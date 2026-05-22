import { NextResponse } from "next/server";

import { requireSupabaseAdmin } from "@/lib/supabase/auth";
import { getV2AdminUsersData } from "@/lib/supabase/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  await requireSupabaseAdmin();

  const data = await getV2AdminUsersData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  await requireSupabaseAdmin();
  const serviceSupabase = createSupabaseServiceRoleClient();

  const body = (await request.json().catch(() => null)) as {
    displayName?: string;
    email?: string;
    password?: string;
    teamIds?: string[];
  } | null;

  const displayName = body?.displayName?.trim() || "";
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password?.trim();
  const teamIds = Array.isArray(body?.teamIds) ? body!.teamIds.filter(Boolean) : [];

  if (!displayName || !email || !password || teamIds.length === 0) {
    return NextResponse.json({ error: "Name, email, temporary password and at least one team are required." }, { status: 400 });
  }

  const { data: createdUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
    },
  });

  if (authError || !createdUser.user) {
    return NextResponse.json({ error: authError?.message ?? "Unable to create user." }, { status: 400 });
  }

  const userId = createdUser.user.id;

  const { error: profileError } = await serviceSupabase
    .from("profiles")
    .update({
      display_name: displayName,
      email,
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { error: membershipError } = await serviceSupabase.from("team_members").insert(
    teamIds.map((teamId) => ({
      team_id: teamId,
      user_id: userId,
    }))
  );

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId });
}
