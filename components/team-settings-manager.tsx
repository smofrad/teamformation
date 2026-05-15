"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createId,
  DEFAULT_STATE,
  getActiveTeam,
  readStoredState,
  sanitizeMatch,
  sanitizeTeam,
  TeamPlayer,
  TeamRecord,
  writeStoredState,
} from "@/lib/lineup-data";

export function TeamSettingsManager() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [teams, setTeams] = useState<TeamRecord[]>(DEFAULT_STATE.teams);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(DEFAULT_STATE.activeTeamId);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    const state = readStoredState();
    setTeams(state.teams);
    setActiveTeamId(state.activeTeamId);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    writeStoredState({ teams, activeTeamId });
  }, [activeTeamId, isHydrated, teams]);

  const activeTeam = useMemo(() => getActiveTeam({ teams, activeTeamId }), [activeTeamId, teams]);
  const teamPlayers = activeTeam?.players ?? [];
  const matches = activeTeam?.matches ?? [];

  const selectedCount = useMemo(() => {
    const ids = new Set<string>();
    matches.forEach((match) => {
      match.periods.forEach((period) => {
        period.bench.forEach((id) => ids.add(id));
        period.lineup.forEach((item) => ids.add(item.playerId));
      });
    });
    return ids.size;
  }, [matches]);

  function updateActiveTeam(updater: (team: TeamRecord) => TeamRecord) {
    if (!activeTeam) return;
    setTeams((currentTeams) =>
      currentTeams.map((team) => (team.id === activeTeam.id ? sanitizeTeam(updater(team)) : team))
    );
  }

  function addTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;

    const nextTeam: TeamRecord = {
      id: createId(),
      name,
      players: [],
      matches: [],
      activeMatchId: null,
    };

    setTeams((currentTeams) => [...currentTeams, nextTeam]);
    setActiveTeamId(nextTeam.id);
    setNewTeamName("");
  }

  function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTeam) return;
    const name = newPlayerName.trim();
    const shirtNumber = newPlayerNumber.trim();
    if (!name || !shirtNumber) return;

    const player: TeamPlayer = {
      id: createId(),
      name,
      shirtNumber,
    };

    updateActiveTeam((team) => ({
      ...team,
      players: [...team.players, player],
    }));
    setNewPlayerName("");
    setNewPlayerNumber("");
  }

  function removePlayer(playerId: string) {
    if (!activeTeam) return;
    const nextPlayers = teamPlayers.filter((player) => player.id !== playerId);
    updateActiveTeam((team) => ({
      ...team,
      players: nextPlayers,
      matches: team.matches.map((match) => sanitizeMatch(match, nextPlayers)),
    }));
  }

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="surface w-full max-w-md p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Loading</p>
          <h1 className="mt-3 text-2xl font-semibold">Opening player settings</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Settings</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Manage team players</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Switch teams, add new teams, and manage the squad for the selected team.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to games
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-700">Selected team</p>
              <p className="mt-2 text-2xl font-semibold">{activeTeam?.name ?? "No team"}</p>
            </div>
            <div className="rounded-3xl bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Squad in games</p>
              <p className="mt-2 text-3xl font-semibold">{selectedCount}</p>
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-lg font-semibold">Teams</h2>
          <p className="mt-1 text-sm text-muted-foreground">Games and players are shown per team.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr),auto]">
            <select
              className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
              onChange={(event) => setActiveTeamId(event.target.value)}
              value={activeTeamId ?? ""}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <form className="grid gap-3 sm:grid-cols-[1fr,auto]" onSubmit={addTeam}>
              <input
                className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition placeholder:text-muted-foreground focus:border-emerald-500"
                onChange={(event) => setNewTeamName(event.target.value)}
                placeholder="New team name"
                value={newTeamName}
              />
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Add team
              </Button>
            </form>
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add player</h2>
              <p className="text-sm text-muted-foreground">Build the player pool for {activeTeam?.name ?? "this team"}.</p>
            </div>
          </div>

          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr,120px,auto]" onSubmit={addPlayer}>
            <input
              className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition placeholder:text-muted-foreground focus:border-emerald-500"
              onChange={(event) => setNewPlayerName(event.target.value)}
              placeholder="Player name"
              value={newPlayerName}
            />
            <input
              className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition placeholder:text-muted-foreground focus:border-emerald-500"
              inputMode="numeric"
              onChange={(event) => setNewPlayerNumber(event.target.value)}
              placeholder="No."
              value={newPlayerNumber}
            />
            <Button className="h-12" type="submit">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </form>
        </section>

        <section className="surface p-5">
          <h2 className="text-lg font-semibold">Current squad</h2>
          <p className="mt-1 text-sm text-muted-foreground">These players are available for games on {activeTeam?.name ?? "this team"}.</p>

          <div className="mt-4 space-y-3">
            {teamPlayers.map((player) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3" key={player.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">
                    {player.shirtNumber}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{player.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Squad player</p>
                  </div>
                </div>
                <Button onClick={() => removePlayer(player.id)} size="icon" type="button" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
