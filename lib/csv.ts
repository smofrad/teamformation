import type { CheckInRecord } from "@/lib/types";

function escapeCsvValue(value: string) {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function buildCheckInCsv(records: CheckInRecord[]) {
  const header = [
    "attendeeName",
    "attendeeTitle",
    "attendeeEmail",
    "sessionName",
    "sessionId",
    "timestamp",
    "scannedBy",
    "source",
  ];

  const rows = records.map((record) =>
    [
      record.attendeeName,
      record.attendeeTitle,
      record.attendeeEmail,
      record.sessionName,
      record.sessionId,
      record.timestamp.toISOString(),
      record.scannedBy ?? "",
      record.source,
    ]
      .map((value) => escapeCsvValue(value))
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function exportItemsToCsv(..._args: unknown[]) {
  return "";
}

export function parseRoadmapCsv(..._args: unknown[]) {
  return [];
}

export function roadmapTemplateCsv() {
  return "";
}
