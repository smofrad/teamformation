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
  const body = (await request.json().catch(() => null)) as { activePeriodNumber?: number } | null;
  const activePeriodNumber = body?.activePeriodNumber;

  if (![1, 2, 3].includes(activePeriodNumber ?? 0)) {
    return NextResponse.json({ error: "Valid period is required." }, { status: 400 });
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

  if (activePeriodNumber! > match.period_count) {
    return NextResponse.json({ error: "This period does not exist for the match." }, { status: 400 });
  }

  const { error } = await supabase
    .from("matches")
    .update({
      active_period_number: activePeriodNumber,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("team_id", teamId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
