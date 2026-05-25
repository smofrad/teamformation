"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronUp, Eye, EyeOff, Info, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { V2MatchDetail, V2MatchPeriod, V2PeriodPlayer, V2Player } from "@/lib/supabase/v2";
import { cn } from "@/lib/utils";

type EffectivePeriod = V2MatchPeriod & {
  players: V2PeriodPlayer[];
};

function getEffectivePeriod(periods: V2MatchPeriod[], periodNumber: number): EffectivePeriod | null {
  const current = periods.find((period) => period.periodNumber === periodNumber);
  if (!current) return null;

  if (current.isCustomized || periodNumber === 1) {
    return current;
  }

  const inherited = getEffectivePeriod(periods, periodNumber - 1);
  return {
    ...current,
    players: inherited ? inherited.players.map((item) => ({ ...item })) : [],
  };
}

function formatLabel(format: 7 | 9 | 11) {
  return `${format}-a-side`;
}

function getPitchCoordinates(index: number) {
  const slots = [
    { x: 50, y: 84 },
    { x: 26, y: 68 },
    { x: 50, y: 64 },
    { x: 74, y: 68 },
    { x: 18, y: 48 },
    { x: 40, y: 46 },
    { x: 60, y: 46 },
    { x: 82, y: 48 },
    { x: 32, y: 28 },
    { x: 50, y: 20 },
    { x: 68, y: 28 },
  ];

  return slots[index] ?? { x: 50, y: 50 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCoordinatesFromRect({
  rect,
  translatedRect,
}: {
  rect: DOMRect;
  translatedRect: { left: number; top: number; width: number; height: number };
}) {
  const tokenCenterX = translatedRect.left + translatedRect.width / 2;
  const tokenCenterY = translatedRect.top + translatedRect.height / 2;

  return {
    x: clamp(((tokenCenterX - rect.left) / rect.width) * 100, 6, 94),
    y: clamp(((tokenCenterY - rect.top) / rect.height) * 100, 8, 92),
  };
}

export function V2MatchEditor({ match, initialPresentationMode = false }: { match: V2MatchDetail; initialPresentationMode?: boolean }) {
  const router = useRouter();
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [activePeriodNumber, setActivePeriodNumber] = useState(match.activePeriodNumber);
  const [localPeriods, setLocalPeriods] = useState(match.periods);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(initialPresentationMode);
  const [activeTab, setActiveTab] = useState<"formation" | "info" | "events" | "subs">("formation");
  const [showMatchInfo, setShowMatchInfo] = useState(false);
  const [showBenchSheet, setShowBenchSheet] = useState(false);
  const [showSquadSheet, setShowSquadSheet] = useState(false);
  const [homeTeam, setHomeTeam] = useState(match.homeTeam);
  const [awayTeam, setAwayTeam] = useState(match.awayTeam);
  const [matchDate, setMatchDate] = useState(match.matchDate);
  const [format, setFormat] = useState<7 | 9 | 11>(match.format);
  const [periodCount, setPeriodCount] = useState<2 | 3>(match.periodCount);
  const [periodLengthMinutes, setPeriodLengthMinutes] = useState(match.periodLengthMinutes);
  const [goalPeriodNumber, setGoalPeriodNumber] = useState<1 | 2 | 3>(Math.min(match.periodCount, 1) as 1 | 2 | 3);
  const [goalTeamSide, setGoalTeamSide] = useState<"home" | "away">("home");
  const [goalScorerName, setGoalScorerName] = useState("");
  const [goalMinute, setGoalMinute] = useState("");
  const [subPeriodNumber, setSubPeriodNumber] = useState<1 | 2 | 3>(1);
  const [subMinute, setSubMinute] = useState("");
  const [subPlayerOutId, setSubPlayerOutId] = useState("");
  const [subPlayerInId, setSubPlayerInId] = useState("");
  const [subNote, setSubNote] = useState("");
  const [editingSubstitutionId, setEditingSubstitutionId] = useState<string | null>(null);
  const [manualHomeScore, setManualHomeScore] = useState(match.manualHomeScore?.toString() ?? "");
  const [manualAwayScore, setManualAwayScore] = useState(match.manualAwayScore?.toString() ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  useEffect(() => {
    setLocalPeriods(match.periods);
    setActivePeriodNumber(match.activePeriodNumber);
    setHomeTeam(match.homeTeam);
    setAwayTeam(match.awayTeam);
    setMatchDate(match.matchDate);
    setFormat(match.format);
    setPeriodCount(match.periodCount);
    setPeriodLengthMinutes(match.periodLengthMinutes);
    setManualHomeScore(match.manualHomeScore?.toString() ?? "");
    setManualAwayScore(match.manualAwayScore?.toString() ?? "");
    setSubPeriodNumber(Math.min(match.periodCount, 1) as 1 | 2 | 3);
    setEditingSubstitutionId(null);
    setSubMinute("");
    setSubPlayerOutId("");
    setSubPlayerInId("");
    setSubNote("");
  }, [match.activePeriodNumber, match.id, match.periods]);

  const activePeriod = useMemo(
    () => getEffectivePeriod(localPeriods, activePeriodNumber),
    [activePeriodNumber, localPeriods]
  );

  const playersById = useMemo(() => new Map(match.players.map((player) => [player.id, player])), [match.players]);

  const lineupPlayers = useMemo(() => {
    if (!activePeriod) return [];
    return activePeriod.players
      .filter((item) => item.zone === "pitch")
      .map((item) => ({
        ...item,
        player: playersById.get(item.playerId),
      }))
      .filter((item): item is V2PeriodPlayer & { player: V2Player } => Boolean(item.player));
  }, [activePeriod, playersById]);

  const benchPlayers = useMemo(() => {
    if (!activePeriod) return [];
    return activePeriod.players
      .filter((item) => item.zone === "bench")
      .map((item) => playersById.get(item.playerId))
      .filter((item): item is V2Player => Boolean(item));
  }, [activePeriod, playersById]);

  const selectedIds = useMemo(() => new Set(activePeriod?.players.map((item) => item.playerId) ?? []), [activePeriod]);
  const availablePlayers = useMemo(() => match.players.filter((player) => !selectedIds.has(player.id)), [match.players, selectedIds]);
  const activeDragPlayer = useMemo(() => (activeDragId ? playersById.get(activeDragId) ?? null : null), [activeDragId, playersById]);
  const lineupPlayerIds = useMemo(() => new Set(lineupPlayers.map((item) => item.playerId)), [lineupPlayers]);
  const benchPlayerIds = useMemo(() => new Set(benchPlayers.map((item) => item.id)), [benchPlayers]);
  const homeGoals = useMemo(() => match.goals.filter((goal) => goal.teamSide === "home").length, [match.goals]);
  const awayGoals = useMemo(() => match.goals.filter((goal) => goal.teamSide === "away").length, [match.goals]);
  const effectiveHomeScore = match.manualHomeScore ?? homeGoals;
  const effectiveAwayScore = match.manualAwayScore ?? awayGoals;
  const teamScorerOptions = useMemo(
    () => match.players.map((player) => ({ id: player.id, label: `#${player.shirtNumber} ${player.name}`, name: player.name })),
    [match.players]
  );
  const substitutionPeriod = useMemo(
    () => getEffectivePeriod(localPeriods, subPeriodNumber),
    [localPeriods, subPeriodNumber]
  );
  const substitutionOutOptions = useMemo(() => {
    if (!substitutionPeriod) return [];
    return substitutionPeriod.players
      .filter((item) => item.zone === "pitch")
      .map((item) => playersById.get(item.playerId))
      .filter((item): item is V2Player => Boolean(item))
      .sort((a, b) => Number(a.shirtNumber) - Number(b.shirtNumber) || a.name.localeCompare(b.name));
  }, [playersById, substitutionPeriod]);
  const substitutionInOptions = useMemo(() => {
    if (!substitutionPeriod) return [];
    return substitutionPeriod.players
      .filter((item) => item.zone === "bench")
      .map((item) => playersById.get(item.playerId))
      .filter((item): item is V2Player => Boolean(item))
      .sort((a, b) => Number(a.shirtNumber) - Number(b.shirtNumber) || a.name.localeCompare(b.name));
  }, [playersById, substitutionPeriod]);

  function updateLocalPeriod(periodNumber: number, updater: (period: EffectivePeriod) => EffectivePeriod) {
    setLocalPeriods((currentPeriods) => {
      const effectivePeriod = getEffectivePeriod(currentPeriods, periodNumber);
      if (!effectivePeriod) return currentPeriods;

      return currentPeriods.map((period) =>
        period.periodNumber === periodNumber
          ? {
              ...updater(effectivePeriod),
              isCustomized: true,
            }
          : period
      );
    });
  }

  async function updateActivePeriodOnServer(periodNumber: number) {
    setError("");
    setActivePeriodNumber(periodNumber);

    const response = await fetch(`/api/v2/teams/${match.teamId}/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activePeriodNumber: periodNumber }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to switch period.");
      startTransition(() => {
        router.refresh();
      });
      return;
    }
  }

  async function savePlayer(playerId: string, zone: "pitch" | "bench", coordinates?: { x: number; y: number }) {
    setError("");
    updateLocalPeriod(activePeriodNumber, (period) => {
      const nextPlayers = period.players.filter((item) => item.playerId !== playerId);
      const pitchCount = nextPlayers.filter((item) => item.zone === "pitch").length;

      if (zone === "pitch" && pitchCount >= match.format) {
        return period;
      }

      return {
        ...period,
        players: [
          ...nextPlayers,
          {
            playerId,
            zone,
            x: zone === "pitch" ? coordinates?.x ?? 50 : null,
            y: zone === "pitch" ? coordinates?.y ?? 72 : null,
          },
        ],
      };
    });

    const response = await fetch(
      `/api/v2/teams/${match.teamId}/matches/${match.id}/periods/${activePeriodNumber}/players`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          zone,
          x: zone === "pitch" ? coordinates?.x : undefined,
          y: zone === "pitch" ? coordinates?.y : undefined,
        }),
      }
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to update player.");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

  }

  function moveBenchPlayerToPitch(playerId: string) {
    void savePlayer(playerId, "pitch", getPitchCoordinates(lineupPlayers.length));
  }

  function movePitchPlayerToBench(playerId: string) {
    void savePlayer(playerId, "bench");
  }

  async function saveMatchInfo() {
    setError("");
    const response = await fetch(`/api/v2/teams/${match.teamId}/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeTeam,
        awayTeam,
        matchDate,
        format,
        periodCount,
        periodLengthMinutes,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to save match info.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function addGoal() {
    setError("");
    const response = await fetch(`/api/v2/teams/${match.teamId}/matches/${match.id}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodNumber: goalPeriodNumber,
        teamSide: goalTeamSide,
        scorerName: goalScorerName,
        minute: Number(goalMinute),
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to add goal.");
      return;
    }

    setGoalScorerName("");
    setGoalMinute("");
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveManualResult() {
    setError("");
    const response = await fetch(`/api/v2/teams/${match.teamId}/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeTeam,
        awayTeam,
        matchDate,
        format,
        periodCount,
        periodLengthMinutes,
        manualHomeScore: manualHomeScore === "" ? null : Number(manualHomeScore),
        manualAwayScore: manualAwayScore === "" ? null : Number(manualAwayScore),
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to save result.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function resetSubstitutionForm() {
    setEditingSubstitutionId(null);
    setSubMinute("");
    setSubPlayerOutId("");
    setSubPlayerInId("");
    setSubNote("");
  }

  async function saveSubstitution() {
    setError("");
    const isEditing = Boolean(editingSubstitutionId);
    const response = await fetch(
      isEditing
        ? `/api/v2/teams/${match.teamId}/matches/${match.id}/substitutions/${editingSubstitutionId}`
        : `/api/v2/teams/${match.teamId}/matches/${match.id}/substitutions`,
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodNumber: subPeriodNumber,
          minute: Number(subMinute),
          playerOutId: subPlayerOutId,
          playerInId: subPlayerInId,
          note: subNote,
        }),
      }
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to save substitution.");
      return;
    }

    resetSubstitutionForm();
    startTransition(() => {
      router.refresh();
    });
  }

  async function deleteSubstitution(substitutionId: string) {
    setError("");
    const response = await fetch(
      `/api/v2/teams/${match.teamId}/matches/${match.id}/substitutions/${substitutionId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to delete substitution.");
      return;
    }

    if (editingSubstitutionId === substitutionId) {
      resetSubstitutionForm();
    }
    startTransition(() => {
      router.refresh();
    });
  }

  function startEditingSubstitution(substitutionId: string) {
    const substitution = match.substitutions.find((item) => item.id === substitutionId);
    if (!substitution) return;
    setEditingSubstitutionId(substitution.id);
    setSubPeriodNumber(substitution.periodNumber as 1 | 2 | 3);
    setSubMinute(String(substitution.minute));
    setSubPlayerOutId(substitution.playerOutId);
    setSubPlayerInId(substitution.playerInId);
    setSubNote(substitution.note ?? "");
    setActiveTab("subs");
  }

  function handleDragStart(event: DragStartEvent) {
    if (presentationMode) return;
    setActiveDragId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (presentationMode) {
      setActiveDragId(null);
      return;
    }

    setActiveDragId(null);
    const playerId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    const translatedRect = event.active.rect.current.translated;
    const pitchRect = pitchRef.current?.getBoundingClientRect();
    const benchRect = benchRef.current?.getBoundingClientRect();

    const centerX = translatedRect ? translatedRect.left + translatedRect.width / 2 : null;
    const centerY = translatedRect ? translatedRect.top + translatedRect.height / 2 : null;

    const droppedInPitch =
      centerX !== null &&
      centerY !== null &&
      pitchRect &&
      centerX >= pitchRect.left &&
      centerX <= pitchRect.right &&
      centerY >= pitchRect.top &&
      centerY <= pitchRect.bottom;

    const droppedInBench =
      centerX !== null &&
      centerY !== null &&
      benchRect &&
      centerX >= benchRect.left &&
      centerX <= benchRect.right &&
      centerY >= benchRect.top &&
      centerY <= benchRect.bottom;

    const overBench = droppedInBench || overId === "bench-zone" || benchPlayerIds.has(overId ?? "");
    const overPitch = droppedInPitch || overId === "pitch-zone" || lineupPlayerIds.has(overId ?? "");

    if (overBench && !overPitch) {
      await savePlayer(playerId, "bench");
      return;
    }

    if (overPitch) {
      const rect = pitchRect;
      const currentLineupItem = lineupPlayers.find((item) => item.playerId === playerId);

      if (!rect || !translatedRect) {
        const fallback = getPitchCoordinates(lineupPlayers.findIndex((item) => item.playerId === playerId) === -1 ? lineupPlayers.length : 0);
        await savePlayer(playerId, "pitch", fallback);
        return;
      }

      if (currentLineupItem) {
        const preciseX = clamp((currentLineupItem.x ?? 50) + (event.delta.x / rect.width) * 100, 6, 94);
        const preciseY = clamp((currentLineupItem.y ?? 50) + (event.delta.y / rect.height) * 100, 8, 92);
        await savePlayer(playerId, "pitch", { x: preciseX, y: preciseY });
        return;
      }

      await savePlayer(playerId, "pitch", getCoordinatesFromRect({ rect, translatedRect }));
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <section className="surface flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 pb-20 sm:overflow-hidden sm:p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">{match.teamName}</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">
              {match.homeTeam} vs {match.awayTeam}
            </h1>
            <div className="mt-1 hidden flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex sm:text-sm">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(match.matchDate).toLocaleDateString("sv-SE")}
              </span>
              <span>{formatLabel(match.format)}</span>
              <span>{match.periodCount} periods</span>
              <span>{match.periodLengthMinutes} min</span>
              {match.createdByDisplayName ? <span>Created by {match.createdByDisplayName}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {lineupPlayers.length + benchPlayers.length} players
            </span>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-slate-700 sm:hidden"
              onClick={() => setShowMatchInfo((current) => !current)}
              type="button"
            >
              {showMatchInfo ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showMatchInfo ? (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-white/80 px-3 py-2 text-xs text-muted-foreground sm:hidden">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {new Date(match.matchDate).toLocaleDateString("sv-SE")}
            </span>
            <span>{formatLabel(match.format)}</span>
            <span>{match.periodLengthMinutes} min</span>
          </div>
        ) : null}

        <div className="mt-2 sm:hidden">
          <select
            className="w-full rounded-2xl border border-border bg-white/90 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500"
            onChange={(event) => setActiveTab(event.target.value as "formation" | "info" | "events" | "subs")}
            value={activeTab}
          >
            <option value="formation">Formation</option>
            <option value="info">Info</option>
            <option value="events">Events</option>
            <option value="subs">Subs</option>
          </select>
        </div>

        <div className="mt-2 hidden grid-cols-4 gap-2 rounded-2xl border border-border bg-white/90 p-1 sm:grid">
          {[
            ["formation", "Formation"],
            ["info", "Info"],
            ["events", "Events"],
            ["subs", "Subs"],
          ].map(([tabKey, label]) => (
            <button
              className={cn(
                "rounded-xl px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm",
                activeTab === tabKey ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-secondary"
              )}
              key={tabKey}
              onClick={() => setActiveTab(tabKey as "formation" | "info" | "events" | "subs")}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "formation" ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border bg-white/90 p-1">
            {match.periods.map((period) => (
              <button
                className={cn(
                  "min-w-fit rounded-xl px-3 py-2 text-sm font-medium transition",
                  activePeriodNumber === period.periodNumber ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-secondary"
                )}
                key={period.id}
                onClick={() => updateActivePeriodOnServer(period.periodNumber)}
                type="button"
              >
                <span className="sm:hidden">P{period.periodNumber}</span>
                <span className="hidden sm:inline">{period.label}</span>
              </button>
            ))}
          </div>

          <Button className="shrink-0 px-3 sm:px-4" onClick={() => setPresentationMode((current) => !current)} size="sm" variant={presentationMode ? "default" : "outline"}>
            {presentationMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{presentationMode ? "Exit presentation" : "Presentation"}</span>
          </Button>
        </div>
        ) : null}

        {error ? <div className="mt-2 rounded-2xl border px-4 py-3 text-sm status-error">{error}</div> : null}

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 pb-3 sm:pb-0">
          {activeTab === "formation" ? (
            <>
              <PitchZone
                lineupPlayers={lineupPlayers}
                movePitchPlayerToBench={movePitchPlayerToBench}
                pitchRef={pitchRef}
                presentationMode={presentationMode}
              />

              {!presentationMode ? (
                <>
                  <div className="hidden sm:block">
                    <BenchZone
                      availablePlayersCount={availablePlayers.length}
                      benchPlayers={benchPlayers}
                      benchRef={benchRef}
                      moveBenchPlayerToPitch={moveBenchPlayerToPitch}
                      onAddPlayers={() => setShowSquadSheet(true)}
                    />
                  </div>

                  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[rgba(250,248,242,0.96)] px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] sm:hidden">
                    <div className="mx-auto flex max-w-5xl items-center gap-2">
                      <button
                        className="flex min-w-0 flex-1 items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left"
                        onClick={() => setShowBenchSheet((current) => !current)}
                        type="button"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">Bench</span>
                          <span className="block text-xs text-muted-foreground">{benchPlayers.length} players</span>
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{benchPlayers.length}</span>
                      </button>
                      <Button
                        className="shrink-0"
                        onClick={() => {
                          setShowBenchSheet(false);
                          setShowSquadSheet(true);
                        }}
                        size="sm"
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {activeTab === "info" ? (
            <section className="rounded-[24px] border border-border bg-white/85 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input onChange={(event) => setHomeTeam(event.target.value)} placeholder="Home team" value={homeTeam} />
                <Input onChange={(event) => setAwayTeam(event.target.value)} placeholder="Away team" value={awayTeam} />
                <Input onChange={(event) => setMatchDate(event.target.value)} type="date" value={matchDate} />
                <select
                  className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) => setFormat(Number(event.target.value) as 7 | 9 | 11)}
                  value={format}
                >
                  <option value={7}>7-a-side</option>
                  <option value={9}>9-a-side</option>
                  <option value={11}>11-a-side</option>
                </select>
                <select
                  className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) => setPeriodCount(Number(event.target.value) as 2 | 3)}
                  value={periodCount}
                >
                  <option value={2}>1st half / 2nd half</option>
                  <option value={3}>Three periods</option>
                </select>
                <Input
                  inputMode="numeric"
                  onChange={(event) => setPeriodLengthMinutes(Number(event.target.value) || 0)}
                  placeholder="Minutes per period"
                  value={periodLengthMinutes}
                />
              </div>

              <div className="mt-4">
                <Button disabled={isPending} onClick={saveMatchInfo} type="button">
                  Save match info
                </Button>
              </div>
            </section>
          ) : null}

          {activeTab === "events" ? (
            <section className="rounded-[24px] border border-border bg-white/85 p-4">
              <div className="rounded-2xl bg-slate-900 px-4 py-4 text-center text-white">
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">Result</p>
                <p className="mt-2 text-3xl font-semibold">
                  {effectiveHomeScore} - {effectiveAwayScore}
                </p>
                <p className="mt-2 text-sm text-white/80">
                  {match.homeTeam} vs {match.awayTeam}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Quick result</h3>
                    <p className="text-sm text-muted-foreground">Set the final or current score directly if you do not want to register scorers.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr),100px,100px]">
                  <div className="text-sm text-slate-700">
                    <p className="font-medium">{match.homeTeam}</p>
                    <p className="mt-3 font-medium">{match.awayTeam}</p>
                  </div>
                  <div className="grid gap-3">
                    <Input inputMode="numeric" onChange={(event) => setManualHomeScore(event.target.value)} placeholder="0" value={manualHomeScore} />
                    <Input inputMode="numeric" onChange={(event) => setManualAwayScore(event.target.value)} placeholder="0" value={manualAwayScore} />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" disabled={isPending} onClick={saveManualResult} type="button">
                      Save result
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-white/80 p-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Goals</h3>
                  <p className="text-sm text-muted-foreground">Register individual goals when you want a more detailed match log.</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <select
                  className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) => setGoalPeriodNumber(Number(event.target.value) as 1 | 2 | 3)}
                  value={goalPeriodNumber}
                >
                  {Array.from({ length: match.periodCount }, (_, index) => index + 1).map((period) => (
                    <option key={period} value={period}>
                      Period {period}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                  onChange={(event) => setGoalTeamSide(event.target.value as "home" | "away")}
                  value={goalTeamSide}
                >
                  <option value="home">{match.homeTeam}</option>
                  <option value="away">{match.awayTeam}</option>
                </select>
                {goalTeamSide === "home" ? (
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => setGoalScorerName(event.target.value)}
                    value={goalScorerName}
                  >
                    <option value="">Choose scorer</option>
                    {teamScorerOptions.map((player) => (
                      <option key={player.id} value={player.name}>
                        {player.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input onChange={(event) => setGoalScorerName(event.target.value)} placeholder="Scorer or Opponent" value={goalScorerName} />
                )}
                <Input inputMode="numeric" onChange={(event) => setGoalMinute(event.target.value)} placeholder="Minute" value={goalMinute} />
                </div>

                <div className="mt-3">
                  <Button disabled={isPending || !goalScorerName || goalMinute === ""} onClick={addGoal} type="button">
                    <Plus className="h-4 w-4" />
                    Add goal
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {match.goals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                    No goals registered yet.
                  </div>
                ) : (
                  match.goals.map((goal) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3" key={goal.id}>
                      <div>
                        <p className="font-medium text-slate-900">{goal.minute}' {goal.scorerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.teamSide === "home" ? match.homeTeam : match.awayTeam} • Period {goal.periodNumber}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-slate-700">
                        {goal.teamSide === "home" ? "Home" : "Away"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "subs" ? (
            <section className="rounded-[24px] border border-border bg-white/85 p-4">
              <div>
                <h2 className="font-semibold text-slate-900">Planned substitutions</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plan who goes out and who comes in for each period.
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-white/80 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => {
                      setSubPeriodNumber(Number(event.target.value) as 1 | 2 | 3);
                      setSubPlayerOutId("");
                      setSubPlayerInId("");
                    }}
                    value={subPeriodNumber}
                  >
                    {Array.from({ length: match.periodCount }, (_, index) => index + 1).map((period) => (
                      <option key={period} value={period}>
                        Period {period}
                      </option>
                    ))}
                  </select>
                  <Input inputMode="numeric" onChange={(event) => setSubMinute(event.target.value)} placeholder="Minute" value={subMinute} />
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => setSubPlayerOutId(event.target.value)}
                    value={subPlayerOutId}
                  >
                    <option value="">Player out</option>
                    {substitutionOutOptions.map((player) => (
                      <option key={player.id} value={player.id}>
                        #{player.shirtNumber} {player.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                    onChange={(event) => setSubPlayerInId(event.target.value)}
                    value={subPlayerInId}
                  >
                    <option value="">Player in</option>
                    {substitutionInOptions.map((player) => (
                      <option key={player.id} value={player.id}>
                        #{player.shirtNumber} {player.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3">
                  <Input onChange={(event) => setSubNote(event.target.value)} placeholder="Optional note" value={subNote} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={isPending || !subMinute || !subPlayerOutId || !subPlayerInId}
                    onClick={saveSubstitution}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {editingSubstitutionId ? "Save changes" : "Add substitution"}
                  </Button>
                  {editingSubstitutionId ? (
                    <Button onClick={resetSubstitutionForm} type="button" variant="outline">
                      Cancel
                    </Button>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Player out is chosen from the pitch and player in from the bench for the selected period.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {match.substitutions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                    No planned substitutions yet.
                  </div>
                ) : (
                  match.substitutions.map((substitution) => {
                    const playerOut = playersById.get(substitution.playerOutId);
                    const playerIn = playersById.get(substitution.playerInId);
                    return (
                      <div className="rounded-2xl border border-border bg-white/80 px-4 py-3" key={substitution.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              Period {substitution.periodNumber} • {substitution.minute}'
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {playerOut ? `#${playerOut.shirtNumber} ${playerOut.name}` : "Unknown player"} {" -> "} 
                              {playerIn ? `#${playerIn.shirtNumber} ${playerIn.name}` : "Unknown player"}
                            </p>
                            {substitution.note ? (
                              <p className="mt-1 text-xs text-muted-foreground">{substitution.note}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button onClick={() => startEditingSubstitution(substitution.id)} size="sm" type="button" variant="outline">
                              Edit
                            </Button>
                            <Button onClick={() => deleteSubstitution(substitution.id)} size="sm" type="button" variant="outline">
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}

        </div>

        {!presentationMode && activeTab === "formation" ? (
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 sm:hidden",
              showBenchSheet ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-slate-950/25 transition-opacity",
                showBenchSheet ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setShowBenchSheet(false)}
            />
            <div
              className={cn(
                "relative ml-auto max-h-[58dvh] overflow-y-auto rounded-t-[28px] border-t border-border bg-[rgba(250,248,242,0.98)] px-3 pb-5 pt-3 shadow-[0_-24px_60px_rgba(15,23,42,0.18)] transition-transform",
                showBenchSheet ? "translate-y-0" : "translate-y-full"
              )}
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300" />
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bench</p>
                  <p className="text-xs text-muted-foreground">Tap minimize when you want more pitch space.</p>
                </div>
                <Button onClick={() => setShowBenchSheet(false)} size="sm" type="button" variant="outline">
                  Minimize
                </Button>
              </div>
              <BenchZone
                availablePlayersCount={availablePlayers.length}
                benchPlayers={benchPlayers}
                benchRef={benchRef}
                moveBenchPlayerToPitch={moveBenchPlayerToPitch}
                onAddPlayers={() => {
                  setShowBenchSheet(false);
                  setShowSquadSheet(true);
                }}
              />
            </div>
          </div>
        ) : null}

        {!presentationMode && activeTab === "formation" ? (
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-[60]",
              showSquadSheet ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-slate-950/25 transition-opacity",
                showSquadSheet ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setShowSquadSheet(false)}
            />
            <div
              className={cn(
                "relative ml-auto max-h-[68dvh] overflow-y-auto rounded-t-[28px] border-t border-border bg-[rgba(250,248,242,0.98)] px-3 pb-5 pt-3 shadow-[0_-24px_60px_rgba(15,23,42,0.18)] transition-transform sm:max-w-xl sm:rounded-[28px] sm:border sm:pb-4 sm:pt-4",
                showSquadSheet ? "translate-y-0 sm:translate-y-0" : "translate-y-full sm:translate-y-6 sm:opacity-0"
              )}
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Squad</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">Add players to this match</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Drag directly to pitch or bench, or use quick actions.</p>
                </div>
                <Button onClick={() => setShowSquadSheet(false)} size="icon" type="button" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {availablePlayers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4 text-sm text-muted-foreground">
                    All squad players are already added to this match period.
                  </div>
                ) : (
                  availablePlayers.map((player) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/90 px-3 py-3"
                      key={player.id}
                    >
                      <DraggableSquadPlayer player={player} />
                      <div className="flex shrink-0 items-center gap-2">
                        <Button onClick={() => savePlayer(player.id, "bench")} size="sm" type="button" variant="outline">
                          To bench
                        </Button>
                        <Button
                          onClick={() =>
                            savePlayer(player.id, "pitch", getPitchCoordinates(lineupPlayers.length))
                          }
                          size="sm"
                          type="button"
                        >
                          To pitch
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {!presentationMode ? <DragOverlay>{activeDragPlayer ? <PlayerToken player={activeDragPlayer} variant="overlay" /> : null}</DragOverlay> : null}
    </DndContext>
  );
}

function PitchZone({
  lineupPlayers,
  movePitchPlayerToBench,
  pitchRef,
  presentationMode,
}: {
  lineupPlayers: Array<V2PeriodPlayer & { player: V2Player }>;
  movePitchPlayerToBench: (playerId: string) => void;
  pitchRef: React.RefObject<HTMLDivElement | null>;
  presentationMode: boolean;
}) {
  const pitchDrop = useDroppable({ id: "pitch-zone" });

  return (
    <div
      className={cn(
        "pitch relative min-h-[300px] flex-1 overflow-hidden rounded-[30px] border-4 border-white/70 shadow-soft sm:min-h-[520px]",
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

      {lineupPlayers.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
          <div className="max-w-sm rounded-[28px] border border-white/30 bg-white/12 px-6 py-5 text-white backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-white/75">Drag players here</p>
            <p className="mt-2 text-lg font-semibold">Build this period on the pitch</p>
          </div>
        </div>
      ) : null}

      {lineupPlayers.map((item) =>
        presentationMode ? (
          <StaticPitchPlayer item={item} key={item.playerId} />
        ) : (
          <DraggablePitchPlayer item={item} key={item.playerId} onMoveToBench={movePitchPlayerToBench} />
        )
      )}
    </div>
  );
}

function BenchZone({
  availablePlayersCount,
  benchPlayers,
  benchRef,
  moveBenchPlayerToPitch,
  onAddPlayers,
}: {
  availablePlayersCount: number;
  benchPlayers: V2Player[];
  benchRef: React.RefObject<HTMLDivElement | null>;
  moveBenchPlayerToPitch: (playerId: string) => void;
  onAddPlayers: () => void;
}) {
  const benchDrop = useDroppable({ id: "bench-zone" });

  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-border bg-[rgba(255,255,255,0.72)] p-3",
        benchDrop.isOver && "border-emerald-400 bg-emerald-50/90"
      )}
      ref={(node) => {
        benchDrop.setNodeRef(node);
        benchRef.current = node;
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Bench</h2>
          <p className="text-sm text-muted-foreground">Drag or tap players between bench and pitch.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onAddPlayers} size="sm" type="button">
            <Plus className="h-4 w-4" />
            Add players
          </Button>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{benchPlayers.length}</span>
        </div>
      </div>

      {availablePlayersCount > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {availablePlayersCount} squad {availablePlayersCount === 1 ? "player" : "players"} available to add
        </p>
      ) : null}

      <div className="mt-3 flex min-h-16 flex-wrap gap-2">
        {benchPlayers.length === 0 ? (
          <div className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 text-sm text-muted-foreground">
            Bench is empty
          </div>
        ) : (
          benchPlayers.map((player) => (
            <DraggableBenchPlayer key={player.id} onMoveToPitch={moveBenchPlayerToPitch} player={player} />
          ))
        )}
      </div>
    </div>
  );
}

function DraggablePitchPlayer({
  item,
  onMoveToBench,
}: {
  item: V2PeriodPlayer & { player: V2Player };
  onMoveToBench: (playerId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.playerId });

  return (
    <button
      {...attributes}
      {...listeners}
      className={cn("absolute touch-none select-none cursor-grab active:cursor-grabbing", isDragging && "z-50 opacity-0")}
      ref={setNodeRef}
      style={{
        left: `${item.x ?? 50}%`,
        top: `${item.y ?? 50}%`,
        transform: transform ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))` : "translate(-50%, -50%)",
      }}
      onClick={() => onMoveToBench(item.playerId)}
      type="button"
    >
      <PlayerToken player={item.player} />
    </button>
  );
}

function StaticPitchPlayer({ item }: { item: V2PeriodPlayer & { player: V2Player } }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${item.x ?? 50}%`,
        top: `${item.y ?? 50}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <PlayerToken player={item.player} />
    </div>
  );
}

function DraggableBenchPlayer({
  player,
  onMoveToPitch,
}: {
  player: V2Player;
  onMoveToPitch: (playerId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id });

  return (
    <button
      {...attributes}
      {...listeners}
      className={cn("touch-none select-none cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
      onClick={() => onMoveToPitch(player.id)}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      type="button"
    >
      <PlayerToken player={player} variant="bench" />
    </button>
  );
}

function DraggableSquadPlayer({ player }: { player: V2Player }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id });

  return (
    <div
      {...attributes}
      {...listeners}
      className={cn("flex min-w-0 items-center gap-3 touch-none select-none cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {player.shirtNumber}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{player.name}</p>
        <p className="text-xs text-muted-foreground">Drag to pitch or bench</p>
      </div>
    </div>
  );
}

function PlayerToken({
  player,
  variant = "pitch",
}: {
  player: V2Player;
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
