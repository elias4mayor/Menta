// One-time/idempotent backfill for the multi-sport foundation: creates one
// AthleteSportContext (isPrimary=true, isActive=true) per existing
// AthleteProfile that already has a sport set, mirroring that profile's
// sport/position exactly as they are today. Run manually:
//
//   node prisma/backfill-athlete-sport-contexts.mjs
//
// Deliberately does NOT touch Workout/PerformanceEntry/Goal/
// RecruitingSchool/Film — their sportContextId stays null (legacy/
// ungrouped) rather than guessing which historical rows belong to which
// sport. Safe to re-run: skipped per-user via the AthleteSportContext
// @@unique([userId, sport]) constraint (upsert), so it never duplicates a
// context and never overwrites one that's already been edited by the app.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.athleteProfile.findMany({
    where: { sport: { not: null } },
    include: { user: { include: { memberships: { include: { team: true } } } } },
  });

  console.log(`Found ${profiles.length} athlete profile(s) with a sport set.`);

  let created = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const existing = await prisma.athleteSportContext.findUnique({
      where: { userId_sport: { userId: profile.userId, sport: profile.sport } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Only attach a teamId if exactly one of the athlete's teams is for
    // this sport — otherwise leave it null rather than guessing.
    const matchingTeams = profile.user.memberships
      .map((m) => m.team)
      .filter((team) => team.sport === profile.sport);
    const teamId = matchingTeams.length === 1 ? matchingTeams[0].id : null;

    await prisma.athleteSportContext.create({
      data: {
        userId: profile.userId,
        sport: profile.sport,
        position: profile.position,
        teamId,
        isPrimary: true,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`Created ${created} AthleteSportContext row(s), skipped ${skipped} already-backfilled athlete(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
