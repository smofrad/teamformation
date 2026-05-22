"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { V2AdminTeamOption, V2AdminUser } from "@/lib/supabase/admin";

export function V2AdminUsers({
  teams,
  users,
}: {
  teams: V2AdminTeamOption[];
  users: V2AdminUser[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [editingTeamsByUser, setEditingTeamsByUser] = useState<Record<string, string[]>>(
    Object.fromEntries(users.map((user) => [user.id, user.teamIds]))
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleTeam(list: string[], teamId: string) {
    return list.includes(teamId) ? list.filter((id) => id !== teamId) : [...list, teamId];
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/v2/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email,
        password,
        teamIds: selectedTeamIds,
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "Unable to create user.");
      return;
    }

    setDisplayName("");
    setEmail("");
    setPassword("");
    setSelectedTeamIds([]);
    startTransition(() => router.refresh());
  }

  async function saveTeams(userId: string) {
    setError("");
    const response = await fetch(`/api/v2/admin/users/${userId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamIds: editingTeamsByUser[userId] ?? [],
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "Unable to update teams.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <section className="surface p-6">
        <h2 className="text-xl font-semibold">Create user</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a coach account with a temporary password and connect it to one or more teams.
        </p>

        <form className="mt-4 space-y-3" onSubmit={createUser}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" value={displayName} />
            <Input onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} />
            <Input onChange={(event) => setPassword(event.target.value)} placeholder="Temporary password" value={password} />
          </div>

          <div className="rounded-2xl border border-border bg-white/80 p-4">
            <p className="text-sm font-medium text-slate-900">Teams</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {teams.map((team) => {
                const checked = selectedTeamIds.includes(team.id);
                return (
                  <label className="flex items-center gap-3 rounded-2xl border border-border px-3 py-3" key={team.id}>
                    <input
                      checked={checked}
                      className="h-4 w-4"
                      onChange={() => setSelectedTeamIds((current) => toggleTeam(current, team.id))}
                      type="checkbox"
                    />
                    <span className="text-sm font-medium text-slate-900">{team.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button disabled={isPending} type="submit">
            <Plus className="h-4 w-4" />
            Create user
          </Button>
        </form>
      </section>

      {error ? <div className="rounded-2xl border px-4 py-3 text-sm status-error">{error}</div> : null}

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review users and update which teams they can access.</p>

        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <article className="rounded-2xl border border-border bg-white/80 p-4" key={user.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{user.displayName || "Unnamed user"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {user.isAdmin ? (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Admin</span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {teams.map((team) => {
                  const checked = (editingTeamsByUser[user.id] ?? []).includes(team.id);
                  return (
                    <label className="flex items-center gap-3 rounded-2xl border border-border px-3 py-3" key={team.id}>
                      <input
                        checked={checked}
                        className="h-4 w-4"
                        onChange={() =>
                          setEditingTeamsByUser((current) => ({
                            ...current,
                            [user.id]: toggleTeam(current[user.id] ?? [], team.id),
                          }))
                        }
                        type="checkbox"
                      />
                      <span className="text-sm font-medium text-slate-900">{team.name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4">
                <Button disabled={isPending} onClick={() => saveTeams(user.id)} type="button" variant="outline">
                  Save teams
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
