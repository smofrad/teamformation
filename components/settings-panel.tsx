"use client";

import { useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPanel() {
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleImport(file: File) {
    setImporting(true);
    const csv = await file.text();
    const response = await fetch("/api/items/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csv }),
    });
    const data = await response.json();
    setImporting(false);

    if (!response.ok) {
      toast.error(data.error ?? "CSV import failed");
      return;
    }

    toast.success(`Imported ${data.imported} roadmap items`);
  }

  async function resetDemoData() {
    setResetting(true);
    const response = await fetch("/api/reset", { method: "POST" });
    const data = await response.json();
    setResetting(false);

    if (!response.ok) {
      toast.error(data.error ?? "Reset failed");
      return;
    }

    toast.success("Demo data reset");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Import and export</CardTitle>
          <CardDescription>Use the provided CSV template so field mapping stays deterministic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="/api/items/export">
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/items/template">
                <Download className="h-4 w-4" />
                Download template
              </a>
            </Button>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" />
            {importing ? "Importing CSV..." : "Choose CSV to import"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
              }}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo controls</CardTitle>
          <CardDescription>Reset the database back to the seeded Proceedo Overall Prios 2026 baseline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
            The reset action clears roadmap items, dependencies, and views, then replays the Prisma seed mapped from the Proceedo
            “Overall prios 2026” sheet.
          </div>
          <Button variant="danger" onClick={resetDemoData} disabled={resetting}>
            <RotateCcw className="h-4 w-4" />
            {resetting ? "Resetting..." : "Reset demo data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
