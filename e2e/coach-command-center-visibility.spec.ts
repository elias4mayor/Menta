import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for Phase A (Coach Command
 * Center, /team/[teamId]/train). Like Phase B's getTodaySession, this
 * page's read (getTeamTodaySessions) has no API route of its own — the
 * page calls it directly as a server component — so these tests
 * exercise the real rendered page over HTTP, the same standard every
 * other security spec in this repo uses.
 */
test.describe("Coach Command Center visibility (Phase A)", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingGroupMember.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingGroup.deleteMany({ where: { session: { teamId: { in: teamIds } } } });
    await testPrisma.trainingSession.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.trainingProgram.deleteMany({ where: { title: { contains: E2E_RUN_ID } } });
    await testPrisma.exercise.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  /**
   * createTestUser() mints a real session but, unlike createTestAthlete(),
   * doesn't create a CoachProfile — fine for the many existing specs that
   * only ever hit API routes as a coach, but this spec is the first to
   * hit an actual page route, and proxy.ts's onboarding-completion gate
   * (page routes only, not API routes) redirects an un-onboarded coach to
   * /onboarding before this page is ever reached. Fixed locally here
   * rather than in the shared db-helpers.ts test infrastructure other
   * passing specs depend on.
   */
  async function createOnboardedCoach(tag: string) {
    const coach = await createTestUser(tag, "COACH");
    await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
    return coach;
  }

  async function setupTeam(tag: string) {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-ccc-${tag}-coach`);
    const athlete = await createTestAthlete(`${E2E_RUN_ID}-ccc-${tag}-athlete`, "Football", "Quarterback");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} ${tag} Program`, createdById: coach.userId },
    });
    return { coach, athlete, team, program };
  }

  async function createSession(teamId: string, programId: string, coachId: string, status: string, athleteIds: string[], title: string) {
    const session = await testPrisma.trainingSession.create({
      data: { teamId, programId, title, status, startedAt: status === "LIVE" ? new Date() : undefined, createdById: coachId },
    });
    if (athleteIds.length > 0) {
      const group = await testPrisma.trainingGroup.create({ data: { sessionId: session.id, name: "Everyone" } });
      await testPrisma.trainingGroupMember.createMany({
        data: athleteIds.map((athleteId) => ({ groupId: group.id, sessionId: session.id, athleteId })),
      });
    }
    return session;
  }

  test("1. coach with a LIVE session sees it featured, with the correct CTA and href", async ({ request }) => {
    const { coach, athlete, team, program } = await setupTeam("live");
    const session = await createSession(team.id, program.id, coach.userId, "LIVE", [athlete.userId], `${E2E_RUN_ID} Live Featured`);

    const res = await request.get(`/team/${team.id}/train`, { headers: { Cookie: coach.cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`${E2E_RUN_ID} Live Featured`);
    expect(html).toContain("Enter live session");
    expect(html).toContain(`/team/${team.id}/sessions/${session.id}`);
  });

  test("2. coach with a SCHEDULED session sees it with the scheduled CTA, not the live one", async ({ request }) => {
    const { coach, athlete, team, program } = await setupTeam("scheduled");
    await createSession(team.id, program.id, coach.userId, "SCHEDULED", [athlete.userId], `${E2E_RUN_ID} Scheduled Featured`);

    const html = await (await request.get(`/team/${team.id}/train`, { headers: { Cookie: coach.cookie } })).text();
    expect(html).toContain(`${E2E_RUN_ID} Scheduled Featured`);
    expect(html).toContain("Open session");
    expect(html).not.toContain("Enter live session");
  });

  test("3. coach with no session today sees the empty state, not an error", async ({ request }) => {
    const { coach, team } = await setupTeam("none");

    const res = await request.get(`/team/${team.id}/train`, { headers: { Cookie: coach.cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("No training session today");
    expect(html).toContain("Start a live session");
  });

  test("4. a coach on multiple teams sees each team's own session independently", async ({ request }) => {
    const coach = await createOnboardedCoach(`${E2E_RUN_ID}-ccc-multi-coach`);
    const teamA = await testPrisma.team.create({
      data: { name: `${E2E_RUN_ID} Multi Team A`, inviteCode: `${E2E_RUN_ID}MA`, createdById: coach.userId, memberships: { create: [{ userId: coach.userId, teamRole: "COACH" }] } },
    });
    const teamB = await testPrisma.team.create({
      data: { name: `${E2E_RUN_ID} Multi Team B`, inviteCode: `${E2E_RUN_ID}MB`, createdById: coach.userId, memberships: { create: [{ userId: coach.userId, teamRole: "COACH" }] } },
    });
    const programA = await testPrisma.trainingProgram.create({ data: { teamId: teamA.id, title: `${E2E_RUN_ID} Multi Program A`, createdById: coach.userId } });
    const programB = await testPrisma.trainingProgram.create({ data: { teamId: teamB.id, title: `${E2E_RUN_ID} Multi Program B`, createdById: coach.userId } });
    await createSession(teamA.id, programA.id, coach.userId, "LIVE", [], `${E2E_RUN_ID} Multi Session A`);
    await createSession(teamB.id, programB.id, coach.userId, "SCHEDULED", [], `${E2E_RUN_ID} Multi Session B`);

    const htmlA = await (await request.get(`/team/${teamA.id}/train`, { headers: { Cookie: coach.cookie } })).text();
    expect(htmlA).toContain(`${E2E_RUN_ID} Multi Session A`);
    expect(htmlA).not.toContain(`${E2E_RUN_ID} Multi Session B`);

    const htmlB = await (await request.get(`/team/${teamB.id}/train`, { headers: { Cookie: coach.cookie } })).text();
    expect(htmlB).toContain(`${E2E_RUN_ID} Multi Session B`);
    expect(htmlB).not.toContain(`${E2E_RUN_ID} Multi Session A`);
  });

  test("5. an unrelated coach cannot view another team's command center", async ({ request }) => {
    const teamA = await setupTeam("unauthA");
    const outsider = await createOnboardedCoach(`${E2E_RUN_ID}-ccc-outsider`);
    await createSession(teamA.team.id, teamA.program.id, teamA.coach.userId, "LIVE", [], `${E2E_RUN_ID} Should Not Leak`);

    const res = await request.get(`/team/${teamA.team.id}/train`, { headers: { Cookie: outsider.cookie } });
    expect(res.status()).toBe(404);
  });

  test("archived programs are excluded from the command center's program list", async ({ request }) => {
    const { coach, team } = await setupTeam("archived");
    const active = await testPrisma.trainingProgram.create({ data: { teamId: team.id, title: `${E2E_RUN_ID} Active Program`, createdById: coach.userId, status: "ACTIVE" } });
    await testPrisma.trainingProgram.create({ data: { teamId: team.id, title: `${E2E_RUN_ID} Archived Program`, createdById: coach.userId, status: "ARCHIVED" } });

    const html = await (await request.get(`/team/${team.id}/train`, { headers: { Cookie: coach.cookie } })).text();
    expect(html).toContain(active.title);
    expect(html).not.toContain(`${E2E_RUN_ID} Archived Program`);
  });
});
