import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { isStaffAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  const authenticated = await isStaffAuthenticated();

  if (authenticated) {
    redirect("/select-session");
  }

  return <LoginForm />;
}
