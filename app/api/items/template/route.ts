import { NextResponse } from "next/server";

import { roadmapTemplateCsv } from "@/lib/csv";

export async function GET() {
  return new NextResponse(roadmapTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="roadmap-studio-template.csv"',
    },
  });
}
