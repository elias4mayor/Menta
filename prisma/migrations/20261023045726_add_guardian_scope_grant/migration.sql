-- CreateTable
CREATE TABLE "GuardianScopeGrant" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianScopeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuardianScopeGrant_athleteId_idx" ON "GuardianScopeGrant"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianScopeGrant_guardianId_athleteId_scope_key" ON "GuardianScopeGrant"("guardianId", "athleteId", "scope");

-- AddForeignKey
ALTER TABLE "GuardianScopeGrant" ADD CONSTRAINT "GuardianScopeGrant_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianScopeGrant" ADD CONSTRAINT "GuardianScopeGrant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
