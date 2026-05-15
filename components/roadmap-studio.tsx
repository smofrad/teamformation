"use client";

import { Fragment, startTransition, useDeferredValue, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { CalendarRange, Eye, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ItemDetailSheet } from "@/components/item-detail-sheet";
import { ItemFormDialog } from "@/components/item-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AREA_OPTIONS,
  QUARTER_OPTIONS,
  STATUS_OPTIONS,
  type RoadmapFilters,
  type RoadmapItemInput,
  type RoadmapItemRecord,
} from "@/lib/types";
import { cn, quarterSortValue, uniqueValues } from "@/lib/utils";

const FILTER_STORAGE_KEY = "roadmap-studio-saved-views";

const emptyFilters: RoadmapFilters = {
  search: "",
  areas: [],
  statuses: [],
  quarters: [],
  tags: [],
  owners: [],
  publicOnly: false,
};

export function RoadmapStudio({ initialItems }: { initialItems: RoadmapItemRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<RoadmapFilters>(emptyFilters);
  const [activeTab, setActiveTab] = useState("timeline");
  const [editingItem, setEditingItem] = useState<RoadmapItemRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RoadmapItemRecord | null>(null);
  const [sortBy, setSortBy] = useState<"quarter" | "title" | "owner">("quarter");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(filters.search);

  async function refreshItems() {
    const response = await fetch("/api/items");
    const data = await response.json();
    setItems(data.items);
  }

  async function saveItem(payload: RoadmapItemInput) {
    const endpoint = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
    const method = editingItem ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Could not save item");
      return;
    }

    setDialogOpen(false);
    setEditingItem(null);
    toast.success(editingItem ? "Roadmap item updated" : "Roadmap item created");
    await refreshItems();
  }

  async function quickUpdate(id: string, patch: Partial<RoadmapItemInput>) {
    const response = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Could not update item");
      return { ok: false as const };
    }

    startTransition(() => {
      setItems((current) => current.map((item) => (item.id === id ? data.item : item)));
    });
    return { ok: true as const, item: data.item as RoadmapItemRecord };
  }

  async function moveItem(id: string, patch: Partial<RoadmapItemInput>, successMessage: string) {
    const existingItem = items.find((item) => item.id === id);
    if (!existingItem) return;

    const hasChanges = Object.entries(patch).some(([key, value]) => existingItem[key as keyof RoadmapItemRecord] !== value);
    if (!hasChanges) return;

    startTransition(() => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                ...patch,
              }
            : item
        )
      );
    });

    const result = await quickUpdate(id, patch);
    if (!result?.ok) {
      startTransition(() => {
        setItems((current) => current.map((item) => (item.id === id ? existingItem : item)));
      });
      return;
    }

    toast.success(successMessage);
  }

  async function deleteItem(id: string) {
    const confirmed = window.confirm("Delete this roadmap item?");
    if (!confirmed) return;

    const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete item");
      return;
    }

    toast.success("Roadmap item deleted");
    await refreshItems();
  }

  function saveCurrentView() {
    const name = window.prompt("Name this view");
    if (!name) return;

    const existing = JSON.parse(window.localStorage.getItem(FILTER_STORAGE_KEY) ?? "[]");
    existing.unshift({
      id: crypto.randomUUID(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    });
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(existing));
    toast.success("View saved locally");
  }

  const filteredItems = items
    .filter((item) => {
      const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
      const matchesSearch = !deferredSearch || haystack.includes(deferredSearch.toLowerCase());
      const matchesArea = !filters.areas.length || filters.areas.includes(item.area);
      const matchesStatus = !filters.statuses.length || filters.statuses.includes(item.status);
      const matchesQuarter = !filters.quarters.length || filters.quarters.includes(item.quarter);
      const matchesOwner = !filters.owners.length || filters.owners.includes(item.owner ?? "");
      const matchesTags = !filters.tags.length || filters.tags.some((tag) => item.tags.includes(tag));
      const matchesPublic = !filters.publicOnly || item.isPublic;
      return matchesSearch && matchesArea && matchesStatus && matchesQuarter && matchesOwner && matchesTags && matchesPublic;
    })
    .sort((left, right) => {
      if (sortBy === "title") return left.title.localeCompare(right.title);
      if (sortBy === "owner") return (left.owner ?? "").localeCompare(right.owner ?? "");
      return quarterSortValue(left.quarter) - quarterSortValue(right.quarter);
    });

  const availableTags = uniqueValues(items.flatMap((item) => item.tags));
  const availableOwners = uniqueValues(items.map((item) => item.owner));

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and slice the roadmap by area, owner, quarter, tag, or public status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search title or description"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </div>
            <FilterGroup label="Area" values={AREA_OPTIONS} selected={filters.areas} onToggle={(value) => toggleFilter("areas", value, setFilters)} />
            <FilterGroup label="Status" values={STATUS_OPTIONS} selected={filters.statuses} onToggle={(value) => toggleFilter("statuses", value, setFilters)} />
            <FilterGroup label="Quarter" values={QUARTER_OPTIONS} selected={filters.quarters} onToggle={(value) => toggleFilter("quarters", value, setFilters)} />
            <FilterGroup label="Owner" values={availableOwners} selected={filters.owners} onToggle={(value) => toggleFilter("owners", value, setFilters)} />
            <FilterGroup label="Tag" values={availableTags} selected={filters.tags} onToggle={(value) => toggleFilter("tags", value, setFilters)} />

            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              Public only
              <input
                type="checkbox"
                checked={filters.publicOnly}
                onChange={(event) => setFilters((current) => ({ ...current, publicOnly: event.target.checked }))}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button className="flex-1" onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                New item
              </Button>
              <Button variant="outline" className="flex-1" onClick={saveCurrentView}>
                <Eye className="h-4 w-4" />
                Save view
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setFilters(emptyFilters)}>
                Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Roadmap workspace</p>
                <h1 className="mt-1 text-3xl font-semibold">Plan by quarter, theme, and shipping risk</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info">{filteredItems.length} visible items</Badge>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as "quarter" | "title" | "owner")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarter">Sort by quarter</SelectItem>
                    <SelectItem value="title">Sort by title</SelectItem>
                    <SelectItem value="owner">Sort by owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <TimelineView
                items={filteredItems}
                draggedItemId={draggedItemId}
                activeDropTarget={activeDropTarget}
                onDragStart={setDraggedItemId}
                onDragEnd={() => {
                  setDraggedItemId(null);
                  setActiveDropTarget(null);
                }}
                onDropTargetChange={setActiveDropTarget}
                onInspect={setSelectedItem}
                onEdit={(item) => { setEditingItem(item); setDialogOpen(true); }}
                onQuickUpdate={quickUpdate}
                onMoveItem={moveItem}
              />
            </TabsContent>
            <TabsContent value="board">
              <BoardView
                items={filteredItems}
                draggedItemId={draggedItemId}
                activeDropTarget={activeDropTarget}
                onDragStart={setDraggedItemId}
                onDragEnd={() => {
                  setDraggedItemId(null);
                  setActiveDropTarget(null);
                }}
                onDropTargetChange={setActiveDropTarget}
                onInspect={setSelectedItem}
                onEdit={(item) => { setEditingItem(item); setDialogOpen(true); }}
                onQuickUpdate={quickUpdate}
                onMoveItem={moveItem}
              />
            </TabsContent>
            <TabsContent value="list">
              <ListView items={filteredItems} onInspect={setSelectedItem} onEdit={(item) => { setEditingItem(item); setDialogOpen(true); }} onQuickUpdate={quickUpdate} onDelete={deleteItem} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ItemFormDialog open={dialogOpen} item={editingItem} items={items} onOpenChange={setDialogOpen} onSubmit={saveItem} />
      <ItemDetailSheet item={selectedItem} allItems={items} open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)} />
    </>
  );
}

function TimelineView({
  items,
  draggedItemId,
  activeDropTarget,
  onDragStart,
  onDragEnd,
  onDropTargetChange,
  onInspect,
  onEdit,
  onQuickUpdate,
  onMoveItem,
}: {
  items: RoadmapItemRecord[];
  draggedItemId: string | null;
  activeDropTarget: string | null;
  onDragStart: (id: string | null) => void;
  onDragEnd: () => void;
  onDropTargetChange: (target: string | null) => void;
  onInspect: (item: RoadmapItemRecord) => void;
  onEdit: (item: RoadmapItemRecord) => void;
  onQuickUpdate: (id: string, patch: Partial<RoadmapItemInput>) => Promise<void>;
  onMoveItem: (id: string, patch: Partial<RoadmapItemInput>, successMessage: string) => Promise<void>;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid min-w-[960px] grid-cols-[180px_repeat(5,minmax(240px,1fr))]">
        <div className="border-b border-r border-border bg-slate-950 p-4 text-sm font-semibold text-white">Area</div>
        {QUARTER_OPTIONS.map((quarter) => (
          <div key={quarter} className="border-b border-border bg-slate-950 p-4 text-sm font-semibold text-white">
            {quarter}
          </div>
        ))}
        {AREA_OPTIONS.map((area) => (
          <Fragment key={area}>
            <div key={`${area}-label`} className="border-r border-border bg-white p-4 font-medium">
              {area}
            </div>
            {QUARTER_OPTIONS.map((quarter) => {
              const cellItems = items.filter((item) => item.area === area && item.quarter === quarter);
              const targetId = `${area}:${quarter}`;
              return (
                <div
                  key={`${area}-${quarter}`}
                  className={cn(
                    "min-h-40 border border-border/70 bg-white/80 p-3 transition",
                    activeDropTarget === targetId && "bg-sky-50 ring-2 ring-sky-200 ring-inset"
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    onDropTargetChange(targetId);
                  }}
                  onDragLeave={() => {
                    if (activeDropTarget === targetId) {
                      onDropTargetChange(null);
                    }
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    const draggedId = event.dataTransfer.getData("text/roadmap-item");
                    onDropTargetChange(null);
                    onDragEnd();
                    if (!draggedId) return;
                    await onMoveItem(draggedId, { area, quarter }, `Moved item to ${area} · ${quarter}`);
                  }}
                >
                  <div className="space-y-3">
                    {cellItems.length ? cellItems.map((item) => (
                      <RoadmapCard
                        key={item.id}
                        item={item}
                        isDragging={draggedItemId === item.id}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onInspect={onInspect}
                        onEdit={onEdit}
                        onQuickUpdate={onQuickUpdate}
                      />
                    )) : <EmptyCell />}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

function BoardView({
  items,
  draggedItemId,
  activeDropTarget,
  onDragStart,
  onDragEnd,
  onDropTargetChange,
  onInspect,
  onEdit,
  onQuickUpdate,
  onMoveItem,
}: {
  items: RoadmapItemRecord[];
  draggedItemId: string | null;
  activeDropTarget: string | null;
  onDragStart: (id: string | null) => void;
  onDragEnd: () => void;
  onDropTargetChange: (target: string | null) => void;
  onInspect: (item: RoadmapItemRecord) => void;
  onEdit: (item: RoadmapItemRecord) => void;
  onQuickUpdate: (id: string, patch: Partial<RoadmapItemInput>) => Promise<void>;
  onMoveItem: (id: string, patch: Partial<RoadmapItemInput>, successMessage: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {STATUS_OPTIONS.map((status) => {
        const columnItems = items.filter((item) => item.status === status);
        return (
          <Card
            key={status}
            className={cn(
              "transition",
              activeDropTarget === status && "bg-sky-50 ring-2 ring-sky-200"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              onDropTargetChange(status);
            }}
            onDragLeave={() => {
              if (activeDropTarget === status) {
                onDropTargetChange(null);
              }
            }}
            onDrop={async (event) => {
              event.preventDefault();
              const draggedId = event.dataTransfer.getData("text/roadmap-item");
              onDropTargetChange(null);
              onDragEnd();
              if (!draggedId) return;
              await onMoveItem(draggedId, { status }, `Moved item to ${status}`);
            }}
          >
            <CardHeader>
              <CardTitle className="text-base">{status}</CardTitle>
              <CardDescription>{columnItems.length} items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {columnItems.length ? columnItems.map((item) => (
                <RoadmapCard
                  key={item.id}
                  item={item}
                  isDragging={draggedItemId === item.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onInspect={onInspect}
                  onEdit={onEdit}
                  onQuickUpdate={onQuickUpdate}
                />
              )) : <EmptyCell />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ListView({
  items,
  onInspect,
  onEdit,
  onQuickUpdate,
  onDelete,
}: {
  items: RoadmapItemRecord[];
  onInspect: (item: RoadmapItemRecord) => void;
  onEdit: (item: RoadmapItemRecord) => void;
  onQuickUpdate: (id: string, patch: Partial<RoadmapItemInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Quarter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Dependencies</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length ? (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <button className="text-left" onClick={() => onInspect(item)}>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.theme || "No theme"}</p>
                  </button>
                </TableCell>
                <TableCell>{item.area}</TableCell>
                <TableCell>
                  <InlineQuarter value={item.quarter} onChange={(value) => onQuickUpdate(item.id, { quarter: value })} />
                </TableCell>
                <TableCell>
                  <InlineStatus value={item.status} onChange={(value) => onQuickUpdate(item.id, { status: value })} />
                </TableCell>
                <TableCell>{item.owner || "Unassigned"}</TableCell>
                <TableCell>{item.dependencies.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onInspect(item)}>
                      View
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7}>
                <EmptyCell />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function RoadmapCard({
  item,
  isDragging,
  onDragStart,
  onDragEnd,
  onInspect,
  onEdit,
  onQuickUpdate,
}: {
  item: RoadmapItemRecord;
  isDragging: boolean;
  onDragStart: (id: string | null) => void;
  onDragEnd: () => void;
  onInspect: (item: RoadmapItemRecord) => void;
  onEdit: (item: RoadmapItemRecord) => void;
  onQuickUpdate: (id: string, patch: Partial<RoadmapItemInput>) => Promise<void>;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/roadmap-item", item.id);
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border border-border bg-white p-4 shadow-sm transition",
        isDragging && "opacity-50 shadow-none"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="text-left" onClick={() => onInspect(item)}>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.theme || item.area}</p>
        </button>
        {item.isPublic ? <Badge variant="success">Public</Badge> : <Badge variant="outline">Internal</Badge>}
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Drag to move</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="muted">{item.owner || "Unassigned"}</Badge>
        <Badge variant="muted">{item.effort}</Badge>
        <Badge variant="info">depends on {item.dependencies.length}</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        <InlineStatus value={item.status} onChange={(value) => onQuickUpdate(item.id, { status: value })} />
        <InlineQuarter value={item.quarter} onChange={(value) => onQuickUpdate(item.id, { quarter: value })} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
          {item.startDate ? item.startDate.slice(5, 10) : "No dates"}
        </div>
        <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function InlineStatus({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InlineQuarter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUARTER_OPTIONS.map((quarter) => (
          <SelectItem key={quarter} value={quarter}>
            {quarter}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.length ? values.map((value) => (
          <button
            key={value}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              selected.includes(value) ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-background text-muted-foreground"
            )}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        )) : <p className="text-xs text-muted-foreground">No values yet.</p>}
      </div>
    </div>
  );
}

function EmptyCell() {
  return <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing scheduled here yet.</div>;
}

function toggleFilter(
  key: keyof Pick<RoadmapFilters, "areas" | "statuses" | "quarters" | "tags" | "owners">,
  value: string,
  setFilters: Dispatch<SetStateAction<RoadmapFilters>>
) {
  setFilters((existing) => ({
    ...existing,
    [key]: existing[key].includes(value) ? existing[key].filter((entry) => entry !== value) : [...existing[key], value],
  }));
}
