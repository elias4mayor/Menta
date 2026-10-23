-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "stateCode" TEXT
);

-- CreateIndex
CREATE INDEX "City_countryCode_stateCode_name_idx" ON "City"("countryCode", "stateCode", "name");

-- CreateIndex
CREATE INDEX "City_countryCode_name_idx" ON "City"("countryCode", "name");
