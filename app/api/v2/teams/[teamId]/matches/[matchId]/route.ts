import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ teamId: string; matchId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, matchId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    activePeriodNumber?: number;
    homeTeam?: string;
    awayTeam?: string;
    matchDate?: string;
    format?: number;
    periodCount?: number;
    periodLengthMinutes?: number;
    manualHomeScore?: number | null;
    manualAwayScore?: number | null;
  } | null;
  const activePeriodNumber = body?.activePeriodNumber;
  const homeTeam = body?.homeTeam?.trim();
  const awayTeam = body?.awayTeam?.trim();
  const matchDate = body?.matchDate?.trim();
  const format = body?.format;
  const periodCount = body?.periodCount;
  const periodLengthMinutes = body?.periodLengthMinutes;
  const manualHomeScore = body?.manualHomeScore;
  const manualAwayScore = body?.manualAwayScore;

  const isPeriodUpdate = activePeriodNumber !== undefined;
  const isInfoUpdate =
    homeTeam !== undefined ||
    awayTeam !== undefined ||
    matchDate !== undefined ||
    format !== undefined ||
    periodCount !== undefined ||
    periodLengthMinutes !== undefined ||
    manualHomeScore !== undefined ||
    manualAwayScore !== undefined;

  if (!isPeriodUpdate && !isInfoUpdate) {
    return NextResponse.json({ error: "No match update provided." }, { status: 400 });
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

  if (isPeriodUpdate && ![1, 2, 3].includes(activePeriodNumber ?? 0)) {
    return NextResponse.json({ error: "Valid period is required." }, { status: 400 });
  }

  if (isPeriodUpdate && activePeriodNumber! > match.period_count) {
    return NextResponse.json({ error: "This period does not exist for the match." }, { status: 400 });
  }

  if (isInfoUpdate) {
    if (!homeTeam || !awayTeam || !matchDate || ![7, 9, 11].includes(format ?? 0) || ![2, 3].includes(periodCount ?? 0)) {
      return NextResponse.json({ error: "Home team, away team, date, format and periods are required." }, { status: 400 });
    }

    if (!Number.isInteger(periodLengthMinutes) || (periodLengthMinutes ?? 0) < 1) {
      return NextResponse.json({ error: "Valid period length is required." }, { status: 400 });
    }

    if (
      (manualHomeScore !== null && manualHomeScore !== undefined && (!Number.isInteger(manualHomeScore) || manualHomeScore < 0)) ||
      (manualAwayScore !== null && manualAwayScore !== undefined && (!Number.isInteger(manualAwayScore) || manualAwayScore < 0))
    ) {
      return NextResponse.json({ error: "Manual result must use whole numbers." }, { status: 400 });
    }
  }

  const nextActivePeriodNumber = isPeriodUpdate ? activePeriodNumber : Math.min(match.period_count, periodCount ?? match.period_count);
  const { error } = await supabase
    .from("matches")
    .update({
      ...(isInfoUpdate
        ? {
            opponent: awayTeam,
            home_team: homeTeam,
            away_team: awayTeam,
            match_date: matchDate,
            format,
            period_count: periodCount,
            period_length_minutes: periodLengthMinutes,
            ...(manualHomeScore !== undefined ? { manual_home_score: manualHomeScore } : {}),
            ...(manualAwayScore !== undefined ? { manual_away_score: manualAwayScore } : {}),
          }
        : {}),
      active_period_number: nextActivePeriodNumber,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("team_id", teamId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isInfoUpdate && periodCount !== match.period_count) {
    const targetLabels = Array.from({ length: periodCount! }, (_, index) => ({
      match_id: matchId,
      period_number: index + 1,
      label: periodCount === 2 ? (index === 0 ? "1st half" : "2nd half") : `Period ${index + 1}`,
      is_customized: index === 0,
    }));

    const { data: existingPeriods, error: existingPeriodsError } = await supabase
      .from("match_periods")
      .select("id, period_number")
      .eq("match_id", matchId);

    if (existingPeriodsError) {
      return NextResponse.json({ error: existingPeriodsError.message }, { status: 400 });
    }

    const existingPeriodNumbers = new Set((existingPeriods ?? []).map((period) => period.period_number));
    const periodsToInsert = targetLabels.filter((period) => !existingPeriodNumbers.has(period.period_number));
    const periodsToDelete = (existingPeriods ?? [])
      .filter((period) => period.period_number > periodCount!)
      .map((period) => period.id);

    if (periodsToInsert.length > 0) {
      const { error: insertPeriodsError } = await supabase.from("match_periods").insert(periodsToInsert);
      if (insertPeriodsError) {
        return NextResponse.json({ error: insertPeriodsError.message }, { status: 400 });
      }
    }

    if (periodsToDelete.length > 0) {
      const { error: deletePeriodsError } = await supabase.from("match_periods").delete().in("id", periodsToDelete);
      if (deletePeriodsError) {
        return NextResponse.json({ error: deletePeriodsError.message }, { status: 400 });
      }
    }
  }

  if (isInfoUpdate) {
    const { error: historyError } = await supabase.from("match_history").insert({
      match_id: matchId,
      team_id: teamId,
      user_id: user.id,
      action: "match_info_updated",
      payload: {
        homeTeam,
        awayTeam,
        matchDate,
        format,
        periodCount,
        periodLengthMinutes,
        manualHomeScore,
        manualAwayScore,
      },
    });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
