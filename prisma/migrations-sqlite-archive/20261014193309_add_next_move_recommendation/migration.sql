-- CreateTable
CREATE TABLE "NextMoveRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "actionHref" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "NextMoveRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NextMoveRecommendation_userId_status_idx" ON "NextMoveRecommendation"("userId", "status");

-- CreateIndex
CREATE INDEX "NextMoveRecommendation_userId_createdAt_idx" ON "NextMoveRecommendation"("userId", "createdAt");

