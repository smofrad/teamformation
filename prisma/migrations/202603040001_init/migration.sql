-- CreateTable
CREATE TABLE "RoadmapItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "area" TEXT NOT NULL,
  "theme" TEXT,
  "quarter" TEXT NOT NULL,
  "startDate" DATETIME,
  "endDate" DATETIME,
  "status" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "impact" TEXT NOT NULL,
  "effort" TEXT NOT NULL,
  "owner" TEXT,
  "tags" JSON NOT NULL DEFAULT '[]',
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dependency" (
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  PRIMARY KEY ("fromId", "toId"),
  CONSTRAINT "Dependency_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "RoadmapItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Dependency_toId_fkey" FOREIGN KEY ("toId") REFERENCES "RoadmapItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoadmapView" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "filters" JSON NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
