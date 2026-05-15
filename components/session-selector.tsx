"use client";

import Link from "next/link";

import { StaffToolbar } from "@/components/staff-toolbar";
import type { SessionConfig } from "@/lib/types";

export function SessionSelector({ sessions }: { sessions: SessionConfig[] }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <StaffToolbar
        title="Choose session"
        subtitle="Start by selecting the room or session at the entrance. Staff can switch sessions at any time."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => (
          <Link
            className="surface flex min-h-52 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:border-emerald-200"
            href={`/scan?session=${session.id}`}
            key={session.id}
          >
            <div className="space-y-3">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                {session.room}
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{session.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{session.description}</p>
              </div>
            </div>

            <div className="mt-5 inline-flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Open scanner
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
