"use client";

import type { FormEvent, RefObject } from "react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Settings2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AppState,
  createId,
  DEFAULT_STATE,
  getActiveTeam,
  getPeriodTemplates,
  MatchFormat,
  MatchPeriod,
  MatchPlayerPosition,
  MatchRecord,
  PeriodCount,
  readStoredState,
  sanitizeMatch,
  sanitizeTeam,
  TeamPlayer,
  TeamRecord,
  writeStoredState,
} from "@/lib/lineup-data";
import { cn } from "@/lib/utils";

export function LineupBuilder() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [teams, setTeams] = useState<TeamRecord[]>(DEFAULT_STATE.teams);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(DEFAULT_STATE.activeTeamId);
  const [presentationMode, setPresentationMode] = useState(false);
  const [newMatchName, setNewMatchName] = useState("");
  const [newMatchFormat, setNewMatchFormat] = useState<MatchFormat>(7);
  const [newPeriodCount, setNewPeriodCount] = useState<PeriodCount>(2);
  const [copyFromMatchId, setCopyFromMatchId] = useState<string>("");
  const [newGameMode, setNewGameMode] = useState<"blank" | "copy">("blank");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showActiveGameDetails, setShowActiveGameDetails] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const state = readStoredState();
    setTeams(state.teams);
    setActiveTeamId(state.activeTeamId);
    setCopyFromMatchId(getActiveTeam(state)?.matches[0]?.id ?? "");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const payload: AppState = {
      teams,
      activeTeamId,
    };

    writeStoredState(payload);
  }, [activeTeamId, isHydrated, teams]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const activeTeam = useMemo(() => getActiveTeam({ teams, activeTeamId }), [activeTeamId, teams]);
  const teamPlayers = activeTeam?.players ?? [];
  const matches = activeTeam?.matches ?? [];
  const activeMatchId = activeTeam?.activeMatchId ?? null;

  const activeMatch = useMemo(() => {
    return matches.find((match) => match.id === activeMatchId) ?? null;
  }, [activeMatchId, matches]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
  }, [matches]);

  const teamPlayerMap = useMemo(() => {
    return new Map(teamPlayers.map((player) => [player.id, player]));
  }, [teamPlayers]);

  const activeLineupPlayers = useMemo(() => {
    const activePeriod = getActivePeriod(activeMatch);
    if (!activePeriod) return [];
    return activePeriod.lineup
      .map((item) => {
        const player = teamPlayerMap.get(item.playerId);
        if (!player) return null;
        return { ...item, player };
      })
      .filter((item): item is MatchPlayerPosition & { player: TeamPlayer } => Boolean(item));
  }, [activeMatch, teamPlayerMap]);

  const activeBenchPlayers = useMemo(() => {
    const activePeriod = getActivePeriod(activeMatch);
    if (!activePeriod) return [];
    return activePeriod.bench
      .map((playerId) => teamPlayerMap.get(playerId))
      .filter((player): player is TeamPlayer => Boolean(player));
  }, [activeMatch, teamPlayerMap]);

  const totalSelectedPlayers = activeLineupPlayers.length + activeBenchPlayers.length;

  const availablePlayers = useMemo(() => {
    const activePeriod = getActivePeriod(activeMatch);
    if (!activePeriod) return [];
    const selectedIds = new Set([...activePeriod.bench, ...activePeriod.lineup.map((item) => item.playerId)]);
    return teamPlayers.filter((player) => !selectedIds.has(player.id));
  }, [activeMatch, teamPlayers]);

  const activePeriod = useMemo(() => getActivePeriod(activeMatch), [activeMatch]);

  const activeDragPlayer = useMemo(() => {
    if (!activeDragId) return null;
    return teamPlayerMap.get(activeDragId) ?? null;
  }, [activeDragId, teamPlayerMap]);

  function updateActiveTeam(updater: (team: TeamRecord) => TeamRecord) {
    if (!activeTeam) return;
    setTeams((currentTeams) =>
      currentTeams.map((team) => (team.id === activeTeam.id ? sanitizeTeam(updater(team)) : team))
    );
  }

  function updateActiveMatch(updater: (match: MatchRecord) => MatchRecord) {
    if (!activeMatch || !activeTeam) return;
    updateActiveTeam((team) => ({
      ...team,
      matches: team.matches.map((match) => (match.id === activeMatch.id ? sanitizeMatch(updater(match), team.players) : match)),
    }));
  }

  function createBlankMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMatch: MatchRecord = {
      id: createId(),
      name: newMatchName.trim() || `Match ${matches.length + 1}`,
      format: newMatchFormat,
      periodCount: newPeriodCount,
      periods: getPeriodTemplates(newPeriodCount).map((period) => ({
        ...period,
        lineup: [],
        bench: [],
      })),
      activePeriodId: "period-1",
      createdAt: new Date().toISOString(),
    };

    updateActiveTeam((team) => ({
      ...team,
      matches: [nextMatch, ...team.matches],
      activeMatchId: nextMatch.id,
    }));
    setNewMatchName("");
    setNewMatchFormat(7);
    setNewPeriodCount(2);
    setShowCreatePanel(false);
    setNewGameMode("blank");
  }

  function createFromCopy() {
    const sourceMatch = matches.find((match) => match.id === copyFromMatchId);
    if (!sourceMatch) return;

    const nextMatch = sanitizeMatch(
      {
        ...sourceMatch,
        id: createId(),
        name: newMatchName.trim() || `${sourceMatch.name} Copy`,
        createdAt: new Date().toISOString(),
      },
      teamPlayers
    );

    updateActiveTeam((team) => ({
      ...team,
      matches: [nextMatch, ...team.matches],
      activeMatchId: nextMatch.id,
    }));
    setNewMatchName("");
    setShowCreatePanel(false);
    setNewGameMode("blank");
  }

  function deleteMatch(matchId: string) {
    if (!activeTeam) return;
    const nextMatches = activeTeam.matches.filter((match) => match.id !== matchId);
    const fallbackId = nextMatches[0]?.id ?? null;
    updateActiveTeam((team) => ({
      ...team,
      matches: nextMatches,
      activeMatchId: team.activeMatchId === matchId ? fallbackId : team.activeMatchId,
    }));
    if (copyFromMatchId === matchId) {
      setCopyFromMatchId(nextMatches[0]?.id ?? "");
    }
  }

  function addPlayerToMatch(playerId: string) {
    if (!activeMatch || !activePeriod) return;
    if (activePeriod.bench.includes(playerId) || activePeriod.lineup.some((item) => item.playerId === playerId)) return;

    updateActiveMatch((match) => ({
      ...match,
      periods: match.periods.map((period) =>
        period.id === match.activePeriodId ? { ...period, bench: [...period.bench, playerId] } : period
      ),
    }));
  }

  function removePlayerFromMatch(playerId: string) {
    updateActiveMatch((match) => ({
      ...match,
      periods: match.periods.map((period) =>
        period.id === match.activePeriodId
          ? {
              ...period,
              lineup: period.lineup.filter((item) => item.playerId !== playerId),
              bench: period.bench.filter((id) => id !== playerId),
            }
          : period
      ),
    }));
  }

  function updateMatchFormat(format: MatchFormat) {
    updateActiveMatch((match) => ({ ...match, format }));
  }

  function updateMatchPeriodCount(periodCount: PeriodCount) {
    updateActiveMatch((match) => ({ ...match, periodCount }));
  }

  function setActivePeriodId(periodId: string) {
    updateActiveMatch((match) => ({ ...match, activePeriodId: periodId }));
  }

  function setTeamAndDefaultMatch(teamId: string) {
    const nextTeam = teams.find((team) => team.id === teamId);
    setActiveTeamId(teamId);
    setCopyFromMatchId(nextTeam?.matches[0]?.id ?? "");
    setShowActiveGameDetails(false);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    if (!activeMatch) return;

    const playerId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (overId === "bench-zone") {
      updateActiveMatch((match) => movePlayerToBench(match, playerId));
      return;
    }

    if (overId === "pitch-zone") {
      const rect = pitchRef.current?.getBoundingClientRect();
      const translatedRect = event.active.rect.current.translated;

      if (!rect || !translatedRect) {
        updateActiveMatch((match) => movePlayerToPitch(match, playerId, 50, 50));
        return;
      }

      const tokenCenterX = translatedRect.left + translatedRect.width / 2;
      const tokenCenterY = translatedRect.top + translatedRect.height / 2;
      const x = clamp(((tokenCenterX - rect.left) / rect.width) * 100, 6, 94);
      const y = clamp(((tokenCenterY - rect.top) / rect.height) * 100, 8, 92);
      updateActiveMatch((match) => movePlayerToPitch(match, playerId, x, y));
    }
  }

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="surface w-full max-w-md p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Loading</p>
          <h1 className="mt-3 text-2xl font-semibold">Preparing your game board</h1>
        </div>
      </main>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <main className="h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-3">
          {activeMatch ? (
            <>
              <section className="surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold sm:text-2xl">{activeMatch.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{totalSelectedPlayers} players in this game</p>
                    <p className="text-xs text-muted-foreground">{activeTeam?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="icon" variant="outline">
                      <Link href="/settings">
                        <Settings2 className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button onClick={() => setShowActiveGameDetails((current) => !current)} size="sm" variant="outline">
                      {showActiveGameDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showActiveGameDetails ? "Hide" : "Expand"}
                    </Button>
                  </div>
                </div>

                {showActiveGameDetails && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-border/70 pt-3">
                    <p className="text-sm text-muted-foreground">
                      {formatMatchLabel(activeMatch.format)} in {activeMatch.periodCount === 2 ? "two halves" : "three periods"}.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {!presentationMode && (
                        <Button onClick={() => setShowCreatePanel((current) => !current)} variant="default">
                          {showCreatePanel ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {showCreatePanel ? "Close" : "Create new"}
                        </Button>
                      )}
                      <Button
                        onClick={() => setPresentationMode((current) => !current)}
                        variant={presentationMode ? "default" : "outline"}
                      >
                        {presentationMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {presentationMode ? "Exit presentation" : "Presentation"}
                      </Button>
                      {!presentationMode && (
                        <Button onClick={() => deleteMatch(activeMatch.id)} variant="outline">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>

                    {!presentationMode && (
                      <div className="grid gap-3">
                        <select
                          className="rounded-2xl border border-border bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500"
                          onChange={(event) => setTeamAndDefaultMatch(event.target.value)}
                          value={activeTeamId ?? ""}
                        >
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-2xl border border-border bg-white px-4 py-2.5 outline-none transition focus:border-emerald-500"
                          onChange={(event) =>
                            updateActiveTeam((team) => ({
                              ...team,
                              activeMatchId: event.target.value,
                            }))
                          }
                          value={activeMatch.id}
                        >
                          {sortedMatches.map((match) => (
                            <option key={match.id} value={match.id}>
                              {match.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex overflow-hidden rounded-2xl border border-border bg-white">
                          {[7, 9, 11].map((format) => (
                            <button
                              className={cn(
                                "px-4 py-2.5 text-sm font-medium transition",
                                activeMatch.format === format ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-secondary"
                              )}
                              key={format}
                              onClick={() => updateMatchFormat(format as MatchFormat)}
                              type="button"
                            >
                              {format}
                            </button>
                          ))}
                        </div>

                        <div className="flex overflow-hidden rounded-2xl border border-border bg-white">
                          {[2, 3].map((periodCount) => (
                            <button
                              className={cn(
                                "flex-1 px-4 py-2.5 text-sm font-medium transition",
                                activeMatch.periodCount === periodCount ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-secondary"
                              )}
                              key={periodCount}
                              onClick={() => updateMatchPeriodCount(periodCount as PeriodCount)}
                              type="button"
                            >
                              {periodCount === 2 ? "Halves" : "3 periods"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!presentationMode && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-[20px] bg-emerald-50 p-3">
                          <h4 className="font-semibold text-emerald-900">Add players to this game</h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {availablePlayers.length > 0 ? (
                              availablePlayers.map((player) => (
                                <button
                                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900"
                                  key={player.id}
                                  onClick={() => addPlayerToMatch(player.id)}
                                  type="button"
                                >
                                  #{player.shirtNumber} {player.name}
                                </button>
                              ))
                            ) : (
                              <p className="text-sm text-emerald-900/70">All squad players are already in this game.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[20px] bg-slate-100 p-3">
                          <h4 className="font-semibold text-slate-900">Remove from this game</h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[...activeBenchPlayers, ...activeLineupPlayers.map((item) => item.player)].map((player) => (
                              <button
                                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
                                key={player.id}
                                onClick={() => removePlayerFromMatch(player.id)}
                                type="button"
                              >
                                #{player.shirtNumber} {player.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <PitchBoard
                activePeriodId={activeMatch.activePeriodId}
                periods={activeMatch.periods}
                benchPlayers={activeBenchPlayers}
                lineupPlayers={activeLineupPlayers}
                pitchRef={pitchRef}
                presentationMode={presentationMode}
                setActivePeriodId={setActivePeriodId}
              />
            </>
          ) : (
            <>
              <section className="surface overflow-hidden">
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-emerald-700">{activeTeam?.name ?? "Football Lineup Studio"}</p>
                      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Pitch board first</h1>
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Switch teams in settings, then create games for the selected team.
                      </p>
                    </div>
                    <Button asChild size="icon" variant="outline">
                      <Link href="/settings">
                        <Settings2 className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>

              <section className="surface p-8 text-center">
                <div className="mx-auto mb-5 max-w-sm">
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => setTeamAndDefaultMatch(event.target.value)}
                    value={activeTeamId ?? ""}
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">No games yet</p>
                <h2 className="mt-3 text-2xl font-semibold">Create a new game to open the pitch</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeTeam?.name ?? "This team"} has its own squad and its own games.
                </p>
                <div className="mt-5">
                  <Button onClick={() => setShowCreatePanel(true)}>
                    <Plus className="h-4 w-4" />
                    Create new
                  </Button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {!presentationMode && showCreatePanel && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/30 p-3 sm:items-center sm:justify-center" onClick={() => setShowCreatePanel(false)}>
          <section className="surface w-full max-w-lg p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">New game</p>
                <h3 className="mt-2 text-2xl font-semibold">Create blank or copy previous</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start from scratch or reuse an older game with players, bench and positions included.
                </p>
              </div>
              <Button onClick={() => setShowCreatePanel(false)} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex overflow-hidden rounded-2xl border border-border bg-white">
              <button
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition",
                  newGameMode === "blank" ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-secondary"
                )}
                onClick={() => setNewGameMode("blank")}
                type="button"
              >
                Blank game
              </button>
              <button
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition",
                  newGameMode === "copy" ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-secondary"
                )}
                onClick={() => setNewGameMode("copy")}
                type="button"
              >
                Copy previous
              </button>
            </div>

            {newGameMode === "blank" ? (
              <form className="mt-4 rounded-[28px] bg-[linear-gradient(180deg,rgba(6,95,70,0.96),rgba(21,94,117,0.96))] p-5 text-white" onSubmit={createBlankMatch}>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-100">Blank game</p>
                <h4 className="mt-2 text-xl font-semibold">Start with an empty squad list</h4>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/70 focus:border-white/60"
                    onChange={(event) => setNewMatchName(event.target.value)}
                    placeholder="Game name"
                    value={newMatchName}
                  />
                  <select
                    className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/60"
                    onChange={(event) => setNewMatchFormat(Number(event.target.value) as MatchFormat)}
                    value={newMatchFormat}
                  >
                    <option className="text-slate-900" value={7}>7-a-side</option>
                    <option className="text-slate-900" value={9}>9-a-side</option>
                    <option className="text-slate-900" value={11}>11-a-side</option>
                  </select>
                  <select
                    className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white outline-none focus:border-white/60"
                    onChange={(event) => setNewPeriodCount(Number(event.target.value) as PeriodCount)}
                    value={newPeriodCount}
                  >
                    <option className="text-slate-900" value={2}>1st half / 2nd half</option>
                    <option className="text-slate-900" value={3}>Three periods</option>
                  </select>
                  <Button className="w-full bg-white text-slate-900 hover:bg-white/90" type="submit">
                    <Plus className="h-4 w-4" />
                    Create blank game
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-[28px] border border-border bg-white/75 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-700">Copy previous</p>
                <h4 className="mt-2 text-xl font-semibold">Reuse a saved lineup</h4>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition placeholder:text-muted-foreground focus:border-emerald-500"
                    onChange={(event) => setNewMatchName(event.target.value)}
                    placeholder="Optional new game name"
                    value={newMatchName}
                  />
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => setCopyFromMatchId(event.target.value)}
                    value={copyFromMatchId}
                  >
                    <option value="">Choose a game to copy</option>
                    {sortedMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.name} ({formatMatchLabel(match.format)})
                      </option>
                    ))}
                  </select>
                  <Button className="w-full" disabled={!copyFromMatchId} onClick={createFromCopy} type="button">
                    <Copy className="h-4 w-4" />
                    Copy selected game
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <DragOverlay>{activeDragPlayer ? <PlayerToken player={activeDragPlayer} variant="overlay" /> : null}</DragOverlay>
    </DndContext>
  );
}

function PitchBoard({
  activePeriodId,
  periods,
  lineupPlayers,
  benchPlayers,
  presentationMode,
  pitchRef,
  setActivePeriodId,
}: {
  activePeriodId: string;
  periods: MatchPeriod[];
  lineupPlayers: Array<MatchPlayerPosition & { player: TeamPlayer }>;
  benchPlayers: TeamPlayer[];
  presentationMode: boolean;
  pitchRef: RefObject<HTMLDivElement | null>;
  setActivePeriodId: (periodId: string) => void;
}) {
  const pitchDrop = useDroppable({ id: "pitch-zone" });
  const benchDrop = useDroppable({ id: "bench-zone" });

  return (
    <section className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex overflow-hidden rounded-2xl border border-border bg-white">
            {periods.map((period) => (
              <button
                className={cn(
                  "px-3 py-2 text-sm font-medium transition sm:px-4",
                  activePeriodId === period.id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-secondary"
                )}
                key={period.id}
                onClick={() => setActivePeriodId(period.id)}
                type="button"
              >
                {period.label}
              </button>
            ))}
          </div>

          {presentationMode && <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Presentation mode</p>}
        </div>

        {presentationMode && (
          <div className="sr-only">Presentation mode</div>
        )}

        <div
          className={cn(
            "pitch relative mx-auto h-full min-h-[320px] w-full overflow-hidden rounded-[32px] border-4 border-white/70 shadow-soft",
            pitchDrop.isOver && "ring-4 ring-emerald-200"
          )}
          ref={(node) => {
            pitchDrop.setNodeRef(node);
            pitchRef.current = node;
          }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-[18%] bottom-0 h-[26%] border-x-2 border-t-2 border-white/80" />
            <div className="absolute inset-x-[30%] bottom-0 h-[12%] border-x-2 border-t-2 border-white/80" />
            <div className="absolute left-1/2 bottom-[26%] h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white/80 opacity-90" />
            <div className="absolute left-1/2 bottom-[18%] h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/90" />
            <div className="absolute inset-x-0 top-0 h-px bg-white/65" />
          </div>

          {lineupPlayers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
              <div className="max-w-sm rounded-[28px] border border-white/30 bg-white/12 px-6 py-5 text-white backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.3em] text-white/75">Drag players here</p>
                <p className="mt-2 text-lg font-semibold">Build the formation your way</p>
              </div>
            </div>
          )}

          {lineupPlayers.map((item) => (
            <DraggablePitchPlayer item={item} key={item.playerId} />
          ))}
        </div>

        <div
          className={cn(
            "mt-3 rounded-[24px] border border-dashed border-border bg-[rgba(255,255,255,0.72)] p-3 sm:p-4",
            benchDrop.isOver && "border-emerald-400 bg-emerald-50/90"
          )}
          ref={benchDrop.setNodeRef}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Bench</h4>
              <p className="text-sm text-muted-foreground">Players not currently on the pitch.</p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{benchPlayers.length}</span>
          </div>

          <div className="mt-3 flex min-h-16 flex-wrap gap-2">
            {benchPlayers.length === 0 ? (
              <div className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 text-sm text-muted-foreground">
                Bench is empty
              </div>
            ) : (
              benchPlayers.map((player) => <DraggableBenchPlayer key={player.id} player={player} />)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DraggablePitchPlayer({ item }: { item: MatchPlayerPosition & { player: TeamPlayer } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.playerId });

  return (
    <button
      {...attributes}
      {...listeners}
      className={cn("absolute touch-none", isDragging && "z-50 opacity-0")}
      ref={setNodeRef}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: transform ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))` : "translate(-50%, -50%)",
      }}
      type="button"
    >
      <PlayerToken player={item.player} />
    </button>
  );
}

function DraggableBenchPlayer({ player }: { player: TeamPlayer }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id });

  return (
    <button
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-40")}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      type="button"
    >
      <PlayerToken player={player} variant="bench" />
    </button>
  );
}

function PlayerToken({
  player,
  variant = "pitch",
}: {
  player: TeamPlayer;
  variant?: "pitch" | "bench" | "overlay";
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", variant === "overlay" && "scale-105", variant === "bench" && "min-w-24")}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-4 font-bold text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)]",
          variant === "bench" ? "h-14 w-14 bg-slate-900 text-sm" : "h-16 w-16 bg-slate-900 text-base",
          variant === "overlay" && "bg-emerald-700"
        )}
      >
        {player.shirtNumber}
      </div>
      <span
        className={cn(
          "mt-2 rounded-full px-2 py-1 font-medium",
          variant === "bench" ? "bg-white/85 text-xs text-slate-900 shadow-sm" : "bg-white/92 text-xs text-slate-900 shadow-sm",
          variant === "overlay" && "bg-white text-slate-900"
        )}
      >
        {player.name}
      </span>
    </div>
  );
}

function movePlayerToPitch(match: MatchRecord, playerId: string, x: number, y: number) {
  const activePeriod = getActivePeriod(match);
  if (!activePeriod) return match;
  const filteredLineup = activePeriod.lineup.filter((item) => item.playerId !== playerId);
  const alreadyOnPitch = activePeriod.lineup.some((item) => item.playerId === playerId);
  const canAddNewPlayer = alreadyOnPitch || filteredLineup.length < match.format;

  if (!canAddNewPlayer) {
    return match;
  }

  return {
    ...match,
    periods: match.periods.map((period) =>
      period.id === match.activePeriodId
        ? {
            ...period,
            lineup: [...filteredLineup, { playerId, x, y }],
            bench: period.bench.filter((id) => id !== playerId),
          }
        : period
    ),
  };
}

function movePlayerToBench(match: MatchRecord, playerId: string) {
  const activePeriod = getActivePeriod(match);
  if (!activePeriod) return match;
  const isAlreadyBenched = activePeriod.bench.includes(playerId);
  return {
    ...match,
    periods: match.periods.map((period) =>
      period.id === match.activePeriodId
        ? {
            ...period,
            lineup: period.lineup.filter((item) => item.playerId !== playerId),
            bench: isAlreadyBenched ? period.bench : [...period.bench, playerId],
          }
        : period
    ),
  };
}

function getActivePeriod(match: MatchRecord | null): MatchPeriod | null {
  if (!match) return null;
  return match.periods.find((period) => period.id === match.activePeriodId) ?? match.periods[0] ?? null;
}

function formatMatchLabel(format: MatchFormat) {
  return `${format}-a-side`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
