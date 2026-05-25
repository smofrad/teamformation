import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";

import { V2MatchEditor } from "@/components/v2-match-editor";
import { Button } from "@/components/ui/button";
import { getSupabaseProfile, requireSupabaseUser } from "@/lib/supabase/auth";
import { getV2MatchDetail } from "@/lib/supabase/v2";

export default async function V2MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; matchId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  await requireSupabaseUser();
  const profile = await getSupabaseProfile();
  const { teamId, matchId } = await params;
  const { view } = await searchParams;
  const match = await getV2MatchDetail(teamId, matchId);

  if (!match) {
    notFound();
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-2 py-2 sm:h-[100dvh] sm:overflow-hidden sm:px-3 sm:py-3">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2 sm:h-full sm:min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/v2/teams/${teamId}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to team
              </Link>
            </Button>
            {profile.is_admin ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/v2/admin/users">
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <V2MatchEditor initialPresentationMode={view === "presentation"} match={match} />
      </div>
    </main>
  );
}
