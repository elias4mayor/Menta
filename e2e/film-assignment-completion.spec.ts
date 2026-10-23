import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * /api/assignments/[id]/targets/me is the one real completion endpoint
 * behind both the /assignments page (AssignmentsList.tsx) and the new
 * film-page completion banner (FilmAssignmentBanner.tsx) — there is no
 * second completion system. These tests exercise that shared endpoint
 * directly: authorization (scoped to the caller's own FilmAssignmentTarget
 * row via the assignmentId_userId unique key, so completing another
 * athlete's assignment is structurally impossible, not just
 * permission-checked), completion, and that it's the same write the Next
 * Move Engine and Coach Queue already reconcile against — completing it
 * here resolves both sides exactly like completing it from /assignments
 * does.
 */
test.describe("Film assignment completion endpoint", () => {
  test.afterAll(async () => {
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("unauthenticated requests are rejected", async ({ request }) => {
    const res = await request.patch("/api/assignments/nonexistent/targets/me", {
      headers: { "Content-Type": "application/json" },
      data: { status: "COMPLETED" },
    });
    expect(res.status()).toBe(401);
  });

  test("an athlete can complete their own assignment target, and it resolves both their Next Move and their coach's queue", async ({ request }) => {
    const coach = await createTestUser("film-complete-coach", "COACH");
    const athlete = await createTestAthlete("film-complete-athlete", "Football", "WR");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const film = await testPrisma.film.create({
      data: { title: "Banner test film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: team.id, visibility: "TEAM", uploadedById: coach.userId },
    });
    const assignment = await testPrisma.filmAssignment.create({
      data: {
        teamId: team.id,
        assignedById: coach.userId,
        title: "Watch for the banner test",
        filmId: film.id,
        dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        requiredViewing: true,
      },
    });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: assignment.id, userId: athlete.userId, status: "ASSIGNED" } });

    // Before: both sides see it as the active signal.
    const beforeAthlete = await request.get("/api/next-move", { headers: { Cookie: athlete.cookie } });
    expect((await beforeAthlete.json()).current.kind).toBe("FILM_ASSIGNMENT_OVERDUE");
    const beforeCoach = await request.get("/api/coach-queue", { headers: { Cookie: coach.cookie } });
    const beforeQueue = (await beforeCoach.json()).queue;
    expect(beforeQueue.some((i: { kind: string }) => i.kind === "FILM_ASSIGNMENT_OVERDUE")).toBe(true);

    // The exact PATCH the new film-page banner (and the existing
    // /assignments page) both call.
    const patchRes = await request.patch(`/api/assignments/${assignment.id}/targets/me`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { status: "COMPLETED" },
    });
    expect(patchRes.status()).toBe(200);
    const { target } = await patchRes.json();
    expect(target.status).toBe("COMPLETED");
    expect(target.completedAt).not.toBeNull();

    // After: resolves on the athlete's side...
    const afterAthlete = await request.get("/api/next-move", { headers: { Cookie: athlete.cookie } });
    const afterAthleteData = await afterAthlete.json();
    expect(afterAthleteData.current?.kind).not.toBe("FILM_ASSIGNMENT_OVERDUE");
    expect(afterAthleteData.recentlyResolved.some((r: { kind: string }) => r.kind === "FILM_ASSIGNMENT_OVERDUE")).toBe(true);

    // ...and independently on the coach's side, with an honest outcome.
    const afterCoach = await request.get("/api/coach-queue", { headers: { Cookie: coach.cookie } });
    const afterCoachData = await afterCoach.json();
    expect(afterCoachData.queue.some((i: { kind: string }) => i.kind === "FILM_ASSIGNMENT_OVERDUE")).toBe(false);
    const resolved = afterCoachData.recentlyResolved.find((r: { kind: string }) => r.kind === "FILM_ASSIGNMENT_OVERDUE");
    expect(resolved).toBeTruthy();
    expect(resolved.outcome.status).toBe("COMPLETED_ONLY");
  });

  test("an athlete cannot complete another athlete's assignment target — scoped by the caller's own session, not just a permission flag", async ({ request }) => {
    const coach = await createTestUser("film-complete-coach-2", "COACH");
    const athleteA = await createTestAthlete("film-complete-a", "Football", "WR");
    const athleteB = await createTestAthlete("film-complete-b", "Football", "WR");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athleteA.userId, teamRole: "ATHLETE" },
      { userId: athleteB.userId, teamRole: "ATHLETE" },
    ]);
    const film = await testPrisma.film.create({
      data: { title: "Cross-athlete test film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: team.id, visibility: "TEAM", uploadedById: coach.userId },
    });
    const assignment = await testPrisma.filmAssignment.create({
      data: { teamId: team.id, assignedById: coach.userId, title: "Assigned to A only", filmId: film.id, dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), requiredViewing: true },
    });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: assignment.id, userId: athleteA.userId, status: "ASSIGNED" } });
    // Deliberately no target row for athleteB.

    const res = await request.patch(`/api/assignments/${assignment.id}/targets/me`, {
      headers: { Cookie: athleteB.cookie, "Content-Type": "application/json" },
      data: { status: "COMPLETED" },
    });
    expect(res.status()).toBe(404);

    // A's own row is untouched by B's attempt.
    const aTarget = await testPrisma.filmAssignmentTarget.findUnique({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId: athleteA.userId } },
    });
    expect(aTarget?.status).toBe("ASSIGNED");
  });

  test("cross-team isolation — an athlete on an unrelated team has no target row and cannot complete the assignment", async ({ request }) => {
    const coachA = await createTestUser("film-complete-cross-coach-a", "COACH");
    const coachB = await createTestUser("film-complete-cross-coach-b", "COACH");
    const athleteA = await createTestAthlete("film-complete-cross-a", "Soccer", "Forward");
    const athleteB = await createTestAthlete("film-complete-cross-b", "Soccer", "Forward");
    const teamA = await createTestTeam(coachA.userId, [
      { userId: coachA.userId, teamRole: "COACH" },
      { userId: athleteA.userId, teamRole: "ATHLETE" },
    ]);
    await createTestTeam(coachB.userId, [
      { userId: coachB.userId, teamRole: "COACH" },
      { userId: athleteB.userId, teamRole: "ATHLETE" },
    ]);
    const film = await testPrisma.film.create({
      data: { title: "Team A only film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: teamA.id, visibility: "TEAM", uploadedById: coachA.userId },
    });
    const assignment = await testPrisma.filmAssignment.create({
      data: { teamId: teamA.id, assignedById: coachA.userId, title: "Team A assignment", filmId: film.id, dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), requiredViewing: true },
    });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: assignment.id, userId: athleteA.userId, status: "ASSIGNED" } });

    const res = await request.patch(`/api/assignments/${assignment.id}/targets/me`, {
      headers: { Cookie: athleteB.cookie, "Content-Type": "application/json" },
      data: { status: "COMPLETED" },
    });
    expect(res.status()).toBe(404);
  });
});
