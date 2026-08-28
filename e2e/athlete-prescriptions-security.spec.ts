import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for the MENTA TRAIN Athlete
 * Prescriptions feature (Phase 5): authorization, cross-team athlete/
 * program-exercise reference integrity, program-default-vs-override
 * behavior, and write attribution. Real HTTP round trips against the
 * actual API routes and database — mirrors the structure of
 * e2e/program-builder-security.spec.ts.
 */
test.describe("Athlete Prescriptions security", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingSet.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingSession.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingProgram.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.exercise.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  /** Builds a real team + coach + athlete + a one-block/one-exercise program, ready to prescribe against. */
  async function setupTeamWithProgram(tag: string) {
    const coach = await createTestUser(`${E2E_RUN_ID}-rx-${tag}-coach`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-rx-${tag}-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const exercise = await testPrisma.exercise.create({
      data: { teamId: null, name: `${E2E_RUN_ID} ${tag} Squat`, category: "STRENGTH", createdById: coach.userId },
    });
    const program = await testPrisma.trainingProgram.create({
      data: {
        teamId: team.id,
        title: `${E2E_RUN_ID} ${tag} Program`,
        createdById: coach.userId,
        blocks: {
          create: [
            {
              title: "Strength",
              order: 0,
              exercises: { create: [{ exerciseId: exercise.id, order: 0, targetSets: 4, targetReps: "5", targetLoadPercent: 80 }] },
            },
          ],
        },
      },
      include: { blocks: { include: { exercises: true } } },
    });
    const programExerciseId = program.blocks[0].exercises[0].id;
    return { coach, athlete, team, exercise, program, programExerciseId };
  }

  test("an athlete cannot create their own prescription", async ({ request }) => {
    const { athlete, team, program, programExerciseId } = await setupTeamWithProgram("plain");

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 500 }] },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.athletePrescription.findFirst({ where: { programExerciseId, athleteId: athlete.userId } });
    expect(found).toBeNull();
  });

  test("a coach cannot create a prescription for a team they don't belong to", async ({ request }) => {
    const { athlete, team, program, programExerciseId } = await setupTeamWithProgram("cross-team-write");
    const outsiderCoach = await createTestUser(`${E2E_RUN_ID}-rx-outsider-coach`, "COACH");

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: outsiderCoach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 500 }] },
    });
    expect(res.status()).toBe(403);
  });

  test("a Team A coach cannot prescribe a Team B athlete, even naming their real id", async ({ request }) => {
    const teamA = await setupTeamWithProgram("crossA");
    const teamB = await setupTeamWithProgram("crossB");

    const res = await request.post(`/api/teams/${teamA.team.id}/programs/${teamA.program.id}/prescriptions`, {
      headers: { Cookie: teamA.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: teamA.programExerciseId, prescriptions: [{ athleteId: teamB.athlete.userId, prescribedLoad: 300 }] },
    });
    expect(res.status()).toBe(400);

    const found = await testPrisma.athletePrescription.findFirst({
      where: { programExerciseId: teamA.programExerciseId, athleteId: teamB.athlete.userId },
    });
    expect(found).toBeNull();
  });

  test("a Team A coach cannot write against a Team B program exercise via Team A's own program URL", async ({ request }) => {
    const teamA = await setupTeamWithProgram("peA");
    const teamB = await setupTeamWithProgram("peB");

    // teamA's coach knows teamB's real programExerciseId (e.g. from a leaked id) but is
    // acting through their own team's programId in the URL — must still be rejected.
    const res = await request.post(`/api/teams/${teamA.team.id}/programs/${teamA.program.id}/prescriptions`, {
      headers: { Cookie: teamA.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: teamB.programExerciseId, prescriptions: [{ athleteId: teamA.athlete.userId, prescribedLoad: 300 }] },
    });
    expect(res.status()).toBe(400);

    const found = await testPrisma.athletePrescription.findFirst({
      where: { programExerciseId: teamB.programExerciseId, athleteId: teamA.athlete.userId },
    });
    expect(found).toBeNull();
  });

  test("a legitimate coach can create and then update a prescription; the update overwrites, not duplicates", async ({ request }) => {
    const { coach, athlete, team, program, programExerciseId } = await setupTeamWithProgram("legit");

    const create = await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 225, prescribedReps: "5", prescribedSets: 4 }] },
    });
    expect(create.status(), await create.text()).toBe(200);
    const { prescriptions: created } = await create.json();
    expect(created[0].prescribedLoad).toBe(225);

    const update = await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 235, prescribedReps: "5", prescribedSets: 4 }] },
    });
    expect(update.status(), await update.text()).toBe(200);

    const rows = await testPrisma.athletePrescription.findMany({ where: { programExerciseId, athleteId: athlete.userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].prescribedLoad).toBe(235);
  });

  test("program default and athlete prescription are distinct: the program exercise's target fields never change from a prescription write", async ({ request }) => {
    const { coach, athlete, team, program, programExerciseId } = await setupTeamWithProgram("default-vs-override");

    const before = await testPrisma.programExercise.findUnique({ where: { id: programExerciseId } });
    expect(before?.targetLoadPercent).toBe(80);

    await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 235, prescribedReps: "5" }] },
    });

    const after = await testPrisma.programExercise.findUnique({ where: { id: programExerciseId } });
    expect(after?.targetLoadPercent).toBe(80);
    expect(after?.targetLoad).toBe(before?.targetLoad);

    const prescription = await testPrisma.athletePrescription.findUnique({
      where: { programExerciseId_athleteId: { programExerciseId, athleteId: athlete.userId } },
    });
    expect(prescription?.prescribedLoad).toBe(235);
  });

  test("clearing a prescription removes the override without touching the program default or other athletes", async ({ request }) => {
    const { coach, athlete, team, program, programExerciseId } = await setupTeamWithProgram("clear");
    const secondAthlete = await createTestAthlete(`${E2E_RUN_ID}-rx-clear-second`, "Football", "Quarterback");
    await testPrisma.teamMembership.create({ data: { userId: secondAthlete.userId, teamId: team.id, teamRole: "ATHLETE" } });

    await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        programExerciseId,
        prescriptions: [
          { athleteId: athlete.userId, prescribedLoad: 235 },
          { athleteId: secondAthlete.userId, prescribedLoad: 245 },
        ],
      },
    });

    const clear = await request.delete(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId, athleteIds: [athlete.userId] },
    });
    expect(clear.status(), await clear.text()).toBe(200);

    const cleared = await testPrisma.athletePrescription.findUnique({
      where: { programExerciseId_athleteId: { programExerciseId, athleteId: athlete.userId } },
    });
    expect(cleared).toBeNull();

    const untouched = await testPrisma.athletePrescription.findUnique({
      where: { programExerciseId_athleteId: { programExerciseId, athleteId: secondAthlete.userId } },
    });
    expect(untouched?.prescribedLoad).toBe(245);
  });

  test("setById always reflects the real signed-in coach, never a client-supplied value", async ({ request }) => {
    const { coach, athlete, team, program, programExerciseId } = await setupTeamWithProgram("attribution");
    const impersonated = await createTestUser(`${E2E_RUN_ID}-rx-impersonated`, "COACH");

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/prescriptions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        programExerciseId,
        prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 225, setById: impersonated.userId }],
      },
    });
    expect(res.status(), await res.text()).toBe(200);

    const row = await testPrisma.athletePrescription.findUnique({
      where: { programExerciseId_athleteId: { programExerciseId, athleteId: athlete.userId } },
    });
    expect(row?.setById).toBe(coach.userId);
    expect(row?.setById).not.toBe(impersonated.userId);
  });

  test("a coach on Team A cannot see or read Team B's prescription data through Team A's program", async ({ request }) => {
    const teamA = await setupTeamWithProgram("visA");
    const teamB = await setupTeamWithProgram("visB");

    await request.post(`/api/teams/${teamB.team.id}/programs/${teamB.program.id}/prescriptions`, {
      headers: { Cookie: teamB.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: teamB.programExerciseId, prescriptions: [{ athleteId: teamB.athlete.userId, prescribedLoad: 999 }] },
    });

    // The only read path (listProgramPrescriptions in src/lib/athlete-prescriptions.ts)
    // scopes strictly by programId via programExercise.block.programId — reproduce that
    // exact where-clause directly against the database to confirm it structurally
    // cannot return Team B's rows for Team A's program id.
    const teamARows = await testPrisma.athletePrescription.findMany({
      where: { programExercise: { block: { programId: teamA.program.id } } },
    });
    expect(teamARows.some((r) => r.athleteId === teamB.athlete.userId)).toBe(false);
    expect(teamARows).toHaveLength(0);
  });
});
