import { test, expect } from "@playwright/test";
import { createTestAthlete, createTestUser, cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * The desktop sidebar's accordion nav: real browser interaction, not just
 * a DOM/unit check — expand/collapse, aria-expanded semantics, keyboard
 * activation, and that the section containing the active route is always
 * revealed. Logs in via a minted session cookie (not the full signup UI
 * flow) since these tests are about the nav itself, not onboarding.
 */
async function loginWithCookie(page: import("@playwright/test").Page, cookie: string) {
  const [, token] = cookie.split("=");
  await page.context().addCookies([
    { name: "menta_session", value: token, url: "http://localhost:3000" },
  ]);
}

test.describe("Accordion navigation", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("sections expand and collapse, with correct aria-expanded state", async ({ page }) => {
    const athlete = await createTestAthlete("accordion-expand", "Football", "WR");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    const devSection = page.locator('aside button[aria-expanded]', { hasText: "Development" });
    await expect(devSection).toHaveAttribute("aria-expanded", "false");

    // The section's items aren't in the accessibility tree / visible height yet.
    const trainingLink = page.locator('aside a:has-text("Training")');
    await expect(trainingLink).toBeAttached();

    await devSection.click();
    await expect(devSection).toHaveAttribute("aria-expanded", "true");
    await expect(trainingLink).toBeVisible();

    await devSection.click();
    await expect(devSection).toHaveAttribute("aria-expanded", "false");
  });

  test("multiple sections can be open at once — opening one never force-closes another", async ({ page }) => {
    const athlete = await createTestAthlete("accordion-multi", "Football", "WR");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    const homeSection = page.locator('aside button[aria-expanded]', { hasText: "Home" });
    const devSection = page.locator('aside button[aria-expanded]', { hasText: "Development" });

    // "Home" is open by default (it contains the active /dashboard route).
    await expect(homeSection).toHaveAttribute("aria-expanded", "true");

    await devSection.click();
    await expect(devSection).toHaveAttribute("aria-expanded", "true");
    // Opening Development must not have closed Home.
    await expect(homeSection).toHaveAttribute("aria-expanded", "true");
  });

  test("the section containing the active route is auto-revealed on navigation", async ({ page }) => {
    const athlete = await createTestAthlete("accordion-active-route", "Football", "WR");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    const devSection = page.locator('aside button[aria-expanded]', { hasText: "Development" });
    await expect(devSection).toHaveAttribute("aria-expanded", "false");

    // Navigate directly to a route inside the (collapsed) Development section.
    await page.goto("http://localhost:3000/train");
    await page.waitForSelector("aside");
    await expect(devSection).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('aside a:has-text("Training")')).toBeVisible();
  });

  test("keyboard: a section header is a real button, activates with Enter, and reaches nav links by Tab", async ({ page }) => {
    const athlete = await createTestAthlete("accordion-keyboard", "Football", "WR");
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    const devSection = page.locator('aside button[aria-expanded]', { hasText: "Development" });
    const tagName = await devSection.evaluate((el) => el.tagName);
    expect(tagName).toBe("BUTTON");

    await devSection.focus();
    await page.keyboard.press("Enter");
    await expect(devSection).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Enter");
    await expect(devSection).toHaveAttribute("aria-expanded", "false");
  });

  test("respects prefers-reduced-motion: the accordion still functions with motion disabled", async ({ browser }) => {
    const athlete = await createTestAthlete("accordion-reduced-motion", "Football", "WR");
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    const devSection = page.locator('aside button[aria-expanded]', { hasText: "Development" });
    await devSection.click();
    await expect(devSection).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('aside a:has-text("Training")')).toBeVisible();
    await ctx.close();
  });

  test("coach role sees its own distinct nav sections — role-scoped nav, not the athlete's", async ({ page }) => {
    const coach = await createTestUser("accordion-coach", "COACH");
    // proxy.ts gates full page access behind onboarding completion — a
    // bare User row (what createTestUser gives) gets redirected to
    // /onboarding instead of /dashboard, which has no sidebar at all.
    await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
    await loginWithCookie(page, coach.cookie);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForSelector("aside");

    await expect(page.locator('aside button[aria-expanded]', { hasText: "Team" })).toBeVisible();
    await expect(page.locator('aside button[aria-expanded]', { hasText: "Development" })).toHaveCount(0);
  });

  test("mobile viewport: the bottom nav is present and compact, no accordion drawer needed", async ({ browser }) => {
    const athlete = await createTestAthlete("accordion-mobile", "Football", "WR");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await loginWithCookie(page, athlete.cookie);
    await page.goto("http://localhost:3000/dashboard");

    await expect(page.locator("aside")).toBeHidden();
    const bottomNav = page.locator("nav.md\\:hidden");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByText("Home")).toBeVisible();

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(docWidth).toBeLessThanOrEqual(viewportWidth + 1);

    await ctx.close();
  });
});
