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
