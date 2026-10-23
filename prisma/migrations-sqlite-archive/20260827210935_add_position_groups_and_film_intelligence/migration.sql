-- CreateTable
CREATE TABLE "FilmSharedWithUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmSharedWithUser_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmSharedWithUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PositionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PositionGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PositionGroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "positionGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupRole" TEXT NOT NULL DEFAULT 'ATHLETE',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PositionGroupMembership_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PositionGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamPermissionGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "permission" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamPermissionGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPermissionGrant_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmTagDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "sport" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmTagDefinition_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmTagInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "tagDefinitionId" TEXT NOT NULL,
    "timestampSec" REAL,
    "athleteId" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmTagInstance_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmTagInstance_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmTagInstance_tagDefinitionId_fkey" FOREIGN KEY ("tagDefinitionId") REFERENCES "FilmTagDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "authorId" TEXT NOT NULL,
    "timestampSec" REAL,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'SHARED',
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "FilmComment_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmComment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FilmComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "createdById" TEXT NOT NULL,
    "timestampSec" REAL NOT NULL,
    "data" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'SHARED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FilmAnnotation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAnnotation_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "positionGroupId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FilmPlaylist_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmPlaylist_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmPlaylistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playlistId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,
    "order" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "FilmPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmPlaylistItem_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmPlaylistItem_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "assignedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "filmId" TEXT,
    "playlistId" TEXT,
    "clipId" TEXT,
    "dueAt" DATETIME,
    "requiredViewing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAssignment_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAssignment_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAssignment_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "FilmPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAssignment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAssignmentTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "comment" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmAssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FilmAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAssignmentTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmReviewRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT,
    "timestampSec" REAL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedById" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmReviewRequest_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmReviewRequest_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmReviewRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT,
    "filmId" TEXT,
    "clipId" TEXT,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachNote_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachNote_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoachNote_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAnalysisTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "sport" TEXT,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmAnalysisTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAnalysisCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "FilmAnalysisCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FilmAnalysisTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAnalysisEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,
    "athleteId" TEXT,
    "score" REAL,
    "notes" TEXT,
    "gradedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmAnalysisEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FilmAnalysisTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAnalysisEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FilmAnalysisCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAnalysisEntry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FilmAnalysisEntry_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FilmReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmReportSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,
    CONSTRAINT "FilmReportSource_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FilmReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opponent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opponentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tendencies" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoutReport_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoutReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutReportTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoutReportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "ScoutReportTag_scoutReportId_fkey" FOREIGN KEY ("scoutReportId") REFERENCES "ScoutReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmShareGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT,
    "playlistId" TEXT,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "FilmShareGrant_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmShareGrant_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmShareGrant_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "opponentId" TEXT,
    "season" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" REAL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "teamId" TEXT,
    "positionGroupId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "sportContextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Film_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Film_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Film_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Film_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Film_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Film" ("category", "createdAt", "description", "durationSec", "id", "mimeType", "opponent", "originalFilename", "season", "sizeBytes", "sportContextId", "storageKey", "teamId", "title", "uploadedById", "visibility") SELECT "category", "createdAt", "description", "durationSec", "id", "mimeType", "opponent", "originalFilename", "season", "sizeBytes", "sportContextId", "storageKey", "teamId", "title", "uploadedById", "visibility" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
CREATE INDEX "Film_teamId_idx" ON "Film"("teamId");
CREATE INDEX "Film_uploadedById_idx" ON "Film"("uploadedById");
CREATE INDEX "Film_sportContextId_idx" ON "Film"("sportContextId");
CREATE INDEX "Film_positionGroupId_idx" ON "Film"("positionGroupId");
CREATE INDEX "Film_opponentId_idx" ON "Film"("opponentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FilmSharedWithUser_userId_idx" ON "FilmSharedWithUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FilmSharedWithUser_filmId_userId_key" ON "FilmSharedWithUser"("filmId", "userId");

-- CreateIndex
CREATE INDEX "PositionGroup_teamId_idx" ON "PositionGroup"("teamId");

-- CreateIndex
CREATE INDEX "PositionGroupMembership_userId_idx" ON "PositionGroupMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionGroupMembership_positionGroupId_userId_key" ON "PositionGroupMembership"("positionGroupId", "userId");

-- CreateIndex
CREATE INDEX "TeamPermissionGrant_teamId_userId_idx" ON "TeamPermissionGrant"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamPermissionGrant_positionGroupId_idx" ON "TeamPermissionGrant"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmTagDefinition_teamId_idx" ON "FilmTagDefinition"("teamId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_filmId_idx" ON "FilmTagInstance"("filmId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_clipId_idx" ON "FilmTagInstance"("clipId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_tagDefinitionId_idx" ON "FilmTagInstance"("tagDefinitionId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_athleteId_idx" ON "FilmTagInstance"("athleteId");

-- CreateIndex
CREATE INDEX "FilmComment_filmId_idx" ON "FilmComment"("filmId");

-- CreateIndex
CREATE INDEX "FilmComment_clipId_idx" ON "FilmComment"("clipId");

-- CreateIndex
CREATE INDEX "FilmComment_parentId_idx" ON "FilmComment"("parentId");

-- CreateIndex
CREATE INDEX "FilmAnnotation_filmId_idx" ON "FilmAnnotation"("filmId");

-- CreateIndex
CREATE INDEX "FilmAnnotation_clipId_idx" ON "FilmAnnotation"("clipId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_teamId_idx" ON "FilmPlaylist"("teamId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_positionGroupId_idx" ON "FilmPlaylist"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_ownerId_idx" ON "FilmPlaylist"("ownerId");

-- CreateIndex
CREATE INDEX "FilmPlaylistItem_playlistId_idx" ON "FilmPlaylistItem"("playlistId");

-- CreateIndex
CREATE INDEX "FilmAssignment_teamId_idx" ON "FilmAssignment"("teamId");

-- CreateIndex
CREATE INDEX "FilmAssignment_positionGroupId_idx" ON "FilmAssignment"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmAssignmentTarget_userId_idx" ON "FilmAssignmentTarget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FilmAssignmentTarget_assignmentId_userId_key" ON "FilmAssignmentTarget"("assignmentId", "userId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_filmId_idx" ON "FilmReviewRequest"("filmId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_athleteId_idx" ON "FilmReviewRequest"("athleteId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_coachId_idx" ON "FilmReviewRequest"("coachId");

-- CreateIndex
CREATE INDEX "CoachNote_athleteId_idx" ON "CoachNote"("athleteId");

-- CreateIndex
CREATE INDEX "CoachNote_coachId_idx" ON "CoachNote"("coachId");

-- CreateIndex
CREATE INDEX "FilmAnalysisTemplate_teamId_idx" ON "FilmAnalysisTemplate"("teamId");

-- CreateIndex
CREATE INDEX "FilmAnalysisCategory_templateId_idx" ON "FilmAnalysisCategory"("templateId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_templateId_idx" ON "FilmAnalysisEntry"("templateId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_categoryId_idx" ON "FilmAnalysisEntry"("categoryId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_athleteId_idx" ON "FilmAnalysisEntry"("athleteId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_filmId_idx" ON "FilmAnalysisEntry"("filmId");

-- CreateIndex
CREATE INDEX "FilmReport_teamId_idx" ON "FilmReport"("teamId");

-- CreateIndex
CREATE INDEX "FilmReport_positionGroupId_idx" ON "FilmReport"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmReportSource_reportId_idx" ON "FilmReportSource"("reportId");

-- CreateIndex
CREATE INDEX "Opponent_teamId_idx" ON "Opponent"("teamId");

-- CreateIndex
CREATE INDEX "ScoutReport_opponentId_idx" ON "ScoutReport"("opponentId");

-- CreateIndex
CREATE INDEX "ScoutReport_teamId_idx" ON "ScoutReport"("teamId");

-- CreateIndex
CREATE INDEX "ScoutReportTag_scoutReportId_idx" ON "ScoutReportTag"("scoutReportId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_fromTeamId_idx" ON "FilmShareGrant"("fromTeamId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_toTeamId_idx" ON "FilmShareGrant"("toTeamId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_filmId_idx" ON "FilmShareGrant"("filmId");

