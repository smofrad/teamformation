import { NextResponse } from "next/server";

import { seedRoadmapData } from "@/prisma/seed";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await seedRoadmapData(prisma);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reset demo data" },
      { status: 500 }
    );
  }
}
