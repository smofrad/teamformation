"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { CalendarDays, ChevronDown, ChevronUp, Eye, EyeOff, History, Info, UserPlus, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const [activePeriodNumber, setActivePeriodNumber] = useState(match.activePeriodNumber);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(initialPresentationMode);
  const [showMatchInfo, setShowMatchInfo] = useState(false);
  const [showControlsSheet, setShowControlsSheet] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const activePeriod = useMemo(
    () => getEffectivePeriod(match.periods, activePeriodNumber),
    [activePeriodNumber, match.periods]
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

  async function refresh() {
    startTransition(() => {
      router.refresh();
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
      return;
    }

    await refresh();
  }

  async function savePlayer(playerId: string, zone: "pitch" | "bench", coordinates?: { x: number; y: number }) {
    setError("");

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
      return;
    }

    await refresh();
  }

  async function removePlayer(playerId: string) {
    setError("");
    const response = await fetch(
      `/api/v2/teams/${match.teamId}/matches/${match.id}/periods/${activePeriodNumber}/players`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      }
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to remove player.");
      return;
    }

    await refresh();
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

    if (!overId) return;

    const overBench = overId === "bench-zone" || benchPlayerIds.has(overId);
    const overPitch = overId === "pitch-zone" || lineupPlayerIds.has(overId);

    if (overBench) {
      await savePlayer(playerId, "bench");
      return;
    }

    if (overPitch) {
      const rect = pitchRef.current?.getBoundingClientRect();
      const translatedRect = event.active.rect.current.translated;
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
      <section className="surface flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">{match.teamName}</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{match.opponent}</h1>
            <div className="mt-1 hidden flex-wrap items-center gap-2 text-xs text-muted-foreground sm:flex sm:text-sm">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(match.matchDate).toLocaleDateString("sv-SE")}
              </span>
              <span>{formatLabel(match.format)}</span>
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
          </div>
        ) : null}

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
                {period.label}
              </button>
            ))}
          </div>

          <Button className="shrink-0" onClick={() => setPresentationMode((current) => !current)} size="sm" variant={presentationMode ? "default" : "outline"}>
            {presentationMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{presentationMode ? "Exit presentation" : "Presentation"}</span>
          </Button>
        </div>

        {error ? <div className="mt-2 rounded-2xl border px-4 py-3 text-sm status-error">{error}</div> : null}

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
          <PitchZone lineupPlayers={lineupPlayers} pitchRef={pitchRef} presentationMode={presentationMode} />

          {!presentationMode ? (
            <>
              <div className="sm:hidden">
                <button
                  className="flex w-full items-center justify-between rounded-[22px] border border-border bg-white/90 px-4 py-3 text-left shadow-sm"
                  onClick={() => setShowControlsSheet((current) => !current)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-slate-900 p-2 text-white">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Bench and controls</p>
                      <p className="text-xs text-muted-foreground">
                        {benchPlayers.length} on bench, {availablePlayers.length} available
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition", showControlsSheet && "rotate-180")} />
                </button>
              </div>

              <div className="hidden sm:block">
                <BenchZone benchPlayers={benchPlayers} />
              </div>
            </>
          ) : null}

          {!presentationMode ? (
            <>
              <div className="hidden gap-2 lg:grid-cols-[1.2fr_1fr] sm:grid">
                <section className="rounded-[24px] bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-700" />
                    <h2 className="font-semibold text-emerald-950">Add players to this period</h2>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availablePlayers.length === 0 ? (
                      <p className="text-sm text-emerald-900/70">All squad players are already included in this period.</p>
                    ) : (
                      availablePlayers.map((player) => (
                        <button
                          className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-950"
                          key={player.id}
                          onClick={() => savePlayer(player.id, "bench")}
                          type="button"
                        >
                          #{player.shirtNumber} {player.name}
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-100 p-3">
                  <h2 className="font-semibold text-slate-950">Remove from this period</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...lineupPlayers.map((item) => item.player), ...benchPlayers].length === 0 ? (
                      <p className="text-sm text-slate-600">No players selected for this period yet.</p>
                    ) : (
                      [...lineupPlayers.map((item) => item.player), ...benchPlayers].map((player) => (
                        <button
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                          key={player.id}
                          onClick={() => removePlayer(player.id)}
                          type="button"
                        >
                          #{player.shirtNumber} {player.name}
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <section className="rounded-[24px] border border-border bg-white/85 p-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-700" />
                  <h2 className="font-semibold">Recent history</h2>
                </div>
                <div className="mt-3 space-y-2">
                  {match.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No history yet.</p>
                  ) : (
                    match.history.map((item) => (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2" key={item.id}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{humanizeHistoryAction(item.action)}</p>
                          <p className="text-xs text-muted-foreground">{item.userDisplayName || "A coach"}</p>
                        </div>
                        <p className={cn("text-xs text-muted-foreground", isPending && "opacity-60")}>
                          {new Date(item.createdAt).toLocaleString("sv-SE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>

        {!presentationMode ? (
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-40 sm:hidden",
              showControlsSheet ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 bg-slate-950/25 transition-opacity",
                showControlsSheet ? "opacity-100" : "opacity-0"
              )}
              onClick={() => setShowControlsSheet(false)}
            />
            <div
              className={cn(
                "relative max-h-[58dvh] overflow-y-auto rounded-t-[28px] border-t border-border bg-[rgba(250,248,242,0.98)] px-3 pb-5 pt-3 shadow-[0_-24px_60px_rgba(15,23,42,0.18)] transition-transform",
                showControlsSheet ? "translate-y-0" : "translate-y-full"
              )}
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300" />
              <BenchZone benchPlayers={benchPlayers} />
              <div className="mt-2 grid gap-2">
                <section className="rounded-[24px] bg-emerald-50 p-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-700" />
                    <h2 className="font-semibold text-emerald-950">Add players to this period</h2>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availablePlayers.length === 0 ? (
                      <p className="text-sm text-emerald-900/70">All squad players are already included in this period.</p>
                    ) : (
                      availablePlayers.map((player) => (
                        <button
                          className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-950"
                          key={player.id}
                          onClick={() => savePlayer(player.id, "bench")}
                          type="button"
                        >
                          #{player.shirtNumber} {player.name}
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] bg-slate-100 p-3">
                  <h2 className="font-semibold text-slate-950">Remove from this period</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...lineupPlayers.map((item) => item.player), ...benchPlayers].length === 0 ? (
                      <p className="text-sm text-slate-600">No players selected for this period yet.</p>
                    ) : (
                      [...lineupPlayers.map((item) => item.player), ...benchPlayers].map((player) => (
                        <button
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"
                          key={player.id}
                          onClick={() => removePlayer(player.id)}
                          type="button"
                        >
                          #{player.shirtNumber} {player.name}
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-border bg-white/85 p-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-700" />
                    <h2 className="font-semibold">Recent history</h2>
                  </div>
                  <div className="mt-3 space-y-2">
                    {match.history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No history yet.</p>
                    ) : (
                      match.history.map((item) => (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2" key={item.id}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{humanizeHistoryAction(item.action)}</p>
                            <p className="text-xs text-muted-foreground">{item.userDisplayName || "A coach"}</p>
                          </div>
                          <p className={cn("text-xs text-muted-foreground", isPending && "opacity-60")}>
                            {new Date(item.createdAt).toLocaleString("sv-SE", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
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
  pitchRef,
  presentationMode,
}: {
  lineupPlayers: Array<V2PeriodPlayer & { player: V2Player }>;
  pitchRef: React.RefObject<HTMLDivElement | null>;
  presentationMode: boolean;
}) {
  const pitchDrop = useDroppable({ id: "pitch-zone" });

  return (
    <div
      className={cn(
        "pitch relative min-h-[420px] flex-1 overflow-hidden rounded-[30px] border-4 border-white/70 shadow-soft sm:min-h-[520px]",
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
        presentationMode ? <StaticPitchPlayer item={item} key={item.playerId} /> : <DraggablePitchPlayer item={item} key={item.playerId} />
      )}
    </div>
  );
}

function BenchZone({ benchPlayers }: { benchPlayers: V2Player[] }) {
  const benchDrop = useDroppable({ id: "bench-zone" });

  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-border bg-[rgba(255,255,255,0.72)] p-3",
        benchDrop.isOver && "border-emerald-400 bg-emerald-50/90"
      )}
      ref={benchDrop.setNodeRef}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Bench</h2>
          <p className="text-sm text-muted-foreground">Drag players between bench and pitch.</p>
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
  );
}

function DraggablePitchPlayer({ item }: { item: V2PeriodPlayer & { player: V2Player } }) {
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

function DraggableBenchPlayer({ player }: { player: V2Player }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id });

  return (
    <button
      {...attributes}
      {...listeners}
      className={cn("touch-none select-none cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
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

function humanizeHistoryAction(action: string) {
  switch (action) {
    case "match_created":
      return "Match created";
    case "player_to_pitch":
      return "Player moved to pitch";
    case "player_to_bench":
      return "Player moved to bench";
    case "player_removed_from_period":
      return "Player removed from period";
    default:
      return action.replaceAll("_", " ");
  }
}
