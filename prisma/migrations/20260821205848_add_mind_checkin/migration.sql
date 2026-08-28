-- CreateTable
CREATE TABLE "MindCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pressure" INTEGER,
    "confidence" INTEGER,
    "focus" INTEGER,
    "readiness" INTEGER,
    "todayGoal" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MindCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MindCheckIn_userId_idx" ON "MindCheckIn"("userId");

-- CreateIndex
CREATE INDEX "MindCheckIn_userId_date_idx" ON "MindCheckIn"("userId", "date");
