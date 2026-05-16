import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { V2TeamMatches } from "@/components/v2-team-matches";
import { V2TeamPlayers } from "@/components/v2-team-players";
import { Button } from "@/components/ui/button";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { getV2TeamDetail } from "@/lib/supabase/v2";

export default async function V2TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  await requireSupabaseUser();
  const { teamId } = await params;
  const team = await getV2TeamDetail(teamId);

  if (!team) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Team</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{team.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Här bygger vi nästa steg av V2: spelartrupp och snart matcher för laget.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/v2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </section>

        <V2TeamPlayers players={team.players} teamId={team.id} />
        <V2TeamMatches matches={team.matches} teamId={team.id} />
      </div>
    </main>
  );
}
