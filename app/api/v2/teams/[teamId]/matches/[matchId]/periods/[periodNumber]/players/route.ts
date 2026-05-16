import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type PeriodRow = {
  id: string;
  period_number: number;
  is_customized: boolean;
  period_players: Array<{
    player_id: string;
    zone: "pitch" | "bench";
    x: number | null;
    y: number | null;
  }>;
};

function getEffectiveSnapshot(periods: PeriodRow[], periodNumber: number) {
  const current = periods.find((period) => period.period_number === periodNumber);

  if (!current) {
    return [];
  }

  if (current.is_customized || periodNumber === 1) {
    return current.period_players.map((item) => ({ ...item }));
  }

  return getEffectiveSnapshot(periods, periodNumber - 1);
}

async function ensureCustomizedPeriod({
  supabase,
  matchId,
  periodNumber,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  matchId: string;
  periodNumber: number;
}) {
  const { data: periods, error } = await supabase
    .from("match_periods")
    .select(
      `
        id,
        period_number,
        is_customized,
        period_players (
          player_id,
          zone,
          x,
          y
        )
      `
    )
    .eq("match_id", matchId)
    .order("period_number", { ascending: true });

  if (error || !periods) {
    throw new Error(error?.message ?? "Unable to load periods.");
  }

  const target = periods.find((period) => period.period_number === periodNumber);
  if (!target) {
    throw new Error("Period not found.");
  }

  if (target.is_customized || periodNumber === 1) {
    return target;
  }

  const snapshot = getEffectiveSnapshot(periods as PeriodRow[], periodNumber - 1);

  const { error: deleteError } = await supabase.from("period_players").delete().eq("match_period_id", target.id);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (snapshot.length > 0) {
    const { error: insertError } = await supabase.from("period_players").insert(
      snapshot.map((item) => ({
        match_period_id: target.id,
        player_id: item.player_id,
        zone: item.zone,
        x: item.x,
        y: item.y,
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: updateError } = await supabase
    .from("match_periods")
    .update({
      is_customized: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    ...target,
    is_customized: true,
    period_players: snapshot,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; matchId: string; periodNumber: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, matchId, periodNumber: periodNumberParam } = await context.params;
  const periodNumber = Number(periodNumberParam);
  const body = (await request.json().catch(() => null)) as {
    playerId?: string;
    zone?: "pitch" | "bench";
    x?: number;
    y?: number;
  } | null;

  if (!body?.playerId || !body.zone || !["pitch", "bench"].includes(body.zone)) {
    return NextResponse.json({ error: "Player and zone are required." }, { status: 400 });
  }

  try {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, format")
      .eq("id", matchId)
      .eq("team_id", teamId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: matchError?.message ?? "Match not found." }, { status: 404 });
    }

    const period = await ensureCustomizedPeriod({ supabase, matchId, periodNumber });
    const effectivePlayers = period.period_players ?? [];

    if (body.zone === "pitch") {
      const pitchCount = effectivePlayers.filter((item) => item.zone === "pitch" && item.player_id !== body.playerId).length;
      if (pitchCount >= match.format) {
        return NextResponse.json({ error: "Pitch is full for this format." }, { status: 400 });
      }
    }

    const { error: upsertError } = await supabase.from("period_players").upsert(
      {
        match_period_id: period.id,
        player_id: body.playerId,
        zone: body.zone,
        x: body.zone === "pitch" ? body.x ?? 50 : null,
        y: body.zone === "pitch" ? body.y ?? 72 : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_period_id,player_id" }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    await supabase.from("matches").update({ updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", matchId);
    await supabase.from("match_history").insert({
      match_id: matchId,
      team_id: teamId,
      user_id: user.id,
      action: body.zone === "pitch" ? "player_to_pitch" : "player_to_bench",
      payload: { playerId: body.playerId, periodNumber },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update period." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string; matchId: string; periodNumber: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, matchId, periodNumber: periodNumberParam } = await context.params;
  const periodNumber = Number(periodNumberParam);
  const body = (await request.json().catch(() => null)) as { playerId?: string } | null;

  if (!body?.playerId) {
    return NextResponse.json({ error: "Player is required." }, { status: 400 });
  }

  try {
    await ensureCustomizedPeriod({ supabase, matchId, periodNumber });

    const { data: period, error: periodError } = await supabase
      .from("match_periods")
      .select("id")
      .eq("match_id", matchId)
      .eq("period_number", periodNumber)
      .single();

    if (periodError || !period) {
      return NextResponse.json({ error: periodError?.message ?? "Period not found." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("period_players")
      .delete()
      .eq("match_period_id", period.id)
      .eq("player_id", body.playerId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await supabase.from("matches").update({ updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", matchId);
    await supabase.from("match_history").insert({
      match_id: matchId,
      team_id: teamId,
      user_id: user.id,
      action: "player_removed_from_period",
      payload: { playerId: body.playerId, periodNumber },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove player." },
      { status: 400 }
    );
  }
}
