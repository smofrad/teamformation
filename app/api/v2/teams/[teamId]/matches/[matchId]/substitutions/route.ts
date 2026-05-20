import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ teamId: string; matchId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, matchId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    periodNumber?: number;
    minute?: number;
    playerOutId?: string;
    playerInId?: string;
    note?: string;
  } | null;

  const periodNumber = body?.periodNumber;
  const minute = body?.minute;
  const playerOutId = body?.playerOutId?.trim();
  const playerInId = body?.playerInId?.trim();
  const note = body?.note?.trim() || null;

  if (
    ![1, 2, 3].includes(periodNumber ?? 0) ||
    !Number.isInteger(minute) ||
    (minute ?? -1) < 0 ||
    !playerOutId ||
    !playerInId
  ) {
    return NextResponse.json({ error: "Period, minute, player out and player in are required." }, { status: 400 });
  }

  if (playerOutId === playerInId) {
    return NextResponse.json({ error: "Player out and player in must be different." }, { status: 400 });
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, period_count")
    .eq("id", matchId)
    .eq("team_id", teamId)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: matchError?.message ?? "Match not found." }, { status: 404 });
  }

  if (periodNumber! > match.period_count) {
    return NextResponse.json({ error: "That period does not exist for this match." }, { status: 400 });
  }

  const { error } = await supabase.from("match_substitutions").insert({
    match_id: matchId,
    team_id: teamId,
    period_number: periodNumber,
    minute,
    player_out_id: playerOutId,
    player_in_id: playerInId,
    note,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
