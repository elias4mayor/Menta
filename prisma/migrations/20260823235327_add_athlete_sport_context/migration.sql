-- CreateTable
CREATE TABLE "AthleteSportContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT,
    "teamId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AthleteSportContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AthleteSportContext_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Film" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GAME',
    "opponent" TEXT,
    "season" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" REAL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "teamId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Film_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Film_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Film_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Film" ("category", "createdAt", "description", "durationSec", "id", "mimeType", "opponent", "originalFilename", "season", "sizeBytes", "storageKey", "teamId", "title", "uploadedById", "visibility") SELECT "category", "createdAt", "description", "durationSec", "id", "mimeType", "opponent", "originalFilename", "season", "sizeBytes", "storageKey", "teamId", "title", "uploadedById", "visibility" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
CREATE INDEX "Film_teamId_idx" ON "Film"("teamId");
CREATE INDEX "Film_uploadedById_idx" ON "Film"("uploadedById");
CREATE INDEX "Film_sportContextId_idx" ON "Film"("sportContextId");
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "actionPlan" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("actionPlan", "category", "createdAt", "id", "progress", "status", "targetDate", "title", "updatedAt", "userId") SELECT "actionPlan", "category", "createdAt", "id", "progress", "status", "targetDate", "title", "updatedAt", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX "Goal_sportContextId_idx" ON "Goal"("sportContextId");
CREATE TABLE "new_PerformanceEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statName" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PerformanceEntry_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PerformanceEntry" ("createdAt", "id", "note", "recordedAt", "statName", "unit", "userId", "value") SELECT "createdAt", "id", "note", "recordedAt", "statName", "unit", "userId", "value" FROM "PerformanceEntry";
DROP TABLE "PerformanceEntry";
ALTER TABLE "new_PerformanceEntry" RENAME TO "PerformanceEntry";
CREATE INDEX "PerformanceEntry_userId_idx" ON "PerformanceEntry"("userId");
CREATE INDEX "PerformanceEntry_userId_statName_idx" ON "PerformanceEntry"("userId", "statName");
CREATE INDEX "PerformanceEntry_sportContextId_idx" ON "PerformanceEntry"("sportContextId");
CREATE TABLE "new_RecruitingSchool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TARGET',
    "priority" INTEGER,
    "notes" TEXT,
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitingSchool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingSchool_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecruitingSchool" ("createdAt", "division", "id", "location", "name", "notes", "priority", "status", "updatedAt", "userId") SELECT "createdAt", "division", "id", "location", "name", "notes", "priority", "status", "updatedAt", "userId" FROM "RecruitingSchool";
DROP TABLE "RecruitingSchool";
ALTER TABLE "new_RecruitingSchool" RENAME TO "RecruitingSchool";
CREATE INDEX "RecruitingSchool_userId_idx" ON "RecruitingSchool"("userId");
CREATE INDEX "RecruitingSchool_sportContextId_idx" ON "RecruitingSchool"("sportContextId");
CREATE TABLE "new_Workout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "exercises" TEXT,
    "planTag" TEXT,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workout_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Workout_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Workout_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Workout" ("assignedToId", "category", "createdAt", "createdById", "description", "exercises", "id", "isTemplate", "planTag", "teamId", "title") SELECT "assignedToId", "category", "createdAt", "createdById", "description", "exercises", "id", "isTemplate", "planTag", "teamId", "title" FROM "Workout";
DROP TABLE "Workout";
ALTER TABLE "new_Workout" RENAME TO "Workout";
CREATE INDEX "Workout_teamId_idx" ON "Workout"("teamId");
CREATE INDEX "Workout_createdById_idx" ON "Workout"("createdById");
CREATE INDEX "Workout_assignedToId_idx" ON "Workout"("assignedToId");
CREATE INDEX "Workout_sportContextId_idx" ON "Workout"("sportContextId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AthleteSportContext_userId_idx" ON "AthleteSportContext"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSportContext_userId_sport_key" ON "AthleteSportContext"("userId", "sport");
