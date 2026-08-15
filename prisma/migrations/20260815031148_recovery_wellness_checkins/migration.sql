-- CreateTable
CREATE TABLE "WellnessCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sleepHours" REAL,
    "sleepQuality" INTEGER,
    "energy" INTEGER,
    "soreness" INTEGER,
    "stress" INTEGER,
    "mood" INTEGER,
    "readiness" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WellnessCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WellnessCheckIn_userId_idx" ON "WellnessCheckIn"("userId");

-- CreateIndex
CREATE INDEX "WellnessCheckIn_userId_date_idx" ON "WellnessCheckIn"("userId", "date");
