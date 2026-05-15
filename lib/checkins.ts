"use client";

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase/client";
import { validateAttendee } from "@/lib/qr";
import type { CheckInRecord, CheckInResult, CheckInSubmission } from "@/lib/types";

const DUPLICATE_WINDOW_MS = 30_000;

function normalizeEmailKey(email: string) {
  return email.trim().toLowerCase();
}

function mapCheckInRecord(id: string, data: Record<string, unknown>): CheckInRecord {
  const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();

  return {
    id,
    attendeeName: String(data.attendeeName ?? ""),
    attendeeTitle: String(data.attendeeTitle ?? ""),
    attendeeEmail: String(data.attendeeEmail ?? ""),
    emailKey: String(data.emailKey ?? ""),
    sessionId: String(data.sessionId ?? ""),
    sessionName: String(data.sessionName ?? ""),
    timestamp,
    scannedBy: data.scannedBy ? String(data.scannedBy) : null,
    source: data.source === "manual" ? "manual" : "scan",
  };
}

export async function submitCheckIn({ attendee, session, scannedBy, source }: CheckInSubmission): Promise<CheckInResult> {
  const db = getDb();
  const validatedAttendee = validateAttendee(attendee);
  const emailKey = normalizeEmailKey(validatedAttendee.email);
  const now = new Date();
  const nowTimestamp = Timestamp.fromDate(now);
  const lockRef = doc(db, "checkinLocks", `${session.id}__${emailKey}`);
  const checkInRef = doc(collection(db, "checkins"));

  return runTransaction(db, async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    const existingTimestamp = lockSnapshot.data()?.lastCheckInAt;
    const previousCheckInAt = existingTimestamp instanceof Timestamp ? existingTimestamp.toDate() : null;

    if (previousCheckInAt && now.getTime() - previousCheckInAt.getTime() < DUPLICATE_WINDOW_MS) {
      return {
        status: "duplicate",
        existing: {
          attendeeName: validatedAttendee.name,
          timestamp: previousCheckInAt,
        },
      } satisfies CheckInResult;
    }

    const record = {
      attendeeName: validatedAttendee.name,
      attendeeTitle: validatedAttendee.title,
      attendeeEmail: validatedAttendee.email,
      emailKey,
      sessionId: session.id,
      sessionName: session.name,
      timestamp: nowTimestamp,
      scannedBy: scannedBy?.trim() || null,
      source,
    };

    transaction.set(checkInRef, record);
    transaction.set(lockRef, {
      attendeeEmail: validatedAttendee.email,
      attendeeName: validatedAttendee.name,
      sessionId: session.id,
      sessionName: session.name,
      lastCheckInAt: nowTimestamp,
    });

    return {
      status: "success",
      record: mapCheckInRecord(checkInRef.id, record),
    } satisfies CheckInResult;
  });
}

export async function fetchCheckIns() {
  const db = getDb();
  const snapshot = await getDocs(query(collection(db, "checkins"), orderBy("timestamp", "desc")));

  return snapshot.docs.map((documentSnapshot) =>
    mapCheckInRecord(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>),
  );
}
