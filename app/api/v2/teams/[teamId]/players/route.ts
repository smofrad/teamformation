import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: string; shirtNumber?: string } | null;
  const name = body?.name?.trim();
  const shirtNumber = body?.shirtNumber?.trim();

  if (!name || !shirtNumber) {
    return NextResponse.json({ error: "Name and shirt number are required." }, { status: 400 });
  }

  const { error } = await supabase.from("players").insert({
    team_id: teamId,
    name,
    shirt_number: shirtNumber,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
