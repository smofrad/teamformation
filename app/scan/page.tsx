import { redirect } from "next/navigation";

import { ScanExperience } from "@/components/scan-experience";
import { getStaffName, requireStaffAuth } from "@/lib/auth";
import { getSessionById } from "@/lib/sessions";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  await requireStaffAuth();

  const { session: sessionId } = await searchParams;
  const selectedSession = sessionId ? getSessionById(sessionId) : null;

  if (!selectedSession) {
    redirect("/select-session");
  }

  const staffName = await getStaffName();

  return <ScanExperience session={selectedSession} staffName={staffName} />;
}
