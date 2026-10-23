-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "externalId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "source" TEXT;

-- CreateTable
CREATE TABLE "GoogleClassroomIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "googleUserId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" DATETIME,
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncedAt" DATETIME,
    CONSTRAINT "GoogleClassroomIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoogleClassroomCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "googleCourseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "description" TEXT,
    "room" TEXT,
    "courseState" TEXT,
    "alternateLink" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleClassroomCourse_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GoogleClassroomIntegration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoogleClassroomAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "googleCourseworkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT,
    "workType" TEXT,
    "dueDate" DATETIME,
    "maxPoints" REAL,
    "alternateLink" TEXT,
    "creationTime" DATETIME,
    "updateTime" DATETIME,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleClassroomAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GoogleClassroomCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoogleClassroomSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "googleSubmissionId" TEXT NOT NULL,
    "state" TEXT,
    "assignedGrade" REAL,
    "draftGrade" REAL,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "updateTime" DATETIME,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleClassroomSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "GoogleClassroomAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomIntegration_userId_key" ON "GoogleClassroomIntegration"("userId");

-- CreateIndex
CREATE INDEX "GoogleClassroomIntegration_userId_idx" ON "GoogleClassroomIntegration"("userId");

-- CreateIndex
CREATE INDEX "GoogleClassroomCourse_integrationId_idx" ON "GoogleClassroomCourse"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomCourse_integrationId_googleCourseId_key" ON "GoogleClassroomCourse"("integrationId", "googleCourseId");

-- CreateIndex
CREATE INDEX "GoogleClassroomAssignment_courseId_idx" ON "GoogleClassroomAssignment"("courseId");

-- CreateIndex
CREATE INDEX "GoogleClassroomAssignment_courseId_dueDate_idx" ON "GoogleClassroomAssignment"("courseId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomAssignment_courseId_googleCourseworkId_key" ON "GoogleClassroomAssignment"("courseId", "googleCourseworkId");

-- CreateIndex
CREATE INDEX "GoogleClassroomSubmission_assignmentId_idx" ON "GoogleClassroomSubmission"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomSubmission_assignmentId_googleSubmissionId_key" ON "GoogleClassroomSubmission"("assignmentId", "googleSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_createdById_source_externalId_key" ON "CalendarEvent"("createdById", "source", "externalId");

