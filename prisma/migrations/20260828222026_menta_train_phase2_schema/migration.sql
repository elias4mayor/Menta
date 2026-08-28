-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT,
    "sport" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "movementPattern" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "coachingCues" TEXT,
    "videoUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exercise_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "sport" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingProgram_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingProgram_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingProgram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blockType" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingBlock_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "targetLoad" REAL,
    "targetLoadPercent" REAL,
    "targetLoadUnit" TEXT,
    "tempo" TEXT,
    "restSec" INTEGER,
    "durationSec" REAL,
    "distanceMeters" REAL,
    "rpeTarget" REAL,
    "supersetGroup" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "TrainingBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AthletePrescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programExerciseId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "prescribedLoad" REAL,
    "prescribedLoadUnit" TEXT,
    "prescribedReps" TEXT,
    "prescribedSets" INTEGER,
    "calculationBasis" TEXT,
    "setById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AthletePrescription_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "ProgramExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AthletePrescription_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AthletePrescription_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "programId" TEXT,
    "positionGroupId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "pausedAt" DATETIME,
    "completedAt" DATETIME,
    "currentBlockId" TEXT,
    "currentProgramExerciseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_currentBlockId_fkey" FOREIGN KEY ("currentBlockId") REFERENCES "TrainingBlock" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_currentProgramExerciseId_fkey" FOREIGN KEY ("currentProgramExerciseId") REFERENCES "ProgramExercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationLabel" TEXT,
    "order" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingGroupMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingGroupMember_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "programExerciseId" TEXT,
    "groupId" TEXT,
    "athleteId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" REAL,
    "weightUnit" TEXT,
    "rpe" REAL,
    "durationSec" REAL,
    "distanceMeters" REAL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" DATETIME,
    CONSTRAINT "TrainingSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainingSet_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "ProgramExercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingSet_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingSet_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Exercise_teamId_idx" ON "Exercise"("teamId");

-- CreateIndex
CREATE INDEX "Exercise_sport_idx" ON "Exercise"("sport");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE INDEX "Exercise_createdById_idx" ON "Exercise"("createdById");

-- CreateIndex
CREATE INDEX "TrainingProgram_teamId_idx" ON "TrainingProgram"("teamId");

-- CreateIndex
CREATE INDEX "TrainingProgram_positionGroupId_idx" ON "TrainingProgram"("positionGroupId");

-- CreateIndex
CREATE INDEX "TrainingProgram_createdById_idx" ON "TrainingProgram"("createdById");

-- CreateIndex
CREATE INDEX "TrainingBlock_programId_idx" ON "TrainingBlock"("programId");

-- CreateIndex
CREATE INDEX "ProgramExercise_blockId_idx" ON "ProgramExercise"("blockId");

-- CreateIndex
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "AthletePrescription_athleteId_idx" ON "AthletePrescription"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthletePrescription_programExerciseId_athleteId_key" ON "AthletePrescription"("programExerciseId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSession_teamId_idx" ON "TrainingSession"("teamId");

-- CreateIndex
CREATE INDEX "TrainingSession_programId_idx" ON "TrainingSession"("programId");

-- CreateIndex
CREATE INDEX "TrainingSession_positionGroupId_idx" ON "TrainingSession"("positionGroupId");

-- CreateIndex
CREATE INDEX "TrainingSession_status_idx" ON "TrainingSession"("status");

-- CreateIndex
CREATE INDEX "TrainingSession_currentBlockId_idx" ON "TrainingSession"("currentBlockId");

-- CreateIndex
CREATE INDEX "TrainingSession_currentProgramExerciseId_idx" ON "TrainingSession"("currentProgramExerciseId");

-- CreateIndex
CREATE INDEX "TrainingGroup_sessionId_idx" ON "TrainingGroup"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingGroupMember_groupId_idx" ON "TrainingGroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingGroupMember_sessionId_athleteId_key" ON "TrainingGroupMember"("sessionId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_sessionId_idx" ON "TrainingSet"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingSet_teamId_idx" ON "TrainingSet"("teamId");

-- CreateIndex
CREATE INDEX "TrainingSet_athleteId_idx" ON "TrainingSet"("athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_exerciseId_idx" ON "TrainingSet"("exerciseId");

-- CreateIndex
CREATE INDEX "TrainingSet_programExerciseId_idx" ON "TrainingSet"("programExerciseId");

-- CreateIndex
CREATE INDEX "TrainingSet_groupId_idx" ON "TrainingSet"("groupId");

-- CreateIndex
CREATE INDEX "TrainingSet_sessionId_athleteId_idx" ON "TrainingSet"("sessionId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_loggedAt_idx" ON "TrainingSet"("loggedAt");
