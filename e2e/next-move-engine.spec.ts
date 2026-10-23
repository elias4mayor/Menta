import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * The Next Move Engine, athlete- and coach-side: deterministic ranking,
 * reconciliation (resolve/supersede without ever double-writing a state),
 * dismissal, cross-team/cross-athlete isolation, and the privacy boundary
 * that keeps coach visibility narrower than athlete visibility. Every
 * scenario is a real HTTP round trip against the real API routes and
 * database — not a unit test of computeCandidates() in isolation.
 */
test.describe("Next Move Engine", () => {
  test.afterAll(async () => {
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("unauthenticated requests are rejected on both athlete and coach routes", async ({ request }) => {
    const r1 = await request.get("/api/next-move");
    expect(r1.status()).toBe(401);
    const r2 = await request.get("/api/coach-queue");
    expect(r2.status()).toBe(401);
  });

  test("competing priorities rank deterministically by real severity, and an athlete with no outstanding issues gets an honest caught-up state", async ({ request }) => {
    const athlete = await createTestAthlete("competing", "Football", "QB");
    const headers = { Cookie: athlete.cookie };

    // Genuinely caught up: a recent performance entry and a recent workout
    // completion against the athlete's own stated cadence.
    await testPrisma.performanceEntry.create({ data: { userId: athlete.userId, statName: "40-yard dash", value: 4.6, recordedAt: new Date() } });
    await testPrisma.athleteProfile.update({ where: { userId: athlete.userId }, data: { trainingDaysPerWeek: 3 } });
    const workout = await testPrisma.workout.create({ data: { title: "Speed work", category: "SPEED", createdById: athlete.userId } });
    await testPrisma.workoutCompletion.create({ data: { workoutId: workout.id, userId: athlete.userId, completedAt: new Date() } });

    const caughtUp = await request.get("/api/next-move", { headers });
    expect(caughtUp.status()).toBe(200);
    const caughtUpData = await caughtUp.json();
    expect(caughtUpData.current).toBeNull();

    // Now introduce two competing issues of different real severity.
    await testPrisma.assignment.create({
      data: { userId: athlete.userId, title: "Overdue essay", status: "NOT_STARTED", dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Mild goal", status: "ACTIVE", progress: 50, targetDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    });

    const ranked = await request.get("/api/next-move", { headers });
    const rankedData = await ranked.json();
    expect(rankedData.current.kind).toBe("ACADEMIC_OVERDUE");

    // Resolve the winner — the engine must promote the real next priority, not re-pick the same one.
    await testPrisma.assignment.updateMany({ where: { userId: athlete.userId }, data: { status: "COMPLETED" } });
    const afterResolve = await request.get("/api/next-move", { headers });
    const afterResolveData = await afterResolve.json();
    expect(afterResolveData.current.kind).toBe("GOAL_STALE");
    expect(afterResolveData.recentlyResolved.some((r: { kind: string }) => r.kind === "ACADEMIC_OVERDUE")).toBe(true);
  });

  test("an athlete can dismiss their own recommendation, and cannot dismiss another athlete's", async ({ request }) => {
    const athleteA = await createTestAthlete("dismiss-a", "Basketball", "Guard");
    const athleteB = await createTestAthlete("dismiss-b", "Basketball", "Guard");
    await testPrisma.goal.create({
      data: { userId: athleteA.userId, title: "Goal to dismiss", status: "ACTIVE", progress: 10, targetDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });

    const first = await request.get("/api/next-move", { headers: { Cookie: athleteA.cookie } });
    const { current } = await first.json();
    expect(current).not.toBeNull();

    const wrongUser = await request.post("/api/next-move", {
      headers: { Cookie: athleteB.cookie, "Content-Type": "application/json" },
      data: { id: current.id, action: "dismiss" },
    });
    expect(wrongUser.status()).toBe(404);

    const owner = await request.post("/api/next-move", {
      headers: { Cookie: athleteA.cookie, "Content-Type": "application/json" },
      data: { id: current.id, action: "dismiss" },
    });
    expect(owner.status()).toBe(200);
  });

  test("coach queue respects team membership and never surfaces academic, recruiting, goal, or performance signals", async ({ request }) => {
    const coach = await createTestUser("coach-priv", "COACH");
    const athlete = await createTestAthlete("coach-priv-athlete", "Football", "WR");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    // Give the athlete a mix of signals — some coach-authorized, several deliberately not.
    await testPrisma.assignment.create({
      data: { userId: athlete.userId, title: "Private homework", status: "NOT_STARTED", dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    });
    await testPrisma.recruitingSchool.create({ data: { userId: athlete.userId, name: "Private U", status: "TARGET" } });
    await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Private goal", status: "ACTIVE", progress: 0, targetDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    });
    const film = await testPrisma.film.create({
      data: { title: "Game film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: team.id, visibility: "TEAM", uploadedById: coach.userId },
    });
    const assignment = await testPrisma.filmAssignment.create({
      data: { teamId: team.id, assignedById: coach.userId, title: "Watch the game", filmId: film.id, dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), requiredViewing: true },
    });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: assignment.id, userId: athlete.userId, status: "ASSIGNED" } });

    const res = await request.get("/api/coach-queue", { headers: { Cookie: coach.cookie } });
    expect(res.status()).toBe(200);
    const { queue } = await res.json();

    expect(queue.length).toBeGreaterThan(0);
    const kinds = queue.map((item: { kind: string }) => item.kind);
    expect(kinds).toContain("FILM_ASSIGNMENT_OVERDUE");
    for (const kind of kinds) {
      expect(["FILM_ASSIGNMENT_OVERDUE", "FILM_REVIEW_UNANSWERED"]).toContain(kind);
    }
    // Never leaks the private evidence fields from excluded domains either.
    const serialized = JSON.stringify(queue);
    expect(serialized).not.toContain("Private homework");
    expect(serialized).not.toContain("Private U");
    expect(serialized).not.toContain("Private goal");
  });

  test("coach queue is isolated per team — a coach on team A sees nothing from team B, and ranks required film ahead of optional", async ({ request }) => {
    const coachA = await createTestUser("cross-coach-a", "COACH");
    const coachB = await createTestUser("cross-coach-b", "COACH");
    const athleteA = await createTestAthlete("cross-athlete-a", "Soccer", "Forward");
    const athleteB = await createTestAthlete("cross-athlete-b", "Soccer", "Forward");
    const teamA = await createTestTeam(coachA.userId, [
      { userId: coachA.userId, teamRole: "COACH" },
      { userId: athleteA.userId, teamRole: "ATHLETE" },
    ]);
    await createTestTeam(coachB.userId, [
      { userId: coachB.userId, teamRole: "COACH" },
      { userId: athleteB.userId, teamRole: "ATHLETE" },
    ]);

    const filmA = await testPrisma.film.create({
      data: { title: "Team A film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: teamA.id, visibility: "TEAM", uploadedById: coachA.userId },
    });
    const requiredAssignment = await testPrisma.filmAssignment.create({
      data: { teamId: teamA.id, assignedById: coachA.userId, title: "Required film", filmId: filmA.id, dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), requiredViewing: true },
    });
    const optionalAssignment = await testPrisma.filmAssignment.create({
      data: { teamId: teamA.id, assignedById: coachA.userId, title: "Optional film", filmId: filmA.id, dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), requiredViewing: false },
    });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: requiredAssignment.id, userId: athleteA.userId, status: "ASSIGNED" } });
    await testPrisma.filmAssignmentTarget.create({ data: { assignmentId: optionalAssignment.id, userId: athleteA.userId, status: "ASSIGNED" } });

    const resA = await request.get("/api/coach-queue", { headers: { Cookie: coachA.cookie } });
    const { queue: queueA } = await resA.json();
    expect(queueA.length).toBe(2);
    expect(queueA[0].title).toContain("Required film");

    const resB = await request.get("/api/coach-queue", { headers: { Cookie: coachB.cookie } });
    const { queue: queueB } = await resB.json();
    expect(queueB.length).toBe(0);
  });

  test("an athlete's film question reaches the right coach queue, ranks by directed-vs-open, and resolves when answered", async ({ request }) => {
    const coach = await createTestUser("review-coach", "COACH");
    const athlete = await createTestAthlete("review-athlete", "Football", "RB");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const film = await testPrisma.film.create({
      data: { title: "Scrimmage film", storageKey: "x", originalFilename: "x.mp4", mimeType: "video/mp4", sizeBytes: 1, teamId: team.id, visibility: "TEAM", uploadedById: coach.userId },
    });
    await testPrisma.filmReviewRequest.create({
      data: { filmId: film.id, athleteId: athlete.userId, question: "Was my footwork right here?", status: "OPEN" },
    });
    const directRequest = await testPrisma.filmReviewRequest.create({
      data: { filmId: film.id, athleteId: athlete.userId, coachId: coach.userId, question: "Should I have cut left?", status: "OPEN" },
    });

    const res = await request.get("/api/coach-queue", { headers: { Cookie: coach.cookie } });
    const { queue } = await res.json();
    const reviewItems = queue.filter((i: { kind: string }) => i.kind === "FILM_REVIEW_UNANSWERED");
    expect(reviewItems.length).toBe(2);
    // Directed-at-me scores higher than open-to-any-coach, all else equal.
    const directedItem = reviewItems.find((i: { evidence: { label: string; value: string }[] }) =>
      i.evidence.some((e) => e.value.includes("Should I have cut left"))
    );
    const openItem = reviewItems.find((i: { evidence: { label: string; value: string }[] }) =>
      i.evidence.some((e) => e.value.includes("Was my footwork"))
    );
    expect(directedItem).toBeTruthy();
    expect(openItem).toBeTruthy();
    expect(reviewItems.indexOf(directedItem)).toBeLessThan(reviewItems.indexOf(openItem));

    // Answer one — it must resolve out of the active queue and into history, without touching the other.
    await testPrisma.filmReviewRequest.update({ where: { id: directRequest.id }, data: { status: "ANSWERED", response: "Yes, cut left next time." } });
    const after = await request.get("/api/coach-queue", { headers: { Cookie: coach.cookie } });
    const { queue: afterQueue, recentlyResolved } = await after.json();
    expect(afterQueue.filter((i: { kind: string }) => i.kind === "FILM_REVIEW_UNANSWERED").length).toBe(1);
    expect(recentlyResolved.some((i: { kind: string }) => i.kind === "FILM_REVIEW_UNANSWERED")).toBe(true);
  });

  test("a coach with no teams gets an empty, honest queue — never a fabricated recommendation", async ({ request }) => {
    const lonelyCoach = await createTestUser("lonely-coach", "COACH");
    const res = await request.get("/api/coach-queue", { headers: { Cookie: lonelyCoach.cookie } });
    expect(res.status()).toBe(200);
    const { queue, recentlyResolved } = await res.json();
    expect(queue).toEqual([]);
    expect(recentlyResolved).toEqual([]);
  });

  test("accepting a recommendation records acceptedAt exactly once, idempotently, and never for another athlete's row", async ({ request }) => {
    const athlete = await createTestAthlete("accept-flow", "Baseball", "Pitcher");
    const otherAthlete = await createTestAthlete("accept-flow-other", "Baseball", "Pitcher");
    await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Acceptable goal", status: "ACTIVE", progress: 10, targetDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });

    const before = await request.get("/api/next-move", { headers: { Cookie: athlete.cookie } });
    const { current } = await before.json();
    expect(current).not.toBeNull();
    expect(current.acceptedAt).toBeNull();

    const wrongUser = await request.post("/api/next-move", {
      headers: { Cookie: otherAthlete.cookie, "Content-Type": "application/json" },
      data: { id: current.id, action: "accept" },
    });
    expect(wrongUser.status()).toBe(404);

    const accept1 = await request.post("/api/next-move", {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { id: current.id, action: "accept" },
    });
    expect(accept1.status()).toBe(200);

    const afterFirstAccept = await request.get("/api/next-move", { headers: { Cookie: athlete.cookie } });
    const firstAcceptedAt = (await afterFirstAccept.json()).current.acceptedAt;
    expect(firstAcceptedAt).not.toBeNull();

    // A second accept click (e.g. the athlete clicks the CTA again) must stay
    // idempotent — same acceptedAt, still a 200, never a false 404.
    const accept2 = await request.post("/api/next-move", {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { id: current.id, action: "accept" },
    });
    expect(accept2.status()).toBe(200);
    const afterSecondAccept = await request.get("/api/next-move", { headers: { Cookie: athlete.cookie } });
    expect((await afterSecondAccept.json()).current.acceptedAt).toBe(firstAcceptedAt);
  });

  test("outcome evidence distinguishes real improvement from mere completion, and never invents a direction for a freeform stat", async ({ request }) => {
    const athlete = await createTestAthlete("outcome-evidence", "Track", "Sprinter");
    const headers = { Cookie: athlete.cookie };

    const goal = await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Outcome goal", status: "ACTIVE", progress: 20, targetDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    });

    const first = await request.get("/api/next-move", { headers });
    const { current } = await first.json();
    expect(current.kind).toBe("GOAL_STALE");

    // Real before/after: progress genuinely rose, and the goal leaves ACTIVE
    // status so the candidate clears — this is the one kind with a true baseline.
    await testPrisma.goal.update({ where: { id: goal.id }, data: { progress: 75, status: "ACHIEVED" } });
    const afterGoal = await request.get("/api/next-move", { headers });
    const { recentlyResolved } = await afterGoal.json();
    const resolvedGoal = recentlyResolved.find((r: { kind: string }) => r.kind === "GOAL_STALE");
    expect(resolvedGoal).toBeTruthy();
    expect(resolvedGoal.outcome.status).toBe("IMPROVED");
    expect(resolvedGoal.outcome.detail).toContain("20%");
    expect(resolvedGoal.outcome.detail).toContain("75%");

    // Performance: a stale/never-logged stat is a different kind of
    // resolution entirely — logging a new one must never be labeled
    // IMPROVED/DECLINED, since this schema has no notion of which direction
    // is "better" for a freeform stat name.
    const perfBefore = await request.get("/api/next-move", { headers });
    const perfCurrent = (await perfBefore.json()).current;
    expect(perfCurrent.kind).toBe("PERFORMANCE_STALE");
    await testPrisma.performanceEntry.create({ data: { userId: athlete.userId, statName: "Mile time", value: 5.2, recordedAt: new Date() } });
    const afterPerf = await request.get("/api/next-move", { headers });
    const { recentlyResolved: resolvedAfterPerf } = await afterPerf.json();
    const resolvedPerf = resolvedAfterPerf.find((r: { kind: string }) => r.kind === "PERFORMANCE_STALE");
    expect(resolvedPerf).toBeTruthy();
    expect(resolvedPerf.outcome.status).toBe("NEW_DATA");
    expect(resolvedPerf.outcome.detail).not.toMatch(/improv|declin/i);
  });
});
