import { SessionSelector } from "@/components/session-selector";
import { requireStaffAuth } from "@/lib/auth";
import { SESSION_OPTIONS } from "@/lib/sessions";

export default async function SelectSessionPage() {
  await requireStaffAuth();

  return <SessionSelector sessions={SESSION_OPTIONS} />;
}
