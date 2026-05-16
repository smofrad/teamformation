import { redirect } from "next/navigation";

import { V2LoginForm } from "@/components/v2-login-form";
import { getSupabaseUser } from "@/lib/supabase/auth";

export default async function V2LoginPage() {
  const user = await getSupabaseUser();

  if (user) {
    redirect("/v2");
  }

  return <V2LoginForm />;
}
