import { test, expect } from "@playwright/test";
import { cleanupE2eUsers, createTestUser, createTestAthlete, testPrisma } from "./db-helpers";

const baseline = {
  sport: "Boxing", position: "Southpaw", schoolName: "MENTA Baseline Test School", schoolType: "High School",
  heightCm: 183, weightKg: 82, baselineRecords: [{ metricId: "forty", value: 4.8 }, { metricId: "bench", value: 185 }],
};

test.afterAll(async () => { await cleanupE2eUsers(); await testPrisma.$disconnect(); });

test("onboarding saves optional measurements and baseline records without duplicating them on retry", async ({ request }) => {
  const athlete = await createTestUser("baseline", "ATHLETE");
  const headers = { Cookie: athlete.cookie };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request.post("/api/onboarding", { headers, data: baseline });
    expect(response.status(), await response.text()).toBe(200);
  }
  const profile = await testPrisma.athleteProfile.findUniqueOrThrow({ where: { userId: athlete.userId } });
  expect(profile.heightCm).toBe(183); expect(profile.weightKg).toBe(82);
  const records = await testPrisma.performanceEntry.findMany({ where: { userId: athlete.userId } });
  expect(records).toHaveLength(2);
  expect(records.find((entry) => entry.statName === "40-yard dash")).toMatchObject({ value: 4.8, unit: "sec" });
  const response = await request.get("/api/mobile/training", { headers });
  expect(response.status()).toBe(200);
  const config = await response.json();
  expect(config.profile).toMatchObject({ sport: "Boxing", position: "Southpaw", heightCm: 183, weightKg: 82 });
  expect(config.sports.some((sport: { name: string }) => sport.name === "Boxing")).toBe(true);
  expect(config.metrics.find((metric: { id: string }) => metric.id === "forty").direction).toBe("LOWER");
  expect(config.starterWorkouts.length).toBeGreaterThan(0);
});

test("invalid or duplicate testing results are rejected before any profile is written", async ({ request }) => {
  const athlete = await createTestUser("invalid-baseline", "ATHLETE");
  for (const fields of [
    { heightCm: 300 }, { weightKg: 0 },
    { baselineRecords: [{ metricId: "forty", value: -1 }] },
    { baselineRecords: [{ metricId: "pullups", value: 1.5 }] },
    { baselineRecords: [{ metricId: "forty", value: 4.8 }, { metricId: "forty", value: 4.9 }] },
  ]) {
    expect((await request.post("/api/onboarding", { headers: { Cookie: athlete.cookie }, data: { ...baseline, ...fields } })).status()).toBe(400);
  }
  expect(await testPrisma.athleteProfile.count({ where: { userId: athlete.userId } })).toBe(0);
  expect(await testPrisma.performanceEntry.count({ where: { userId: athlete.userId } })).toBe(0);
});

test("mobile training uses the caller's active primary sport and ignores another user's id", async ({ request }) => {
  const athlete = await createTestAthlete("training-owner", "Football", "Quarterback");
  const other = await createTestAthlete("training-other", "Soccer", "Goalkeeper");
  await testPrisma.athleteSportContext.updateMany({ where: { userId: athlete.userId }, data: { sport: "Boxing", position: "Southpaw" } });
  const response = await request.get(`/api/mobile/training?userId=${other.userId}`, { headers: { Cookie: athlete.cookie } });
  expect(response.status()).toBe(200);
  expect((await response.json()).profile).toMatchObject({ sport: "Boxing", position: "Southpaw" });
  expect((await request.get("/api/mobile/training")).status()).toBe(401);
});

test("measurements and personal records can all be skipped", async ({ request }) => {
  const athlete = await createTestUser("skip-baseline", "ATHLETE");
  const response = await request.post("/api/onboarding", { headers: { Cookie: athlete.cookie }, data: {
    sport: "Boxing", schoolName: "MENTA Optional Test School", schoolType: "High School",
  } });
  expect(response.status(), await response.text()).toBe(200);
  expect(await testPrisma.performanceEntry.count({ where: { userId: athlete.userId } })).toBe(0);
});
