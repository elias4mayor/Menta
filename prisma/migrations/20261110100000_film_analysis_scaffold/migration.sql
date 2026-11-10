-- CreateTable
CREATE TABLE "FilmAnalysisJob" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "allowedCueIds" TEXT[] NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAnalysisJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FilmAnalysisJob_window_check" CHECK ("startMs" >= 0 AND "endMs" > "startMs")
);

-- CreateTable
CREATE TABLE "FilmAnalysisReport" (
    "jobId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAnalysisReport_pkey" PRIMARY KEY ("jobId")
);

-- CreateIndex
CREATE INDEX "FilmAnalysisJob_filmId_idx" ON "FilmAnalysisJob"("filmId");

-- CreateIndex
CREATE INDEX "FilmAnalysisJob_subjectId_idx" ON "FilmAnalysisJob"("subjectId");

-- CreateIndex
CREATE INDEX "FilmAnalysisJob_requestedById_idx" ON "FilmAnalysisJob"("requestedById");

-- AddForeignKey
ALTER TABLE "FilmAnalysisJob" ADD CONSTRAINT "FilmAnalysisJob_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisJob" ADD CONSTRAINT "FilmAnalysisJob_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisJob" ADD CONSTRAINT "FilmAnalysisJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisReport" ADD CONSTRAINT "FilmAnalysisReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "FilmAnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
