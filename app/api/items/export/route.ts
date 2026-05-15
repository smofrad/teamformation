import { NextResponse } from "next/server";

import { exportItemsToCsv } from "@/lib/csv";
import { getRoadmapItems } from "@/lib/roadmap";

export async function GET() {
  const csv = exportItemsToCsv(await getRoadmapItems());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="roadmap-studio-export.csv"',
    },
  });
}
