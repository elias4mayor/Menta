-- CreateTable
CREATE TABLE "NextMoveRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectAthleteId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "actionHref" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "NextMoveRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NextMoveRecommendation_userId_status_idx" ON "NextMoveRecommendation"("userId", "status");

-- CreateIndex
CREATE INDEX "NextMoveRecommendation_userId_createdAt_idx" ON "NextMoveRecommendation"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "NextMoveRecommendation" ADD CONSTRAINT "NextMoveRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
