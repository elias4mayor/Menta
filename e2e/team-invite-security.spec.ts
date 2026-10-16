import { test, expect } from "@playwright/test";
import { createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

test.describe("Team invite authority", () => {
  test.afterAll(async () => {
    const teams = await testPrisma.team.findMany({ where: { name: { contains: E2E_RUN_ID } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    await testPrisma.trainingProgram.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.film.deleteMany({ where: { teamId: { in: teamIds } } });
    await testPrisma.subscription.deleteMany({ where: { ownerType: "TEAM", ownerId: { in: teamIds } } });
    await testPrisma.team.deleteMany({ where: { id: { in: teamIds } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  async function setup() {
    const owner = await createTestUser("invite-owner", "COACH");
    const team = await createTestTeam(owner.userId, [{ userId: owner.userId, teamRole: "COACH" }], { grantPlan: false });
    // The shared helper's retired individual plan has no team roster
    // entitlement. Give this fixture an actual TEAM subscription.
    const plan = await testPrisma.plan.findUniqueOrThrow({ where: { key: "TEAM" } });
    await testPrisma.subscription.create({ data: { ownerType: "TEAM", ownerId: team.id, planId: plan.id, status: "ACTIVE" } });
    return { owner, team };
  }

  test("a freshly self-registered coach cannot join with an ordinary roster code", async ({ request }) => {
    const { team } = await setup();
    const signup = await request.post("/api/auth/signup", { data: {
      name: "Invite regression coach", email: `e2e-api-${E2E_RUN_ID}-signup@example.test`,
      password: "E2e-only-password-123!", role: "COACH",
    } });
    expect(signup.status()).toBe(200);
    const { user } = await signup.json();
    // This request context retains the real session cookie issued by signup.
    expect((await request.post("/api/team/join", { data: { inviteCode: team.inviteCode } })).status()).toBe(403);
    expect(await testPrisma.teamMembership.count({ where: { userId: user.id, teamId: team.id } })).toBe(0);
  });

  for (const role of ["ATHLETE", "PARENT"]) {
    test(`${role} can use the roster code without receiving staff access`, async ({ request }) => {
      const { team } = await setup();
      const member = await createTestUser("roster", role);
      const joined = await request.post("/api/team/join", {
        headers: { Cookie: member.cookie },
        // Attempted extra fields must never influence the assigned role.
        data: { inviteCode: team.inviteCode.toLowerCase(), teamRole: "ADMIN" },
      });
      expect(joined.status()).toBe(200);
      const row = await testPrisma.teamMembership.findUniqueOrThrow({ where: { userId_teamId: { userId: member.userId, teamId: team.id } } });
      expect(row.teamRole).toBe(role);
      expect((await request.get(`/api/teams/${team.id}/permission-grants`, { headers: { Cookie: member.cookie } })).status()).toBe(403);
      expect((await request.post("/api/team/join", { headers: { Cookie: member.cookie }, data: { inviteCode: team.inviteCode } })).status()).toBe(409);
    });
  }

  for (const role of ["COACH", "TRAINER", "DOCTOR", "SUPER_ADMIN", "DEVELOPER", "ORG_ADMIN"]) {
    test(`${role} cannot acquire membership or staff access with a roster code`, async ({ request }) => {
      const { owner, team } = await setup();
      const outsider = await createTestUser("unapproved", role);
      const headers = { Cookie: outsider.cookie };
      const joined = await request.post("/api/team/join", { headers, data: { inviteCode: team.inviteCode } });
      expect(joined.status()).toBe(403);
      expect(await testPrisma.teamMembership.count({ where: { userId: outsider.userId, teamId: team.id } })).toBe(0);
      if (role === "SUPER_ADMIN") return; // Existing platform-operation exceptions are outside this fix.
      const program = await request.post(`/api/teams/${team.id}/programs`, { headers, data: { title: "Forbidden", blocks: [] } });
      expect(program.status()).toBe(403);
      expect((await request.get(`/api/teams/${team.id}/permission-grants`, { headers })).status()).toBe(403);
      expect((await request.get(`/api/teams/${team.id}/athletes/${owner.userId}/notes`, { headers })).status()).toBe(403);
      const film = await testPrisma.film.create({ data: {
        title: "Private staff film", teamId: team.id, uploadedById: owner.userId,
        visibility: "COACH_STAFF", storageKey: "e2e-unused", originalFilename: "test.mp4", mimeType: "video/mp4", sizeBytes: 1,
      } });
      expect((await request.get(`/api/films/${film.id}`, { headers })).status()).toBe(404);
    });
  }

  for (const role of ["COACH", "TRAINER", "DOCTOR"]) {
    test(`owner explicitly approves ${role} without granting admin or provider verification`, async ({ request }) => {
      const { owner, team } = await setup();
      const staff = await createTestUser("approved", role);
      const url = `/api/teams/${team.id}/staff`;
      const appointment = { headers: { Cookie: owner.cookie }, data: { userId: staff.userId, teamRole: role } };
      expect((await request.post(url, appointment)).status()).toBe(200);
      expect((await request.post(url, appointment)).status()).toBe(200);
      const rows = await testPrisma.teamMembership.findMany({ where: { userId: staff.userId, teamId: team.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].teamRole).toBe(role);
      expect(rows[0].verifiedAt).toBeNull();
      const grants = await request.get(`/api/teams/${team.id}/permission-grants`, { headers: { Cookie: staff.cookie } });
      expect(grants.status()).toBe(role === "COACH" ? 200 : 403);
      const other = await createTestUser("cannot-delegate", "COACH");
      expect((await request.post(url, { headers: { Cookie: staff.cookie }, data: { userId: other.userId, teamRole: "COACH" } })).status()).toBe(403);
      expect(await testPrisma.auditLog.count({ where: { actorId: owner.userId, action: "team.staff_approved", targetId: rows[0].id } })).toBeGreaterThan(0);
    });
  }

  test("only this team's owner or admin can appoint staff", async ({ request }) => {
    const { team } = await setup();
    const target = await createTestUser("target", "COACH");
    const athlete = await createTestUser("athlete-approver", "ATHLETE");
    const coach = await createTestUser("assistant-approver", "COACH");
    const unrelatedOwner = (await setup()).owner;
    await testPrisma.teamMembership.createMany({ data: [
      { userId: athlete.userId, teamId: team.id, teamRole: "ATHLETE" },
      { userId: coach.userId, teamId: team.id, teamRole: "COACH" },
    ] });
    for (const cookie of [undefined, athlete.cookie, coach.cookie, unrelatedOwner.cookie, target.cookie]) {
      const res = await request.post(`/api/teams/${team.id}/staff`, {
        headers: cookie ? { Cookie: cookie } : {}, data: { userId: target.userId, teamRole: "COACH" },
      });
      expect(res.status()).toBe(cookie ? 403 : 401);
    }
    expect(await testPrisma.teamMembership.count({ where: { userId: target.userId, teamId: team.id } })).toBe(0);
    const admin = await createTestUser("admin-approver", "ATHLETE");
    await testPrisma.teamMembership.create({ data: { userId: admin.userId, teamId: team.id, teamRole: "ADMIN" } });
    expect((await request.post(`/api/teams/${team.id}/staff`, {
      headers: { Cookie: admin.cookie }, data: { userId: target.userId, teamRole: "COACH" },
    })).status()).toBe(200);
  });

  test("appointment rejects admin escalation, self-appointment, unverified accounts and role mismatches", async ({ request }) => {
    const { owner, team } = await setup();
    const target = await createTestUser("invalid-target", "COACH");
    const url = `/api/teams/${team.id}/staff`;
    const headers = { Cookie: owner.cookie };
    expect((await request.post(url, { headers, data: { userId: target.userId, teamRole: "ADMIN" } })).status()).toBe(400);
    expect((await request.post(url, { headers, data: { userId: owner.userId, teamRole: "COACH" } })).status()).toBe(403);
    expect((await request.post(url, { headers, data: { userId: target.userId, teamRole: "DOCTOR" } })).status()).toBe(400);
    await testPrisma.user.update({ where: { id: target.userId }, data: { emailVerified: null } });
    expect((await request.post(url, { headers, data: { userId: target.userId, teamRole: "COACH" } })).status()).toBe(400);
    await testPrisma.user.update({ where: { id: owner.userId }, data: { emailVerified: null } });
    expect((await request.post(url, { headers, data: { userId: target.userId, teamRole: "COACH" } })).status()).toBe(403);
    expect(await testPrisma.teamMembership.count({ where: { userId: target.userId, teamId: team.id } })).toBe(0);
  });
});
