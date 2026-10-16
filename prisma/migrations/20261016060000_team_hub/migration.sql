ALTER TABLE "CalendarEvent" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'GENERAL';
CREATE TABLE "SchoolProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "schoolName" TEXT NOT NULL,
  "focus" TEXT,
  "onboardingCompletedAt" TIMESTAMP(3),
  CONSTRAINT "SchoolProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TeamAnnouncement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "important" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamAnnouncement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TeamAnnouncement_teamId_createdAt_idx" ON "TeamAnnouncement"("teamId", "createdAt");
ALTER TABLE "Conversation" ADD COLUMN "scopeTeamId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "groupOwnerId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "joinCode" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "staffOnly" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Conversation_joinCode_key" ON "Conversation"("joinCode");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_scopeTeamId_fkey" FOREIGN KEY ("scopeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AcademicSupportSettings" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "threshold" DOUBLE PRECISION NOT NULL DEFAULT 70
);
CREATE TABLE "AcademicSupportGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "supporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "AcademicSupportGrant_ownerId_supporterId_key" ON "AcademicSupportGrant"("ownerId", "supporterId");
CREATE TABLE "AcademicGradeState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "percent" DOUBLE PRECISION NOT NULL
);
CREATE TABLE "AcademicAlertSignal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
