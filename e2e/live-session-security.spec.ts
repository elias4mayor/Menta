import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for MENTA LIVE (Phase 6):
 * session/group creation and control, state-machine enforcement, set
 * logging, cross-team isolation, and the historical-integrity guarantees
 * the spec is built around. Real HTTP round trips — mirrors the
 * structure of e2e/program-builder-security.spec.ts and
 * e2e/athlete-prescriptions-security.spec.ts.
 */
test.describe("MENTA LIVE security", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingSet.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingGroupMember.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingGroup.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingSession.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingProgram.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.exercise.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  /** A real team + coach + N athletes + a two-exercise program, ready to run a live session against. */
  async function setupTeamWithProgram(tag: string, athleteCount = 2) {
    const coach = await createTestUser(`${E2E_RUN_ID}-live-${tag}-coach`, "COACH");
    const athletes = [];
    for (let i = 0; i < athleteCount; i++) {
      athletes.push(await createTestAthlete(`${E2E_RUN_ID}-live-${tag}-athlete${i}`, "Football", "Quarterback"));
    }
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      ...athletes.map((a) => ({ userId: a.userId, teamRole: "ATHLETE" })),
    ]);
    const squat = await testPrisma.exercise.create({
      data: { teamId: null, name: `${E2E_RUN_ID} ${tag} Squat`, category: "STRENGTH", createdById: coach.userId },
    });
    const bench = await testPrisma.exercise.create({
      data: { teamId: null, name: `${E2E_RUN_ID} ${tag} Bench`, category: "STRENGTH", createdById: coach.userId },
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
              exercises: {
                create: [
                  { exerciseId: squat.id, order: 0, targetSets: 4, targetReps: "5", targetLoad: 225, restSec: 120 },
                  { exerciseId: bench.id, order: 1, targetSets: 3, targetReps: "8", targetLoad: 135, restSec: 90 },
                ],
              },
            },
          ],
        },
      },
      include: { blocks: { include: { exercises: true } } },
    });
    const [squatPE, benchPE] = program.blocks[0].exercises;
    return { coach, athletes, team, program, squat, bench, squatPE, benchPE };
  }

  test("an athlete cannot start a session", async ({ request }) => {
    const { athletes, team, program } = await setupTeamWithProgram("no-start");
    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: athletes[0].cookie, "Content-Type": "application/json" },
      data: { title: "Should not exist", athleteIds: [athletes[0].userId] },
    });
    expect(res.status()).toBe(403);
    const found = await testPrisma.trainingSession.findFirst({ where: { title: "Should not exist" } });
    expect(found).toBeNull();
  });

  test("an unauthorized coach cannot start a session for a team they don't belong to", async ({ request }) => {
    const { team, program } = await setupTeamWithProgram("no-cross-start");
    const outsider = await createTestUser(`${E2E_RUN_ID}-live-outsider`, "COACH");
    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: outsider.cookie, "Content-Type": "application/json" },
      data: { title: "Should not exist", athleteIds: ["someone"] },
    });
    expect(res.status()).toBe(403);
  });

  test("a valid coach can create a session; it starts SCHEDULED, pointed at the program's first exercise, with a default group", async ({ request }) => {
    const { coach, athletes, team, program, squatPE } = await setupTeamWithProgram("valid-create");
    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Live Session`, athleteIds: athletes.map((a) => a.userId) },
    });
    expect(res.status(), await res.text()).toBe(200);
    const { session } = await res.json();
    expect(session.status).toBe("SCHEDULED");
    expect(session.currentProgramExerciseId).toBe(squatPE.id);

    const groups = await testPrisma.trainingGroup.findMany({ where: { sessionId: session.id }, include: { members: true } });
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(athletes.length);
    expect(groups[0].currentProgramExerciseId).toBe(squatPE.id);
  });

  test("session creation is transactional — an invalid athlete anywhere in the request creates nothing", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeamWithProgram("transactional");
    const outsiderAthlete = await createTestAthlete(`${E2E_RUN_ID}-live-not-on-team`, "Football", "Quarterback");

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Should Not Persist`, athleteIds: [athletes[0].userId, outsiderAthlete.userId] },
    });
    expect(res.status()).toBe(400);

    const found = await testPrisma.trainingSession.findFirst({ where: { title: `${E2E_RUN_ID} Should Not Persist` } });
    expect(found).toBeNull();
    const groupCount = await testPrisma.trainingGroup.count({ where: { session: { title: `${E2E_RUN_ID} Should Not Persist` } } });
    expect(groupCount).toBe(0);
  });

  test("an athlete cannot be assigned to two groups in the same session", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeamWithProgram("dup-group");
    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} Dup Group`,
        groups: [
          { name: "A", athleteIds: [athletes[0].userId] },
          { name: "B", athleteIds: [athletes[0].userId] },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("state machine: valid transitions succeed, invalid ones are rejected", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeamWithProgram("state-machine");
    const create = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} State Machine`, athleteIds: athletes.map((a) => a.userId) },
    });
    const { session } = await create.json();
    const headers = { Cookie: coach.cookie, "Content-Type": "application/json" };

    // SCHEDULED -> COMPLETE directly is invalid.
    const skip = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "COMPLETE" } });
    expect(skip.status()).toBe(409);

    const toLive = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "LIVE" } });
    expect(toLive.status(), await toLive.text()).toBe(200);

    const toPaused = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "PAUSED" } });
    expect(toPaused.status()).toBe(200);

    const toLiveAgain = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "LIVE" } });
    expect(toLiveAgain.status()).toBe(200);

    const toComplete = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "COMPLETE" } });
    expect(toComplete.status()).toBe(200);

    // COMPLETE is terminal — never reopens.
    const reopen = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, { headers, data: { status: "LIVE" } });
    expect(reopen.status()).toBe(409);

    const final = await testPrisma.trainingSession.findUnique({ where: { id: session.id } });
    expect(final?.status).toBe("COMPLETE");
  });

  test("an unauthorized coach cannot control another team's session", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeamWithProgram("no-cross-control");
    const outsider = await createTestUser(`${E2E_RUN_ID}-live-control-outsider`, "COACH");
    const create = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Control Target`, athleteIds: athletes.map((a) => a.userId) },
    });
    const { session } = await create.json();

    const res = await request.patch(`/api/teams/${team.id}/sessions/${session.id}`, {
      headers: { Cookie: outsider.cookie, "Content-Type": "application/json" },
      data: { status: "LIVE" },
    });
    expect(res.status()).toBe(403);

    const untouched = await testPrisma.trainingSession.findUnique({ where: { id: session.id } });
    expect(untouched?.status).toBe("SCHEDULED");
  });

  test("Team A cannot read Team B's session room view", async ({ request }) => {
    const teamA = await setupTeamWithProgram("visA");
    const teamB = await setupTeamWithProgram("visB");
    const createB = await request.post(`/api/teams/${teamB.team.id}/programs/${teamB.program.id}/sessions`, {
      headers: { Cookie: teamB.coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Team B Session`, athleteIds: teamB.athletes.map((a) => a.userId) },
    });
    const { session: sessionB } = await createB.json();

    // Team A's coach tries to read Team B's session via Team A's own team id in the URL.
    const wrongTeamUrl = await request.get(`/api/teams/${teamA.team.id}/sessions/${sessionB.id}`, {
      headers: { Cookie: teamA.coach.cookie },
    });
    expect(wrongTeamUrl.status()).toBe(404);

    // And even with Team B's real team id, Team A's coach isn't a member there.
    const wrongActor = await request.get(`/api/teams/${teamB.team.id}/sessions/${sessionB.id}`, {
      headers: { Cookie: teamA.coach.cookie },
    });
    expect(wrongActor.status()).toBe(403);
  });

  async function createAndStartSession(
    request: import("@playwright/test").APIRequestContext,
    setup: Awaited<ReturnType<typeof setupTeamWithProgram>>,
    title: string
  ) {
    const create = await request.post(`/api/teams/${setup.team.id}/programs/${setup.program.id}/sessions`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { title, athleteIds: setup.athletes.map((a) => a.userId) },
    });
    const { session } = await create.json();
    await request.patch(`/api/teams/${setup.team.id}/sessions/${session.id}`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { status: "LIVE" },
    });
    const groups = await testPrisma.trainingGroup.findMany({ where: { sessionId: session.id } });
    return { session, groupId: groups[0].id };
  }

  test("advancing a group rejects a programExercise from a different program", async ({ request }) => {
    const setupA = await setupTeamWithProgram("advA");
    const setupB = await setupTeamWithProgram("advB");
    const { session, groupId } = await createAndStartSession(request, setupA, `${E2E_RUN_ID} Advance Reject`);

    const res = await request.post(`/api/teams/${setupA.team.id}/sessions/${session.id}/groups/${groupId}/advance`, {
      headers: { Cookie: setupA.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: setupB.benchPE.id },
    });
    expect(res.status()).toBe(400);

    const untouched = await testPrisma.trainingGroup.findUnique({ where: { id: groupId } });
    expect(untouched?.currentProgramExerciseId).toBe(setupA.squatPE.id);
  });

  test("advancing a group to the next exercise updates only that group, not the whole session", async ({ request }) => {
    const setup = await setupTeamWithProgram("advGroupOnly");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Advance Group Only`);

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/groups/${groupId}/advance`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: setup.benchPE.id },
    });
    expect(res.status(), await res.text()).toBe(200);

    const group = await testPrisma.trainingGroup.findUnique({ where: { id: groupId } });
    expect(group?.currentProgramExerciseId).toBe(setup.benchPE.id);
    const sessionRow = await testPrisma.trainingSession.findUnique({ where: { id: session.id } });
    expect(sessionRow?.currentProgramExerciseId).toBe(setup.squatPE.id);
  });

  test("advancing the whole room updates the session and every one of its groups", async ({ request }) => {
    const setup = await setupTeamWithProgram("advWholeRoom", 4);
    const create = await request.post(`/api/teams/${setup.team.id}/programs/${setup.program.id}/sessions`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: {
        title: `${E2E_RUN_ID} Advance Whole Room`,
        groups: [
          { name: "A", athleteIds: [setup.athletes[0].userId, setup.athletes[1].userId] },
          { name: "B", athleteIds: [setup.athletes[2].userId, setup.athletes[3].userId] },
        ],
      },
    });
    const { session } = await create.json();
    await request.patch(`/api/teams/${setup.team.id}/sessions/${session.id}`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { status: "LIVE" },
    });

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/advance`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: setup.benchPE.id },
    });
    expect(res.status(), await res.text()).toBe(200);

    const groups = await testPrisma.trainingGroup.findMany({ where: { sessionId: session.id } });
    expect(groups.every((g) => g.currentProgramExerciseId === setup.benchPE.id)).toBe(true);
    const sessionRow = await testPrisma.trainingSession.findUnique({ where: { id: session.id } });
    expect(sessionRow?.currentProgramExerciseId).toBe(setup.benchPE.id);
  });

  test("an athlete can log their own set; the resolved prescription follows AthletePrescription over the program default", async ({ request }) => {
    const setup = await setupTeamWithProgram("selfLog");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Self Log`);
    const athlete = setup.athletes[0];

    // Give this athlete an individualized prescription above the program's 225 lb default.
    await testPrisma.athletePrescription.create({
      data: { programExerciseId: setup.squatPE.id, athleteId: athlete.userId, prescribedLoad: 235, prescribedReps: "5", setById: setup.coach.userId },
    });

    const me = await request.get(`/api/teams/${setup.team.id}/sessions/${session.id}/me`, { headers: { Cookie: athlete.cookie } });
    expect(me.status(), await me.text()).toBe(200);
    const meData = await me.json();
    expect(meData.prescribed.source).toBe("prescription");
    expect(meData.prescribed.load).toBe(235);

    const log = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { athleteId: athlete.userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 235, reps: 5 },
    });
    expect(log.status(), await log.text()).toBe(200);

    const row = await testPrisma.trainingSet.findFirst({ where: { sessionId: session.id, athleteId: athlete.userId, setNumber: 1 } });
    expect(row?.weight).toBe(235);
    expect(row?.loggedById).toBe(athlete.userId);
  });

  test("a program with no individualized prescription falls back to the ProgramExercise default", async ({ request }) => {
    const setup = await setupTeamWithProgram("defaultFallback");
    const { session } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Default Fallback`);
    const athlete = setup.athletes[0];

    const me = await request.get(`/api/teams/${setup.team.id}/sessions/${session.id}/me`, { headers: { Cookie: athlete.cookie } });
    const meData = await me.json();
    expect(meData.prescribed.source).toBe("default");
    expect(meData.prescribed.load).toBe(225);
  });

  test("an athlete cannot log another athlete's set", async ({ request }) => {
    const setup = await setupTeamWithProgram("noLogForOther");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} No Log For Other`);

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setup.athletes[0].cookie, "Content-Type": "application/json" },
      data: { athleteId: setup.athletes[1].userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(403);

    const found = await testPrisma.trainingSet.findFirst({ where: { sessionId: session.id, athleteId: setup.athletes[1].userId } });
    expect(found).toBeNull();
  });

  test("a coach with LOG_TRAINING_SETS can log on behalf of an athlete (no-phone mode)", async ({ request }) => {
    const setup = await setupTeamWithProgram("coachLogsForAthlete");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Coach Logs`);

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { athleteId: setup.athletes[0].userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status(), await res.text()).toBe(200);

    const row = await testPrisma.trainingSet.findFirst({ where: { sessionId: session.id, athleteId: setup.athletes[0].userId } });
    expect(row?.loggedById).toBe(setup.coach.userId);
    expect(row?.athleteId).toBe(setup.athletes[0].userId);
  });

  test("an athlete cannot log a set against another team's session, even claiming themself", async ({ request }) => {
    const setupA = await setupTeamWithProgram("crossSessionA");
    const setupB = await setupTeamWithProgram("crossSessionB");
    const { session, groupId } = await createAndStartSession(request, setupA, `${E2E_RUN_ID} Cross Session Log`);

    const res = await request.post(`/api/teams/${setupA.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setupB.athletes[0].cookie, "Content-Type": "application/json" },
      data: { athleteId: setupB.athletes[0].userId, programExerciseId: setupA.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(400);
  });

  test("an invalid programExercise is rejected when logging a set", async ({ request }) => {
    const setupA = await setupTeamWithProgram("invalidPE");
    const setupB = await setupTeamWithProgram("invalidPEsource");
    const { session, groupId } = await createAndStartSession(request, setupA, `${E2E_RUN_ID} Invalid PE`);

    const res = await request.post(`/api/teams/${setupA.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setupA.coach.cookie, "Content-Type": "application/json" },
      data: { athleteId: setupA.athletes[0].userId, programExerciseId: setupB.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(400);
  });

  test("an invalid group is rejected when logging a set", async ({ request }) => {
    const setupA = await setupTeamWithProgram("invalidGroup");
    const setupB = await setupTeamWithProgram("invalidGroupSource");
    const { session } = await createAndStartSession(request, setupA, `${E2E_RUN_ID} Invalid Group`);
    const { groupId: groupFromB } = await createAndStartSession(request, setupB, `${E2E_RUN_ID} Invalid Group Source`);

    const res = await request.post(`/api/teams/${setupA.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setupA.coach.cookie, "Content-Type": "application/json" },
      data: { athleteId: setupA.athletes[0].userId, programExerciseId: setupA.squatPE.id, groupId: groupFromB, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(400);
  });

  test("duplicate set submission updates the same row instead of creating a second one", async ({ request }) => {
    const setup = await setupTeamWithProgram("duplicateSubmit");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Duplicate Submit`);
    const athlete = setup.athletes[0];
    const body = { athleteId: athlete.userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 };

    const first = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: body,
    });
    expect(first.status()).toBe(200);
    const second = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { ...body, weight: 230 },
    });
    expect(second.status()).toBe(200);

    const rows = await testPrisma.trainingSet.findMany({ where: { sessionId: session.id, athleteId: athlete.userId, setNumber: 1 } });
    expect(rows).toHaveLength(1);
    expect(rows[0].weight).toBe(230);
    expect(rows[0].editedAt).not.toBeNull();
  });

  test("logging a set is rejected while the session is paused", async ({ request }) => {
    const setup = await setupTeamWithProgram("pausedReject");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Paused Reject`);
    await request.patch(`/api/teams/${setup.team.id}/sessions/${session.id}`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { status: "PAUSED" },
    });

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setup.athletes[0].cookie, "Content-Type": "application/json" },
      data: { athleteId: setup.athletes[0].userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(409);
  });

  test("logging a set is rejected once the session is complete", async ({ request }) => {
    const setup = await setupTeamWithProgram("completeReject");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Complete Reject`);
    await request.patch(`/api/teams/${setup.team.id}/sessions/${session.id}`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { status: "COMPLETE" },
    });

    const res = await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: setup.athletes[0].cookie, "Content-Type": "application/json" },
      data: { athleteId: setup.athletes[0].userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });
    expect(res.status()).toBe(409);
  });

  test("historical integrity: a program edit after a set is logged never rewrites the logged set, and is rejected while the session is live", async ({ request }) => {
    const setup = await setupTeamWithProgram("historicalIntegrity");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Historical Integrity`);
    const athlete = setup.athletes[0];

    await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { athleteId: athlete.userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });

    // Attempting to edit the program's blocks/exercises while the session is LIVE is rejected outright.
    const editAttempt = await request.patch(`/api/teams/${setup.team.id}/programs/${setup.program.id}`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: {
        title: setup.program.title,
        blocks: [{ title: "Strength", order: 0, exercises: [{ exerciseId: setup.squat.id, order: 0, targetLoad: 999 }] }],
      },
    });
    expect(editAttempt.status()).toBe(400);

    const loggedSet = await testPrisma.trainingSet.findFirst({ where: { sessionId: session.id, athleteId: athlete.userId, setNumber: 1 } });
    expect(loggedSet?.weight).toBe(225);
    const programExercise = await testPrisma.programExercise.findUnique({ where: { id: setup.squatPE.id } });
    expect(programExercise?.targetLoad).toBe(225);
  });

  test("prescription changes remain allowed while a session is live and never alter already-logged sets", async ({ request }) => {
    const setup = await setupTeamWithProgram("prescriptionDuringLive");
    const { session, groupId } = await createAndStartSession(request, setup, `${E2E_RUN_ID} Prescription During Live`);
    const athlete = setup.athletes[0];

    await request.post(`/api/teams/${setup.team.id}/sessions/${session.id}/sets`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { athleteId: athlete.userId, programExerciseId: setup.squatPE.id, groupId, setNumber: 1, weight: 225, reps: 5 },
    });

    const rxUpdate = await request.post(`/api/teams/${setup.team.id}/programs/${setup.program.id}/prescriptions`, {
      headers: { Cookie: setup.coach.cookie, "Content-Type": "application/json" },
      data: { programExerciseId: setup.squatPE.id, prescriptions: [{ athleteId: athlete.userId, prescribedLoad: 240, prescribedReps: "5" }] },
    });
    expect(rxUpdate.status(), await rxUpdate.text()).toBe(200);

    const loggedSet = await testPrisma.trainingSet.findFirst({ where: { sessionId: session.id, athleteId: athlete.userId, setNumber: 1 } });
    expect(loggedSet?.weight).toBe(225);
  });

  test("creating a session with zero athletes returns a friendly message, never a raw Zod string", async ({ request }) => {
    const { coach, team, program } = await setupTeamWithProgram("emptyAthletes");

    const res = await request.post(`/api/teams/${team.id}/programs/${program.id}/sessions`, {
      headers: { Cookie: coach.cookie, "Content-Type": "application/json" },
      data: { title: `${E2E_RUN_ID} Empty Athletes`, athleteIds: [] },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Select at least one athlete to continue.");
    expect(body.error).not.toMatch(/too_small|expected array|>=|Zod/i);

    const found = await testPrisma.trainingSession.findFirst({ where: { title: `${E2E_RUN_ID} Empty Athletes` } });
    expect(found).toBeNull();
  });
});
