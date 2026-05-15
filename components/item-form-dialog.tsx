"use client";

import { useEffect, useState } from "react";

import {
  AREA_OPTIONS,
  CONFIDENCE_OPTIONS,
  EFFORT_OPTIONS,
  IMPACT_OPTIONS,
  QUARTER_OPTIONS,
  STATUS_OPTIONS,
  type RoadmapItemInput,
  type RoadmapItemRecord,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  item?: RoadmapItemRecord | null;
  items: RoadmapItemRecord[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: RoadmapItemInput) => Promise<void>;
};

const defaultState: RoadmapItemInput = {
  title: "",
  description: "",
  area: "Product",
  theme: "",
  quarter: "2026-Q1",
  startDate: "",
  endDate: "",
  status: "Idea",
  confidence: "Medium",
  impact: "Medium",
  effort: "M",
  owner: "",
  tags: [],
  dependencyIds: [],
  isPublic: false,
};

export function ItemFormDialog({ open, item, items, onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<RoadmapItemInput>(defaultState);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        description: item.description ?? "",
        area: item.area,
        theme: item.theme ?? "",
        quarter: item.quarter,
        startDate: item.startDate?.slice(0, 10) ?? "",
        endDate: item.endDate?.slice(0, 10) ?? "",
        status: item.status,
        confidence: item.confidence,
        impact: item.impact,
        effort: item.effort,
        owner: item.owner ?? "",
        tags: item.tags,
        dependencyIds: item.dependencies,
        isPublic: item.isPublic,
      });
      setTagInput(item.tags.join(", "));
      return;
    }

    setForm(defaultState);
    setTagInput("");
  }, [item, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit roadmap item" : "Create roadmap item"}</DialogTitle>
          <DialogDescription>
            Capture the outcome, timeline, owner, and visibility in one place.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              await onSubmit({
                ...form,
                tags: tagInput
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <SelectField label="Area" value={form.area} onChange={(value) => setForm((current) => ({ ...current, area: value }))} options={AREA_OPTIONS} />
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" value={form.theme} onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))} />
          </div>
          <SelectField label="Quarter" value={form.quarter} onChange={(value) => setForm((current) => ({ ...current, quarter: value }))} options={QUARTER_OPTIONS} />
          <SelectField label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={STATUS_OPTIONS} />
          <SelectField label="Confidence" value={form.confidence} onChange={(value) => setForm((current) => ({ ...current, confidence: value }))} options={CONFIDENCE_OPTIONS} />
          <SelectField label="Impact" value={form.impact} onChange={(value) => setForm((current) => ({ ...current, impact: value }))} options={IMPACT_OPTIONS} />
          <SelectField label="Effort" value={form.effort} onChange={(value) => setForm((current) => ({ ...current, effort: value }))} options={EFFORT_OPTIONS} />

          <div>
            <Label htmlFor="owner">Owner</Label>
            <Input id="owner" value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="AI, Launch, Security" />
          </div>

          <div>
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
          </div>
          <div>
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
          </div>

          <div className="md:col-span-2">
            <Label>Dependencies</Label>
            <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-border p-3">
              {items.filter((candidate) => candidate.id !== item?.id).map((candidate) => (
                <label key={candidate.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={form.dependencyIds?.includes(candidate.id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dependencyIds: event.target.checked
                          ? [...(current.dependencyIds ?? []), candidate.id]
                          : (current.dependencyIds ?? []).filter((id) => id !== candidate.id),
                      }))
                    }
                  />
                  <span>{candidate.title}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
            <Checkbox
              checked={Boolean(form.isPublic)}
              onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
            />
            Show this item on the public roadmap
          </label>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : item ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
