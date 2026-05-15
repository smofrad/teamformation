import { NextResponse } from "next/server";

import { createRoadmapItem, getRoadmapItems } from "@/lib/roadmap";

export async function GET() {
  const items = await getRoadmapItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await createRoadmapItem(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create item" },
      { status: 400 }
    );
  }
}
