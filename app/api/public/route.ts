import { NextResponse } from "next/server";

import { getPublicRoadmapItems } from "@/lib/roadmap";

export async function GET() {
  const items = await getPublicRoadmapItems();
  return NextResponse.json({ items });
}
