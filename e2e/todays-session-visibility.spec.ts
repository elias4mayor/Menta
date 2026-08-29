import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for Phase B (Athlete Home /
 * Today's Training): getMyDay()'s new TodaySession slot has no API
 * route of its own — the dashboard page calls it directly as a server
 * component — so these tests exercise the real thing a browser would
 * see: a GET against the actual /dashboard route with a real session
 * cookie, asserting on the rendered output. This is the same
 * HTTP-round-trip standard every other security spec in this repo uses,
 * just against a page route instead of an API route.
 */
test.describe("Today's Session visibility (Phase B)", () => {
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

  /** A real team + coach + N athletes + a program, ready to attach sessions to. */
  async function setupTeam(tag: string, athleteCount = 2) {
    const coach = await createTestUser(`${E2E_RUN_ID}-tsv-${tag}-coach`, "COACH");
    const athletes = [];
    for (let i = 0; i < athleteCount; i++) {
      athletes.push(await createTestAthlete(`${E2E_RUN_ID}-tsv-${tag}-athlete${i}`, "Football", "Quarterback"));
    }
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      ...athletes.map((a) => ({ userId: a.userId, teamRole: "ATHLETE" })),
    ]);
    const program = await testPrisma.trainingProgram.create({
      data: { teamId: team.id, title: `${E2E_RUN_ID} ${tag} Program`, createdById: coach.userId },
    });
    return { coach, athletes, team, program };
  }

  /** Creates a session with a single group; membershipAthleteIds decides who's actually a TrainingGroupMember. */
  async function createSession(
    teamId: string,
    programId: string,
    coachId: string,
    status: string,
    membershipAthleteIds: string[],
    opts: { scheduledAt?: Date; title?: string } = {}
  ) {
    const session = await testPrisma.trainingSession.create({
      data: {
        teamId,
        programId,
        title: opts.title ?? `${E2E_RUN_ID} Session`,
        status,
        scheduledAt: opts.scheduledAt,
        startedAt: status === "LIVE" ? new Date() : undefined,
        createdById: coachId,
      },
    });
    if (membershipAthleteIds.length > 0) {
      const group = await testPrisma.trainingGroup.create({ data: { sessionId: session.id, name: "Everyone" } });
      await testPrisma.trainingGroupMember.createMany({
        data: membershipAthleteIds.map((athleteId) => ({ groupId: group.id, sessionId: session.id, athleteId })),
      });
    }
    return session;
  }

  test("1. an athlete sees their own LIVE session on the dashboard", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeam("own-session");
    const session = await createSession(team.id, program.id, coach.userId, "LIVE", [athletes[0].userId], {
      title: `${E2E_RUN_ID} My Live Session`,
    });

    const res = await request.get("/dashboard", { headers: { Cookie: athletes[0].cookie } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain(`${E2E_RUN_ID} My Live Session`);
    expect(html).toContain(`/team/${team.id}/sessions/${session.id}/me`);
  });

  test("2 & 3. an athlete never sees another athlete's or another team's session", async ({ request }) => {
    const teamA = await setupTeam("crossA");
    const teamB = await setupTeam("crossB");
    // Session belongs to Team B, athlete B0 only.
    await createSession(teamB.team.id, teamB.program.id, teamB.coach.userId, "LIVE", [teamB.athletes[0].userId], {
      title: `${E2E_RUN_ID} Team B Secret Session`,
    });

    // Team A's athlete 0 (unrelated) must never see it.
    const asAthleteA0 = await request.get("/dashboard", { headers: { Cookie: teamA.athletes[0].cookie } });
    expect((await asAthleteA0.text())).not.toContain(`${E2E_RUN_ID} Team B Secret Session`);

    // Team B's OTHER athlete (same team, not a member of the session) must not see it either.
    const asAthleteB1 = await request.get("/dashboard", { headers: { Cookie: teamB.athletes[1].cookie } });
    expect((await asAthleteB1.text())).not.toContain(`${E2E_RUN_ID} Team B Secret Session`);
  });

  test("4. an athlete not assigned through TrainingGroupMember does not see the session even though they're on the team", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeam("not-a-member", 2);
    await createSession(team.id, program.id, coach.userId, "LIVE", [athletes[0].userId], {
      title: `${E2E_RUN_ID} Members Only Session`,
    });

    const asNonMember = await request.get("/dashboard", { headers: { Cookie: athletes[1].cookie } });
    expect((await asNonMember.text())).not.toContain(`${E2E_RUN_ID} Members Only Session`);
  });

  test("5. a session with zero membership is not surfaced to anyone, and doesn't error", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeam("zero-membership");
    await createSession(team.id, program.id, coach.userId, "LIVE", [], {
      title: `${E2E_RUN_ID} Empty Session`,
    });

    const res = await request.get("/dashboard", { headers: { Cookie: athletes[0].cookie } });
    expect(res.status()).toBe(200);
    expect((await res.text())).not.toContain(`${E2E_RUN_ID} Empty Session`);
  });

  test("6. LIVE renders the live CTA, SCHEDULED renders the scheduled CTA — never mixed up", async ({ request }) => {
    const live = await setupTeam("liveFilter");
    await createSession(live.team.id, live.program.id, live.coach.userId, "LIVE", [live.athletes[0].userId], {
      title: `${E2E_RUN_ID} Filter Live`,
    });
    const liveHtml = await (await request.get("/dashboard", { headers: { Cookie: live.athletes[0].cookie } })).text();
    expect(liveHtml).toContain("Join live session");
    expect(liveHtml).not.toContain("View session →");

    const scheduled = await setupTeam("scheduledFilter");
    // A short, same-calendar-day offset rather than hours out — a multi-hour
    // offset risks crossing midnight (and so failing to count as "today" by
    // design) depending on what time this test happens to run; found via a
    // real manual smoke test that hit exactly this edge case near 10pm.
    const inFiveMinutes = new Date(Date.now() + 5 * 60 * 1000);
    await createSession(scheduled.team.id, scheduled.program.id, scheduled.coach.userId, "SCHEDULED", [scheduled.athletes[0].userId], {
      title: `${E2E_RUN_ID} Filter Scheduled`,
      scheduledAt: inFiveMinutes,
    });
    const scheduledHtml = await (await request.get("/dashboard", { headers: { Cookie: scheduled.athletes[0].cookie } })).text();
    expect(scheduledHtml).toContain(`${E2E_RUN_ID} Filter Scheduled`);
    expect(scheduledHtml).toContain("View session →");
    expect(scheduledHtml).not.toContain("Join live session");
  });

  test("7. CANCELED and COMPLETE sessions never appear as today's training", async ({ request }) => {
    const { coach, athletes, team, program } = await setupTeam("terminalStates");

    const canceled = await createSession(team.id, program.id, coach.userId, "CANCELED", [athletes[0].userId], {
      title: `${E2E_RUN_ID} Canceled Session`,
    });
    const complete = await createSession(team.id, program.id, coach.userId, "COMPLETE", [athletes[0].userId], {
      title: `${E2E_RUN_ID} Complete Session`,
    });
    expect(canceled.status).toBe("CANCELED");
    expect(complete.status).toBe("COMPLETE");

    const html = await (await request.get("/dashboard", { headers: { Cookie: athletes[0].cookie } })).text();
    expect(html).not.toContain(`${E2E_RUN_ID} Canceled Session`);
    expect(html).not.toContain(`${E2E_RUN_ID} Complete Session`);
    expect(html).toContain("No training session today");
  });
});
