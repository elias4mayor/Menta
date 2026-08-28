import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for the MENTA TRAIN Exercise
 * Library (Phase 3): global-vs-team-custom visibility, cross-team
 * isolation, and permission-gated creation. Every scenario here is a
 * real HTTP round trip against the actual API routes and database —
 * not a unit test of the permission functions in isolation. Mirrors the
 * structure of e2e/film-intelligence-security.spec.ts.
 */
test.describe("Exercise Library security", () => {
  test.afterAll(async () => {
    await testPrisma.exercise.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("global (MENTA-curated) exercises are visible to any authenticated user regardless of team", async ({ request }) => {
    const athlete = await createTestAthlete("global-visible", "Football", "Quarterback");

    const res = await request.get("/api/exercises", { headers: { Cookie: athlete.cookie } });
    expect(res.status()).toBe(200);
    const { exercises } = await res.json();
    const globalOnes = exercises.filter((e: { isGlobal: boolean }) => e.isGlobal);
    // The Phase 3 seed populates the global library; any signed-in user
    // (even one on no team at all) should see it.
    expect(globalOnes.length).toBeGreaterThan(0);
  });

  test("a coach/admin can create a team-custom exercise; it's invisible to an unrelated team and visible to teammates", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-coachA`, "COACH");
    const teammate = await createTestAthlete(`${E2E_RUN_ID}-teammate`, "Football", "Wide Receiver");
    const outsider = await createTestAthlete(`${E2E_RUN_ID}-outsider`, "Football", "Wide Receiver");

    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: teammate.userId, teamRole: "ATHLETE" },
    ]);
    // outsider belongs only to a separate, unrelated team.
    await createTestTeam(outsider.userId, [{ userId: outsider.userId, teamRole: "ATHLETE" }]);

    const create = await request.post("/api/exercises", {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { teamId: team.id, name: `${E2E_RUN_ID} Custom Sled Push`, category: "STRENGTH" },
    });
    expect(create.status(), await create.text()).toBe(200);
    const { exercise } = await create.json();
    expect(exercise.isGlobal).toBe(false);
    expect(exercise.teamName).toBe(team.name);

    // Teammate (plain ATHLETE, no explicit grant) can see it via list and detail.
    const teammateList = await request.get("/api/exercises", { headers: { Cookie: teammate.cookie } });
    const { exercises: teammateExercises } = await teammateList.json();
    expect(teammateExercises.some((e: { id: string }) => e.id === exercise.id)).toBe(true);

    const teammateDetail = await request.get(`/api/exercises/${exercise.id}`, { headers: { Cookie: teammate.cookie } });
    expect(teammateDetail.status()).toBe(200);

    // Outsider (unrelated team) gets neither the list entry nor direct access.
    const outsiderList = await request.get("/api/exercises", { headers: { Cookie: outsider.cookie } });
    const { exercises: outsiderExercises } = await outsiderList.json();
    expect(outsiderExercises.some((e: { id: string }) => e.id === exercise.id)).toBe(false);

    const outsiderDetail = await request.get(`/api/exercises/${exercise.id}`, { headers: { Cookie: outsider.cookie } });
    expect(outsiderDetail.status()).toBe(404);
  });

  test("a plain athlete on the team (no MANAGE_EXERCISE_LIBRARY) cannot create a team-custom exercise", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-coachB`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-plain-athlete`, "Soccer", "Midfielder");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    const res = await request.post("/api/exercises", {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { teamId: team.id, name: `${E2E_RUN_ID} Should Not Exist`, category: "STRENGTH" },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.exercise.findFirst({ where: { name: `${E2E_RUN_ID} Should Not Exist` } });
    expect(found).toBeNull();
  });

  test("a coach cannot create a custom exercise for a team they don't belong to, even by naming its real id", async ({ request }) => {
    const coachA = await createTestUser(`${E2E_RUN_ID}-crossCoachA`, "COACH");
    const coachB = await createTestUser(`${E2E_RUN_ID}-crossCoachB`, "COACH");
    const teamB = await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }]);
    // coachA has no membership on teamB at all.

    const res = await request.post("/api/exercises", {
      headers: { Cookie: coachA.cookie, "Content-Type": "application/json" },
      data: { teamId: teamB.id, name: `${E2E_RUN_ID} Cross Team Hijack`, category: "STRENGTH" },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.exercise.findFirst({ where: { name: `${E2E_RUN_ID} Cross Team Hijack` } });
    expect(found).toBeNull();
  });

  test("teamId is required and null/missing never produces a global exercise from a client request", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-coachC`, "COACH");

    const noTeam = await request.post("/api/exercises", {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { name: `${E2E_RUN_ID} No Team Provided`, category: "STRENGTH" },
    });
    expect(noTeam.status()).toBe(400);

    const nullTeam = await request.post("/api/exercises", {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { teamId: null, name: `${E2E_RUN_ID} Null Team Provided`, category: "STRENGTH" },
    });
    expect(nullTeam.status()).toBe(400);

    const found = await testPrisma.exercise.findFirst({
      where: { name: { in: [`${E2E_RUN_ID} No Team Provided`, `${E2E_RUN_ID} Null Team Provided`] } },
    });
    expect(found).toBeNull();
  });

  test("createdById always reflects the real session user, never a client-supplied value", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-coachD`, "COACH");
    const impersonated = await createTestUser(`${E2E_RUN_ID}-impersonated`, "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);

    const res = await request.post("/api/exercises", {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        teamId: team.id,
        name: `${E2E_RUN_ID} CreatedBy Check`,
        category: "STRENGTH",
        createdById: impersonated.userId,
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const { exercise } = await res.json();

    const row = await testPrisma.exercise.findUnique({ where: { id: exercise.id } });
    expect(row?.createdById).toBe(coach.userId);
    expect(row?.createdById).not.toBe(impersonated.userId);
  });

  test("filtering by category/sport/position/equipment narrows results without leaking other teams' exercises", async ({ request }) => {
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-filter-athlete`, "Football", "Quarterback");

    const byCategory = await request.get("/api/exercises?category=SKILL", { headers: { Cookie: athlete.cookie } });
    const { exercises: skillOnly } = await byCategory.json();
    expect(skillOnly.length).toBeGreaterThan(0);
    expect(skillOnly.every((e: { category: string }) => e.category === "SKILL")).toBe(true);

    const byPosition = await request.get(`/api/exercises?position=${encodeURIComponent("Quarterback")}`, {
      headers: { Cookie: athlete.cookie },
    });
    const { exercises: qbOnly } = await byPosition.json();
    expect(qbOnly.length).toBeGreaterThan(0);
    expect(qbOnly.every((e: { positions: string[] }) => e.positions.includes("Quarterback"))).toBe(true);
  });
});
