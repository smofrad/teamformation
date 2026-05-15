"use client";

import { useEffect, useState } from "react";
import { Layers3, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SavedView, RoadmapViewRecord } from "@/lib/types";

const FILTER_STORAGE_KEY = "roadmap-studio-saved-views";

export function SavedViewsClient({ dbViews }: { dbViews: RoadmapViewRecord[] }) {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    const stored = JSON.parse(window.localStorage.getItem(FILTER_STORAGE_KEY) ?? "[]");
    setViews(stored);
  }, []);

  function deleteView(id: string) {
    const nextViews = views.filter((view) => view.id !== id);
    setViews(nextViews);
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(nextViews));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Saved locally</CardTitle>
          <CardDescription>Views captured from the roadmap screen in this browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {views.length ? (
            views.map((view) => (
              <div key={view.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{view.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(view.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteView(view.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(view.filters).map(([key, value]) => (
                    <Badge key={key} variant="muted">
                      {key}: {Array.isArray(value) ? value.length : String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Save a filter set from the roadmap page to see it here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database presets</CardTitle>
          <CardDescription>Seeded examples from Prisma for public and internal slices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dbViews.map((view) => (
            <div key={view.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-secondary p-2">
                  <Layers3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{view.name}</p>
                  <p className="text-sm text-muted-foreground">{view.isPublic ? "Public preset" : "Internal preset"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(view.filters).map(([key, value]) => (
                  <Badge key={key} variant="outline">
                    {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
