import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Parent Next Move: the third SubjectCandidate/reconcileSubjectQueue
 * instance, sharing the engine and table with the athlete's own queue and
 * Coach Next Move. These tests focus on what's unique to the parent path —
 * guardian-link status gating, the independent GuardianScope consent
 * model (APPROVED alone must never be enough for the three permission-
 * gated signal kinds), live re-authorization on every read (not just at
 * the next reconciliation), multi-athlete households, and that nothing
 * confidential ever reaches the engine's evidence.
 */

async function loginWithCookie(page: import("@playwright/test").Page, cookie: string) {
  const [, token] = cookie.split("=");
  await page.context().addCookies([{ name: "menta_session", value: token, url: "http://localhost:3000" }]);
}

async function approveGuardianLink(guardianId: string, athleteId: string) {
  return testPrisma.guardianLink.create({ data: { guardianId, athleteId, status: "APPROVED" } });
}

async function grantScope(guardianId: string, athleteId: string, scope: string) {
  await testPrisma.guardianScopeGrant.create({ data: { guardianId, athleteId, scope } });
}

test.describe("Parent Next Move", () => {
  test.afterAll(async () => {
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("unauthenticated requests are rejected", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/parent-queue");
    expect(res.status()).toBe(401);
  });

  test("a PENDING or REVOKED guardian link grants nothing — only APPROVED surfaces any signal", async ({ request }) => {
    const parent = await createTestUser("pnm-link-status", "PARENT");
    const approvedAthlete = await createTestAthlete("pnm-link-approved", "Football", "WR");
    const pendingAthlete = await createTestAthlete("pnm-link-pending", "Football", "WR");
    const revokedAthlete = await createTestAthlete("pnm-link-revoked", "Football", "WR");

    await approveGuardianLink(parent.userId, approvedAthlete.userId);
    await testPrisma.guardianLink.create({ data: { guardianId: parent.userId, athleteId: pendingAthlete.userId, status: "PENDING" } });
    await testPrisma.guardianLink.create({ data: { guardianId: parent.userId, athleteId: revokedAthlete.userId, status: "REVOKED" } });

    // A document request outstanding needs nothing beyond APPROVED — the
    // simplest signal to prove link-status gating with.
    for (const athleteId of [approvedAthlete.userId, pendingAthlete.userId, revokedAthlete.userId]) {
      await testPrisma.documentRequest.create({
        data: { requestedById: parent.userId, athleteId, title: "2026 physical", category: "MEDICAL", status: "PENDING" },
      });
    }

    const res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    const body = await res.json();
    expect(body.queue).toHaveLength(1);
    expect(body.queue[0].athleteId).toBe(approvedAthlete.userId);
  });

  test("cross-household isolation — a parent never sees another parent's linked athlete", async ({ request }) => {
    const parentA = await createTestUser("pnm-household-a", "PARENT");
    const parentB = await createTestUser("pnm-household-b", "PARENT");
    const athleteA = await createTestAthlete("pnm-household-athlete-a", "Football", "WR");
    const athleteB = await createTestAthlete("pnm-household-athlete-b", "Football", "WR");

    await approveGuardianLink(parentA.userId, athleteA.userId);
    await approveGuardianLink(parentB.userId, athleteB.userId);

    await testPrisma.documentRequest.create({
      data: { requestedById: parentA.userId, athleteId: athleteA.userId, title: "Form A", category: "OTHER", status: "PENDING" },
    });
    await testPrisma.documentRequest.create({
      data: { requestedById: parentB.userId, athleteId: athleteB.userId, title: "Form B", category: "OTHER", status: "PENDING" },
    });

    const resA = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parentA.cookie } });
    const bodyA = await resA.json();
    expect(bodyA.queue).toHaveLength(1);
    expect(bodyA.queue[0].athleteId).toBe(athleteA.userId);
    expect(bodyA.queue.some((i: { title: string }) => i.title.includes("Form B"))).toBe(false);

    const resB = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parentB.cookie } });
    const bodyB = await resB.json();
    expect(bodyB.queue).toHaveLength(1);
    expect(bodyB.queue[0].athleteId).toBe(athleteB.userId);
  });

  test("multi-athlete household: both linked athletes' signals appear, correctly attributed", async ({ request }) => {
    const parent = await createTestUser("pnm-multi", "PARENT");
    const athlete1 = await createTestAthlete("pnm-multi-1", "Football", "WR");
    const athlete2 = await createTestAthlete("pnm-multi-2", "Basketball", "Guard");
    await approveGuardianLink(parent.userId, athlete1.userId);
    await approveGuardianLink(parent.userId, athlete2.userId);

    await testPrisma.documentRequest.create({
      data: { requestedById: parent.userId, athleteId: athlete1.userId, title: "Form for athlete 1", category: "OTHER", status: "PENDING" },
    });
    await testPrisma.documentRequest.create({
      data: { requestedById: parent.userId, athleteId: athlete2.userId, title: "Form for athlete 2", category: "OTHER", status: "PENDING" },
    });

    const res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    const body = await res.json();
    expect(body.queue).toHaveLength(2);
    const athleteIds = body.queue.map((i: { athleteId: string }) => i.athleteId).sort();
    expect(athleteIds).toEqual([athlete1.userId, athlete2.userId].sort());
  });

  test("permission-gated signals need an explicit scope grant — APPROVED alone is not enough, and scopes are independent of each other", async ({ request }) => {
    const parent = await createTestUser("pnm-scope-default", "PARENT");
    const athlete = await createTestAthlete("pnm-scope-default-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);

    await testPrisma.eligibilityChecklistItem.create({
      data: { userId: athlete.userId, category: "NCAA", title: "Core course GPA", status: "NOT_STARTED" },
    });
    await testPrisma.assignment.create({
      data: { userId: athlete.userId, title: "History essay", status: "NOT_STARTED", dueDate: new Date(Date.now() - 2 * 86400000) },
    });

    // No scopes granted yet — neither permission-gated kind should appear.
    let res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    let body = await res.json();
    expect(body.queue).toHaveLength(0);

    // Grant only VIEW_ACADEMIC_ASSIGNMENTS — eligibility must still be absent.
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_ASSIGNMENTS");
    res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    body = await res.json();
    expect(body.queue).toHaveLength(1);
    expect(body.queue[0].kind).toBe("PARENT_ACADEMIC_ASSIGNMENT_OVERDUE");

    // Now also grant VIEW_ACADEMIC_STATUS — eligibility should appear too.
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_STATUS");
    res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    body = await res.json();
    expect(body.queue).toHaveLength(2);
    expect(body.queue.map((i: { kind: string }) => i.kind).sort()).toEqual(
      ["PARENT_ACADEMIC_ASSIGNMENT_OVERDUE", "PARENT_ELIGIBILITY_INCOMPLETE"].sort()
    );
  });

  test("revoking a scope makes an already-persisted recommendation disappear immediately, from both the active queue and resolved history", async ({ request }) => {
    const parent = await createTestUser("pnm-revoke", "PARENT");
    const athlete = await createTestAthlete("pnm-revoke-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_ASSIGNMENTS");
    await testPrisma.assignment.create({
      data: { userId: athlete.userId, title: "Lab report", status: "NOT_STARTED", dueDate: new Date(Date.now() - 1 * 86400000) },
    });

    // First read: persists the row and returns it.
    let res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    let body = await res.json();
    expect(body.queue).toHaveLength(1);
    const persisted = await testPrisma.nextMoveRecommendation.findFirst({
      where: { userId: parent.userId, kind: "PARENT_ACADEMIC_ASSIGNMENT_OVERDUE" },
    });
    expect(persisted?.status).toBe("ACTIVE");

    // Revoke the scope — the underlying assignment is still overdue;
    // nothing about the real-world condition changed, only authorization.
    await testPrisma.guardianScopeGrant.deleteMany({
      where: { guardianId: parent.userId, athleteId: athlete.userId, scope: "VIEW_ACADEMIC_ASSIGNMENTS" },
    });

    // The very next read must show it in neither the active queue nor
    // "recently resolved" — reconciliation alone would otherwise move the
    // now-candidate-less row into recentlyResolved and leak its existence
    // through that history; getParentQueue's live re-check strips it from
    // both, not just the active queue.
    res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    body = await res.json();
    expect(body.queue).toHaveLength(0);
    expect(body.recentlyResolved.some((i: { id: string }) => i.id === persisted!.id)).toBe(false);
  });

  test("duplicate recommendation prevention — repeated reads never create a second row for the same condition", async ({ request }) => {
    const parent = await createTestUser("pnm-dedup", "PARENT");
    const athlete = await createTestAthlete("pnm-dedup-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);
    await testPrisma.documentRequest.create({
      data: { requestedById: parent.userId, athleteId: athlete.userId, title: "Dedup form", category: "OTHER", status: "PENDING" },
    });

    await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });

    const rows = await testPrisma.nextMoveRecommendation.findMany({
      where: { userId: parent.userId, kind: "PARENT_DOCUMENT_REQUEST_OUTSTANDING", subjectAthleteId: athlete.userId },
    });
    expect(rows).toHaveLength(1);
  });

  test("care appointment evidence is status + scheduledStart only — reason/reasonNote/providerNote never appear, and the endpoint never touches wellness/mind/emergency/safety data", async ({ request }) => {
    const parent = await createTestUser("pnm-care-privacy", "PARENT");
    const athlete = await createTestAthlete("pnm-care-privacy-athlete", "Football", "WR");
    const provider = await createTestUser("pnm-care-privacy-provider", "DOCTOR");
    await approveGuardianLink(parent.userId, athlete.userId);
    const team = await testPrisma.team.create({
      data: {
        name: `E2E Team ${E2E_RUN_ID}`,
        inviteCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        createdById: provider.userId,
        memberships: { create: [{ userId: athlete.userId, teamRole: "ATHLETE" }] },
      },
    });

    const SECRET_REASON = "CONFIDENTIAL-shoulder-injury-detail";
    await testPrisma.careRequest.create({
      data: {
        athleteId: athlete.userId,
        providerId: provider.userId,
        teamId: team.id,
        reason: "INJURY",
        reasonNote: SECRET_REASON,
        providerNote: "CONFIDENTIAL-provider-note",
        status: "SCHEDULED",
        requestedStart: new Date(),
        scheduledStart: new Date(Date.now() + 2 * 86400000),
      },
    });

    const res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    const body = await res.json();
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(SECRET_REASON);
    expect(raw).not.toContain("CONFIDENTIAL-provider-note");
    expect(body.queue.some((i: { kind: string }) => i.kind === "PARENT_CARE_APPOINTMENT_UPCOMING")).toBe(true);
  });

  test("a message awaiting reply appears once, and clears once the parent replies", async ({ request }) => {
    const parent = await createTestUser("pnm-message", "PARENT");
    const athlete = await createTestAthlete("pnm-message-athlete", "Football", "WR");
    const coach = await createTestUser("pnm-message-coach", "COACH");
    await approveGuardianLink(parent.userId, athlete.userId);

    const team = await testPrisma.team.create({
      data: {
        name: `E2E Team ${E2E_RUN_ID}`,
        inviteCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        createdById: coach.userId,
        memberships: { create: [{ userId: athlete.userId, teamRole: "ATHLETE" }, { userId: coach.userId, teamRole: "COACH" }] },
      },
    });
    const conversation = await testPrisma.conversation.create({
      data: { teamId: team.id, isGroup: true, participants: { create: [{ userId: parent.userId }, { userId: coach.userId }] } },
    });
    await testPrisma.message.create({ data: { conversationId: conversation.id, senderId: coach.userId, body: "Please confirm pickup time" } });

    let res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    let body = await res.json();
    expect(body.queue.some((i: { kind: string }) => i.kind === "PARENT_MESSAGE_AWAITING_REPLY")).toBe(true);

    await testPrisma.message.create({ data: { conversationId: conversation.id, senderId: parent.userId, body: "Confirmed, thanks!" } });

    res = await request.get("http://localhost:3000/api/parent-queue", { headers: { Cookie: parent.cookie } });
    body = await res.json();
    expect(body.queue.some((i: { kind: string }) => i.kind === "PARENT_MESSAGE_AWAITING_REPLY")).toBe(false);
  });

  test("only the athlete can grant or revoke a guardian scope — the guardian themselves gets a 403", async ({ request }) => {
    const parent = await createTestUser("pnm-scope-api-auth", "PARENT");
    const athlete = await createTestAthlete("pnm-scope-api-auth-athlete", "Football", "WR");
    const link = await approveGuardianLink(parent.userId, athlete.userId);

    const guardianAttempt = await request.patch(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: parent.cookie, "Content-Type": "application/json" },
      data: { scope: "VIEW_ACADEMIC_STATUS", grant: true },
    });
    expect(guardianAttempt.status()).toBe(403);

    const athleteGrant = await request.patch(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { scope: "VIEW_ACADEMIC_STATUS", grant: true },
    });
    expect(athleteGrant.ok()).toBe(true);
    expect((await athleteGrant.json()).scopes).toContain("VIEW_ACADEMIC_STATUS");

    const athleteRevoke = await request.patch(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { scope: "VIEW_ACADEMIC_STATUS", grant: false },
    });
    expect(athleteRevoke.ok()).toBe(true);
    expect((await athleteRevoke.json()).scopes).not.toContain("VIEW_ACADEMIC_STATUS");
  });

  test("an unrelated third party — neither the guardian nor the athlete on this link — cannot grant or even read scopes", async ({ request }) => {
    const parent = await createTestUser("pnm-scope-stranger", "PARENT");
    const athlete = await createTestAthlete("pnm-scope-stranger-athlete", "Football", "WR");
    const stranger = await createTestUser("pnm-scope-stranger-outsider", "PARENT");
    const link = await approveGuardianLink(parent.userId, athlete.userId);

    const strangerRead = await request.get(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: stranger.cookie },
    });
    expect(strangerRead.status()).toBe(403);

    const strangerGrant = await request.patch(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: stranger.cookie, "Content-Type": "application/json" },
      data: { scope: "VIEW_ACADEMIC_STATUS", grant: true },
    });
    expect(strangerGrant.status()).toBe(403);

    const scopesAfter = await request.get(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: athlete.cookie },
    });
    expect((await scopesAfter.json()).scopes).toEqual([]);
  });

  test("a scope cannot be granted while the underlying guardian link is only PENDING, not yet APPROVED", async ({ request }) => {
    const parent = await createTestUser("pnm-scope-pending-link", "PARENT");
    const athlete = await createTestAthlete("pnm-scope-pending-link-athlete", "Football", "WR");
    const link = await testPrisma.guardianLink.create({
      data: { guardianId: parent.userId, athleteId: athlete.userId, status: "PENDING" },
    });

    const attempt = await request.patch(`http://localhost:3000/api/guardian/${link.id}/scopes`, {
      headers: { Cookie: athlete.cookie, "Content-Type": "application/json" },
      data: { scope: "VIEW_ACADEMIC_STATUS", grant: true },
    });
    expect(attempt.status()).toBe(409);

    const grants = await testPrisma.guardianScopeGrant.count({ where: { guardianId: parent.userId, athleteId: athlete.userId } });
    expect(grants).toBe(0);
  });

  test("UI and API authorization agree: the academics page honestly says what hasn't been shared, and shows real data only once granted", async ({ page }) => {
    const parent = await createTestUser("pnm-ui-auth", "PARENT");
    const athlete = await createTestAthlete("pnm-ui-auth-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);
    await testPrisma.assignment.create({
      data: { userId: athlete.userId, title: "Chemistry homework", status: "NOT_STARTED", dueDate: new Date(Date.now() - 86400000) },
    });

    await loginWithCookie(page, parent.cookie);
    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/academics`);
    await expect(page.getByText(/hasn.t shared assignment details/i)).toBeVisible();
    await expect(page.getByText("Chemistry homework")).toHaveCount(0);

    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_ASSIGNMENTS");
    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/academics`);
    await expect(page.getByText("Chemistry homework")).toBeVisible();
  });

  test("a parent cannot view another guardian's athlete academics page even by guessing the URL", async ({ page }) => {
    const parentA = await createTestUser("pnm-ui-isolation-a", "PARENT");
    const athleteB = await createTestAthlete("pnm-ui-isolation-b", "Football", "WR");
    // No GuardianLink at all between parentA and athleteB.

    await loginWithCookie(page, parentA.cookie);
    const res = await page.goto(`http://localhost:3000/parent/athletes/${athleteB.userId}/academics`);
    expect(res?.status()).toBe(404);
  });

  test("revoking a scope takes effect immediately on the academics UI page, not just the API — no stale cache, no stale server render", async ({ page }) => {
    const parent = await createTestUser("pnm-ui-revoke", "PARENT");
    const athlete = await createTestAthlete("pnm-ui-revoke-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_STATUS");
    await testPrisma.eligibilityChecklistItem.create({
      data: { userId: athlete.userId, category: "NCAA", title: "Core course GPA", status: "NOT_STARTED" },
    });

    await loginWithCookie(page, parent.cookie);
    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/academics`);
    await expect(page.getByText("Core course GPA")).toBeVisible();

    await testPrisma.guardianScopeGrant.deleteMany({
      where: { guardianId: parent.userId, athleteId: athlete.userId, scope: "VIEW_ACADEMIC_STATUS" },
    });

    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/academics`);
    await expect(page.getByText("Core course GPA")).toHaveCount(0);
    await expect(page.getByText(/hasn.t shared eligibility status/i)).toBeVisible();
  });

  test("the calendar page is independently scope-gated — team events only appear once VIEW_TEAM_CALENDAR is granted, and visibility is never implied by the academics scopes", async ({ page }) => {
    const parent = await createTestUser("pnm-ui-calendar", "PARENT");
    const coach = await createTestUser("pnm-ui-calendar-coach", "COACH");
    const athlete = await createTestAthlete("pnm-ui-calendar-athlete", "Football", "WR");
    await approveGuardianLink(parent.userId, athlete.userId);
    // Academic scopes granted, calendar scope deliberately withheld — one
    // scope must never leak visibility into another.
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_STATUS");
    await grantScope(parent.userId, athlete.userId, "VIEW_ACADEMIC_ASSIGNMENTS");

    const team = await testPrisma.team.create({
      data: {
        name: `E2E Team ${E2E_RUN_ID}`,
        inviteCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        createdById: coach.userId,
        memberships: { create: [{ userId: athlete.userId, teamRole: "ATHLETE" }] },
      },
    });
    await testPrisma.calendarEvent.create({
      data: {
        title: "Varsity scrimmage",
        teamId: team.id,
        createdById: coach.userId,
        visibility: "TEAM",
        startsAt: new Date(Date.now() + 86400000),
        location: "Away field",
      },
    });

    await loginWithCookie(page, parent.cookie);
    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/calendar`);
    await expect(page.getByText(/hasn.t shared team calendar access/i)).toBeVisible();
    await expect(page.getByText("Varsity scrimmage")).toHaveCount(0);

    await grantScope(parent.userId, athlete.userId, "VIEW_TEAM_CALENDAR");
    await page.goto(`http://localhost:3000/parent/athletes/${athlete.userId}/calendar`);
    await expect(page.getByText("Varsity scrimmage")).toBeVisible();
  });
});
