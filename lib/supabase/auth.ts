import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireSupabaseUser() {
  const user = await getSupabaseUser();

  if (!user) {
    redirect("/v2/login");
  }

  return user;
}

export async function getSupabaseProfile() {
  const user = await requireSupabaseUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load profile.");
  }

  return data;
}

export async function requireSupabaseAdmin() {
  const profile = await getSupabaseProfile();

  if (!profile.is_admin) {
    redirect("/v2");
  }

  return profile;
}
