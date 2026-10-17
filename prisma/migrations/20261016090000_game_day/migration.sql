CREATE TABLE "GameDay" (
 "id" TEXT NOT NULL PRIMARY KEY, "teamId" TEXT NOT NULL, "opponentName" TEXT NOT NULL,
 "homeName" TEXT NOT NULL, "homeLogo" TEXT, "awayLogo" TEXT, "startsAt" TIMESTAMP(3) NOT NULL,
 "venue" TEXT NOT NULL, "visitorInfo" TEXT NOT NULL DEFAULT '', "watchUrl" TEXT, "ticketUrl" TEXT,
 "published" BOOLEAN NOT NULL DEFAULT false, "scorerId" TEXT, "homeScore" INTEGER NOT NULL DEFAULT 0,
 "awayScore" INTEGER NOT NULL DEFAULT 0, "period" TEXT NOT NULL DEFAULT 'Pregame',
 "status" TEXT NOT NULL DEFAULT 'SCHEDULED', "version" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GameDay_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameDay_teamId_startsAt_idx" ON "GameDay"("teamId", "startsAt");
CREATE TABLE "GameScoreUpdate" (
 "id" TEXT NOT NULL PRIMARY KEY, "gameId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "version" INTEGER NOT NULL,
 "homeScore" INTEGER NOT NULL, "awayScore" INTEGER NOT NULL, "period" TEXT NOT NULL,
 "status" TEXT NOT NULL, "note" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "GameScoreUpdate_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameDay"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GameScoreUpdate_gameId_version_key" ON "GameScoreUpdate"("gameId", "version");
