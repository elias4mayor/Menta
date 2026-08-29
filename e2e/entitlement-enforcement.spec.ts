import { test, expect } from "@playwright/test";
import { createTestUser, createTestTeam, cleanupE2eUsers, grantUnlimitedPlan, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Proves the Phase 7 entitlement gates actually block/allow real requests,
 * not just that the routes exist. Usage-metered gates (AI_*) are tested by
 * seeding a UsageCounter row directly at the plan's limit — this dev/test
 * environment has no configured AI provider, so there's no way to
 * naturally exhaust a quota through N real AI calls; seeding the counter
 * is the same approach other specs use to reach an otherwise-hard-to-
 * reach state directly via the DB. Current-state caps (film storage,
 * highlight reels, recruiting schools) and team-scoped flags (training
 * programs, live sessions, roster cap) are tested by seeding real rows
 * and calling the real route.
 */
test.describe("Entitlement enforcement (Phase 7)", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingSession.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingProgram.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.subscription.deleteMany({ where: { ownerType: "TEAM", ownerId: { in: teamIds } } });
    await testPrisma.team.deleteMany({ where: { id: { in: teamIds } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  function currentPeriodStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  test("1. AI Coach chat is blocked once a ROOKIE user's monthly usage is already at the plan limit", async ({ request }) => {
    const user = await createTestUser("ent-ai-blocked", "ATHLETE");
    await testPrisma.usageCounter.create({
      data: { ownerType: "USER", ownerId: user.userId, key: "AI_COACH_CHAT_MONTHLY", periodStart: currentPeriodStart(), count: 10 },
    });

    const res = await request.post("/api/ai", { headers: { Cookie: user.cookie }, data: { message: "hi" } });
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.limitReached).toBe(true);
  });

  test("2. AI Coach chat is not blocked for a fresh ROOKIE user under the limit", async ({ request }) => {
    const user = await createTestUser("ent-ai-ok", "ATHLETE");
    const res = await request.post("/api/ai", { headers: { Cookie: user.cookie }, data: { message: "hi" } });
    expect(res.status()).not.toBe(402);
  });

  test("3. AI Coach chat is never blocked for a MENTA PRO (unlimited) user, even with heavy usage logged", async ({ request }) => {
    const user = await createTestUser("ent-ai-unlimited", "ATHLETE");
    await grantUnlimitedPlan("USER", user.userId);
    await testPrisma.usageCounter.create({
      data: { ownerType: "USER", ownerId: user.userId, key: "AI_COACH_CHAT_MONTHLY", periodStart: currentPeriodStart(), count: 9999 },
    });

    const res = await request.post("/api/ai", { headers: { Cookie: user.cookie }, data: { message: "hi" } });
    expect(res.status()).not.toBe(402);
  });

  test("4. a ROOKIE user at their highlight reel limit is blocked from creating another", async ({ request }) => {
    const user = await createTestUser("ent-highlight-blocked", "ATHLETE");
    const film = await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Highlight source film`,
        category: "GAME",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist.mp4",
        originalFilename: "existing.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024,
        uploadedById: user.userId,
      },
    });
    const clip = await testPrisma.clip.create({
      data: { filmId: film.id, createdById: user.userId, startSec: 0, endSec: 5, label: "Clip" },
    });
    await testPrisma.highlight.create({ data: { userId: user.userId, title: "Existing reel" } });

    const res = await request.post("/api/highlights", { headers: { Cookie: user.cookie }, data: { title: "New reel", clipIds: [clip.id] } });
    expect(res.status()).toBe(402);

    await testPrisma.highlight.deleteMany({ where: { userId: user.userId } });
    await testPrisma.clip.deleteMany({ where: { createdById: user.userId } });
    await testPrisma.film.deleteMany({ where: { uploadedById: user.userId } });
  });

  test("5. a ROOKIE user at their recruiting-school limit is blocked from adding another", async ({ request }) => {
    const user = await createTestUser("ent-schools-blocked", "ATHLETE");
    await testPrisma.recruitingSchool.createMany({
      data: [1, 2, 3].map((n) => ({ userId: user.userId, name: `${E2E_RUN_ID} School ${n}` })),
    });

    const res = await request.post("/api/recruiting/schools", {
      headers: { Cookie: user.cookie },
      data: { name: `${E2E_RUN_ID} School 4` },
    });
    expect(res.status()).toBe(402);

    await testPrisma.recruitingSchool.deleteMany({ where: { userId: user.userId } });
  });

  test("6. a ROOKIE-tier team's coach cannot create a training program", async ({ request }) => {
    const coach = await createTestUser("ent-program-blocked", "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }], { grantPlan: false });

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Blocked Program", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("6b. Team A's paid plan does not grant Team B's coach access (cross-team isolation)", async ({ request }) => {
    const coachA = await createTestUser("ent-isolation-a", "COACH");
    const coachB = await createTestUser("ent-isolation-b", "COACH");
    await createTestTeam(coachA.userId, [{ userId: coachA.userId, teamRole: "COACH" }]); // paid (default grant)
    const teamB = await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }], { grantPlan: false });

    const res = await request.post(`/api/teams/${teamB.id}/programs`, {
      headers: { Cookie: coachB.cookie },
      data: { title: "Should stay blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("7. a paid team's coach can create a training program", async ({ request }) => {
    const coach = await createTestUser("ent-program-ok", "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Allowed Program", blocks: [] },
    });
    expect(res.status()).toBe(200);
  });

  test("8. a ROOKIE-tier team is blocked from starting a live session", async ({ request }) => {
    const coach = await createTestUser("ent-live-blocked", "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });
    // Downgrade this specific team back to ROOKIE after program creation
    // (createTestTeam grants MENTA_PRO by default) to isolate the LIVE_SESSIONS gate.
    await testPrisma.subscription.deleteMany({ where: { ownerType: "TEAM", ownerId: team.id } });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Blocked Session", athleteIds: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("9. a team at its athlete roster cap rejects a new athlete join", async ({ request }) => {
    const coach = await createTestUser("ent-roster-blocked", "COACH");
    const athlete1 = await createTestUser("ent-roster-existing", "ATHLETE");
    const athlete2 = await createTestUser("ent-roster-new", "ATHLETE");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete1.userId, teamRole: "ATHLETE" },
    ], { grantPlan: false });

    const plan = await testPrisma.plan.findUniqueOrThrow({ where: { key: "TEAM" } });
    await testPrisma.subscription.create({ data: { ownerType: "TEAM", ownerId: team.id, planId: plan.id, status: "ACTIVE" } });
    await testPrisma.planEntitlement.upsert({
      where: { planId_key: { planId: plan.id, key: "TEAM_MAX_ATHLETES" } },
      create: { planId: plan.id, key: "TEAM_MAX_ATHLETES", limitValue: 1 },
      update: { limitValue: 1 },
    });

    const res = await request.post("/api/team/join", {
      headers: { Cookie: athlete2.cookie },
      data: { inviteCode: team.inviteCode },
    });
    expect(res.status()).toBe(402);

    // Restore the shared TEAM plan template back to unlimited so this test
    // doesn't leak a low cap into any other spec/manual testing that uses it.
    await testPrisma.planEntitlement.update({
      where: { planId_key: { planId: plan.id, key: "TEAM_MAX_ATHLETES" } },
      data: { limitValue: null },
    });
  });

  test("10. a coach/trainer/parent joining is never blocked by the athlete roster cap", async ({ request }) => {
    const coach = await createTestUser("ent-roster-coach-owner", "COACH");
    const athlete1 = await createTestUser("ent-roster-coach-existing", "ATHLETE");
    const secondCoach = await createTestUser("ent-roster-coach-joiner", "COACH");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete1.userId, teamRole: "ATHLETE" },
    ], { grantPlan: false });

    const plan = await testPrisma.plan.findUniqueOrThrow({ where: { key: "TEAM" } });
    await testPrisma.subscription.create({ data: { ownerType: "TEAM", ownerId: team.id, planId: plan.id, status: "ACTIVE" } });
    await testPrisma.planEntitlement.upsert({
      where: { planId_key: { planId: plan.id, key: "TEAM_MAX_ATHLETES" } },
      create: { planId: plan.id, key: "TEAM_MAX_ATHLETES", limitValue: 1 },
      update: { limitValue: 1 },
    });

    const res = await request.post("/api/team/join", {
      headers: { Cookie: secondCoach.cookie },
      data: { inviteCode: team.inviteCode },
    });
    expect(res.status()).toBe(200);

    await testPrisma.planEntitlement.update({
      where: { planId_key: { planId: plan.id, key: "TEAM_MAX_ATHLETES" } },
      data: { limitValue: null },
    });
  });

  test("11. a film upload that would exceed a ROOKIE user's storage cap is rejected before saving", async ({ request }) => {
    const user = await createTestUser("ent-film-blocked", "ATHLETE");
    // ROOKIE's cap is 1GB — seed existing usage right at the cap so any new upload is over.
    await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Existing film`,
        category: "GAME",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist.mp4",
        originalFilename: "existing.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024 * 1024 * 1024,
        uploadedById: user.userId,
      },
    });

    const res = await request.post("/api/films", {
      headers: { Cookie: user.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake video bytes") },
        title: `${E2E_RUN_ID} New film`,
        category: "GAME",
        visibility: "PRIVATE",
      },
    });
    expect(res.status()).toBe(402);

    await testPrisma.film.deleteMany({ where: { uploadedById: user.userId } });
  });
});
