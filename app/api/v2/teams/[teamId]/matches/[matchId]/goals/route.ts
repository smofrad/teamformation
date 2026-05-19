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
    teamSide?: "home" | "away";
    scorerName?: string;
    minute?: number;
  } | null;

  const periodNumber = body?.periodNumber;
  const teamSide = body?.teamSide;
  const scorerName = body?.scorerName?.trim();
  const minute = body?.minute;

  if (
    ![1, 2, 3].includes(periodNumber ?? 0) ||
    !["home", "away"].includes(teamSide ?? "") ||
    !scorerName ||
    !Number.isInteger(minute) ||
    (minute ?? -1) < 0
  ) {
    return NextResponse.json({ error: "Period, team, scorer and minute are required." }, { status: 400 });
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

  const { error } = await supabase.from("match_goals").insert({
    match_id: matchId,
    team_id: teamId,
    period_number: periodNumber,
    team_side: teamSide,
    scorer_name: scorerName,
    minute,
    created_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: historyError } = await supabase.from("match_history").insert({
    match_id: matchId,
    team_id: teamId,
    user_id: user.id,
    action: "goal_added",
    payload: {
      periodNumber,
      teamSide,
      scorerName,
      minute,
    },
  });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
