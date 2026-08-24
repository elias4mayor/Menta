import { test, expect } from "@playwright/test";
import { defaultAthleteParams, signupAndVerify, waitForOnboardingStep, trackPageIssues } from "./fixtures";
import { cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * Regression smoke coverage: every core athlete page must still load —
 * real content, no console errors, no failed requests — after the
 * multi-sport foundation changes. Not deep functional tests (those exist
 * elsewhere); this exists purely so a broken page can never slip through
 * unnoticed during future phases.
 */
test.describe("Page smoke regression — athlete", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("dashboard, profile, training, performance, recruiting, film, and care all load cleanly", async ({ page }) => {
    const issues = trackPageIssues(page);
    const params = defaultAthleteParams("smoke");
    await signupAndVerify(page, params);

    await page.locator("#onb-sport-0").click();
    await page.getByRole("option", { name: "Soccer", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);
    await page.locator("#onb-school-type").click();
    await page.getByRole("option", { name: "High School", exact: true }).click();
    await page.locator("#onb-school").fill("MENTA Smoke Test High School");
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);
    await page.getByRole("button", { name: "Build my MENTA" }).click();
    await expect(page.getByText("Your MENTA is ready.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Enter MENTA" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    const pages: { path: string; heading: string }[] = [
      { path: "/dashboard", heading: "Now" },
      { path: "/profile", heading: params.name },
      { path: "/train", heading: "Workout library" },
      { path: "/performance", heading: "Stats & trends" },
      { path: "/recruit", heading: "Your recruiting dashboard" },
      { path: "/film", heading: "Film library" },
      { path: "/care", heading: "MENTA Care" },
    ];

    for (const { path, heading } of pages) {
      await page.goto(path);
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 10_000 });
    }

    expect(issues).toEqual([]);
  });
});
