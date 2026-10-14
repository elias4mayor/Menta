#!/usr/bin/env node
/**
 * Removes everything created by seed-demo-scenario.mjs — matches ONLY the
 * @menta-demo.local email domain, so it can never touch a real account.
 * Idempotent: safe to run even if the demo was never seeded, or was
 * partially seeded.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@menta-demo.local" } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);

  await prisma.team.deleteMany({ where: { name: { startsWith: "[MENTA DEMO]" } } });
  if (ids.length > 0) {
    await prisma.workout.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  console.log(`Removed ${ids.length} demo user(s) and all associated demo data.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
