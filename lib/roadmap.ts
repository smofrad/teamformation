import { Area, Confidence, Effort, Impact, Prisma, RoadmapStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RoadmapFilters, RoadmapItemInput, RoadmapItemRecord, RoadmapMetrics, RoadmapViewRecord } from "@/lib/types";

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function validateEnum<T extends string>(value: string, options: readonly T[], field: string): T {
  if (options.includes(value as T)) {
    return value as T;
  }

  throw new Error(`Invalid ${field}`);
}

function optionalDate(value?: string) {
  return value ? new Date(value) : null;
}

function isMissingRoadmapSchema(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    typeof error.message === "string" &&
    (error.message.includes("RoadmapItem") || error.message.includes("RoadmapView") || error.message.includes("Dependency"))
  );
}

type RoadmapItemWithRelations = Prisma.RoadmapItemGetPayload<{
  include: {
    dependencies: {
      select: {
        toId: true;
      };
    };
    dependentOn: {
      select: {
        fromId: true;
      };
    };
  };
}>;

function serializeItem(item: RoadmapItemWithRelations): RoadmapItemRecord {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    area: item.area,
    theme: item.theme,
    quarter: item.quarter,
    startDate: item.startDate?.toISOString() ?? null,
    endDate: item.endDate?.toISOString() ?? null,
    status: item.status,
    confidence: item.confidence,
    impact: item.impact,
    effort: item.effort,
    owner: item.owner,
    tags: asStringArray(item.tags),
    dependencies: item.dependencies.map((entry) => entry.toId),
    dependents: item.dependentOn.map((entry) => entry.fromId),
    isPublic: item.isPublic,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export const defaultFilters: RoadmapFilters = {
  search: "",
  areas: [],
  statuses: [],
  quarters: [],
  tags: [],
  owners: [],
  publicOnly: false,
};

export async function getRoadmapItems() {
  try {
    const items = await prisma.roadmapItem.findMany({
      include: {
        dependencies: {
          select: {
            toId: true,
          },
        },
        dependentOn: {
          select: {
            fromId: true,
          },
        },
      },
      orderBy: [{ quarter: "asc" }, { updatedAt: "desc" }],
    });

    return items.map(serializeItem);
  } catch (error) {
    if (isMissingRoadmapSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function getRoadmapMetrics(): Promise<RoadmapMetrics> {
  try {
    const [totalItems, publicItems, inFlight, shippedThisQuarter] = await Promise.all([
      prisma.roadmapItem.count(),
      prisma.roadmapItem.count({ where: { isPublic: true } }),
      prisma.roadmapItem.count({ where: { status: { in: ["Discovery", "Planned", "InProgress"] } } }),
      prisma.roadmapItem.count({
        where: {
          status: "Shipped",
          quarter: "2026-Q1",
        },
      }),
    ]);

    return { totalItems, publicItems, inFlight, shippedThisQuarter };
  } catch (error) {
    if (isMissingRoadmapSchema(error)) {
      return { totalItems: 0, publicItems: 0, inFlight: 0, shippedThisQuarter: 0 };
    }

    throw error;
  }
}

export async function getPublicRoadmapItems() {
  try {
    const items = await prisma.roadmapItem.findMany({
      where: { isPublic: true },
      include: {
        dependencies: { select: { toId: true } },
        dependentOn: { select: { fromId: true } },
      },
      orderBy: [{ quarter: "asc" }, { area: "asc" }],
    });

    return items.map(serializeItem);
  } catch (error) {
    if (isMissingRoadmapSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function getDbViews(): Promise<RoadmapViewRecord[]> {
  try {
    const views = await prisma.roadmapView.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return views.map((view) => ({
      ...view,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
      filters: typeof view.filters === "object" && view.filters ? (view.filters as Record<string, unknown>) : {},
    }));
  } catch (error) {
    if (isMissingRoadmapSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function createRoadmapItem(input: RoadmapItemInput) {
  const title = input.title?.trim();
  const quarter = input.quarter?.trim();

  if (!title) {
    throw new Error("Title is required");
  }

  if (!quarter) {
    throw new Error("Quarter is required");
  }

  if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
    throw new Error("End date must be after start date");
  }

  const dependencyIds = input.dependencyIds ?? [];

  const item = await prisma.roadmapItem.create({
    data: {
      title,
      description: input.description?.trim() || null,
      area: validateEnum(input.area, ["Product", "Platform", "Integrations", "Security", "UX", "Other"] as const, "area") as Area,
      theme: input.theme?.trim() || null,
      quarter,
      startDate: optionalDate(input.startDate),
      endDate: optionalDate(input.endDate),
      status: validateEnum(input.status, ["Idea", "Discovery", "Planned", "InProgress", "Shipped", "Parked"] as const, "status") as RoadmapStatus,
      confidence: validateEnum(input.confidence, ["Low", "Medium", "High"] as const, "confidence") as Confidence,
      impact: validateEnum(input.impact, ["Low", "Medium", "High"] as const, "impact") as Impact,
      effort: validateEnum(input.effort, ["S", "M", "L", "XL"] as const, "effort") as Effort,
      owner: input.owner?.trim() || null,
      tags: asStringArray(input.tags),
      isPublic: Boolean(input.isPublic),
      dependencies: dependencyIds.length
        ? {
            create: dependencyIds.map((toId) => ({
              to: {
                connect: { id: toId },
              },
            })),
          }
        : undefined,
    },
    include: {
      dependencies: { select: { toId: true } },
      dependentOn: { select: { fromId: true } },
    },
  });

  return serializeItem(item);
}

export async function updateRoadmapItem(id: string, input: Partial<RoadmapItemInput>) {
  const existing = await prisma.roadmapItem.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Item not found");
  }

  const startDate = input.startDate ?? existing.startDate?.toISOString().slice(0, 10);
  const endDate = input.endDate ?? existing.endDate?.toISOString().slice(0, 10);

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw new Error("End date must be after start date");
  }

  const dependencyIds = input.dependencyIds;

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Title is required");
  }

  if (input.quarter !== undefined && !input.quarter.trim()) {
    throw new Error("Quarter is required");
  }

  const item = await prisma.$transaction(async (tx) => {
    if (dependencyIds) {
      await tx.dependency.deleteMany({ where: { fromId: id } });
    }

    return tx.roadmapItem.update({
      where: { id },
      data: {
        title: input.title !== undefined ? input.title.trim() : undefined,
        description: input.description !== undefined ? input.description.trim() || null : undefined,
        area: input.area
          ? (validateEnum(input.area, ["Product", "Platform", "Integrations", "Security", "UX", "Other"] as const, "area") as Area)
          : undefined,
        theme: input.theme !== undefined ? input.theme.trim() || null : undefined,
        quarter: input.quarter?.trim() || undefined,
        startDate: input.startDate !== undefined ? optionalDate(input.startDate) : undefined,
        endDate: input.endDate !== undefined ? optionalDate(input.endDate) : undefined,
        status: input.status
          ? (validateEnum(input.status, ["Idea", "Discovery", "Planned", "InProgress", "Shipped", "Parked"] as const, "status") as RoadmapStatus)
          : undefined,
        confidence: input.confidence
          ? (validateEnum(input.confidence, ["Low", "Medium", "High"] as const, "confidence") as Confidence)
          : undefined,
        impact: input.impact
          ? (validateEnum(input.impact, ["Low", "Medium", "High"] as const, "impact") as Impact)
          : undefined,
        effort: input.effort
          ? (validateEnum(input.effort, ["S", "M", "L", "XL"] as const, "effort") as Effort)
          : undefined,
        owner: input.owner !== undefined ? input.owner.trim() || null : undefined,
        tags: input.tags !== undefined ? asStringArray(input.tags) : undefined,
        isPublic: input.isPublic,
        dependencies: dependencyIds?.length
          ? {
              create: dependencyIds.map((toId) => ({
                to: {
                  connect: { id: toId },
                },
              })),
            }
          : dependencyIds
            ? undefined
            : undefined,
      },
      include: {
        dependencies: { select: { toId: true } },
        dependentOn: { select: { fromId: true } },
      },
    });
  });

  return serializeItem(item);
}

export async function deleteRoadmapItem(id: string) {
  await prisma.roadmapItem.delete({
    where: { id },
  });
}

export async function resetDemoData() {
  await prisma.dependency.deleteMany();
  await prisma.roadmapView.deleteMany();
  await prisma.roadmapItem.deleteMany();
}
