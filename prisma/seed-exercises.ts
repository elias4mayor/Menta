import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  WARM_UP_POOL,
  COOLDOWN_POOL,
  FOOTWORK_DRILLS,
  QUARTERBACK_DRILLS,
  RECEIVER_DRILLS,
  RUNNING_BACK_DRILLS,
  DEFENSIVE_DRILLS,
  GENERAL_ATHLETIC_DRILLS,
  STRENGTH_DRILLS,
  SPEED_DRILLS,
  CONDITIONING_DRILLS,
  MOBILITY_DRILLS,
  RECOVERY_DRILLS,
  GENERIC_SKILL_POOL,
  type Drill,
} from "../src/lib/workout-generator";

/**
 * Seeds the MENTA-curated global Exercise library (teamId: null) from the
 * real drill content already written in src/lib/workout-generator.ts —
 * the same ~70 drills that back the deterministic Workout Generator UI.
 * Nothing here is invented: every name/instructions/cue/equipment value
 * is copied from that file, not authored fresh. Fields with no reliable
 * per-drill source data (movementPattern, videoUrl) are left null rather
 * than guessed — see the field-mapping notes below.
 *
 * Idempotent: re-running this script does not create duplicates. Each
 * drill is looked up by (teamId: null, name, category) before insert;
 * an existing match is left untouched rather than updated, so any
 * manual edits a coach/admin makes later to a seeded row survive a
 * re-seed.
 */

const prisma = new PrismaClient();

const SYSTEM_USER_EMAIL = "menta-system@menta.internal";

type PoolMapping = {
  pool: Drill[];
  category: string;
  sport: string | null;
  positions: string[] | null;
};

// Category assignment mirrors exactly how src/lib/workout-generator.ts's
// own poolFor()/skillPoolFor()/NON_SKILL_POOLS already use each pool —
// this mapping doesn't invent any new categorization, it just names the
// categorization the generator code already encodes structurally.
const POOL_MAPPINGS: PoolMapping[] = [
  { pool: WARM_UP_POOL, category: "WARMUP", sport: null, positions: null },
  { pool: COOLDOWN_POOL, category: "COOLDOWN", sport: null, positions: null },
  { pool: FOOTWORK_DRILLS, category: "AGILITY", sport: null, positions: null },
  { pool: STRENGTH_DRILLS, category: "STRENGTH", sport: null, positions: null },
  { pool: SPEED_DRILLS, category: "SPEED", sport: null, positions: null },
  { pool: CONDITIONING_DRILLS, category: "CONDITIONING", sport: null, positions: null },
  { pool: MOBILITY_DRILLS, category: "MOBILITY", sport: null, positions: null },
  { pool: RECOVERY_DRILLS, category: "RECOVERY", sport: null, positions: null },
  { pool: GENERIC_SKILL_POOL, category: "SKILL", sport: null, positions: null },
  { pool: QUARTERBACK_DRILLS, category: "SKILL", sport: "Football", positions: ["Quarterback"] },
  { pool: RECEIVER_DRILLS, category: "SKILL", sport: "Football", positions: ["Wide Receiver", "Tight End"] },
  { pool: RUNNING_BACK_DRILLS, category: "SKILL", sport: "Football", positions: ["Running Back"] },
  {
    pool: DEFENSIVE_DRILLS,
    category: "SKILL",
    sport: "Football",
    positions: ["Defensive Line", "Linebacker", "Cornerback", "Safety"],
  },
  {
    // The exact fallback pool skillPoolFor() reaches for when a Football
    // athlete plays offensive line, a specialist spot, or has no position
    // set — see the comment on skillPoolFor() in workout-generator.ts.
    pool: GENERAL_ATHLETIC_DRILLS,
    category: "SKILL",
    sport: "Football",
    positions: ["Offensive Line"],
  },
];

async function getOrCreateSystemUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL }, select: { id: true } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      name: "MENTA System",
      email: SYSTEM_USER_EMAIL,
      // Never a real, usable credential — long random hex, no signup/login
      // flow ever produces or checks against this value.
      passwordHash: `unusable:${crypto.randomUUID()}`,
      role: "MENTA_STAFF",
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

function buildInstructions(drill: Drill): string {
  return drill.volume ? `Typical volume: ${drill.volume}. ${drill.instructions}` : drill.instructions;
}

async function seedDrill(drill: Drill, mapping: PoolMapping, createdById: string): Promise<"created" | "skipped"> {
  const existing = await prisma.exercise.findFirst({
    where: { teamId: null, name: drill.name, category: mapping.category },
    select: { id: true },
  });
  if (existing) return "skipped";

  await prisma.exercise.create({
    data: {
      teamId: null,
      sport: mapping.sport,
      name: drill.name,
      category: mapping.category,
      positions: mapping.positions ? JSON.stringify(mapping.positions) : null,
      movementPattern: null,
      equipment: drill.equipment.length > 0 ? JSON.stringify(drill.equipment) : null,
      instructions: buildInstructions(drill),
      coachingCues: drill.cue,
      videoUrl: null,
      createdById,
    },
  });
  return "created";
}

async function main() {
  const createdById = await getOrCreateSystemUser();

  let created = 0;
  let skipped = 0;
  for (const mapping of POOL_MAPPINGS) {
    for (const drill of mapping.pool) {
      const result = await seedDrill(drill, mapping, createdById);
      if (result === "created") created++;
      else skipped++;
    }
  }

  const totalGlobal = await prisma.exercise.count({ where: { teamId: null } });
  console.log(
    JSON.stringify({ created, skipped, totalGlobalExercisesAfterRun: totalGlobal }, null, 2)
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
