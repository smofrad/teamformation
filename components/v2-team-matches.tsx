"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Copy, Eye, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { V2MatchSummary } from "@/lib/supabase/v2";

export function V2TeamMatches({
  matches,
  teamName,
  teamId,
}: {
  matches: V2MatchSummary[];
  teamName: string;
  teamId: string;
}) {
  const router = useRouter();
  const [createMode, setCreateMode] = useState<"blank" | "copy">("blank");
  const [homeTeam, setHomeTeam] = useState(teamName);
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [format, setFormat] = useState<7 | 9 | 11>(7);
  const [periodCount, setPeriodCount] = useState<2 | 3>(2);
  const [periodLengthMinutes, setPeriodLengthMinutes] = useState(20);
  const [sourceMatchId, setSourceMatchId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/v2/teams/${teamId}/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        homeTeam,
        awayTeam,
        matchDate,
        format,
        periodCount,
        periodLengthMinutes,
        sourceMatchId: createMode === "copy" ? sourceMatchId : undefined,
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string; matchId?: string } | null;

    if (!response.ok) {
      setError(data?.error ?? "Unable to create match.");
      return;
    }

    setHomeTeam(teamName);
    setAwayTeam("");
    setMatchDate("");
    setFormat(7);
    setPeriodCount(2);
    setPeriodLengthMinutes(20);
    setSourceMatchId("");
    setCreateMode("blank");
    startTransition(() => {
      if (data?.matchId) {
        router.push(`/v2/teams/${teamId}/matches/${data.matchId}`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="surface p-6">
      <h2 className="text-xl font-semibold">Matches</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create a blank match or copy a previous one with periods, players and positions intact.</p>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div className="flex overflow-hidden rounded-2xl border border-border bg-white">
          <button
            className={createMode === "blank" ? "bg-emerald-600 px-4 py-3 text-sm font-medium text-white" : "px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-secondary"}
            onClick={() => setCreateMode("blank")}
            type="button"
          >
            Blank match
          </button>
          <button
            className={createMode === "copy" ? "bg-emerald-600 px-4 py-3 text-sm font-medium text-white" : "px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-secondary"}
            onClick={() => setCreateMode("copy")}
            type="button"
          >
            Copy previous
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input onChange={(event) => setHomeTeam(event.target.value)} placeholder="Home team" value={homeTeam} />
          <Input onChange={(event) => setAwayTeam(event.target.value)} placeholder="Away team" value={awayTeam} />
        </div>
        <Input onChange={(event) => setMatchDate(event.target.value)} type="date" value={matchDate} />
        <div className="grid gap-3 sm:grid-cols-3">
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
            placeholder="Minutes / period"
            value={periodLengthMinutes}
          />
        </div>

        {createMode === "copy" ? (
          <select
            className="rounded-2xl border border-border bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
            onChange={(event) => {
              const nextSourceMatchId = event.target.value;
              setSourceMatchId(nextSourceMatchId);
              const sourceMatch = matches.find((match) => match.id === nextSourceMatchId);
              if (!sourceMatch) return;
              setHomeTeam(sourceMatch.homeTeam);
              setAwayTeam(sourceMatch.awayTeam);
              setFormat(sourceMatch.format);
              setPeriodCount(sourceMatch.periodCount);
              setPeriodLengthMinutes(sourceMatch.periodLengthMinutes);
            }}
            value={sourceMatchId}
          >
            <option value="">Choose a match to copy</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.homeTeam} vs {match.awayTeam} ({new Date(match.matchDate).toLocaleDateString("sv-SE")})
              </option>
            ))}
          </select>
        ) : null}

        <Button disabled={isPending || (createMode === "copy" && !sourceMatchId)} type="submit">
          {createMode === "copy" ? <Copy className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {createMode === "copy" ? "Copy match" : "Create match"}
        </Button>
      </form>

      {error ? <div className="mt-3 rounded-2xl border px-4 py-3 text-sm status-error">{error}</div> : null}

      <div className="mt-5 space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            No matches yet for this team.
          </div>
        ) : (
          matches.map((match) => (
            <article className="rounded-2xl border border-border bg-white/80 px-4 py-4" key={match.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">{match.format}-a-side</p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(match.matchDate).toLocaleDateString("sv-SE")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{match.periodCount} periods • {match.periodLengthMinutes} min</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {match.periodCount === 2 ? "2 periods" : "3 periods"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/v2/teams/${teamId}/matches/${match.id}`}>
                    Open match
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/v2/teams/${teamId}/matches/${match.id}?view=presentation`}>
                    <Eye className="h-4 w-4" />
                    Presentation
                  </Link>
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
