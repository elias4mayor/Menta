-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrainingGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationLabel" TEXT,
    "order" INTEGER,
    "currentBlockId" TEXT,
    "currentProgramExerciseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingGroup_currentBlockId_fkey" FOREIGN KEY ("currentBlockId") REFERENCES "TrainingBlock" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingGroup_currentProgramExerciseId_fkey" FOREIGN KEY ("currentProgramExerciseId") REFERENCES "ProgramExercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingGroup" ("createdAt", "id", "name", "order", "sessionId", "stationLabel") SELECT "createdAt", "id", "name", "order", "sessionId", "stationLabel" FROM "TrainingGroup";
DROP TABLE "TrainingGroup";
ALTER TABLE "new_TrainingGroup" RENAME TO "TrainingGroup";
CREATE INDEX "TrainingGroup_sessionId_idx" ON "TrainingGroup"("sessionId");
CREATE INDEX "TrainingGroup_currentBlockId_idx" ON "TrainingGroup"("currentBlockId");
CREATE INDEX "TrainingGroup_currentProgramExerciseId_idx" ON "TrainingGroup"("currentProgramExerciseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
