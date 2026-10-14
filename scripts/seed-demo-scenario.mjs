#!/usr/bin/env node
/**
 * Seeds one complete, realistic, clearly-labeled demo scenario for the
 * Next Move Engine live demonstration (athlete + coach, connected loop).
 *
 * ISOLATION: every account this creates has an email on the
 * @menta-demo.local domain and a name prefixed "[MENTA DEMO]" — nothing
 * here can be confused with a real user, and reset-demo-scenario.mjs
 * only ever deletes rows matching that exact domain. Safe to run against
 * a shared dev database; does not touch any other data.
 *
 * Run: node scripts/seed-demo-scenario.mjs
 * Reset: node scripts/reset-demo-scenario.mjs
 *
 * What it sets up (see MENTA_ROADMAP.md "Live demonstration script" for
 * the full click-through):
 *   - A coach and two athletes on one real team.
 *   - The primary athlete (Jordan Carter) has real, competing signals
 *     across training, film, academics, recruiting, and a goal — seeded
 *     with real numbers so the engine's own scoring picks the winner,
 *     nothing is hardcoded to "look right."
 *   - A required film assignment overdue by 3 days is the one signal
 *     that's simultaneously the athlete's own top Next Move AND the
 *     coach's top coaching-queue item — the connected loop the demo
 *     is built to show.
 *   - A second athlete (Sam Rivera) has a lower-priority optional film
 *     assignment, so the coach's queue is a real ranked list, not a
 *     single item.
 *   - An open film question from Jordan gives the coach a second,
 *     already-real workflow to act on (/team/{id}/review-requests).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_DOMAIN = "menta-demo.local";
const DEMO_PASSWORD = "MentaDemo2027!";
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const coach = await prisma.user.create({
    data: {
      name: "[MENTA DEMO] Coach Avery Reed",
      email: `coach@${DEMO_DOMAIN}`,
      passwordHash,
      role: "COACH",
      emailVerified: new Date(),
    },
  });
  await prisma.coachProfile.create({ data: { userId: coach.id, onboardingCompletedAt: new Date() } });

  const jordan = await prisma.user.create({
    data: {
      name: "[MENTA DEMO] Jordan Carter",
      email: `jordan@${DEMO_DOMAIN}`,
      passwordHash,
      role: "ATHLETE",
      emailVerified: new Date(),
    },
  });
  await prisma.athleteProfile.create({
    data: {
      userId: jordan.id,
      sport: "Football",
      position: "Wide Receiver",
      graduationYear: 2027,
      trainingDaysPerWeek: 4,
      onboardingCompletedAt: new Date(),
    },
  });

  const sam = await prisma.user.create({
    data: {
      name: "[MENTA DEMO] Sam Rivera",
      email: `sam@${DEMO_DOMAIN}`,
      passwordHash,
      role: "ATHLETE",
      emailVerified: new Date(),
    },
  });
  await prisma.athleteProfile.create({
    data: { userId: sam.id, sport: "Football", position: "Cornerback", onboardingCompletedAt: new Date() },
  });

  const team = await prisma.team.create({
    data: {
      name: "[MENTA DEMO] Riverside Varsity Football",
      sport: "Football",
      inviteCode: `DEMO${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      createdById: coach.id,
      memberships: {
        create: [
          { userId: coach.id, teamRole: "COACH" },
          { userId: jordan.id, teamRole: "ATHLETE" },
          { userId: sam.id, teamRole: "ATHLETE" },
        ],
      },
    },
  });

  const film = await prisma.film.create({
    data: {
      title: "Week 4 Scrimmage — Full Game",
      category: "GAME",
      storageKey: "demo/placeholder",
      originalFilename: "week4-scrimmage.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1,
      teamId: team.id,
      visibility: "TEAM",
      uploadedById: coach.id,
    },
  });

  // The connective signal: required, 3 days overdue — this is what makes
  // both sides of the demo point at the same real thing.
  const requiredAssignment = await prisma.filmAssignment.create({
    data: {
      teamId: team.id,
      assignedById: coach.id,
      title: "Watch Week 4 scrimmage — release points",
      instructions: "Focus on your release off press coverage in the 2nd quarter.",
      filmId: film.id,
      dueAt: daysAgo(3),
      requiredViewing: true,
    },
  });
  await prisma.filmAssignmentTarget.create({
    data: { assignmentId: requiredAssignment.id, userId: jordan.id, status: "ASSIGNED" },
  });

  // Sam's lower-priority item, so the coach's queue is a real ranked list.
  const optionalAssignment = await prisma.filmAssignment.create({
    data: {
      teamId: team.id,
      assignedById: coach.id,
      title: "Optional: review your own coverage reps",
      filmId: film.id,
      dueAt: daysAgo(1),
      requiredViewing: false,
    },
  });
  await prisma.filmAssignmentTarget.create({
    data: { assignmentId: optionalAssignment.id, userId: sam.id, status: "ASSIGNED" },
  });

  // Jordan's open question — a second, already-real coach workflow.
  await prisma.filmReviewRequest.create({
    data: {
      filmId: film.id,
      athleteId: jordan.id,
      question: "Was my release off the line too slow on the slant route in the 2nd quarter?",
      status: "OPEN",
    },
  });

  // Competing athlete-side signals — training, academics, goal, recruiting
  // all genuinely present, so the engine's ranking is doing real work, not
  // just picking the only candidate that exists.
  await prisma.assignment.create({
    data: {
      userId: jordan.id,
      title: "Chemistry lab report",
      subject: "Chemistry",
      status: "NOT_STARTED",
      dueDate: daysAgo(2),
    },
  });
  await prisma.goal.create({
    data: {
      userId: jordan.id,
      title: "Improve 40-yard dash to 4.5s",
      category: "SPEED",
      status: "ACTIVE",
      progress: 60,
      targetDate: daysAgo(1),
    },
  });
  await prisma.recruitingSchool.create({
    data: { userId: jordan.id, name: "State University", division: "D1", status: "INTERESTED", priority: 1 },
  });
  await prisma.recruitingActivity.create({
    data: {
      userId: jordan.id,
      type: "EMAIL_DRAFT",
      subject: "Initial interest email",
      body: "Logged initial outreach.",
      createdAt: daysAgo(20),
    },
  });
  const oldWorkout = await prisma.workout.create({
    data: { title: "Route-running speed circuit", category: "SPEED", createdById: coach.id, teamId: team.id },
  });
  await prisma.workoutCompletion.create({
    data: { workoutId: oldWorkout.id, userId: jordan.id, completedAt: daysAgo(5) },
  });

  console.log("Demo scenario seeded.\n");
  console.log("Login at /login with password:", DEMO_PASSWORD);
  console.log("  Coach:  coach@menta-demo.local");
  console.log("  Athlete (primary): jordan@menta-demo.local");
  console.log("  Athlete (secondary): sam@menta-demo.local");
  console.log("\nSee MENTA_ROADMAP.md 'Live demonstration script' for the full click-through.");
  console.log("Reset with: node scripts/reset-demo-scenario.mjs");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
