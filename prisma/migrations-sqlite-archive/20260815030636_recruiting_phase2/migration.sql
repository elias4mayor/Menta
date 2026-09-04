-- CreateTable
CREATE TABLE "RecruitingSchool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TARGET',
    "priority" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitingSchool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecruitingContact" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecruitingContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingContact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "RecruitingSchool" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecruitingActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "contactId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NOTE',
    "subject" TEXT,
    "body" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecruitingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "RecruitingSchool" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecruitingActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RecruitingContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecruitingSchool_userId_idx" ON "RecruitingSchool"("userId");

-- CreateIndex
CREATE INDEX "RecruitingContact_userId_idx" ON "RecruitingContact"("userId");

-- CreateIndex
CREATE INDEX "RecruitingContact_schoolId_idx" ON "RecruitingContact"("schoolId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_userId_idx" ON "RecruitingActivity"("userId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_schoolId_idx" ON "RecruitingActivity"("schoolId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_contactId_idx" ON "RecruitingActivity"("contactId");
