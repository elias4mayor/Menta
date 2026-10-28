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

    await page.keyboard.press("PageDown");
    await expect(page.locator(".home-overview")).toHaveClass(/home-is-collapsed/);
    await expect(page.locator(".home-focus-body")).toHaveAttribute("inert", "");
    await page.keyboard.press("Control+Home");
    await expect(page.locator(".home-overview")).not.toHaveClass(/home-is-collapsed/);
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.getByRole("navigation", { name: "Main navigation", exact: true })).toBeVisible();
    await expect(page.locator('.menta-bottom-dock a[aria-current="page"]')).toHaveText("Home");
    await page.setViewportSize({ width: 1280, height: 720 });

    // Home interactions must hydrate and remain useful with a fresh account.
    await page.getByRole("button", { name: "10 min", exact: true }).click();
    await expect(page.getByRole("timer")).toHaveText("10:00");
    await page.getByRole("button", { name: "Start focus", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    await expect(page.getByRole("timer")).not.toHaveText("10:00", { timeout: 5_000 });
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.getByRole("button", { name: "Reset timer", exact: true }).click();
    await expect(page.getByRole("timer")).toHaveText("10:00");
    await page.getByRole("button", { name: "Game day", exact: false }).click();
    await expect(page.getByRole("link", { name: "Team messages Open your conversations", exact: true })).toHaveAttribute("href", "/messages");
    await page.getByRole("button", { name: "My day", exact: true }).click();

    const pages: { path: string; heading: string }[] = [
      { path: "/dashboard", heading: "Ready when you are." },
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
