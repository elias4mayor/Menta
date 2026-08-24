-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN "verifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "specialties" TEXT,
    "credentials" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderAvailability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProviderAvailability_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "athleteId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedStart" DATETIME NOT NULL,
    "scheduledStart" DATETIME,
    "scheduledEnd" DATETIME,
    "providerNote" TEXT,
    "followUpOfId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CareRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareRequest_followUpOfId_fkey" FOREIGN KEY ("followUpOfId") REFERENCES "CareRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "ProviderAvailability_providerId_idx" ON "ProviderAvailability"("providerId");

-- CreateIndex
CREATE INDEX "ProviderAvailability_teamId_idx" ON "ProviderAvailability"("teamId");

-- CreateIndex
CREATE INDEX "CareRequest_athleteId_idx" ON "CareRequest"("athleteId");

-- CreateIndex
CREATE INDEX "CareRequest_providerId_idx" ON "CareRequest"("providerId");

-- CreateIndex
CREATE INDEX "CareRequest_teamId_idx" ON "CareRequest"("teamId");

-- CreateIndex
CREATE INDEX "CareRequest_status_idx" ON "CareRequest"("status");
