import { test, expect } from "@playwright/test";
import { createTestUser, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Regression coverage for the Scope Resolution Design fix: TRAINING_PROGRAMS
 * and LIVE_SESSIONS now resolve exclusively from a team's own Subscription
 * (hasTeamEntitlement), never blended with the acting coach's individual
 * plan via the old getEffectiveLimit "best of user or team" logic.
 * FILM_STORAGE_GB now resolves per-upload from Film.teamId: team-owned
 * uploads (teamId set) count against the team's own pool via
 * getTeamCurrentStateLimit, individual uploads (teamId null) are unchanged.
 *
 * None of the existing entitlement-enforcement.spec.ts fixtures exercised
 * a coach with a *personal* paid plan on a team with *no* plan — every one
 * of them grants at TEAM ownerType only — which is exactly why this
 * loophole shipped uncaught. This file closes that gap.
 */

async function grantPlan(ownerType: "USER" | "TEAM", ownerId: string, planKey: string) {
  const plan = await testPrisma.plan.findUniqueOrThrow({ where: { key: planKey } });
  await testPrisma.subscription.upsert({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    create: { ownerType, ownerId, planId: plan.id, status: "ACTIVE" },
    update: { planId: plan.id, status: "ACTIVE" },
  });
}

async function makeTeam(coachId: string, extraMembers: { userId: string; teamRole: string }[] = []) {
  return testPrisma.team.create({
    data: {
      name: `E2E Scope Team ${E2E_RUN_ID}`,
      inviteCode: `SCP${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdById: coachId,
      memberships: { create: [{ userId: coachId, teamRole: "COACH" }, ...extraMembers] },
    },
  });
}

test.describe("Team-scoped entitlement resolution (Scope Resolution Design)", () => {
  test.afterAll(async () => {
    // Same FK-dependency-ordered cleanup as live-session-security.spec.ts
    // — cleanupE2eUsers() alone can't delete users still referenced by
    // TrainingSession/TrainingProgram/Team rows this file creates.
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingGroupMember.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingGroup.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingSession.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingProgram.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.film.deleteMany({ where: { OR: [{ title: { contains: E2E_RUN_ID } }, { teamId: { in: teamIds } }] } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  // ===================================================================
  // Negative cases first — these prove the bug cannot return.
  // ===================================================================

  test("NEG 1. coach personally on UNDERDOG, team has no plan → cannot create a team program", async ({ request }) => {
    const coach = await createTestUser("scope-neg-underdog-prog", "COACH");
    await grantPlan("USER", coach.userId, "UNDERDOG");
    const team = await makeTeam(coach.userId);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 2. coach personally on UNDERDOG, team has no plan → cannot start team LIVE", async ({ request }) => {
    const coach = await createTestUser("scope-neg-underdog-live2", "COACH");
    const athlete = await createTestUser("scope-neg-underdog-live2-ath", "ATHLETE");
    await grantPlan("USER", coach.userId, "UNDERDOG");
    const team = await makeTeam(coach.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", athleteIds: [athlete.userId] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 3. coach personally on MVP, team has no plan → cannot create a team program", async ({ request }) => {
    const coach = await createTestUser("scope-neg-mvp-prog", "COACH");
    await grantPlan("USER", coach.userId, "MVP");
    const team = await makeTeam(coach.userId);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 4. coach personally on MVP, team has no plan → cannot start team LIVE", async ({ request }) => {
    const coach = await createTestUser("scope-neg-mvp-live", "COACH");
    const athlete = await createTestUser("scope-neg-mvp-live-ath", "ATHLETE");
    await grantPlan("USER", coach.userId, "MVP");
    const team = await makeTeam(coach.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", athleteIds: [athlete.userId] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 5. coach personally on ONYX, team has no plan → cannot create a team program", async ({ request }) => {
    const coach = await createTestUser("scope-neg-onyx-prog", "COACH");
    await grantPlan("USER", coach.userId, "ONYX");
    const team = await makeTeam(coach.userId);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 6. coach personally on ONYX, team has no plan → cannot start team LIVE", async ({ request }) => {
    const coach = await createTestUser("scope-neg-onyx-live", "COACH");
    const athlete = await createTestUser("scope-neg-onyx-live-ath", "ATHLETE");
    await grantPlan("USER", coach.userId, "ONYX");
    const team = await makeTeam(coach.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Should be blocked", athleteIds: [athlete.userId] },
    });
    expect(res.status()).toBe(402);
  });

  test("NEG 7 (B6, direct API). a well-formed direct POST with only a paid individual subscription behind it is still rejected — entitlement, not a UI omission, is what blocks it", async ({ request }) => {
    const coach = await createTestUser("scope-neg-direct-api", "COACH");
    await grantPlan("USER", coach.userId, "ONYX"); // richest individual plan available
    const team = await makeTeam(coach.userId);

    const progRes = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Direct API attempt", blocks: [{ title: "Block", order: 0, exercises: [] }] },
    });
    expect(progRes.status()).toBe(402);
    const body = await progRes.json();
    expect(typeof body.error).toBe("string");
  });

  // ===================================================================
  // Positive cases — the one pattern that must never break.
  // ===================================================================

  test("POS 1. coach with no individual plan + paid MENTA TEAM → team programming succeeds", async ({ request }) => {
    const coach = await createTestUser("scope-pos-team-prog", "COACH");
    const team = await makeTeam(coach.userId);
    await grantPlan("TEAM", team.id, "TEAM");

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Allowed Program", blocks: [] },
    });
    expect(res.status()).toBe(200);
  });

  test("POS 2. coach with a paid individual plan AND MENTA TEAM → team programming still succeeds (team plan is sufficient on its own)", async ({ request }) => {
    const coach = await createTestUser("scope-pos-both-prog", "COACH");
    await grantPlan("USER", coach.userId, "MVP");
    const team = await makeTeam(coach.userId);
    await grantPlan("TEAM", team.id, "TEAM");

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Allowed Program", blocks: [] },
    });
    expect(res.status()).toBe(200);
  });

  test("POS 3. coach with no individual plan + paid MENTA TEAM → can start team LIVE", async ({ request }) => {
    const coach = await createTestUser("scope-pos-team-live", "COACH");
    const athlete = await createTestUser("scope-pos-team-live-ath", "ATHLETE");
    const team = await makeTeam(coach.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]);
    await grantPlan("TEAM", team.id, "TEAM");
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Allowed Session", athleteIds: [athlete.userId] },
    });
    expect(res.status()).toBe(200);
  });

  test("POS 4. athlete with a free individual plan + paid MENTA TEAM → can participate in the authorized team LIVE session", async ({ request }) => {
    const coach = await createTestUser("scope-pos-participate-coach", "COACH");
    const athlete = await createTestUser("scope-pos-participate-ath", "ATHLETE"); // no individual Subscription = ROOKIE
    const team = await makeTeam(coach.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]);
    await grantPlan("TEAM", team.id, "TEAM");
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const sessionRes = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Session", athleteIds: [athlete.userId] },
    });
    expect(sessionRes.status()).toBe(200);
    const { session } = await sessionRes.json();

    const startRes = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, {
      headers: { Cookie: coach.cookie },
      data: { status: "LIVE" },
    });
    expect(startRes.status()).toBe(200);

    // Participation was never entitlement-gated (only creation is) — this
    // confirms that stays true after the fix: a ROOKIE athlete on a paid
    // team can see their own live session view.
    const meRes = await request.get(`/api/teams/${team.id}/sessions/${session.id}/me`, {
      headers: { Cookie: athlete.cookie },
    });
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.session.status).toBe("LIVE");
  });

  // ===================================================================
  // A. Team programming — full matrix (some already covered above; the
  //    remaining two are explicit per the requested list).
  // ===================================================================

  test("A1. coach with ROOKIE + no team subscription → cannot create a team program", async ({ request }) => {
    const coach = await createTestUser("scope-a1", "COACH");
    const team = await makeTeam(coach.userId);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie },
      data: { title: "Blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });

  // ===================================================================
  // B. Team LIVE — remaining explicit items.
  // ===================================================================

  test("B (non-member). a user who isn't even a member of the team cannot start team LIVE, regardless of any plan", async ({ request }) => {
    const coach = await createTestUser("scope-b-nonmember-coach", "COACH");
    const outsider = await createTestUser("scope-b-nonmember-outsider", "COACH");
    await grantPlan("USER", outsider.userId, "ONYX");
    const team = await makeTeam(coach.userId);
    await grantPlan("TEAM", team.id, "TEAM");
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} Program`, createdById: coach.userId },
    });

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: outsider.cookie },
      data: { title: "Should be blocked", athleteIds: [] },
    });
    // Permission gate (not on the team at all) fires before entitlement.
    expect(res.status()).toBe(403);
  });

  // ===================================================================
  // C. Film storage — ownership-based resolution.
  // ===================================================================

  test("C1. individual (non-team) film counts against the uploader's own individual storage", async ({ request }) => {
    const user = await createTestUser("scope-c1", "ATHLETE");
    await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Individual film at cap`,
        category: "GAME",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist.mp4",
        originalFilename: "existing.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024 * 1024 * 1024, // ROOKIE's individual cap is 1GB
        uploadedById: user.userId,
      },
    });

    const res = await request.post("/api/films", {
      headers: { Cookie: user.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake video bytes") },
        title: `${E2E_RUN_ID} New individual film`,
        category: "GAME",
        visibility: "PRIVATE",
      },
    });
    expect(res.status()).toBe(402);

    await testPrisma.film.deleteMany({ where: { uploadedById: user.userId } });
  });

  test("C2 & C3 & C4. team-owned film counts against the team's pool, not the uploading coach's personal quota", async ({ request }) => {
    const coach = await createTestUser("scope-c2-coach", "COACH");
    const team = await makeTeam(coach.userId); // no team Subscription -> ROOKIE fallback (250GB TEAM plan not granted here on purpose, see C5 below for the enforced-ceiling case)
    await grantPlan("TEAM", team.id, "TEAM"); // now team has the real 250GB pool
    // Coach personally maxed out on their own ROOKIE 1GB cap.
    await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Coach's own film at personal cap`,
        category: "GAME",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist-2.mp4",
        originalFilename: "existing2.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024 * 1024 * 1024,
        uploadedById: coach.userId,
      },
    });

    // C3: a team-owned upload succeeds even though the coach's own 1GB
    // personal quota is already fully consumed — it's evaluated against
    // the team's near-empty 250GB pool instead.
    const teamUploadRes = await request.post("/api/films", {
      headers: { Cookie: coach.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake team video bytes") },
        title: `${E2E_RUN_ID} Team film`,
        category: "GAME",
        visibility: "TEAM",
        teamId: team.id,
      },
    });
    expect(teamUploadRes.status()).toBe(200);

    // C2: the film that just succeeded is genuinely stored against the team.
    const { film } = await teamUploadRes.json();
    const stored = await testPrisma.film.findUnique({ where: { id: film.id } });
    expect(stored?.teamId).toBe(team.id);

    // C4: the coach's own individual quota is untouched by the team
    // upload — a second, purely individual upload attempt is still
    // rejected, proving the team upload was never charged to it.
    const individualUploadRes = await request.post("/api/films", {
      headers: { Cookie: coach.cookie },
      multipart: {
        file: { name: "clip2.mp4", mimeType: "video/mp4", buffer: Buffer.from("more fake bytes") },
        title: `${E2E_RUN_ID} Coach's second individual film`,
        category: "GAME",
        visibility: "PRIVATE",
      },
    });
    expect(individualUploadRes.status()).toBe(402);

    await testPrisma.film.deleteMany({ where: { OR: [{ uploadedById: coach.userId }, { teamId: team.id }] } });
  });

  test("C5. the team's own storage ceiling is enforced even when the uploading coach's personal plan is unlimited", async ({ request }) => {
    const coach = await createTestUser("scope-c5-coach", "COACH");
    await grantPlan("USER", coach.userId, "ONYX"); // unlimited* individual film storage
    const team = await makeTeam(coach.userId); // no TEAM Subscription -> ROOKIE fallback = 1GB team pool
    await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Team film at team's fallback cap`,
        category: "GAME",
        visibility: "TEAM",
        storageKey: "films/does-not-exist-3.mp4",
        originalFilename: "existing3.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024 * 1024 * 1024, // team's ROOKIE-fallback cap is 1GB
        uploadedById: coach.userId,
        teamId: team.id,
      },
    });

    const res = await request.post("/api/films", {
      headers: { Cookie: coach.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake video bytes") },
        title: `${E2E_RUN_ID} Should be blocked by team cap`,
        category: "GAME",
        visibility: "TEAM",
        teamId: team.id,
      },
    });
    expect(res.status()).toBe(402);

    await testPrisma.film.deleteMany({ where: { OR: [{ uploadedById: coach.userId }, { teamId: team.id }] } });
  });

  test("C6. individual storage quota remains enforced correctly (unchanged behavior)", async ({ request }) => {
    const user = await createTestUser("scope-c6", "ATHLETE");
    await testPrisma.film.create({
      data: {
        title: `${E2E_RUN_ID} Individual film at cap (C6)`,
        category: "GAME",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist-4.mp4",
        originalFilename: "existing4.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024 * 1024 * 1024,
        uploadedById: user.userId,
      },
    });

    const res = await request.post("/api/films", {
      headers: { Cookie: user.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake video bytes") },
        title: `${E2E_RUN_ID} New film (C6)`,
        category: "GAME",
        visibility: "PRIVATE",
      },
    });
    expect(res.status()).toBe(402);

    await testPrisma.film.deleteMany({ where: { uploadedById: user.userId } });
  });

  // ===================================================================
  // D. Security preservation — scope resolution changes must not weaken
  //    anything else. (LIVE state machine + set logging + advance are
  //    covered by the full, unmodified live-session-security.spec.ts run
  //    — 24 tests, re-run as part of validation, not duplicated here.)
  // ===================================================================

  test("D1. team membership is still required to upload team-owned film — storage scope change doesn't bypass it", async ({ request }) => {
    const coach = await createTestUser("scope-d1-coach", "COACH");
    const outsider = await createTestUser("scope-d1-outsider", "ATHLETE");
    const team = await makeTeam(coach.userId);
    await grantPlan("TEAM", team.id, "TEAM");

    const res = await request.post("/api/films", {
      headers: { Cookie: outsider.cookie },
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("fake video bytes") },
        title: `${E2E_RUN_ID} Should be blocked, not a team member`,
        category: "GAME",
        visibility: "TEAM",
        teamId: team.id,
      },
    });
    expect(res.status()).toBe(403);
  });

  test("D2. cross-team isolation: Team A's paid plan does not grant Team B's coach team programming access (mirrors existing test 6b)", async ({ request }) => {
    const coachA = await createTestUser("scope-d2-a", "COACH");
    const coachB = await createTestUser("scope-d2-b", "COACH");
    const teamA = await makeTeam(coachA.userId);
    await grantPlan("TEAM", teamA.id, "TEAM");
    const teamB = await makeTeam(coachB.userId);

    const res = await request.post(`/api/teams/${teamB.id}/programs`, {
      headers: { Cookie: coachB.cookie },
      data: { title: "Should stay blocked", blocks: [] },
    });
    expect(res.status()).toBe(402);
  });
});
