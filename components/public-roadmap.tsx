"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoadmapItemRecord } from "@/lib/types";
import { AREA_OPTIONS, QUARTER_OPTIONS } from "@/lib/types";

export function PublicRoadmap({ items }: { items: RoadmapItemRecord[] }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-4 bg-slate-950 p-8 text-white md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Public roadmap</p>
            <h1 className="mt-2 text-4xl font-semibold">What the team is exploring, building, and shipping</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              This page is read-only and shows only items explicitly marked public in the studio.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Metric label="Public items" value={String(items.length)} />
            <Metric label="Areas covered" value={String(new Set(items.map((item) => item.area)).size)} />
            <Metric label="Themes" value={String(new Set(items.map((item) => item.theme).filter(Boolean)).size)} />
            <Metric label="Shipped" value={String(items.filter((item) => item.status === "Shipped").length)} />
          </div>
        </CardContent>
      </Card>

      {AREA_OPTIONS.map((area) => {
        const areaItems = items.filter((item) => item.area === area);
        if (!areaItems.length) return null;

        return (
          <Card key={area}>
            <CardHeader>
              <CardTitle>{area}</CardTitle>
              <CardDescription>{areaItems.length} public roadmap items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {QUARTER_OPTIONS.map((quarter) => {
                const quarterItems = areaItems.filter((item) => item.quarter === quarter);
                if (!quarterItems.length) return null;

                return (
                  <section key={quarter} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{quarter}</Badge>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {quarterItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.theme || "Roadmap item"}</p>
                            </div>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">{item.description || "More detail coming soon."}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="muted">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
