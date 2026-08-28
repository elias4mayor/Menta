import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { readFileSync } from "fs";
import path from "path";

export const testPrisma = new PrismaClient();

/**
 * Embedded in every email this suite creates, and the ONLY thing
 * cleanupE2eUsers() matches on. The dev database already has years of
 * leftover accounts from ad hoc QA scripts across this project's history
 * (some using this exact @example.test domain) — sweeping by domain alone
 * would delete rows this suite didn't create and doesn't understand the
 * shape of. Scoping to one run's unique id means cleanup only ever touches
 * what this run itself created.
 */
export const E2E_RUN_ID = `run${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

function loadSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const envPath = path.join(__dirname, "..", ".env");
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^SESSION_SECRET="?([^"\n]+)"?/m);
  if (!match) throw new Error("SESSION_SECRET not found in .env — can't mint a real session for API tests.");
  return match[1];
}

function hashToken(token: string): string {
  return crypto.createHmac("sha256", loadSessionSecret()).update(token).digest("hex");
}

/**
 * Creates a real, fully-onboarded athlete with a real, valid session row —
 * the same session.ts machinery the app itself uses, just minted directly
 * against the database instead of via the signup/verify/onboarding UI.
 * This is test setup, not a mock: every API test that uses the returned
 * cookie exercises the real getSessionUser() → route handler → Prisma
 * path, exactly like a real signed-in athlete would.
 */
export async function createTestAthlete(tag: string, sport: string, position: string) {
  const email = `e2e-api-${E2E_RUN_ID}-${tag}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const user = await testPrisma.user.create({
    data: { name: "E2E API Athlete", email, passwordHash: "x", role: "ATHLETE", emailVerified: new Date() },
  });
  await testPrisma.athleteProfile.create({
    data: { userId: user.id, sport, position, onboardingCompletedAt: new Date() },
  });
  await testPrisma.athleteSportContext.create({
    data: { userId: user.id, sport, position, isPrimary: true, isActive: true },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await testPrisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) },
  });

  return { userId: user.id, email, cookie: `menta_session=${token}` };
}

/**
 * Creates a real, email-verified user with the given role and a real,
 * valid session row — same minting approach as createTestAthlete, but
 * without an AthleteProfile/AthleteSportContext, for tests that need a
 * coach, a second athlete, or any other role as a plain team member.
 */
export async function createTestUser(tag: string, role: string) {
  const email = `e2e-api-${E2E_RUN_ID}-${tag}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const user = await testPrisma.user.create({
    data: { name: `E2E API ${role}`, email, passwordHash: "x", role, emailVerified: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await testPrisma.session.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) },
  });

  return { userId: user.id, email, cookie: `menta_session=${token}` };
}

/**
 * A real Team row plus a TeamMembership for each given user — the minimum
 * setup Film Center / position-group tests need instead of going through
 * the create-team-then-join-by-invite-code UI flow.
 */
export async function createTestTeam(
  createdById: string,
  members: { userId: string; teamRole: string }[] = []
) {
  const team = await testPrisma.team.create({
    data: {
      name: `E2E Team ${E2E_RUN_ID}`,
      inviteCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdById,
      memberships: { create: members },
    },
  });
  return team;
}

/**
 * Deletes every e2e-created user, and everything hanging off them. Most
 * child tables cascade on User deletion, but AuditLog.actor and
 * Workout.createdBy intentionally don't (an audit trail and a coach's
 * workout library should outlive the person, in the real product) — those
 * two get deleted explicitly first so the real FK constraint doesn't
 * block cleanup.
 */
export async function cleanupE2eUsers() {
  const users = await testPrisma.user.findMany({
    where: { email: { contains: E2E_RUN_ID } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;

  await testPrisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await testPrisma.workout.deleteMany({ where: { createdById: { in: ids } } });
  await testPrisma.user.deleteMany({ where: { id: { in: ids } } });
}
