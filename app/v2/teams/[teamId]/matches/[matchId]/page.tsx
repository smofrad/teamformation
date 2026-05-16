import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { V2MatchEditor } from "@/components/v2-match-editor";
import { Button } from "@/components/ui/button";
import { requireSupabaseUser } from "@/lib/supabase/auth";
import { getV2MatchDetail } from "@/lib/supabase/v2";

export default async function V2MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; matchId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  await requireSupabaseUser();
  const { teamId, matchId } = await params;
  const { view } = await searchParams;
  const match = await getV2MatchDetail(teamId, matchId);

  if (!match) {
    notFound();
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button asChild size="sm" variant="outline">
            <Link href={`/v2/teams/${teamId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to team
            </Link>
          </Button>
        </div>

        <V2MatchEditor initialPresentationMode={view === "presentation"} match={match} />
      </div>
    </main>
  );
}
