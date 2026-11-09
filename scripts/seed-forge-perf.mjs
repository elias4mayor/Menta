import { createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const RACKS = 20;
const ATHLETES_PER_RACK = 5;
const SPORTS = ["Football", "Basketball", "Volleyball", "Soccer", "Track & Field"];

function requireLoopbackDatabase(name) {
  const url = new URL(process.env[name] ?? "");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/menta_forge_perf") {
    throw new Error(`${name} must point to a disposable loopback menta_forge_perf database`);
  }
}

async function measureClock(prisma) {
  const estimates = [];
  for (let sample = 0; sample < 10; sample++) {
    const before = performance.timeOrigin + performance.now();
    const [row] = await prisma.$queryRaw`SELECT (extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "nowMs"`;
    const after = performance.timeOrigin + performance.now();
    estimates.push({
      databaseMinusRunnerMs: row.nowMs - (before + after) / 2,
      clockUncertaintyMs: (after - before) / 2 + 1,
    });
  }
  return estimates.sort((a, b) => a.clockUncertaintyMs - b.clockUncertaintyMs)[0];
}

async function main() {
  requireLoopbackDatabase("DATABASE_URL");
  requireLoopbackDatabase("DATABASE_URL_POOLED");
  const origin = new URL(process.env.FORGE_PERF_ORIGIN ?? "");
  const secret = process.env.SESSION_SECRET;
  const output = process.argv[2];
  if (!["localhost", "127.0.0.1"].includes(origin.hostname) || !secret || !output) {
    throw new Error("Provide a loopback origin, an isolated session secret, and an output directory");
  }

  const prisma = new PrismaClient();
  try {
    const fixture = await prisma.$transaction(async (tx) => {
      if (await tx.user.count()) throw new Error("Start with an empty disposable Forge database");
      const now = new Date();
      const coach = await tx.user.create({
        data: { id: "forge-perf-coach", name: "Forge fixture coach", email: "coach@forge.invalid", role: "COACH", emailVerified: now },
      });
      const athletes = Array.from({ length: RACKS * ATHLETES_PER_RACK }, (_, i) => ({
        id: `forge-perf-athlete-${i + 1}`,
        name: `Fixture athlete ${i + 1}`,
        email: `athlete-${i + 1}@forge.invalid`,
        emailVerified: now,
      }));
      await tx.user.createMany({ data: athletes });
      await tx.athleteProfile.createMany({
        data: athletes.map(({ id }, i) => ({ userId: id, sport: SPORTS[i % SPORTS.length], onboardingCompletedAt: now })),
      });
      await tx.athleteSportContext.createMany({
        data: athletes.map(({ id }, i) => ({ userId: id, sport: SPORTS[i % SPORTS.length], isPrimary: true })),
      });
      const team = await tx.team.create({
        data: { id: "forge-perf-team", name: "Forge fixture team", inviteCode: "FORGEPERF", createdById: coach.id },
      });
      await tx.teamMembership.createMany({
        data: [
          { teamId: team.id, userId: coach.id, teamRole: "COACH" },
          ...athletes.map(({ id }) => ({ teamId: team.id, userId: id, teamRole: "ATHLETE" })),
        ],
      });

      const exercise = await tx.exercise.create({
        data: { name: "Fixture squat", category: "STRENGTH", createdById: coach.id, teamId: team.id },
      });
      const program = await tx.trainingProgram.create({
        data: { title: "Forge fixture program", createdById: coach.id, teamId: team.id },
      });
      const block = await tx.trainingBlock.create({
        data: { programId: program.id, title: "Strength", order: 0 },
      });
      const slot = await tx.programExercise.create({
        data: { blockId: block.id, exerciseId: exercise.id, order: 0, targetSets: 4, targetReps: "5", restSec: 60 },
      });
      const pointers = { currentBlockId: block.id, currentProgramExerciseId: slot.id };
      const session = await tx.trainingSession.create({
        data: {
          id: "forge-perf-session", title: "Forge fixture lift", teamId: team.id, programId: program.id,
          status: "LIVE", startedAt: now, createdById: coach.id, ...pointers,
        },
      });
      const racks = Array.from({ length: RACKS }, (_, i) => ({
        id: `forge-perf-rack-${i + 1}`, name: `Rack ${i + 1}`, sessionId: session.id, ...pointers,
      }));
      await tx.trainingGroup.createMany({ data: racks });
      await tx.trainingGroupMember.createMany({
        data: athletes.map(({ id }, i) => ({
          athleteId: id, sessionId: session.id, groupId: racks[Math.floor(i / ATHLETES_PER_RACK)].id,
        })),
      });

      const tokens = [coach.id, athletes[0].id].map((userId) => ({
        userId, value: randomBytes(32).toString("hex"),
      }));
      await tx.session.createMany({
        data: tokens.map(({ userId, value }) => ({
          userId, tokenHash: createHmac("sha256", secret).update(value).digest("hex"),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        })),
      });
      const path = `/teams/${team.id}/sessions/${session.id}`;
      return {
        receiverPath: `/team/${team.id}/sessions/${session.id}/display?perf=1`,
        tokens,
        mutations: athletes.map(({ id }, i) => ({
          id, method: "POST", path: `/api${path}/sets`,
          body: {
            athleteId: id, groupId: racks[Math.floor(i / ATHLETES_PER_RACK)].id,
            programExerciseId: slot.id, setNumber: 1, reps: 5,
          },
        })),
      };
    }, { timeout: 30_000 });

    await mkdir(output, { recursive: true, mode: 0o700 });
    const files = ["coach.json", "athlete.json"];
    await Promise.all(fixture.tokens.map(({ value }, i) => writeFile(join(output, files[i]), JSON.stringify({
      cookies: [{
        name: "menta_session", value, domain: origin.hostname, path: "/",
        expires: -1, httpOnly: true, secure: origin.protocol === "https:", sameSite: "Lax",
      }],
      origins: [],
    }), { mode: 0o600, flag: "wx" })));
    await writeFile(join(output, "fixture.json"), JSON.stringify({
      origin: origin.origin, receiverPath: fixture.receiverPath, mutations: fixture.mutations,
      ...await measureClock(prisma),
    }, null, 2), { mode: 0o600, flag: "wx" });
    console.log(`Seeded ${fixture.mutations.length} synthetic athletes across ${RACKS} racks.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.split("\n")[0] : "Forge fixture setup failed");
  process.exitCode = 1;
});
