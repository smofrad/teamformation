import type { AttendeeInput } from "@/lib/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedMap = Record<string, string>;

function normalizeField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapToAttendee(input: ParsedMap): AttendeeInput {
  return {
    name: normalizeField(input.name),
    title: normalizeField(input.title),
    email: normalizeField(input.email),
  };
}

function parseJsonPayload(payload: string) {
  const raw = JSON.parse(payload) as Record<string, unknown>;

  return mapToAttendee({
    name: normalizeField(raw.name),
    title: normalizeField(raw.title),
    email: normalizeField(raw.email),
  });
}

function parseKeyValuePayload(payload: string) {
  const values = payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<ParsedMap>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      accumulator[key] = value;
      return accumulator;
    }, {});

  return mapToAttendee(values);
}

export function validateAttendee(attendee: AttendeeInput) {
  if (!attendee.name.trim()) {
    throw new Error("Attendee name is required.");
  }

  if (!attendee.email.trim()) {
    throw new Error("Attendee email is required.");
  }

  if (!EMAIL_REGEX.test(normalizeEmail(attendee.email))) {
    throw new Error("Attendee email is not valid.");
  }

  return {
    ...attendee,
    name: attendee.name.trim(),
    title: attendee.title.trim(),
    email: normalizeEmail(attendee.email),
  };
}

export function parseQrPayload(payload: string) {
  const trimmedPayload = payload.trim();

  if (!trimmedPayload) {
    throw new Error("QR code was empty.");
  }

  const attendee = trimmedPayload.startsWith("{")
    ? parseJsonPayload(trimmedPayload)
    : parseKeyValuePayload(trimmedPayload);

  return validateAttendee(attendee);
}
