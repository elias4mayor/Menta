import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, cleanupE2eUsers, testPrisma } from "./db-helpers";

test.describe("Compact workspace", () => {
  test.afterAll(async () => { await cleanupE2eUsers(); await testPrisma.$disconnect(); });

  test("home starts compact, reveals goals, and honors a direct goals link", async ({ page, context }) => {
    const athlete = await createTestAthlete("compact-home", "Football", "Running Back");
    await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], url: "http://localhost:3000" }]);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /good|hey/i })).toBeVisible();
    const goals = page.locator("details#goals");
    await expect(goals).not.toHaveAttribute("open");
    await goals.locator("summary").click();
    await expect(goals).toHaveAttribute("open", "");
    await expect(goals.getByRole("button", { name: /add/i }).first()).toBeVisible();
    await goals.locator("summary").click();
    await page.goto("/dashboard#goals");
    await expect(goals).toHaveAttribute("open", "");
  });

  test("nested exercise route has one active sidebar link and no home hero", async ({ page, context }) => {
    const athlete = await createTestAthlete("compact-library", "Football", "Running Back");
    await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], url: "http://localhost:3000" }]);
    await page.goto("/train/exercises");
    const nav = page.getByRole("complementary", { name: "Main sidebar" });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("href", "/train/exercises");
    await expect(page.getByRole("region", { name: "My MENTA overview" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Exercise library", exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Development", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Exercise Library", exact: true })).toBeHidden();
    await nav.getByRole("button", { name: "Development", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Exercise Library", exact: true })).toBeVisible();
  });

  test("mobile More exposes all sections and Escape returns focus", async ({ page, context }) => {
    const athlete = await createTestAthlete("compact-mobile", "Football", "Running Back");
    await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], url: "http://localhost:3000" }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click();
    const dialog = page.getByRole("dialog", { name: "All workspace sections" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Future", exact: true }).click();
    await expect(dialog.getByRole("link", { name: "Academics", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(more).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("parent navigation retains the guardian-specific destinations", async ({ page, context }) => {
    const parent = await createTestUser("compact-parent", "PARENT");
    await context.addCookies([{ name: "menta_session", value: parent.cookie.split("=")[1], url: "http://localhost:3000" }]);
    await page.goto("/care");
    const nav = page.getByRole("complementary", { name: "Main sidebar" });
    await expect(nav.getByRole("link", { name: "Care", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Recruiting", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Care status", exact: true })).toBeVisible();
  });
});
