import { NextResponse } from "next/server";

import { requireSupabaseAdmin } from "@/lib/supabase/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  await requireSupabaseAdmin();
  const serviceSupabase = createSupabaseServiceRoleClient();
  const { userId } = await context.params;

  const body = (await request.json().catch(() => null)) as { teamIds?: string[] } | null;
  const teamIds = Array.isArray(body?.teamIds) ? [...new Set(body!.teamIds.filter(Boolean))] : [];

  const { error: deleteError } = await serviceSupabase.from("team_members").delete().eq("user_id", userId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (teamIds.length > 0) {
    const { error: insertError } = await serviceSupabase.from("team_members").insert(
      teamIds.map((teamId) => ({
        team_id: teamId,
        user_id: userId,
      }))
    );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
