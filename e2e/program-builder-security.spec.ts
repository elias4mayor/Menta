import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for the MENTA TRAIN Program
 * Builder (Phase 4): authorization, cross-team exercise/position-group
 * reference integrity, and the "editing a program must never corrupt
 * past session history" guarantee. Real HTTP round trips against the
 * actual API routes and database — mirrors the structure of
 * e2e/exercise-library-security.spec.ts and
 * e2e/film-intelligence-security.spec.ts.
 */
test.describe("Program Builder security", () => {
  test.afterAll(async () => {
    // Deletion order matters: TrainingSet/Exercise are Restrict-protected
    // (see their schema doc comments), and TrainingSession/Exercise's
    // author relations don't cascade on User deletion either — so
    // everything referencing a test team/exercise/program must go before
    // the team, exercise rows, and finally the users themselves.
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

  async function globalExercise(name: string, createdById: string) {
    return testPrisma.exercise.create({
      data: { teamId: null, name: `${E2E_RUN_ID} ${name}`, category: "STRENGTH", createdById },
    });
  }

  test("a plain athlete cannot create a program for their own team", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-coachA`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-pb-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Should Not Exist`, blocks: [] },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.trainingProgram.findFirst({ where: { title: `${E2E_RUN_ID} Should Not Exist` } });
    expect(found).toBeNull();
  });

  test("a coach cannot create a program for a team they don't belong to", async ({ request }) => {
    const coachA = await createTestUser(`${E2E_RUN_ID}-pb-crossA`, "COACH");
    const coachB = await createTestUser(`${E2E_RUN_ID}-pb-crossB`, "COACH");
    const teamB = await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }]);

    const res = await request.post(`/api/teams/${teamB.id}/programs`, {
      headers: { Cookie: coachA.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Cross Team Program`, blocks: [] },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.trainingProgram.findFirst({ where: { title: `${E2E_RUN_ID} Cross Team Program` } });
    expect(found).toBeNull();
  });

  test("a team coach can build a real program referencing a global exercise", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-coachB`, "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
    const squat = await globalExercise("Back Squat", coach.userId);

    const res = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} Lower Body Power`,
        sport: "Football",
        blocks: [
          {
            title: "Strength",
            order: 0,
            exercises: [{ exerciseId: squat.id, order: 0, targetSets: 4, targetReps: "5", targetLoadPercent: 80 }],
          },
        ],
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const { program } = await res.json();
    expect(program.blocks).toHaveLength(1);
    expect(program.blocks[0].exercises[0].exerciseName).toBe(squat.name);
    expect(program.status).toBe("DRAFT");
  });

  test("a program cannot reference another team's private custom exercise", async ({ request }) => {
    const coachA = await createTestUser(`${E2E_RUN_ID}-pb-ownerA`, "COACH");
    const coachB = await createTestUser(`${E2E_RUN_ID}-pb-ownerB`, "COACH");
    const teamA = await createTestTeam(coachA.userId, [{ userId: coachA.userId, teamRole: "COACH" }]);
    const teamB = await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }]);

    const teamBPrivateExercise = await testPrisma.exercise.create({
      data: { teamId: teamB.id, name: `${E2E_RUN_ID} Team B Secret Drill`, category: "SKILL", createdById: coachB.userId },
    });

    const res = await request.post(`/api/teams/${teamA.id}/programs`, {
      headers: { Cookie: coachA.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} Should Reject Foreign Exercise`,
        blocks: [{ title: "Skill", order: 0, exercises: [{ exerciseId: teamBPrivateExercise.id, order: 0 }] }],
      },
    });
    expect(res.status()).toBe(400);

    const found = await testPrisma.trainingProgram.findFirst({ where: { title: `${E2E_RUN_ID} Should Reject Foreign Exercise` } });
    expect(found).toBeNull();
  });

  test("a program cannot reference another team's position group", async ({ request }) => {
    const coachA = await createTestUser(`${E2E_RUN_ID}-pb-pgA`, "COACH");
    const coachB = await createTestUser(`${E2E_RUN_ID}-pb-pgB`, "COACH");
    const teamA = await createTestTeam(coachA.userId, [{ userId: coachA.userId, teamRole: "COACH" }]);
    const teamB = await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }]);

    const teamBGroup = await testPrisma.positionGroup.create({
      data: { teamId: teamB.id, name: `${E2E_RUN_ID} Team B Group`, createdById: coachB.userId },
    });

    const res = await request.post(`/api/teams/${teamA.id}/programs`, {
      headers: { Cookie: coachA.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Should Reject Foreign Group`, positionGroupId: teamBGroup.id, blocks: [] },
    });
    expect(res.status()).toBe(400);
  });

  test("unauthorized users cannot edit or archive another team's program", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-editOwner`, "COACH");
    const outsider = await createTestUser(`${E2E_RUN_ID}-pb-editOutsider`, "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);

    const create = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Edit Target`, blocks: [] },
    });
    const { program } = await create.json();

    const patchAttempt = await request.patch(`/api/teams/${team.id}/programs/${program.id}`, {
      headers: { Cookie: outsider.cookie, "Content-Type": "application/json" },
      data: { title: "Hijacked", blocks: [] },
    });
    expect(patchAttempt.status()).toBe(403);

    const deleteAttempt = await request.delete(`/api/teams/${team.id}/programs/${program.id}`, {
      headers: { Cookie: outsider.cookie },
    });
    expect(deleteAttempt.status()).toBe(403);

    const stillIntact = await testPrisma.trainingProgram.findUnique({ where: { id: program.id } });
    expect(stillIntact?.title).toBe(`${E2E_RUN_ID} Edit Target`);
    expect(stillIntact?.status).not.toBe("ARCHIVED");
  });

  test("editing a program's targetLoad does not alter already-logged TrainingSet history", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-historyCoach`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-pb-historyAthlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const squat = await globalExercise("History Squat", coach.userId);

    const create = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} History Program`,
        blocks: [{ title: "Strength", order: 0, exercises: [{ exerciseId: squat.id, order: 0, targetLoad: 225 }] }],
      },
    });
    const { program } = await create.json();
    const programExerciseId = program.blocks[0].exercises[0].id;

    // Simulate what Phase 6's live engine will eventually do: a real
    // session and a real logged set against this exact program exercise.
    const session = await testPrisma.trainingSession.create({
      data: { teamId: team.id, programId: program.id, title: "History session", createdById: coach.userId, status: "COMPLETE" },
    });
    const loggedSet = await testPrisma.trainingSet.create({
      data: {
        sessionId: session.id,
        teamId: team.id,
        exerciseId: squat.id,
        programExerciseId,
        athleteId: athlete.userId,
        loggedById: athlete.userId,
        setNumber: 1,
        weight: 225,
        reps: 5,
      },
    });

    // Now the coach edits the program's target load for next time.
    const patch = await request.patch(`/api/teams/${team.id}/programs/${program.id}`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        title: program.title,
        blocks: [{ title: "Strength", order: 0, exercises: [{ exerciseId: squat.id, order: 0, targetLoad: 245 }] }],
      },
    });
    expect(patch.status(), await patch.text()).toBe(200);

    const unchangedSet = await testPrisma.trainingSet.findUnique({ where: { id: loggedSet.id } });
    expect(unchangedSet?.weight).toBe(225);
    expect(unchangedSet?.reps).toBe(5);
  });

  test("archiving a program preserves TrainingSet history and the program remains readable", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-archiveCoach`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-pb-archiveAthlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const bench = await globalExercise("Archive Bench", coach.userId);

    const create = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Archive Program`, blocks: [{ title: "Strength", order: 0, exercises: [{ exerciseId: bench.id, order: 0 }] }] },
    });
    const { program } = await create.json();

    const session = await testPrisma.trainingSession.create({
      data: { teamId: team.id, programId: program.id, title: "Archive session", createdById: coach.userId, status: "COMPLETE" },
    });
    const loggedSet = await testPrisma.trainingSet.create({
      data: {
        sessionId: session.id,
        teamId: team.id,
        exerciseId: bench.id,
        athleteId: athlete.userId,
        loggedById: athlete.userId,
        setNumber: 1,
        weight: 185,
        reps: 8,
      },
    });

    const archive = await request.delete(`/api/teams/${team.id}/programs/${program.id}`, { headers: { Cookie: coach.cookie } });
    expect(archive.status()).toBe(200);

    const stillReadable = await request.get(`/api/teams/${team.id}/programs/${program.id}`, { headers: { Cookie: coach.cookie } });
    expect(stillReadable.status()).toBe(200);
    const { program: archived } = await stillReadable.json();
    expect(archived.status).toBe("ARCHIVED");

    const setStillIntact = await testPrisma.trainingSet.findUnique({ where: { id: loggedSet.id } });
    expect(setStillIntact).not.toBeNull();
    expect(setStillIntact?.weight).toBe(185);
  });

  test("a valid saved program resolves cleanly into the future live-session shape (session, group, prescription)", async ({ request }) => {
    const coach = await createTestUser(`${E2E_RUN_ID}-pb-liveCoach`, "COACH");
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-pb-liveAthlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const deadlift = await globalExercise("Live Compat Deadlift", coach.userId);

    const create = await request.post(`/api/teams/${team.id}/programs`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} Live Compat Program`,
        blocks: [{ title: "Strength", order: 0, exercises: [{ exerciseId: deadlift.id, order: 0, targetSets: 3, targetReps: "5" }] }],
      },
    });
    const { program } = await create.json();
    const programExerciseId = program.blocks[0].exercises[0].id;
    const blockId = program.blocks[0].id;

    const session = await testPrisma.trainingSession.create({
      data: {
        teamId: team.id,
        programId: program.id,
        title: "Live compat session",
        createdById: coach.userId,
        status: "LIVE",
        currentBlockId: blockId,
        currentProgramExerciseId: programExerciseId,
      },
    });
    const group = await testPrisma.trainingGroup.create({ data: { sessionId: session.id, name: "Group A" } });
    const prescription = await testPrisma.athletePrescription.create({
      data: { programExerciseId, athleteId: athlete.userId, prescribedLoad: 235, prescribedReps: "5", setById: coach.userId },
    });
    const loggedSet = await testPrisma.trainingSet.create({
      data: {
        sessionId: session.id,
        teamId: team.id,
        exerciseId: deadlift.id,
        programExerciseId,
        groupId: group.id,
        athleteId: athlete.userId,
        loggedById: athlete.userId,
        setNumber: 1,
        weight: 235,
        reps: 5,
      },
    });

    expect(session.currentProgramExerciseId).toBe(programExerciseId);
    expect(prescription.prescribedLoad).toBe(235);
    expect(loggedSet.groupId).toBe(group.id);
  });
});
