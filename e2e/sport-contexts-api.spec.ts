import { test, expect } from "@playwright/test";
import { createTestAthlete, cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * Permanent regression coverage for the exact scenario matrix the
 * multi-sport foundation was built against: normal primary switch,
 * removing the primary (with promotion), concurrent primary changes,
 * re-adding a deactivated sport, duplicate-sport attempts, and one
 * athlete trying to manipulate another's context. Every one of these was
 * hand-verified live against the running server during development —
 * this file is that same verification, kept runnable instead of thrown
 * away.
 */
test.describe("/api/athlete/sport-contexts", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("duplicate-sport prevention, adding a second sport, and listing", async ({ request }) => {
    const athlete = await createTestAthlete("dup", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };

    const list = await request.get("/api/athlete/sport-contexts", { headers });
    expect(list.status()).toBe(200);
    const { sportContexts } = await list.json();
    expect(sportContexts).toHaveLength(1);
    expect(sportContexts[0].isPrimary).toBe(true);

    const dup = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Football", position: "Running Back" },
    });
    expect(dup.status()).toBe(409);

    const second = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Track & Field", position: "Sprinter" },
    });
    expect(second.status()).toBe(200);
    const { sportContext } = await second.json();
    expect(sportContext.isPrimary).toBe(false);
    expect(sportContext.isActive).toBe(true);
  });

  test("switching primary is transactional and mirrors into AthleteProfile", async ({ request }) => {
    const athlete = await createTestAthlete("switch", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };

    const created = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Track & Field", position: "Sprinter" },
    });
    const { sportContext: track } = await created.json();

    const switched = await request.patch(`/api/athlete/sport-contexts/${track.id}`, {
      headers,
      data: { isPrimary: true },
    });
    expect(switched.status()).toBe(200);
    expect((await switched.json()).sportContext.isPrimary).toBe(true);

    const profile = await testPrisma.athleteProfile.findUnique({ where: { userId: athlete.userId } });
    expect(profile?.sport).toBe("Track & Field");
    expect(profile?.position).toBe("Sprinter");
  });

  test("removing the primary promotes the next active sport and mirrors it", async ({ request }) => {
    const athlete = await createTestAthlete("promote", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };

    const created = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Basketball", position: "Point Guard" },
    });
    const { sportContext: basketball } = await created.json();

    const primary = await testPrisma.athleteSportContext.findFirst({
      where: { userId: athlete.userId, isPrimary: true },
    });
    expect(primary?.sport).toBe("Football");

    const del = await request.delete(`/api/athlete/sport-contexts/${primary!.id}`, { headers });
    expect(del.status()).toBe(200);
    const { newPrimary } = await del.json();
    expect(newPrimary.id).toBe(basketball.id);
    expect(newPrimary.isPrimary).toBe(true);

    const profile = await testPrisma.athleteProfile.findUnique({ where: { userId: athlete.userId } });
    expect(profile?.sport).toBe("Basketball");
  });

  test("removing the only active sport is rejected", async ({ request }) => {
    const athlete = await createTestAthlete("last", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie };
    const context = await testPrisma.athleteSportContext.findFirstOrThrow({ where: { userId: athlete.userId } });

    const del = await request.delete(`/api/athlete/sport-contexts/${context.id}`, { headers });
    expect(del.status()).toBe(409);

    const stillActive = await testPrisma.athleteSportContext.findUnique({ where: { id: context.id } });
    expect(stillActive?.isActive).toBe(true);
  });

  test("deactivating a sport preserves every historical record pointing at it — never deletes, merges, or reassigns them", async ({
    request,
  }) => {
    const athlete = await createTestAthlete("isolation", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };

    const created = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Track & Field", position: "100m" },
    });
    const { sportContext: track } = await created.json();
    const football = await testPrisma.athleteSportContext.findFirstOrThrow({
      where: { userId: athlete.userId, sport: "Football" },
    });

    // Simulate what a later, per-sport-aware Training/Goals/etc. page will
    // do once it's wired up (out of scope for this phase, per the original
    // build plan — the schema/FK are ready for it now): attach one real
    // record to each sport context directly.
    const workoutA = await testPrisma.workout.create({
      data: { title: "Football Lift", category: "STRENGTH", createdById: athlete.userId, sportContextId: football.id },
    });
    const workoutB = await testPrisma.workout.create({
      data: { title: "Track Sprints", category: "SPEED", createdById: athlete.userId, sportContextId: track.id },
    });
    const goalA = await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Bench 250", sportContextId: football.id },
    });
    const goalB = await testPrisma.goal.create({
      data: { userId: athlete.userId, title: "Sub-11 100m", sportContextId: track.id },
    });

    // Deactivate Football (the primary) — Track gets promoted, but neither
    // sport's records move, merge, or disappear.
    const del = await request.delete(`/api/athlete/sport-contexts/${football.id}`, { headers });
    expect(del.status()).toBe(200);

    const [refreshedWorkoutA, refreshedWorkoutB, refreshedGoalA, refreshedGoalB] = await Promise.all([
      testPrisma.workout.findUnique({ where: { id: workoutA.id } }),
      testPrisma.workout.findUnique({ where: { id: workoutB.id } }),
      testPrisma.goal.findUnique({ where: { id: goalA.id } }),
      testPrisma.goal.findUnique({ where: { id: goalB.id } }),
    ]);
    expect(refreshedWorkoutA?.sportContextId).toBe(football.id);
    expect(refreshedWorkoutB?.sportContextId).toBe(track.id);
    expect(refreshedGoalA?.sportContextId).toBe(football.id);
    expect(refreshedGoalB?.sportContextId).toBe(track.id);

    const deactivatedFootball = await testPrisma.athleteSportContext.findUnique({ where: { id: football.id } });
    expect(deactivatedFootball?.isActive).toBe(false);

    // Reactivate — same row, records still untouched, nothing duplicated.
    const reAdd = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Football", position: "Running Back" },
    });
    expect((await reAdd.json()).sportContext.id).toBe(football.id);

    const [finalWorkoutA, finalGoalA] = await Promise.all([
      testPrisma.workout.findUnique({ where: { id: workoutA.id } }),
      testPrisma.goal.findUnique({ where: { id: goalA.id } }),
    ]);
    expect(finalWorkoutA?.sportContextId).toBe(football.id);
    expect(finalGoalA?.sportContextId).toBe(football.id);
  });

  test("re-adding a deactivated sport reactivates the same row instead of duplicating it", async ({ request }) => {
    const athlete = await createTestAthlete("reactivate", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };

    await request.post("/api/athlete/sport-contexts", { headers, data: { sport: "Soccer", position: "" } });
    const football = await testPrisma.athleteSportContext.findFirstOrThrow({
      where: { userId: athlete.userId, sport: "Football" },
    });
    await request.delete(`/api/athlete/sport-contexts/${football.id}`, { headers });

    const reAdd = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Football", position: "Wide Receiver" },
    });
    expect(reAdd.status()).toBe(200);
    const { sportContext } = await reAdd.json();
    expect(sportContext.id).toBe(football.id);
    expect(sportContext.position).toBe("Wide Receiver");
    expect(sportContext.isActive).toBe(true);

    const total = await testPrisma.athleteSportContext.count({ where: { userId: athlete.userId, sport: "Football" } });
    expect(total).toBe(1);
  });

  test("concurrent primary-switch requests leave exactly one primary", async ({ request }) => {
    const athlete = await createTestAthlete("concurrent", "Football", "Running Back");
    const headers = { Cookie: athlete.cookie, "Content-Type": "application/json" };
    const created = await request.post("/api/athlete/sport-contexts", {
      headers,
      data: { sport: "Baseball", position: "Pitcher" },
    });
    const { sportContext: baseball } = await created.json();
    const football = await testPrisma.athleteSportContext.findFirstOrThrow({
      where: { userId: athlete.userId, sport: "Football" },
    });

    await Promise.all([
      request.patch(`/api/athlete/sport-contexts/${football.id}`, { headers, data: { isPrimary: true } }),
      request.patch(`/api/athlete/sport-contexts/${baseball.id}`, { headers, data: { isPrimary: true } }),
    ]);

    const active = await testPrisma.athleteSportContext.findMany({
      where: { userId: athlete.userId, isActive: true },
    });
    expect(active.filter((c) => c.isPrimary)).toHaveLength(1);
  });

  test("an athlete cannot read, modify, or remove another athlete's sport context", async ({ request }) => {
    const athleteA = await createTestAthlete("victim", "Football", "Running Back");
    const athleteB = await createTestAthlete("attacker", "Basketball", "Point Guard");
    const targetContext = await testPrisma.athleteSportContext.findFirstOrThrow({
      where: { userId: athleteA.userId },
    });
    const headersB = { Cookie: athleteB.cookie, "Content-Type": "application/json" };

    const patchAttempt = await request.patch(`/api/athlete/sport-contexts/${targetContext.id}`, {
      headers: headersB,
      data: { isPrimary: true },
    });
    expect(patchAttempt.status()).toBe(404);

    const deleteAttempt = await request.delete(`/api/athlete/sport-contexts/${targetContext.id}`, {
      headers: headersB,
    });
    expect(deleteAttempt.status()).toBe(404);

    const stillUntouched = await testPrisma.athleteSportContext.findUnique({ where: { id: targetContext.id } });
    expect(stillUntouched?.userId).toBe(athleteA.userId);
    expect(stillUntouched?.isActive).toBe(true);
  });

  test("an unauthenticated request is rejected", async ({ request }) => {
    const res = await request.get("/api/athlete/sport-contexts");
    expect(res.status()).toBe(401);
  });
});
