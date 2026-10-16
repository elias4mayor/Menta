import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

/**
 * The Training hub (/train): three entry points — Build Workout, Team
 * Weight Room, Log Measurements — in front of the existing workout
 * library, program builder, and live-session features. These tests check
 * the hub itself (default states, role-awareness, live-session detection)
 * and that the existing features it links to (library, measurements)
 * still work after the move.
 */
async function loginWithCookie(page: import("@playwright/test").Page, cookie: string) {
  const [, token] = cookie.split("=");
  await page.context().addCookies([{ name: "menta_session", value: token, url: "http://localhost:3000" }]);
}

test.describe("Training hub", () => {
  test.afterAll(async () => {
    await testPrisma.team.deleteMany({ where: { name: { contains: E2E_RUN_ID } } });
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("an athlete with no workouts, no sessions, and no stats sees honest default states on all three tiles", async ({ page }) => {
    const athlete = await createTestAthlete("hub-empty", "Football", "WR");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/train");

    await expect(page.getByRole("link", { name: /Build Workout/ })).toBeVisible();
    await expect(page.getByText("Get started")).toBeVisible();

    await expect(page.getByRole("link", { name: /Team Weight Room/ })).toBeVisible();
    await expect(page.getByText("None scheduled")).toBeVisible();

    await expect(page.getByRole("link", { name: /Log Measurements/ })).toBeVisible();
  });

  test("a coach with a manageable team sees a Manage badge and links into their program builder", async ({ page }) => {
    const coach = await createTestUser("hub-coach", "COACH");
    await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
    const team = await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
    await loginWithCookie(page, coach.cookie);
    await page.goto("http://localhost:3000/train");

    const weightRoomTile = page.getByRole("link", { name: /Team Weight Room/ });
    await expect(weightRoomTile).toBeVisible();
    await expect(weightRoomTile.getByText("Manage")).toBeVisible();
    await expect(weightRoomTile).toHaveAttribute("href", `/team/${team.id}/programs`);
  });

  test("a live team session surfaces on the Team Weight Room tile and links to the live /me view", async ({ page }) => {
    const athlete = await createTestAthlete("hub-live", "Football", "WR");
    const coach = await createTestUser("hub-live-coach", "COACH");
    const team = await createTestTeam(coach.userId, [
      { userId: coach.userId, teamRole: "COACH" },
      { userId: athlete.userId, teamRole: "ATHLETE" },
    ]);
    const session = await testPrisma.trainingSession.create({
      data: { teamId: team.id, title: "Monday lower body", status: "LIVE", createdById: coach.userId, startedAt: new Date() },
    });

    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/train");

    const weightRoomTile = page.getByRole("link", { name: /Team Weight Room/ });
    await expect(weightRoomTile.getByText("Live now")).toBeVisible();
    await expect(weightRoomTile).toContainText("Monday lower body");
    await expect(weightRoomTile).toHaveAttribute("href", `/team/${team.id}/sessions/${session.id}/me`);
  });

  test("Build Workout links to the full library, which still renders real workouts (regression)", async ({ page }) => {
    const athlete = await createTestAthlete("hub-library", "Basketball", "Guard");
    await testPrisma.workout.create({
      data: { title: "Hub regression workout", category: "STRENGTH", createdById: athlete.userId },
    });
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/train");

    await page.getByRole("link", { name: /Build Workout/ }).click();
    await expect(page).toHaveURL(/\/train\/library$/);
    await expect(page.getByText("Hub regression workout")).toBeVisible();
  });

  test("the latest logged stat surfaces on the Log Measurements tile", async ({ page }) => {
    const athlete = await createTestAthlete("hub-stat", "Track", "Sprinter");
    await testPrisma.performanceEntry.create({
      data: { userId: athlete.userId, statName: "40-Yard Dash", value: 4.6, unit: "sec" },
    });
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/train");

    await expect(page.getByRole("link", { name: /Log Measurements/ })).toContainText("40-Yard Dash: 4.6sec");
  });

  test("the measurement presets fill the stat name and unit", async ({ page }) => {
    const athlete = await createTestAthlete("hub-preset", "Football", "RB");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/performance");

    await page.getByRole("button", { name: "Log a stat" }).click();
    await page.getByRole("button", { name: "Vertical Jump" }).click();
    await expect(page.getByPlaceholder("Stat name (e.g. 40-yard dash, Points, ERA)")).toHaveValue("Vertical Jump");
    await expect(page.getByPlaceholder("Unit (optional, e.g. sec, lbs)")).toHaveValue("in");
  });
});
