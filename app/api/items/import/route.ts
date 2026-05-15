import { NextResponse } from "next/server";

import { parseRoadmapCsv } from "@/lib/csv";
import { createRoadmapItem } from "@/lib/roadmap";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const csv = String(body.csv ?? "");
    const rows = parseRoadmapCsv(csv);

    const items = [];
    for (const row of rows) {
      items.push(await createRoadmapItem(row));
    }

    return NextResponse.json({ imported: items.length, items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import CSV" },
      { status: 400 }
    );
  }
}
