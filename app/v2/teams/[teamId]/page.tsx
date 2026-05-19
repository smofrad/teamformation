import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";

import { V2TeamMatches } from "@/components/v2-team-matches";
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

  const latestMatch = team.matches[0] ?? null;

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto max-w-4xl space-y-3">
        <section className="surface p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Formation hub</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{team.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Go straight into match planning here. Squad management lives in a separate view so coaches can build lineups faster.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/v2">
                  <ArrowLeft className="h-4 w-4" />
                  Teams
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/v2/teams/${team.id}/players`}>
                  <Settings2 className="h-4 w-4" />
                  Manage squad
                </Link>
              </Button>
            </div>
          </div>

          {latestMatch ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/v2/teams/${team.id}/matches/${latestMatch.id}`}>Continue latest match</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/v2/teams/${team.id}/matches/${latestMatch.id}?view=presentation`}>Presentation view</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              No saved matches yet. Create one below and you will go straight into the formation board.
            </div>
          )}
        </section>

        <V2TeamMatches matches={team.matches} teamId={team.id} teamName={team.name} />
      </div>
    </main>
  );
}
