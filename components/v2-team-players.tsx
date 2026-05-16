"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { V2Player } from "@/lib/supabase/v2";

export function V2TeamPlayers({
  players,
  teamId,
}: {
  players: V2Player[];
  teamId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/v2/teams/${teamId}/players`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, shirtNumber }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to add player.");
      return;
    }

    setName("");
    setShirtNumber("");
    startTransition(() => {
      router.refresh();
    });
  }

  async function removePlayer(playerId: string) {
    setError("");

    const response = await fetch(`/api/v2/teams/${teamId}/players/${playerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to remove player.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="surface p-6">
      <h2 className="text-xl font-semibold">Players</h2>
      <p className="mt-2 text-sm text-muted-foreground">Hantera spelartruppen för laget direkt i Supabase-baserade V2.</p>

      <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr),120px,auto]" onSubmit={handleSubmit}>
        <Input onChange={(event) => setName(event.target.value)} placeholder="Player name" value={name} />
        <Input inputMode="numeric" onChange={(event) => setShirtNumber(event.target.value)} placeholder="No." value={shirtNumber} />
        <Button disabled={isPending} type="submit">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {error ? <div className="mt-3 rounded-2xl border px-4 py-3 text-sm status-error">{error}</div> : null}

      <div className="mt-5 space-y-3">
        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            No players yet for this team.
          </div>
        ) : (
          players.map((player) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3" key={player.id}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">
                  {player.shirtNumber}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{player.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team player</p>
                </div>
              </div>

              <Button disabled={isPending} onClick={() => removePlayer(player.id)} size="icon" type="button" variant="ghost">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
