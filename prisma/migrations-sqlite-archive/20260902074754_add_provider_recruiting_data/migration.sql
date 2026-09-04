-- CreateTable
CREATE TABLE "College" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT,
    "sport" TEXT NOT NULL,
    "division" TEXT,
    "conference" TEXT,
    "schoolName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "isHeadCoach" BOOLEAN,
    "season" TEXT,
    "headshotUrl" TEXT,
    "bioUrl" TEXT,
    "profileSlug" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coach_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "classYear" TEXT,
    "jerseyNumber" TEXT,
    "hometown" TEXT,
    "headshotUrl" TEXT,
    "isVerified" BOOLEAN,
    "personId" TEXT,
    "season" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RosterEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RosterChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT,
    "changeType" TEXT NOT NULL,
    "subjectName" TEXT,
    "subjectPosition" TEXT,
    "subjectClassYear" TEXT,
    "personId" TEXT,
    "sportPath" TEXT,
    "division" TEXT,
    "season" TEXT,
    "schoolName" TEXT,
    "schoolLogoUrl" TEXT,
    "fromTeamProviderId" TEXT,
    "toTeamProviderId" TEXT,
    "fromDivision" TEXT,
    "toDivision" TEXT,
    "fromConference" TEXT,
    "toConference" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RosterChange_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecruitingSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT,
    "collegeId" TEXT,
    "signalType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "subjectName" TEXT,
    "isHeadCoach" BOOLEAN,
    "fromTitle" TEXT,
    "toTitle" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitingSignal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecruitingSignal_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecruitingContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONTACTED',
    "notes" TEXT,
    "lastContactedAt" DATETIME,
    "coachId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitingContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingContact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "RecruitingSchool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingContact_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecruitingContact" ("createdAt", "email", "id", "lastContactedAt", "name", "notes", "phone", "schoolId", "status", "title", "updatedAt", "userId") SELECT "createdAt", "email", "id", "lastContactedAt", "name", "notes", "phone", "schoolId", "status", "title", "updatedAt", "userId" FROM "RecruitingContact";
DROP TABLE "RecruitingContact";
ALTER TABLE "new_RecruitingContact" RENAME TO "RecruitingContact";
CREATE INDEX "RecruitingContact_userId_idx" ON "RecruitingContact"("userId");
CREATE INDEX "RecruitingContact_schoolId_idx" ON "RecruitingContact"("schoolId");
CREATE INDEX "RecruitingContact_coachId_idx" ON "RecruitingContact"("coachId");
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
    "collegeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitingSchool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingSchool_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecruitingSchool_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecruitingSchool" ("createdAt", "division", "id", "location", "name", "notes", "priority", "sportContextId", "status", "updatedAt", "userId") SELECT "createdAt", "division", "id", "location", "name", "notes", "priority", "sportContextId", "status", "updatedAt", "userId" FROM "RecruitingSchool";
DROP TABLE "RecruitingSchool";
ALTER TABLE "new_RecruitingSchool" RENAME TO "RecruitingSchool";
CREATE INDEX "RecruitingSchool_userId_idx" ON "RecruitingSchool"("userId");
CREATE INDEX "RecruitingSchool_sportContextId_idx" ON "RecruitingSchool"("sportContextId");
CREATE INDEX "RecruitingSchool_collegeId_idx" ON "RecruitingSchool"("collegeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "College_name_idx" ON "College"("name");

-- CreateIndex
CREATE INDEX "Program_collegeId_idx" ON "Program"("collegeId");

-- CreateIndex
CREATE INDEX "Program_sport_division_idx" ON "Program"("sport", "division");

-- CreateIndex
CREATE UNIQUE INDEX "Program_provider_providerRecordId_key" ON "Program"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "Coach_programId_idx" ON "Coach"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_provider_providerRecordId_key" ON "Coach"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RosterEntry_programId_idx" ON "RosterEntry"("programId");

-- CreateIndex
CREATE INDEX "RosterEntry_personId_idx" ON "RosterEntry"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_provider_providerRecordId_key" ON "RosterEntry"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RosterChange_programId_idx" ON "RosterChange"("programId");

-- CreateIndex
CREATE INDEX "RosterChange_personId_idx" ON "RosterChange"("personId");

-- CreateIndex
CREATE INDEX "RosterChange_publishedAt_idx" ON "RosterChange"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RosterChange_provider_providerRecordId_key" ON "RosterChange"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_programId_idx" ON "RecruitingSignal"("programId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_collegeId_idx" ON "RecruitingSignal"("collegeId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_publishedAt_idx" ON "RecruitingSignal"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingSignal_provider_providerRecordId_key" ON "RecruitingSignal"("provider", "providerRecordId");
