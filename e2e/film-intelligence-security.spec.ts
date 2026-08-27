import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Security-focused regression coverage for the Position Groups + Film
 * Intelligence system: permission scoping (team-wide vs. one group),
 * cross-team isolation, film visibility tiers, and private-coach-content
 * access control. Every scenario here is a real HTTP round trip against
 * the actual API routes and database — not a unit test of the permission
 * functions in isolation.
 */
test.describe("Film Intelligence security", () => {
  test.afterAll(async () => {
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("a scoped permission grant only works inside its own position group, never team-wide", async ({ request }) => {
    const coach = await createTestUser("headcoach", "COACH");
    const assistant = await createTestUser("assistant", "COACH");
    const athlete = await createTestAthlete("scoped-athlete", "Football", "QB");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: assistant.userId, teamRole: "TRAINER" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const coachHeaders = { Cookie: coach.cookie, "Content-Type": "application/json" };
    const assistantHeaders = { Cookie: assistant.cookie, "Content-Type": "application/json" };

    const groupA = await request.post(`/api/teams/${team.id}/position-groups`, { headers: coachHeaders, data: { name: "QBs" } });
    expect(groupA.status()).toBe(200);
    const { group: qbGroup } = await groupA.json();
    const groupB = await request.post(`/api/teams/${team.id}/position-groups`, { headers: coachHeaders, data: { name: "WRs" } });
    const { group: wrGroup } = await groupB.json();

    // Before any grant, the assistant (a TRAINER, not COACH/ADMIN) cannot manage groups or tag film.
    const deniedBefore = await request.post(`/api/teams/${team.id}/tag-definitions`, { headers: assistantHeaders, data: { label: "Blitz" } });
    expect(deniedBefore.status()).toBe(403);

    // Grant TAG_FILM scoped to the QB group only.
    const grant = await request.post(`/api/teams/${team.id}/permission-grants`, {
      headers: coachHeaders,
      data: { userId: assistant.userId, permission: "TAG_FILM", positionGroupId: qbGroup.id },
    });
    expect(grant.status()).toBe(200);

    // A team-wide tag-definition action still requires MANAGE_FILM_TAGS (not granted) — TAG_FILM alone isn't enough.
    const stillDenied = await request.post(`/api/teams/${team.id}/tag-definitions`, { headers: assistantHeaders, data: { label: "Blitz" } });
    expect(stillDenied.status()).toBe(403);

    const tagDef = await request.post(`/api/teams/${team.id}/tag-definitions`, { headers: coachHeaders, data: { label: "Blitz" } });
    const { definition } = await tagDef.json();

    const filmInQbGroup = await testPrisma.film.create({
      data: {
        title: "QB group film",
        storageKey: "x",
        originalFilename: "x.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1,
        teamId: team.id,
        positionGroupId: qbGroup.id,
        visibility: "POSITION_GROUP",
        uploadedById: coach.userId,
      },
    });
    const filmInWrGroup = await testPrisma.film.create({
      data: {
        title: "WR group film",
        storageKey: "x",
        originalFilename: "x.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1,
        teamId: team.id,
        positionGroupId: wrGroup.id,
        visibility: "POSITION_GROUP",
        uploadedById: coach.userId,
      },
    });

    // The assistant's TAG_FILM grant is scoped to the QB group's film — allowed here.
    const tagInScope = await request.post(`/api/films/${filmInQbGroup.id}/tags`, {
      headers: assistantHeaders,
      data: { tagDefinitionId: definition.id, timestampSec: 12 },
    });
    expect(tagInScope.status()).toBe(200);

    // The same permission does NOT extend to the WR group's film.
    const tagOutOfScope = await request.post(`/api/films/${filmInWrGroup.id}/tags`, {
      headers: assistantHeaders,
      data: { tagDefinitionId: definition.id, timestampSec: 5 },
    });
    expect(tagOutOfScope.status()).toBe(403);
  });

  test("POSITION_GROUP film is invisible to team members outside the group and staff can still see it", async ({ request }) => {
    const coach = await createTestUser("pg-coach", "COACH");
    const inGroup = await createTestAthlete("pg-in", "Basketball", "Guard");
    const outOfGroup = await createTestAthlete("pg-out", "Basketball", "Center");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: inGroup.userId, teamRole: "ATHLETE" },
      { userId: outOfGroup.userId, teamRole: "ATHLETE" },
    ]);
    const coachHeaders = { Cookie: coach.cookie, "Content-Type": "application/json" };

    const groupRes = await request.post(`/api/teams/${team.id}/position-groups`, { headers: coachHeaders, data: { name: "Guards" } });
    const { group } = await groupRes.json();
    const memberRes = await request.post(`/api/teams/${team.id}/position-groups/${group.id}/members`, {
      headers: coachHeaders,
      data: { userId: inGroup.userId, groupRole: "ATHLETE" },
    });
    expect(memberRes.status(), await memberRes.text()).toBe(200);

    const film = await testPrisma.film.create({
      data: {
        title: "Guards-only film",
        storageKey: "x",
        originalFilename: "x.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1,
        teamId: team.id,
        positionGroupId: group.id,
        visibility: "POSITION_GROUP",
        uploadedById: coach.userId,
      },
    });

    const asMember = await request.get(`/api/films/${film.id}`, { headers: { Cookie: inGroup.cookie } });
    expect(asMember.status()).toBe(200);

    const asOutsider = await request.get(`/api/films/${film.id}`, { headers: { Cookie: outOfGroup.cookie } });
    expect(asOutsider.status()).toBe(404);

    const asCoach = await request.get(`/api/films/${film.id}`, { headers: coachHeaders });
    expect(asCoach.status()).toBe(200);
  });

  test("position groups, tag definitions, and assignments on one team are invisible/unreachable from another team", async ({ request }) => {
    const coachA = await createTestUser("crossA", "COACH");
    const coachB = await createTestUser("crossB", "COACH");
    const teamA = await createTestTeam(coachA.userId, [{ userId: coachA.userId, teamRole: "COACH" }]);
    await createTestTeam(coachB.userId, [{ userId: coachB.userId, teamRole: "COACH" }]);

    const groupOnA = await request.post(`/api/teams/${teamA.id}/position-groups`, {
      headers: { Cookie: coachA.cookie, "Content-Type": "application/json" },
      data: { name: "Team A group" },
    });
    const { group } = await groupOnA.json();

    // Coach B has no membership on team A at all — every team-A-scoped action must reject them.
    const bHeaders = { Cookie: coachB.cookie, "Content-Type": "application/json" };
    const readGroups = await request.get(`/api/teams/${teamA.id}/position-groups`, { headers: bHeaders });
    expect(readGroups.status()).toBe(403);

    const createTagOnA = await request.post(`/api/teams/${teamA.id}/tag-definitions`, { headers: bHeaders, data: { label: "Steal" } });
    expect(createTagOnA.status()).toBe(403);

    const renameGroupOnA = await request.patch(`/api/teams/${teamA.id}/position-groups/${group.id}`, {
      headers: bHeaders,
      data: { name: "Hijacked" },
    });
    expect(renameGroupOnA.status()).toBe(403);

    const createAssignmentOnA = await request.post(`/api/teams/${teamA.id}/assignments`, {
      headers: bHeaders,
      data: { title: "Watch this", filmId: "nonexistent" },
    });
    expect(createAssignmentOnA.status()).toBe(403);
  });

  test("coach notes are private to staff — the athlete themselves and an unrelated coach both get denied", async ({ request }) => {
    const headCoach = await createTestUser("notes-coach", "COACH");
    const otherCoach = await createTestUser("notes-other-coach", "COACH");
    const athlete = await createTestAthlete("notes-athlete", "Soccer", "Midfielder");
    const team = await createTestTeam(headCoach.userId, [
      { userId: headCoach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);

    const created = await request.post(`/api/teams/${team.id}/athletes/${athlete.userId}/notes`, {
      headers: { Cookie: headCoach.cookie, "Content-Type": "application/json" },
      data: { body: "Needs to work on first touch." },
    });
    expect(created.status(), await created.text()).toBe(200);

    const asAthlete = await request.get(`/api/teams/${team.id}/athletes/${athlete.userId}/notes`, { headers: { Cookie: athlete.cookie } });
    expect(asAthlete.status()).toBe(403);

    // otherCoach isn't even a member of this team, so they're denied too.
    const asOtherCoach = await request.get(`/api/teams/${team.id}/athletes/${athlete.userId}/notes`, { headers: { Cookie: otherCoach.cookie } });
    expect(asOtherCoach.status()).toBe(403);
  });

  test("sport-agnostic: identical position-group/tag architecture works unmodified for two different sports on the same team", async ({ request }) => {
    const coach = await createTestUser("multisport-coach", "COACH");
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
    const headers = { Cookie: coach.cookie, "Content-Type": "application/json" };

    const footballGroup = await request.post(`/api/teams/${team.id}/position-groups`, { headers, data: { name: "Offensive Line" } });
    expect(footballGroup.status()).toBe(200);
    const basketballGroup = await request.post(`/api/teams/${team.id}/position-groups`, { headers, data: { name: "3-Point Shooters" } });
    expect(basketballGroup.status()).toBe(200);

    const footballTag = await request.post(`/api/teams/${team.id}/tag-definitions`, { headers, data: { label: "Pancake block", sport: "Football" } });
    expect(footballTag.status()).toBe(200);
    const basketballTag = await request.post(`/api/teams/${team.id}/tag-definitions`, { headers, data: { label: "Corner 3", sport: "Basketball" } });
    expect(basketballTag.status()).toBe(200);

    const list = await request.get(`/api/teams/${team.id}/position-groups`, { headers });
    const { groups } = await list.json();
    expect(groups.map((g: { name: string }) => g.name).sort()).toEqual(["3-Point Shooters", "Offensive Line"]);
  });
});
