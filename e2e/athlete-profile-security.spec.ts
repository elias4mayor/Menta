import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security coverage for Phase 8 (Unified Athlete Profile). Both /profile
 * (self-view) and /team/[teamId]/athletes/[athleteId] (coach-view) have no
 * API route of their own — they're server components calling
 * src/lib/athlete-profile.ts directly — so these tests exercise the real
 * rendered pages over HTTP, the same standard every other security spec
 * in this repo uses.
 */
test.describe("Unified Athlete Profile security (Phase 8)", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.coachNote.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingSet.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.film.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.goal.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.performanceEntry.deleteMany({ where: { statName: { contains: E2E_RUN_ID } } });
    await testPrisma.subscription.deleteMany({ where: { ownerType: "TEAM", ownerId: { in: teamIds } } });
    await testPrisma.team.deleteMany({ where: { id: { in: teamIds } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  async function createOnboardedCoach(tag: string) {
    const coach = await createTestUser(tag, "COACH");
    await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
    return coach;
  }

  /**
   * createTestUser() doesn't create a TrainerProfile, so proxy.ts's
   * onboarding-completion gate (page routes only) redirects an
   * un-onboarded TRAINER to /onboarding before this page is ever reached —
   * Playwright's request fixture follows that redirect by default, which
   * would make an unauthorized-access test pass for the wrong reason
   * (landing on /onboarding, not a real 404 from the profile route itself).
   */
  async function createOnboardedTrainer(tag: string) {
    const trainer = await createTestUser(tag, "TRAINER");
    await testPrisma.trainerProfile.create({ data: { userId: trainer.userId, onboardingCompletedAt: new Date() } });
    return trainer;
  }

  test("1. an athlete can view their own /profile with their own data", async ({ request }) => {
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-self`, "Football", "Quarterback");
    await testPrisma.goal.create({ data: { userId: athlete.userId, title: `${E2E_RUN_ID} Self Goal`, status: "ACTIVE" } });

    const res = await request.get("/profile", { headers: { Cookie: athlete.cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`${E2E_RUN_ID} Self Goal`);
  });

  test("2. self-view payload never contains CoachNote content, even when notes exist for that athlete", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-cn-coach`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-cn-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const noteBody = `${E2E_RUN_ID} SECRET COACH NOTE`;
    await testPrisma.coachNote.create({ data: { coachId: coach.userId, athleteId: athlete.userId, teamId: team.id, body: noteBody } });

    const res = await request.get("/profile", { headers: { Cookie: athlete.cookie } });
    const html = await res.text();
    expect(html).not.toContain(noteBody);
  });

  test("3. empty profile sections render cleanly for a brand-new athlete", async ({ request }) => {
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-empty`, "Football", "Quarterback");
    const res = await request.get("/profile", { headers: { Cookie: athlete.cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("No performance entries yet");
    expect(html).toContain("No training activity yet");
    expect(html).toContain("No film yet");
    expect(html).toContain("No academic activity yet");
    expect(html).toContain("No recruiting activity yet");
  });

  test("4. an authorized team coach can view an athlete on their team, including Coach Notes", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-auth-coach`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-auth-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const noteBody = `${E2E_RUN_ID} VISIBLE NOTE`;
    await testPrisma.coachNote.create({ data: { coachId: coach.userId, athleteId: athlete.userId, teamId: team.id, body: noteBody } });

    const res = await request.get(`/team/${team.id}/athletes/${athlete.userId}`, { headers: { Cookie: coach.cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(noteBody);
  });

  test("5. an unrelated coach (not on the team at all) gets 404", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-team-owner`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-unrel-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const outsider = await createOnboardedCoach(`${E2E_RUN_ID}-outsider`);

    const res = await request.get(`/team/${team.id}/athletes/${athlete.userId}`, { headers: { Cookie: outsider.cookie } });
    expect(res.status()).toBe(404);
  });

  test("6. cross-team isolation: Team A's coach cannot view an athlete who only belongs to Team B", async ({ request }) => {
    const coachA = await createOnboardedCoach(`${E2E_RUN_ID}-crossA-coach`);
    const coachB = await createOnboardedCoach(`${E2E_RUN_ID}-crossB-coach`);
    const athleteB = await createTestAthlete(`${E2E_RUN_ID}-crossB-athlete`, "Football", "Quarterback");
    const teamA = await createTestTeam(coachA.userId, [{ userId: coachA.userId, teamRole: "COACH" }]);
    await createTestTeam(coachB.userId, [
      { userId: coachB.userId, teamRole: "COACH" },
      { userId: athleteB.userId, teamRole: "ATHLETE" },
    ]);

    const res = await request.get(`/team/${teamA.id}/athletes/${athleteB.userId}`, { headers: { Cookie: coachA.cookie } });
    expect(res.status()).toBe(404);
  });

  test("7. real-user-id-guessing: a coach cannot view a real user who exists but was never on their team, and the response leaks no identifying content", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-guess-coach`);
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
    const stranger = await createTestAthlete(`${E2E_RUN_ID}-stranger-guess`, "Basketball", "Guard");

    const res = await request.get(`/team/${team.id}/athletes/${stranger.userId}`, { headers: { Cookie: coach.cookie } });
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).not.toContain("E2E API Athlete");
  });

  test("8. a plain athlete cannot use the coach route to view another athlete, even on their own team", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-viewer-coach`);
    const athleteA = await createTestAthlete(`${E2E_RUN_ID}-viewerA`, "Football", "Quarterback");
    const athleteB = await createTestAthlete(`${E2E_RUN_ID}-viewerB`, "Football", "Running Back");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athleteA.userId, teamRole: "ATHLETE" },
      { userId: athleteB.userId, teamRole: "ATHLETE" },
    ]);

    const res = await request.get(`/team/${team.id}/athletes/${athleteB.userId}`, { headers: { Cookie: athleteA.cookie } });
    expect(res.status()).toBe(404);
  });

  test("9. a team member who is not COACH/ADMIN (e.g. TRAINER) cannot view the general athlete profile", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-trainer-team-coach`);
    const trainer = await createOnboardedTrainer(`${E2E_RUN_ID}-trainer-viewer`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-trainer-target`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: trainer.userId, teamRole: "TRAINER" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    const res = await request.get(`/team/${team.id}/athletes/${athlete.userId}`, { headers: { Cookie: trainer.cookie } });
    expect(res.status()).toBe(404);
  });

  test("10. Film authorization: a PRIVATE film the athlete owns is visible to the athlete but not to a coach viewing the profile", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-film-coach`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-film-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const filmTitle = `${E2E_RUN_ID} Private Film`;
    await testPrisma.film.create({
      data: {
        title: filmTitle,
        category: "TRAINING",
        visibility: "PRIVATE",
        storageKey: "films/does-not-exist.mp4",
        originalFilename: "x.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1,
        uploadedById: athlete.userId,
      },
    });

    const selfRes = await request.get("/profile", { headers: { Cookie: athlete.cookie } });
    expect(await selfRes.text()).toContain(filmTitle);

    const coachRes = await request.get(`/team/${team.id}/athletes/${athlete.userId}`, { headers: { Cookie: coach.cookie } });
    expect(coachRes.status()).toBe(200);
    expect(await coachRes.text()).not.toContain(filmTitle);
  });

  test("11. Training isolation: a TrainingSet logged under Team B does not appear in Team A's view of a shared athlete", async ({ request }) => {
    const coachA = await createOnboardedCoach(`${E2E_RUN_ID}-trainiso-coachA`);
    const coachB = await createOnboardedCoach(`${E2E_RUN_ID}-trainiso-coachB`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-trainiso-athlete`, "Football", "Quarterback");
    const teamA = await createTestTeam(coachA.userId, [
      { userId: coachA.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const teamB = await createTestTeam(coachB.userId, [
      { userId: coachB.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    const exercise = await testPrisma.exercise.findFirst({ where: { teamId: null } });
    if (!exercise) throw new Error("Expected at least one seeded global exercise for this test.");
    const program = await testPrisma.trainingProgram.create({ data: { teamId: teamB.id, title: `${E2E_RUN_ID} Team B Program`, createdById: coachB.userId } });
    const block = await testPrisma.trainingBlock.create({ data: { programId: program.id, title: "Block 1", order: 0 } });
    const programExercise = await testPrisma.programExercise.create({ data: { blockId: block.id, exerciseId: exercise.id, order: 0 } });
    const session = await testPrisma.trainingSession.create({ data: { teamId: teamB.id, programId: program.id, title: "B Session", status: "LIVE", startedAt: new Date(), createdById: coachB.userId } });

    await testPrisma.trainingSet.create({
      data: {
        sessionId: session.id,
        teamId: teamB.id,
        exerciseId: exercise.id,
        programExerciseId: programExercise.id,
        athleteId: athlete.userId,
        loggedById: athlete.userId,
        setNumber: 1,
        reps: 5,
        weight: 999,
      },
    });

    const resA = await request.get(`/team/${teamA.id}/athletes/${athlete.userId}`, { headers: { Cookie: coachA.cookie } });
    expect(resA.status()).toBe(200);
    expect(await resA.text()).not.toContain("999");

    const resB = await request.get(`/team/${teamB.id}/athletes/${athlete.userId}`, { headers: { Cookie: coachB.cookie } });
    expect(await resB.text()).toContain(exercise.name);
  });
});
