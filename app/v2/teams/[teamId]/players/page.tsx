import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { V2TeamPlayers } from "@/components/v2-team-players";
import { Button } from "@/components/ui/button";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { getV2TeamDetail } from "@/lib/supabase/v2";

export default async function V2TeamPlayersPage({ params }: { params: Promise<{ teamId: string }> }) {
  await requireSupabaseUser();
  const { teamId } = await params;
  const team = await getV2TeamDetail(teamId);

  if (!team) {
    notFound();
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto max-w-4xl space-y-3">
        <section className="surface p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Squad</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage the shared squad here. Match planning stays on the main team view for fewer clicks on game day.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/v2/teams/${team.id}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to formations
              </Link>
            </Button>
          </div>
        </section>

        <V2TeamPlayers players={team.players} teamId={team.id} />
      </div>
    </main>
  );
}
