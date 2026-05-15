import { PrismaClient, Area, Confidence, Effort, Impact, RoadmapStatus } from "@prisma/client";

type ProceedoRow = {
  title: string;
  objective: string;
  deliveryPeriod: "P1" | "P2" | "P3" | "TBD";
  status: "OPEN" | "IN PROGRESS" | "DONE";
  lane: "BUSINESS" | "TECH";
  comment?: string;
  owner?: string;
  isPublic?: boolean;
};

const proceedoRows: ProceedoRow[] = [
  { title: "Application split", objective: "Software upgrades", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "TECH", comment: "Make backend separated.", owner: "Team Tech Squad" },
  { title: "Hubflow for invoices", objective: "Automation", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "BUSINESS", comment: "Needed for E-facto invoice firewall flow.", owner: "Team Invoice", isPublic: true },
  { title: "Search words enrichment", objective: "Usability", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "BUSINESS", comment: "Pilot active with customer.", owner: "Team Proc", isPublic: true },
  { title: "Contract Administration", objective: "Compliance & Control", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "BUSINESS", owner: "Team Proc", isPublic: true },
  { title: "Integrate Vakanta Platform and Proceedo API", objective: "Compliance & Control", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "BUSINESS", comment: "Orders, budgets and core integration.", owner: "Team Core", isPublic: true },
  { title: "AutoSuggest on Reviewer", objective: "Automation", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "BUSINESS", comment: "Finalize and harden rollout.", owner: "Team Invoice", isPublic: true },
  { title: "Invoice Page infinite scroll", objective: "Usability", deliveryPeriod: "P1", status: "DONE", lane: "BUSINESS", comment: "Released March 5.", owner: "Team Invoice", isPublic: true },
  { title: "Nginx Ingress controller replacement", objective: "Security", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", comment: "Current ingress reaches EOL in March 2026.", owner: "Team CD" },
  { title: "Dynamic secrets for DB", objective: "Security", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "TECH", owner: "Team CD" },
  { title: "Replace Wootric with Survicate", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "BUSINESS", comment: "Visma decision to replace; deadline June 30, 2026.", owner: "Team Core", isPublic: true },
  { title: "Create and run BCP test suite for Vakanta", objective: "Compliance & Control", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", owner: "Team CD" },
  { title: "Assign controlling value to users/groups via API", objective: "Automation", deliveryPeriod: "P2", status: "OPEN", lane: "BUSINESS", comment: "Client funded development, target Q3.", owner: "Team Core", isPublic: true },
  { title: "Rabbit upgrade to 4.x", objective: "Software upgrades", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", comment: "Qurum queues update may require service window.", owner: "Team CD" },
  { title: "Report tables in separate database", objective: "Other", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "TECH", comment: "Move report data to PostgreSQL.", owner: "Team Core" },
  { title: "Structured logging of authorization changes", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "VGR and Region Stockholm requirement.", owner: "Team Core" },
  { title: "SolR independence", objective: "Other", deliveryPeriod: "P1", status: "IN PROGRESS", lane: "TECH", comment: "Core Proceedo should work even if SolR is down.", owner: "Team Invoice" },
  { title: "Primary/Replica DB switch exercise", objective: "Security", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", comment: "Run once in prod and include in BCP suite.", owner: "Team CD" },
  { title: "Proceedius AI agent", objective: "AI & Automation", deliveryPeriod: "P2", status: "OPEN", lane: "BUSINESS", owner: "Team Proc", isPublic: true },
  { title: "Supplier Control", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "BUSINESS", comment: "Dependent on Inyett API.", owner: "Team Proc", isPublic: true },
  { title: "SCIM 2.0 for User/Role/Group APIs", objective: "Customer compliance", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", comment: "VGR demand with deadline end P2.", owner: "Team Core" },
  { title: "Upgrade SFTP to Rocky 9", objective: "Software upgrades", deliveryPeriod: "P1", status: "OPEN", lane: "TECH", comment: "Parallel SFTP servers needed during migration.", owner: "Team CD" },
  { title: "Replace LaunchDarkly", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "Current setup has high cost.", owner: "Team Core" },
  { title: "Replace SolR with Elastic", objective: "Software upgrades", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "SolR indexing blocks Spring Boot 3 upgrade.", owner: "Team Proc" },
  { title: "Logs tracing for Java services", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "Ensure unique logId through internal service calls.", owner: "Team CD" },
  { title: "Admin FE refactoring", objective: "Software upgrades", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "Remove Bootstrap 3 and unblock Angular upgrades.", owner: "Team Core" },
  { title: "TLS between internal services", objective: "Compliance & Control", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "Minimum target is TLS between DB and Maxscale in Q/Prod.", owner: "Team CD" },
  { title: "Kubernetes upgrade", objective: "Software upgrades", deliveryPeriod: "P2", status: "OPEN", lane: "TECH", comment: "Upgrade to version 1.33 or later.", owner: "Team CD" },
];

const objectiveToArea: Record<string, Area> = {
  "Software upgrades": Area.Platform,
  Security: Area.Security,
  "Compliance & Control": Area.Product,
  Automation: Area.Product,
  Usability: Area.UX,
  "Customer compliance": Area.Security,
  "AI & Automation": Area.Product,
  Other: Area.Other,
};

const periodToQuarter: Record<ProceedoRow["deliveryPeriod"], string> = {
  P1: "2026-Q1",
  P2: "2026-Q2",
  P3: "2026-Q3",
  TBD: "2026-Q4",
};

const statusMap: Record<ProceedoRow["status"], RoadmapStatus> = {
  OPEN: RoadmapStatus.Planned,
  "IN PROGRESS": RoadmapStatus.InProgress,
  DONE: RoadmapStatus.Shipped,
};

function confidenceFor(row: ProceedoRow): Confidence {
  if (row.deliveryPeriod === "P1") return Confidence.High;
  if (row.deliveryPeriod === "P2") return Confidence.Medium;
  return Confidence.Low;
}

function impactFor(row: ProceedoRow): Impact {
  if (row.lane === "BUSINESS") return Impact.High;
  if (row.deliveryPeriod === "P1") return Impact.High;
  return Impact.Medium;
}

function effortFor(row: ProceedoRow): Effort {
  if (row.objective === "Software upgrades" || row.objective === "Compliance & Control") return Effort.L;
  if (row.objective === "AI & Automation") return Effort.M;
  return Effort.M;
}

function themeFor(row: ProceedoRow) {
  if (row.objective === "Software upgrades") return "Platform Modernization";
  if (row.objective === "Compliance & Control") return "Compliance & Control";
  if (row.objective === "AI & Automation") return "AI Automation";
  if (row.objective === "Usability") return "UX Improvements";
  return row.objective;
}

function tagsFor(row: ProceedoRow) {
  const tags = [row.lane, row.deliveryPeriod, row.objective];
  if (row.comment?.toLowerCase().includes("vgr")) tags.push("VGR");
  if (row.comment?.toLowerCase().includes("vakanta")) tags.push("Vakanta");
  return tags;
}

export async function seedRoadmapData(client: PrismaClient) {
  await client.dependency.deleteMany();
  await client.roadmapView.deleteMany();
  await client.roadmapItem.deleteMany();

  const created = await Promise.all(
    proceedoRows.map((row) =>
      client.roadmapItem.create({
        data: {
          title: row.title,
          description: row.comment || null,
          area: objectiveToArea[row.objective] ?? Area.Other,
          theme: themeFor(row),
          quarter: periodToQuarter[row.deliveryPeriod],
          status: statusMap[row.status],
          confidence: confidenceFor(row),
          impact: impactFor(row),
          effort: effortFor(row),
          owner: row.owner ?? null,
          tags: tagsFor(row),
          isPublic: Boolean(row.isPublic),
        },
      })
    )
  );

  const byTitle = Object.fromEntries(created.map((item) => [item.title, item.id]));

  await client.dependency.createMany({
    data: [
      {
        fromId: byTitle["Replace SolR with Elastic"],
        toId: byTitle["Rabbit upgrade to 4.x"],
      },
      {
        fromId: byTitle["Kubernetes upgrade"],
        toId: byTitle["Nginx Ingress controller replacement"],
      },
      {
        fromId: byTitle["TLS between internal services"],
        toId: byTitle["Dynamic secrets for DB"],
      },
      {
        fromId: byTitle["Integrate Vakanta Platform and Proceedo API"],
        toId: byTitle["Create and run BCP test suite for Vakanta"],
      },
      {
        fromId: byTitle["Proceedius AI agent"],
        toId: byTitle["Search words enrichment"],
      },
    ],
  });

  await client.roadmapView.createMany({
    data: [
      {
        name: "P1 focus",
        filters: { quarters: ["2026-Q1"], statuses: ["InProgress", "Planned"] },
        isPublic: false,
      },
      {
        name: "Security and compliance",
        filters: { areas: ["Security"], tags: ["Compliance & Control"] },
        isPublic: false,
      },
      {
        name: "Public business bets",
        filters: { publicOnly: true, tags: ["BUSINESS"] },
        isPublic: true,
      },
    ],
  });
}

async function main() {
  const prisma = new PrismaClient();
  await seedRoadmapData(prisma);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
