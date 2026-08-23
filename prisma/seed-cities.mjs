// One-time/idempotent loader for the City table — reads the committed real
// dataset (src/lib/data/cities-seed.json, 152,307 real cities) and inserts
// it in batches (SQLite has a bound-parameter limit per statement, so a
// single createMany() for the whole file isn't possible). Run manually:
//
//   node prisma/seed-cities.mjs
//
// Safe to re-run: skips entirely if the table already has rows, so it
// never duplicates data or touches anything else in the database.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const BATCH_SIZE = 900; // 3 columns/row * 900 < SQLite's ~32k bound-parameter ceiling, comfortably

async function main() {
  const existing = await prisma.city.count();
  if (existing > 0) {
    console.log(`City table already has ${existing} rows — skipping seed.`);
    return;
  }

  const dataPath = path.join(__dirname, "..", "src", "lib", "data", "cities-seed.json");
  const cities = JSON.parse(readFileSync(dataPath, "utf8"));
  console.log(`Seeding ${cities.length} real cities...`);

  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);
    await prisma.city.createMany({
      data: batch.map((c) => ({ name: c.name, countryCode: c.countryCode, stateCode: c.stateCode })),
    });
    if (i % (BATCH_SIZE * 20) === 0) {
      console.log(`  ${Math.min(i + BATCH_SIZE, cities.length)} / ${cities.length}`);
    }
  }

  const total = await prisma.city.count();
  console.log(`Done. City table now has ${total} rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
