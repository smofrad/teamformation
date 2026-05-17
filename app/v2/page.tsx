import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, Users } from "lucide-react";

import { requireSupabaseUser } from "@/lib/supabase/auth";
import { getV2TeamsForCurrentUser } from "@/lib/supabase/v2";

export default async function V2HomePage() {
  const user = await requireSupabaseUser();
  const teams = await getV2TeamsForCurrentUser();

  if (teams.length === 1) {
    const onlyTeam = teams[0];
    if (onlyTeam.latestMatchId) {
      redirect(`/v2/teams/${onlyTeam.id}/matches/${onlyTeam.latestMatchId}`);
    }

    redirect(`/v2/teams/${onlyTeam.id}`);
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="surface p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Team Formation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your shared team workspace</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as <strong>{user.email}</strong>. Choose a team and go straight into building formations.
          </p>
        </section>

        <section className="surface p-6">
          <h2 className="text-xl font-semibold">Your teams</h2>
          <p className="mt-2 text-sm text-muted-foreground">Each team opens into the formation workflow first. Squad management is kept separate.</p>

          {teams.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
              No teams are connected to this account yet. Create a team and add yourself as a member in Supabase first.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {teams.map((team) => (
                <article className="rounded-[28px] border border-border bg-white/75 p-5" key={team.id}>
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Team</p>
                  <h3 className="mt-2 text-xl font-semibold">{team.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Players</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-700" />
                        <p className="text-2xl font-semibold">{team.playerCount}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Matches</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Database className="h-4 w-4 text-amber-700" />
                        <p className="text-2xl font-semibold">{team.matchCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Link
                      className="inline-flex rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-secondary"
                      href={team.latestMatchId ? `/v2/teams/${team.id}/matches/${team.latestMatchId}` : `/v2/teams/${team.id}`}
                    >
                      {team.latestMatchId ? "Open latest match" : "Create formation"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
