import { AdminDashboard } from "@/components/admin-dashboard";
import { requireStaffAuth } from "@/lib/auth";
import { SESSION_OPTIONS } from "@/lib/sessions";

export default async function AdminPage() {
  await requireStaffAuth();

  return <AdminDashboard sessions={SESSION_OPTIONS} />;
}
