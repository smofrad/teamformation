"use client";

import { useEffect, useMemo, useState } from "react";

import { StaffToolbar } from "@/components/staff-toolbar";
import { buildCheckInCsv, downloadCsv } from "@/lib/csv";
import { fetchCheckIns } from "@/lib/checkins";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type { CheckInRecord, SessionConfig } from "@/lib/types";

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminDashboard({ sessions }: { sessions: SessionConfig[] }) {
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const firebaseReady = useMemo(() => isFirebaseConfigured(), []);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    let active = true;

    fetchCheckIns()
      .then((result) => {
        if (!active) {
          return;
        }

        setRecords(result);
        setError("");
      })
      .catch((fetchError) => {
        if (!active) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Could not load check-ins.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [firebaseReady]);

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return records.filter((record) => {
      const sessionMatch = selectedSession === "all" || record.sessionId === selectedSession;
      const searchMatch =
        !searchTerm ||
        record.attendeeName.toLowerCase().includes(searchTerm) ||
        record.attendeeEmail.toLowerCase().includes(searchTerm);

      return sessionMatch && searchMatch;
    });
  }, [records, search, selectedSession]);

  const totalsBySession = useMemo(() => {
    return sessions.map((session) => ({
      sessionId: session.id,
      sessionName: session.name,
      total: records.filter((record) => record.sessionId === session.id).length,
    }));
  }, [records, sessions]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <StaffToolbar
        subtitle="Review all saved check-ins, filter by session, and export CSV for reporting or reconciliation."
        showAdmin={false}
        title="Admin overview"
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="surface p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2 sm:col-span-1">
              <span className="text-sm font-medium text-slate-700">Session</span>
              <select
                className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setSelectedSession(event.target.value)}
                value={selectedSession}
              >
                <option value="all">All sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Search</span>
              <input
                className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by attendee name or email"
                value={search}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!filteredRecords.length}
              onClick={() => downloadCsv("conference-checkins.csv", buildCheckInCsv(filteredRecords))}
              type="button"
            >
              Export CSV
            </button>
            <a className="rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700" href="/select-session">
              Back to session selection
            </a>
          </div>

          {!firebaseReady ? (
            <div className="mt-4 rounded-[24px] border px-4 py-4 text-sm status-error">
              Firebase is not configured yet. Add the `NEXT_PUBLIC_FIREBASE_*` values before using the admin view.
            </div>
          ) : null}
          {error ? <div className="mt-4 rounded-[24px] border px-4 py-4 text-sm status-error">{error}</div> : null}
        </div>

        <div className="surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Totals by session</p>
          <div className="mt-4 space-y-3">
            {totalsBySession.map((item) => (
              <div className="flex items-center justify-between rounded-[22px] border bg-white px-4 py-3" key={item.sessionId}>
                <div>
                  <p className="font-semibold text-slate-900">{item.sessionName}</p>
                  <p className="text-sm text-slate-500">Saved check-ins</p>
                </div>
                <div className="text-2xl font-semibold tracking-tight text-emerald-700">{item.total}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Attendee</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Staff</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Loading check-ins...
                  </td>
                </tr>
              ) : filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <tr className="border-t border-slate-200" key={record.id}>
                    <td className="px-4 py-4 align-top">
                      <div>
                        <p className="font-semibold text-slate-900">{record.attendeeName}</p>
                        <p className="text-slate-500">{record.attendeeTitle || "No title"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{record.attendeeEmail}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{record.sessionName}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatTimestamp(record.timestamp)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{record.source}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{record.scannedBy || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    No check-ins match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
