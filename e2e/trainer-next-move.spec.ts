import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * Trainer Next Move: the fourth SubjectCandidate/reconcileSubjectQueue
 * instance, built on MENTA Care's existing provider model
 * (isVerifiedProvider/TeamMembership.verifiedAt) rather than a new
 * authorization system. These tests focus on what's unique to the
 * trainer path — live re-verification of provider status (not just
 * CareRequest.providerId as a historical fact), schedule-conflict
 * detection using real intervals only, honest "outstanding" vs. fabricated
 * "overdue" follow-up framing, and that nothing clinical ever reaches the
 * engine's evidence.
 */

function teamData(createdById: string, members: { userId: string; teamRole: string; verifiedAt?: Date | null }[]) {
  return {
    name: `E2E Team ${E2E_RUN_ID}`,
    inviteCode: `E2E${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdById,
    memberships: { create: members },
  };
}

async function createCareRequest(data: {
  athleteId: string;
  providerId: string;
  teamId: string;
  status: string;
  reason?: string;
  reasonNote?: string;
  providerNote?: string;
  requestedStart?: Date;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  updatedAt?: Date;
}) {
  const req = await testPrisma.careRequest.create({
    data: {
      athleteId: data.athleteId,
      providerId: data.providerId,
      teamId: data.teamId,
      reason: data.reason ?? "GENERAL",
      reasonNote: data.reasonNote,
      providerNote: data.providerNote,
      status: data.status,
      requestedStart: data.requestedStart ?? new Date(),
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
    },
  });
  if (data.updatedAt) {
    await testPrisma.careRequest.update({ where: { id: req.id }, data: { updatedAt: data.updatedAt } });
  }
  return req;
}

test.describe("Trainer Next Move", () => {
  test.afterAll(async () => {
    await testPrisma.careRequest.deleteMany({ where: { team: { name: { contains: E2E_RUN_ID } } } });
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("unauthenticated requests are rejected", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/trainer-queue");
    expect(res.status()).toBe(401);
  });

  test("a trainer with no verified provider teams gets an empty, honest queue — never a fabricated recommendation", async ({ request }) => {
    const trainer = await createTestUser("tnm-empty", "TRAINER");
    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const body = await res.json();
    expect(body.queue).toHaveLength(0);
  });

  test("cross-provider isolation: trainer A never sees trainer B's assigned care requests, even on the same team", async ({ request }) => {
    const trainerA = await createTestUser("tnm-provider-a", "TRAINER");
    const trainerB = await createTestUser("tnm-provider-b", "TRAINER");
    const athlete = await createTestAthlete("tnm-provider-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainerA.userId, [
        { userId: trainerA.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: trainerB.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainerA.userId, teamId: team.id, status: "REQUESTED" });

    const resA = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainerA.cookie } });
    expect((await resA.json()).queue).toHaveLength(1);

    const resB = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainerB.cookie } });
    expect((await resB.json()).queue).toHaveLength(0);
  });

  test("cross-team isolation: a care request on a team the trainer isn't verified on never surfaces, even with a matching providerId", async ({ request }) => {
    const trainer = await createTestUser("tnm-cross-team", "TRAINER");
    const athlete = await createTestAthlete("tnm-cross-team-athlete", "Football", "WR");
    const otherAdmin = await createTestUser("tnm-cross-team-admin", "COACH");
    // Trainer is NOT a member of this team at all — a stale/invalid providerId assignment.
    const foreignTeam = await testPrisma.team.create({
      data: teamData(otherAdmin.userId, [{ userId: athlete.userId, teamRole: "ATHLETE" }]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainer.userId, teamId: foreignTeam.id, status: "REQUESTED" });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    expect((await res.json()).queue).toHaveLength(0);
  });

  test("an unverified provider (TRAINER membership, verifiedAt null) never surfaces a care request", async ({ request }) => {
    const trainer = await createTestUser("tnm-unverified", "TRAINER");
    const athlete = await createTestAthlete("tnm-unverified-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: null },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "REQUESTED" });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    expect((await res.json()).queue).toHaveLength(0);
  });

  test("revoking provider verification makes an already-persisted recommendation disappear immediately, from both the active queue and resolved history", async ({ request }) => {
    const trainer = await createTestUser("tnm-revoke-verify", "TRAINER");
    const athlete = await createTestAthlete("tnm-revoke-verify-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "REQUESTED" });

    let res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    let body = await res.json();
    expect(body.queue).toHaveLength(1);
    const persistedId = body.queue[0].id;

    await testPrisma.teamMembership.updateMany({
      where: { userId: trainer.userId, teamId: team.id },
      data: { verifiedAt: null },
    });

    res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    body = await res.json();
    expect(body.queue).toHaveLength(0);
    expect(body.recentlyResolved.some((i: { id: string }) => i.id === persistedId)).toBe(false);
  });

  test("removing the trainer's team membership entirely makes a persisted recommendation disappear immediately — a stale providerId is never trusted alone", async ({ request }) => {
    const trainer = await createTestUser("tnm-remove-membership", "TRAINER");
    const athlete = await createTestAthlete("tnm-remove-membership-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "REQUESTED" });

    let res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    expect((await res.json()).queue).toHaveLength(1);

    // CareRequest.providerId still points at this trainer — a stale,
    // historical assignment that must not be trusted on its own once the
    // membership itself is gone.
    await testPrisma.teamMembership.deleteMany({ where: { userId: trainer.userId, teamId: team.id } });

    res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    expect((await res.json()).queue).toHaveLength(0);
  });

  test("overlapping scheduled appointments produce exactly one conflict candidate; non-overlapping ones produce none", async ({ request }) => {
    const trainer = await createTestUser("tnm-conflict", "TRAINER");
    const athleteA = await createTestAthlete("tnm-conflict-a", "Football", "WR");
    const athleteB = await createTestAthlete("tnm-conflict-b", "Football", "RB");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athleteA.userId, teamRole: "ATHLETE" },
        { userId: athleteB.userId, teamRole: "ATHLETE" },
      ]),
    });
    const base = new Date(Date.now() + 2 * 86400000);
    base.setHours(14, 0, 0, 0);
    const overlapEnd = new Date(base.getTime() + 60 * 60000);
    const overlapStart2 = new Date(base.getTime() + 30 * 60000);
    const overlapEnd2 = new Date(base.getTime() + 90 * 60000);

    await createCareRequest({
      athleteId: athleteA.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED",
      scheduledStart: base, scheduledEnd: overlapEnd,
    });
    await createCareRequest({
      athleteId: athleteB.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED",
      scheduledStart: overlapStart2, scheduledEnd: overlapEnd2,
    });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const body = await res.json();
    const conflicts = body.queue.filter((i: { kind: string }) => i.kind === "TRAINER_CARE_SCHEDULE_CONFLICT");
    expect(conflicts).toHaveLength(1);
  });

  test("non-overlapping scheduled appointments never produce a conflict candidate", async ({ request }) => {
    const trainer = await createTestUser("tnm-no-conflict", "TRAINER");
    const athleteA = await createTestAthlete("tnm-no-conflict-a", "Football", "WR");
    const athleteB = await createTestAthlete("tnm-no-conflict-b", "Football", "RB");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athleteA.userId, teamRole: "ATHLETE" },
        { userId: athleteB.userId, teamRole: "ATHLETE" },
      ]),
    });
    const start1 = new Date(Date.now() + 3 * 86400000);
    start1.setHours(9, 0, 0, 0);
    const end1 = new Date(start1.getTime() + 60 * 60000);
    const start2 = new Date(start1.getTime() + 2 * 60 * 60000);
    const end2 = new Date(start2.getTime() + 60 * 60000);

    await createCareRequest({ athleteId: athleteA.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED", scheduledStart: start1, scheduledEnd: end1 });
    await createCareRequest({ athleteId: athleteB.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED", scheduledStart: start2, scheduledEnd: end2 });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const body = await res.json();
    const conflicts = body.queue.filter((i: { kind: string }) => i.kind === "TRAINER_CARE_SCHEDULE_CONFLICT");
    expect(conflicts).toHaveLength(0);
    // Both still show up as upcoming appointments — a missing conflict
    // isn't the same as the appointments themselves being hidden.
    const upcoming = body.queue.filter((i: { kind: string }) => i.kind === "TRAINER_CARE_APPOINTMENT_UPCOMING");
    expect(upcoming).toHaveLength(2);
  });

  test("a scheduled appointment with no end time is never treated as conflicting with anything — no invented duration", async ({ request }) => {
    const trainer = await createTestUser("tnm-missing-end", "TRAINER");
    const athleteA = await createTestAthlete("tnm-missing-end-a", "Football", "WR");
    const athleteB = await createTestAthlete("tnm-missing-end-b", "Football", "RB");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athleteA.userId, teamRole: "ATHLETE" },
        { userId: athleteB.userId, teamRole: "ATHLETE" },
      ]),
    });
    const start = new Date(Date.now() + 2 * 86400000);
    start.setHours(10, 0, 0, 0);

    // No scheduledEnd — missing, not zero-length.
    await createCareRequest({ athleteId: athleteA.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED", scheduledStart: start, scheduledEnd: null });
    const overlappingStart = new Date(start.getTime() + 10 * 60000);
    const overlappingEnd = new Date(start.getTime() + 70 * 60000);
    await createCareRequest({ athleteId: athleteB.userId, providerId: trainer.userId, teamId: team.id, status: "SCHEDULED", scheduledStart: overlappingStart, scheduledEnd: overlappingEnd });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const body = await res.json();
    expect(body.queue.filter((i: { kind: string }) => i.kind === "TRAINER_CARE_SCHEDULE_CONFLICT")).toHaveLength(0);
    // The end-time-missing appointment still appears as upcoming (it just can't be checked for conflicts).
    expect(body.queue.some((i: { kind: string; athleteId: string }) => i.kind === "TRAINER_CARE_APPOINTMENT_UPCOMING" && i.athleteId === athleteA.userId)).toBe(true);
  });

  test("a follow-up is framed as outstanding, never a fabricated 'overdue' — and clears once a real follow-up request exists", async ({ request }) => {
    const trainer = await createTestUser("tnm-followup", "TRAINER");
    const athlete = await createTestAthlete("tnm-followup-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    const original = await createCareRequest({
      athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "FOLLOW_UP",
      updatedAt: new Date(Date.now() - 3 * 86400000),
    });

    let res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    let body = await res.json();
    const followUpItem = body.queue.find((i: { kind: string }) => i.kind === "TRAINER_CARE_FOLLOWUP_DUE");
    expect(followUpItem).toBeTruthy();
    expect(JSON.stringify(followUpItem).toLowerCase()).not.toContain("overdue");
    expect(JSON.stringify(followUpItem).toLowerCase()).toContain("outstanding");

    // A real follow-up request now exists, linked via followUpOfId.
    await testPrisma.careRequest.create({
      data: {
        athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id,
        reason: "GENERAL", status: "SCHEDULED", requestedStart: new Date(),
        scheduledStart: new Date(Date.now() + 86400000), scheduledEnd: new Date(Date.now() + 90 * 60000 + 86400000),
        followUpOfId: original.id,
      },
    });

    res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    body = await res.json();
    expect(body.queue.some((i: { kind: string }) => i.kind === "TRAINER_CARE_FOLLOWUP_DUE")).toBe(false);
  });

  test("no clinical detail ever reaches the response — reason, reasonNote, and providerNote are excluded from the entire payload", async ({ request }) => {
    const trainer = await createTestUser("tnm-privacy", "TRAINER");
    const athlete = await createTestAthlete("tnm-privacy-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    const SECRET_REASON_NOTE = "CONFIDENTIAL-hamstring-strain-grade-2";
    const SECRET_PROVIDER_NOTE = "CONFIDENTIAL-provider-clinical-assessment";
    await createCareRequest({
      athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "REQUESTED",
      reason: "INJURY", reasonNote: SECRET_REASON_NOTE, providerNote: SECRET_PROVIDER_NOTE,
    });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain(SECRET_REASON_NOTE);
    expect(raw).not.toContain(SECRET_PROVIDER_NOTE);
    // Even the coarse reason category is excluded — Next Move's own
    // surface is more conservative than the full /care/provider page.
    expect(raw).not.toContain("INJURY");
  });

  test("multi-team support: a trainer verified on two different teams sees care requests from both, correctly attributed", async ({ request }) => {
    const trainer = await createTestUser("tnm-multi-team", "TRAINER");
    const athlete1 = await createTestAthlete("tnm-multi-team-1", "Football", "WR");
    const athlete2 = await createTestAthlete("tnm-multi-team-2", "Basketball", "Guard");
    const teamA = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete1.userId, teamRole: "ATHLETE" },
      ]),
    });
    const teamB = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete2.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete1.userId, providerId: trainer.userId, teamId: teamA.id, status: "REQUESTED" });
    await createCareRequest({ athleteId: athlete2.userId, providerId: trainer.userId, teamId: teamB.id, status: "REQUESTED" });

    const res = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    const body = await res.json();
    expect(body.queue).toHaveLength(2);
    expect(body.queue.map((i: { athleteId: string }) => i.athleteId).sort()).toEqual([athlete1.userId, athlete2.userId].sort());
  });

  test("duplicate recommendation prevention — repeated reads never create a second row for the same care request", async ({ request }) => {
    const trainer = await createTestUser("tnm-dedup", "TRAINER");
    const athlete = await createTestAthlete("tnm-dedup-athlete", "Football", "WR");
    const team = await testPrisma.team.create({
      data: teamData(trainer.userId, [
        { userId: trainer.userId, teamRole: "TRAINER", verifiedAt: new Date() },
        { userId: athlete.userId, teamRole: "ATHLETE" },
      ]),
    });
    await createCareRequest({ athleteId: athlete.userId, providerId: trainer.userId, teamId: team.id, status: "REQUESTED" });

    await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });
    await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: trainer.cookie } });

    const rows = await testPrisma.nextMoveRecommendation.findMany({
      where: { userId: trainer.userId, kind: "TRAINER_CARE_REQUEST_NEW" },
    });
    expect(rows).toHaveLength(1);
  });

  test("an unrelated coach or athlete account gets an empty trainer queue, never an error or another provider's data", async ({ request }) => {
    const coach = await createTestUser("tnm-unrelated-coach", "COACH");
    const athlete = await createTestAthlete("tnm-unrelated-athlete", "Football", "WR");

    const resCoach = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: coach.cookie } });
    expect(resCoach.ok()).toBe(true);
    expect((await resCoach.json()).queue).toHaveLength(0);

    const resAthlete = await request.get("http://localhost:3000/api/trainer-queue", { headers: { Cookie: athlete.cookie } });
    expect(resAthlete.ok()).toBe(true);
    expect((await resAthlete.json()).queue).toHaveLength(0);
  });
});
