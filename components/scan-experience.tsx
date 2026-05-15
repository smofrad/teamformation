"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ManualCheckInForm } from "@/components/manual-checkin-form";
import { QrScannerPanel } from "@/components/qr-scanner-panel";
import { StaffToolbar } from "@/components/staff-toolbar";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { submitCheckIn } from "@/lib/checkins";
import { parseQrPayload } from "@/lib/qr";
import type { AttendeeInput, CheckInResult, SessionConfig } from "@/lib/types";

export function ScanExperience({
  session,
  staffName,
}: {
  session: SessionConfig;
  staffName: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { tone: "success"; title: string; detail: string }
    | { tone: "warning"; title: string; detail: string }
    | { tone: "error"; title: string; detail: string }
    | null
  >(null);
  const [lastName, setLastName] = useState("");

  const firebaseReady = useMemo(() => isFirebaseConfigured(), []);

  async function handleSave(attendee: AttendeeInput, source: "scan" | "manual") {
    setSubmitting(true);

    try {
      const result = await submitCheckIn({
        attendee,
        session,
        scannedBy: staffName || null,
        source,
      });

      applyResult(result);
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could not save check-in",
        detail: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function applyResult(result: CheckInResult) {
    if (result.status === "duplicate") {
      setLastName(result.existing.attendeeName);
      setStatus({
        tone: "warning",
        title: "Duplicate blocked",
        detail: `${result.existing.attendeeName} was already checked in to this session within the last 30 seconds.`,
      });
      return;
    }

    setLastName(result.record.attendeeName);
    setStatus({
      tone: "success",
      title: "Check-in saved",
      detail: `${result.record.attendeeName} is registered for ${result.record.sessionName}.`,
    });
  }

  async function handleDetected(payload: string) {
    const attendee = parseQrPayload(payload);
    await handleSave(attendee, "scan");
  }

  async function handleManualSubmit(attendee: AttendeeInput) {
    await handleSave(attendee, "manual");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <StaffToolbar
        subtitle="Keep the phone pointed at attendee QR codes. If a code does not scan, use the manual fallback form below."
        title="Scan attendees"
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Current session</p>
              <h2 className="text-2xl font-semibold tracking-tight">{session.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {session.room} · {session.description}
              </p>
            </div>
            <Link className="rounded-full border px-4 py-2 text-sm font-medium text-slate-700" href="/select-session">
              Change
            </Link>
          </div>

          {!firebaseReady ? (
            <div className="rounded-[28px] border px-4 py-4 text-sm status-error">
              Firebase is not configured yet. Add the `NEXT_PUBLIC_FIREBASE_*` values before scanning.
            </div>
          ) : (
            <QrScannerPanel
              onDetected={handleDetected}
              onError={(message) =>
                setStatus({
                  tone: "error",
                  title: "Scanner error",
                  detail: message,
                })
              }
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Live result</p>
            <div className="mt-3 rounded-[24px] border px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Latest attendee</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{lastName || "Waiting for a successful scan"}</p>
            </div>
            {status ? (
              <div
                className={`mt-4 rounded-[24px] border px-4 py-4 text-sm ${
                  status.tone === "success"
                    ? "status-success"
                    : status.tone === "warning"
                      ? "status-warning"
                      : "status-error"
                }`}
              >
                <p className="font-semibold">{status.title}</p>
                <p className="mt-1">{status.detail}</p>
              </div>
            ) : null}
            {staffName ? <p className="mt-4 text-xs text-slate-500">Scanned by: {staffName}</p> : null}
          </div>

          <div className="surface p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Manual fallback</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Enter attendee details</h3>
              <p className="mt-1 text-sm text-slate-600">Use this if the badge is damaged or the camera cannot read the QR code.</p>
            </div>

            <ManualCheckInForm loading={submitting || !firebaseReady} onSubmit={handleManualSubmit} />
          </div>
        </div>
      </section>
    </main>
  );
}
