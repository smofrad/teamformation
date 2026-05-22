import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { V2AdminUsers } from "@/components/v2-admin-users";
import { Button } from "@/components/ui/button";
import { requireSupabaseAdmin } from "@/lib/supabase/auth";
import { getV2AdminUsersData } from "@/lib/supabase/admin";

export default async function V2AdminUsersPage() {
  await requireSupabaseAdmin();
  const data = await getV2AdminUsersData();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/v2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <section className="surface p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">User management</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Create coach accounts with temporary passwords and decide which teams they can access.
          </p>
        </section>

        <V2AdminUsers teams={data.teams} users={data.users} />
      </div>
    </main>
  );
}
