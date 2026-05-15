"use client";

import { FormEvent, useState } from "react";

import type { AttendeeInput } from "@/lib/types";

export function ManualCheckInForm({
  onSubmit,
  loading,
}: {
  onSubmit: (attendee: AttendeeInput) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ name, title, email });
    setName("");
    setTitle("");
    setEmail("");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setName(event.target.value)}
            placeholder="Anna Svensson"
            required
            value={name}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="CFO"
            value={title}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="anna@company.se"
            required
            type="email"
            value={email}
          />
        </label>
      </div>

      <button
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? "Saving..." : "Save manual check-in"}
      </button>
    </form>
  );
}
