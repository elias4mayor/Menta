import { test, expect } from "@playwright/test";

/**
 * Minimal, self-contained infra smoke test for the isolated CI branch
 * (ci/e2e-isolated-test, based on origin/main). Its only job is to prove
 * the GitHub Actions Linux runner can install and launch Chromium, boot
 * the app's real dev server, and drive a real page with Playwright — not
 * to exercise MENTA feature behavior. Deliberately touches only pages
 * that exist on origin/main and requires no signed-in session or
 * feature-branch-only data model.
 */
test("homepage responds", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
});

test("login page renders the real form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});
