import { test, expect } from "@playwright/test";
import { signupAndVerify, uniqueEmail } from "./fixtures";
import { cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * Regression coverage for the signup → verify-email → onboarding handoff
 * across every role, not just ATHLETE (which onboarding-multisport.spec.ts
 * already exercises in full). MENTA previously had a real client-router
 * bug where this handoff silently stalled — this file exists specifically
 * so a regression there fails a permanent test instead of only being
 * caught by hand.
 */
const ROLE_HEADINGS: Record<"COACH" | "TRAINER" | "PARENT" | "DOCTOR", string> = {
  COACH: "Let’s set up your team.",
  TRAINER: "Let’s set up your training profile.",
  PARENT: "Let’s get you connected.",
  DOCTOR: "Let’s set up your provider profile.",
};

test.describe("Onboarding handoff regression — all roles", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  for (const role of ["COACH", "TRAINER", "PARENT", "DOCTOR"] as const) {
    test(`${role} signup → verify → lands on the real ${role} onboarding UI`, async ({ page }) => {
      await signupAndVerify(page, {
        name: `E2E ${role}`,
        email: uniqueEmail(`role-${role.toLowerCase()}`),
        password: "correct-horse-battery-9",
        role,
      });
      await expect(page).toHaveURL(/onboarding/);
      await expect(page.getByText(ROLE_HEADINGS[role])).toBeVisible();
    });
  }

  test("a signed-in, already-onboarded athlete visiting /onboarding again is sent to the dashboard, not stuck", async ({
    page,
  }) => {
    await signupAndVerify(page, {
      name: "E2E Already Onboarded",
      email: uniqueEmail("already-onboarded"),
      password: "correct-horse-battery-9",
      role: "ATHLETE",
    });
    // Minimal real completion of the athlete flow so onboardingCompletedAt
    // gets set, then re-visiting /onboarding should bounce to /dashboard —
    // proxy.ts's actual completed-onboarding redirect, not a UI assumption.
    await page.locator("#onb-sport-0").click();
    await page.getByRole("option", { name: "Golf", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(320);
    await page.locator("#onb-school-type").click();
    await page.getByRole("option", { name: "High School", exact: true }).click();
    await page.locator("#onb-school").fill("MENTA E2E Regression High School");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(320);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(320);
    await page.getByRole("button", { name: "Build my MENTA" }).click();
    await expect(page.getByText("Your MENTA is ready.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Enter MENTA" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    await page.goto("/onboarding");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
  });
});
