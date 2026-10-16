import { test, expect, type APIRequestContext } from "@playwright/test";
import { testPrisma, createTestUser, createTestTeam, cleanupE2eUsers, E2E_RUN_ID } from "./db-helpers";

async function setup() {
  const coach = await createTestUser("hub-coach", "COACH");
  const athlete = await createTestUser("hub-athlete", "ATHLETE");
  const outsider = await createTestUser("hub-outsider", "COACH");
  const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }, { userId: athlete.userId, teamRole: "ATHLETE" }], { grantPlan: false });
  return { coach, athlete, outsider, team };
}
const headers = (user: { cookie: string }) => ({ Cookie: user.cookie });

test.afterAll(async () => {
  const users = await testPrisma.user.findMany({ where: { email: { contains: E2E_RUN_ID } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await testPrisma.guardianLink.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { guardianId: { in: ids } }] } });
  await testPrisma.team.deleteMany({ where: { createdById: { in: ids } } });
  await cleanupE2eUsers(); await testPrisma.$disconnect();
});

test("team feed isolates memberships, hides roster codes, and announces to team members", async ({ request }) => {
  const { coach, athlete, outsider, team } = await setup();
  const posted = await request.post(`/api/teams/${team.id}/announcements`, { headers: headers(coach), data: { title: "Bus departure", body: "Meet at the north gate.", important: true } });
  expect(posted.status(), await posted.text()).toBe(200);
  expect((await request.post(`/api/teams/${team.id}/announcements`, { headers: headers(athlete), data: { title: "No", body: "No" } })).status()).toBe(403);
  expect((await request.post(`/api/teams/${team.id}/announcements`, { headers: headers(outsider), data: { title: "No", body: "No" } })).status()).toBe(403);
  const ownFeed = await (await request.get("/api/mobile/team-home", { headers: headers(athlete) })).json();
  expect(ownFeed.teams.map((t: { id: string }) => t.id)).toEqual([team.id]);
  expect(ownFeed.teams[0].inviteCode).toBeNull();
  expect(ownFeed.teams[0].announcements[0]).toMatchObject({ title: "Bus departure", authorName: "E2E API COACH" });
  expect((await (await request.get("/api/mobile/team-home", { headers: headers(outsider) })).json()).teams).toEqual([]);
  expect(await testPrisma.notification.count({ where: { userId: athlete.userId, title: "Bus departure" } })).toBe(1);
  expect(await testPrisma.notification.count({ where: { userId: outsider.userId, title: "Bus departure" } })).toBe(0);
  expect((await request.get("/api/mobile/team-home")).status()).toBe(401);
});

test("coach schedule retains bus and weight-room categories and rejects teammate writes", async ({ request }) => {
  const { coach, athlete, team } = await setup();
  const data = { title: "Away game bus", kind: "BUS", startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 7200000).toISOString(), teamId: team.id, visibility: "TEAM", location: "North gate" };
  expect((await request.post("/api/calendar", { headers: headers(coach), data })).status()).toBe(200);
  expect((await request.post("/api/calendar", { headers: headers(athlete), data })).status()).toBe(403);
  expect((await request.post("/api/calendar", { headers: headers(coach), data: { ...data, startsAt: "not-a-date" } })).status()).toBe(400);
  expect((await request.post("/api/calendar", { headers: headers(coach), data: { ...data, endsAt: new Date(0).toISOString() } })).status()).toBe(400);
  const feed = await (await request.get("/api/mobile/team-home", { headers: headers(athlete) })).json();
  expect(feed.teams[0].events[0]).toMatchObject({ title: "Away game bus", kind: "BUS", location: "North gate" });
});

test("team owner can appoint a verified teacher by email without granting coach authority", async ({ request }) => {
  const { coach, athlete, team } = await setup();
  const teacher = await createTestUser("teacher-by-email", "TEACHER");
  const data = { email: teacher.email, teamRole: "TEACHER" };
  expect((await request.post(`/api/teams/${team.id}/staff`, { headers: headers(athlete), data })).status()).toBe(403);
  expect((await request.post(`/api/teams/${team.id}/staff`, { headers: headers(coach), data })).status()).toBe(200);
  expect((await request.post(`/api/teams/${team.id}/announcements`, { headers: headers(teacher), data: { title: "No coach access", body: "No" } })).status()).toBe(403);
});

test("teacher signup retains its role and requires its own setup", async ({ request }) => {
  const response = await request.post("/api/auth/signup", { data: { name: "E2E Teacher", email: `e2e-api-${E2E_RUN_ID}-teacher-signup@example.test`, password: "E2e-only-password-123!", role: "TEACHER" } });
  expect(response.status(), await response.text()).toBe(200);
  const me = await (await request.get("/api/auth/me")).json();
  expect(me.user.role).toBe("TEACHER"); expect(me.onboardingCompleted).toBe(false);
});

async function createGroup(request: APIRequestContext, user: { cookie: string }, teamId: string, staffOnly: boolean) {
  const response = await request.post("/api/messages/groups", { headers: headers(user), data: { teamId, title: staffOnly ? "Coaches" : "Position group", staffOnly } });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).conversation as { id: string; joinCode: string };
}

test("staff groups require current approved membership and revoke read and write access", async ({ request }) => {
  const { coach, athlete, outsider, team } = await setup();
  const teacher = await createTestUser("approved-teacher", "TEACHER");
  await testPrisma.teamMembership.create({ data: { teamId: team.id, userId: teacher.userId, teamRole: "TEACHER" } });
  const group = await createGroup(request, coach, team.id, true);
  for (const user of [athlete, outsider]) expect((await request.post("/api/messages/groups/join", { headers: headers(user), data: { joinCode: group.joinCode } })).status()).toBe(403);
  for (let i = 0; i < 2; i++) expect((await request.post("/api/messages/groups/join", { headers: headers(teacher), data: { joinCode: group.joinCode.toLowerCase() } })).status()).toBe(200);
  expect(await testPrisma.conversationParticipant.count({ where: { conversationId: group.id, userId: teacher.userId } })).toBe(1);
  expect((await request.post(`/api/messages/${group.id}`, { headers: headers(teacher), data: { body: "Planning update" } })).status()).toBe(200);
  await testPrisma.teamMembership.deleteMany({ where: { teamId: team.id, userId: teacher.userId } });
  expect((await request.get(`/api/messages/${group.id}`, { headers: headers(teacher) })).status()).toBe(404);
  expect((await request.post(`/api/messages/${group.id}`, { headers: headers(teacher), data: { body: "No access" } })).status()).toBe(404);
  const list = await (await request.get("/api/messages", { headers: headers(teacher) })).json();
  expect(list.conversations.some((c: { id: string }) => c.id === group.id)).toBe(false);
});

test("team group codes admit teammates but never enroll outsiders or grant staff access", async ({ request }) => {
  const { coach, athlete, outsider, team } = await setup();
  const group = await createGroup(request, coach, team.id, false);
  expect((await request.post("/api/messages/groups/join", { headers: headers(athlete), data: { joinCode: group.joinCode } })).status()).toBe(200);
  expect((await request.post("/api/messages/groups/join", { headers: headers(outsider), data: { joinCode: group.joinCode } })).status()).toBe(403);
  expect((await request.post(`/api/messages/${group.id}`, { headers: headers(athlete), data: { body: "Ready for practice" } })).status()).toBe(200);
  const messages = await (await request.get(`/api/messages/${group.id}`, { headers: headers(coach) })).json();
  expect(messages.messages[0].body).toBe("Ready for practice");
  const membership = await testPrisma.teamMembership.findUniqueOrThrow({ where: { userId_teamId: { userId: athlete.userId, teamId: team.id } } });
  expect(membership.teamRole).toBe("ATHLETE");
});

for (const role of ["TEACHER", "STUDENT", "STAFF"]) {
  test(`${role} has distinct durable onboarding without implicit staff authority`, async ({ request }) => {
    const user = await createTestUser(`role-${role}`, role);
    expect((await (await request.get("/api/auth/me", { headers: headers(user) })).json()).onboardingCompleted).toBe(false);
    expect((await request.post("/api/onboarding/school", { headers: headers(user), data: { schoolName: "MENTA E2E School", focus: "Academic support" } })).status()).toBe(200);
    expect((await (await request.get("/api/auth/me", { headers: headers(user) })).json()).onboardingCompleted).toBe(true);
    const { team } = await setup();
    if (role !== "STUDENT") expect((await request.post("/api/team/join", { headers: headers(user), data: { inviteCode: team.inviteCode } })).status()).toBe(403);
    expect((await request.post(`/api/teams/${team.id}/announcements`, { headers: headers(user), data: { title: "No", body: "No" } })).status()).toBe(403);
  });
}

test("coach completion status comes from the coach profile", async ({ request }) => {
  const coach = await createTestUser("coach-onboarding", "COACH");
  expect((await (await request.get("/api/auth/me", { headers: headers(coach) })).json()).onboardingCompleted).toBe(false);
  await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
  expect((await (await request.get("/api/auth/me", { headers: headers(coach) })).json()).onboardingCompleted).toBe(true);
});

test("academic support is opt-in, deduplicated, private, and stops after consent or team revocation", async ({ request }) => {
  const { coach, athlete, outsider, team } = await setup();
  expect((await request.put("/api/academics/support", { headers: headers(athlete), data: { enabled: true, threshold: 70, supporterIds: [outsider.userId] } })).status()).toBe(403);
  expect((await request.put("/api/academics/support", { headers: headers(athlete), data: { enabled: true, threshold: 70, supporterIds: [coach.userId] } })).status()).toBe(200);
  const response = await request.post("/api/academics/terms", { headers: headers(athlete), data: { term: "FALL", gpa: 2, gpaScale: 4 } });
  expect(response.status(), await response.text()).toBe(200);
  const { term } = await response.json();
  const alerts = await testPrisma.notification.findMany({ where: { userId: coach.userId, type: "ACADEMICS" } });
  expect(alerts).toHaveLength(1); expect(alerts[0].body).not.toContain("2.0"); expect(alerts[0].body).not.toContain("FALL");
  await request.patch(`/api/academics/terms/${term.id}`, { headers: headers(athlete), data: { gpa: 2 } });
  expect(await testPrisma.notification.count({ where: { userId: coach.userId, type: "ACADEMICS" } })).toBe(1);
  await request.put("/api/academics/support", { headers: headers(athlete), data: { enabled: true, threshold: 70, supporterIds: [] } });
  await request.patch(`/api/academics/terms/${term.id}`, { headers: headers(athlete), data: { gpa: 1.9 } });
  expect(await testPrisma.notification.count({ where: { userId: coach.userId, type: "ACADEMICS" } })).toBe(1);
  await request.put("/api/academics/support", { headers: headers(athlete), data: { enabled: true, threshold: 70, supporterIds: [coach.userId] } });
  await testPrisma.teamMembership.deleteMany({ where: { teamId: team.id, userId: coach.userId } });
  await request.patch(`/api/academics/terms/${term.id}`, { headers: headers(athlete), data: { gpa: 1.8 } });
  expect(await testPrisma.notification.count({ where: { userId: coach.userId, type: "ACADEMICS" } })).toBe(1);
  const theirTerms = await (await request.get("/api/academics/terms", { headers: headers(outsider) })).json();
  expect(theirTerms.terms).toHaveLength(0);
});
