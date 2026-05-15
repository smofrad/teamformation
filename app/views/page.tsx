import { SavedViewsClient } from "@/components/saved-views-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDbViews } from "@/lib/roadmap";

export default async function ViewsPage() {
  const dbViews = await getDbViews();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved views</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Filter sets can be saved locally from the roadmap screen for fast demos, while seeded presets show how shared views could be modeled in the database.
        </CardContent>
      </Card>
      <SavedViewsClient dbViews={dbViews} />
    </div>
  );
}
