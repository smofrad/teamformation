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
  const body = (await request.json().catch(() => null)) as {
    opponent?: string;
    matchDate?: string;
    format?: number;
    periodCount?: number;
    sourceMatchId?: string;
  } | null;

  const opponent = body?.opponent?.trim();
  const matchDate = body?.matchDate?.trim();
  const format = body?.format;
  const periodCount = body?.periodCount;
  const sourceMatchId = body?.sourceMatchId?.trim();

  if (!opponent || !matchDate || ![7, 9, 11].includes(format ?? 0) || ![2, 3].includes(periodCount ?? 0)) {
    return NextResponse.json({ error: "Opponent, date, format and periods are required." }, { status: 400 });
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      team_id: teamId,
      opponent,
      match_date: matchDate,
      format,
      period_count: periodCount,
      active_period_number: 1,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: matchError?.message ?? "Unable to create match." }, { status: 400 });
  }

  const periodRows = Array.from({ length: periodCount }, (_, index) => ({
    match_id: match.id,
    period_number: index + 1,
    label: periodCount === 2 ? (index === 0 ? "1st half" : "2nd half") : `Period ${index + 1}`,
    is_customized: index === 0,
  }));

  const { error: periodsError } = await supabase.from("match_periods").insert(periodRows);

  if (periodsError) {
    return NextResponse.json({ error: periodsError.message }, { status: 400 });
  }

  if (sourceMatchId) {
    const { data: sourcePeriods, error: sourcePeriodsError } = await supabase
      .from("match_periods")
      .select(
        `
          period_number,
          label,
          is_customized,
          period_players (
            player_id,
            zone,
            x,
            y
          )
        `
      )
      .eq("match_id", sourceMatchId)
      .order("period_number", { ascending: true });

    if (sourcePeriodsError) {
      return NextResponse.json({ error: sourcePeriodsError.message }, { status: 400 });
    }

    const { data: newPeriods, error: newPeriodsError } = await supabase
      .from("match_periods")
      .select("id, period_number")
      .eq("match_id", match.id)
      .order("period_number", { ascending: true });

    if (newPeriodsError || !newPeriods) {
      return NextResponse.json({ error: newPeriodsError?.message ?? "Unable to load new match periods." }, { status: 400 });
    }

    const targetPeriodMap = new Map(newPeriods.map((period) => [period.period_number, period.id]));

    const periodUpdates = (sourcePeriods ?? [])
      .filter((period) => period.period_number <= periodCount)
      .map((period) => ({
        id: targetPeriodMap.get(period.period_number),
        label: period.label,
        is_customized: period.is_customized,
        updated_at: new Date().toISOString(),
      }))
      .filter((period): period is { id: string; label: string; is_customized: boolean; updated_at: string } => Boolean(period.id));

    if (periodUpdates.length > 0) {
      const { error: updatePeriodsError } = await supabase.from("match_periods").upsert(periodUpdates);

      if (updatePeriodsError) {
        return NextResponse.json({ error: updatePeriodsError.message }, { status: 400 });
      }
    }

    const periodPlayers = (sourcePeriods ?? []).flatMap((period) => {
      const targetPeriodId = targetPeriodMap.get(period.period_number);
      if (!targetPeriodId) return [];

      return (period.period_players ?? []).map((player) => ({
        match_period_id: targetPeriodId,
        player_id: player.player_id,
        zone: player.zone,
        x: player.x,
        y: player.y,
      }));
    });

    if (periodPlayers.length > 0) {
      const { error: insertPlayersError } = await supabase.from("period_players").insert(periodPlayers);

      if (insertPlayersError) {
        return NextResponse.json({ error: insertPlayersError.message }, { status: 400 });
      }
    }
  }

  const { error: historyError } = await supabase.from("match_history").insert({
    match_id: match.id,
    team_id: teamId,
    user_id: user.id,
    action: sourceMatchId ? "match_copied" : "match_created",
    payload: {
      opponent,
      matchDate,
      format,
      periodCount,
      sourceMatchId: sourceMatchId ?? null,
    },
  });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, matchId: match.id });
}
