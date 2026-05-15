"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { RoadmapItemRecord } from "@/lib/types";

type Props = {
  item: RoadmapItemRecord | null;
  allItems: RoadmapItemRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ItemDetailSheet({ item, allItems, open, onOpenChange }: Props) {
  const dependencyTitles = allItems.filter((candidate) => item?.dependencies.includes(candidate.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>{item.description || "No detailed description yet."}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <MetaCard label="Area" value={item.area} />
              <MetaCard label="Theme" value={item.theme || "No theme"} />
              <MetaCard label="Quarter" value={item.quarter} />
              <MetaCard label="Status" value={item.status} />
              <MetaCard label="Owner" value={item.owner || "Unassigned"} />
              <MetaCard label="Dates" value={`${formatDate(item.startDate)} - ${formatDate(item.endDate)}`} />
            </div>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Signals</p>
                  <div className="flex gap-2">
                    <Badge variant="muted">Confidence {item.confidence}</Badge>
                    <Badge variant="muted">Impact {item.impact}</Badge>
                    <Badge variant="muted">Effort {item.effort}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.tags.length ? item.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>) : <Badge variant="outline">No tags</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Dependencies</p>
                  <Badge variant="info">depends on {dependencyTitles.length}</Badge>
                </div>
                <div className="space-y-2">
                  {dependencyTitles.length ? (
                    dependencyTitles.map((dependency) => (
                      <div key={dependency.id} className="rounded-xl border border-border p-3 text-sm">
                        <p className="font-medium">{dependency.title}</p>
                        <p className="text-muted-foreground">{dependency.quarter} · {dependency.status}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No dependency links yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
