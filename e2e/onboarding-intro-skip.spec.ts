import { test, expect } from "@playwright/test";
import { signupAndVerify, uniqueEmail } from "./fixtures";
import { cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * The first-launch MentaIntro cinematic previously had no way to opt out
 * short of the OS-level prefers-reduced-motion setting — every signup sat
 * through the full ~13s sequence before reaching the real onboarding form.
 * This checks the new Skip control actually works: present, keyboard-
 * reachable, and clicking it reveals the real form immediately rather than
 * after the full timer sequence.
 */
test.describe("Onboarding intro — skip control", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("clicking Skip reveals the real onboarding form well before the intro's own ~13s sequence would finish", async ({ page }) => {
    await signupAndVerify(page, {
      name: "E2E Skip Intro",
      email: uniqueEmail("skip-intro"),
      password: "correct-horse-battery-9",
      role: "ATHLETE",
    });
    // signupAndVerify's own navigation chain (cold Turbopack compiles of
    // /signup, /verify-email, /onboarding) can itself take longer than the
    // intro's ~13s timer, so the intro may already be done by the time it
    // resolves. A fresh navigation to /onboarding forces OnboardingGate to
    // remount, deterministically restarting the intro from "empty".
    await page.goto("/onboarding");

    const skipButton = page.getByRole("button", { name: "Skip" });
    await expect(skipButton).toBeVisible();

    const start = Date.now();
    await skipButton.click();
    await expect(page.getByText("What sport do you compete in?")).toBeVisible();
    const elapsedMs = Date.now() - start;

    // The full intro sequence holds for 12s before even starting its fade;
    // skip should land well under that, not merely before the fade finishes.
    expect(elapsedMs).toBeLessThan(8000);
  });

  test("Skip is reachable by keyboard, not just a mouse target", async ({ page }) => {
    await signupAndVerify(page, {
      name: "E2E Skip Intro Keyboard",
      email: uniqueEmail("skip-intro-kbd"),
      password: "correct-horse-battery-9",
      role: "ATHLETE",
    });
    await page.goto("/onboarding");

    const skipButton = page.getByRole("button", { name: "Skip" });
    await expect(skipButton).toBeVisible();
    await skipButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("What sport do you compete in?")).toBeVisible();
  });
});
