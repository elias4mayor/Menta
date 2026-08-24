import { test, expect } from "@playwright/test";
import { defaultAthleteParams, readVerificationCode, signup } from "./fixtures";
import { cleanupE2eUsers, testPrisma } from "./db-helpers";

function sessionCookieFromResponse(headers: { name: string; value: string }[]): string {
  const setCookie = headers.find((h) => h.name.toLowerCase() === "set-cookie");
  const match = setCookie?.value.match(/menta_session=[^;]+/);
  if (!match) throw new Error("No menta_session cookie in response.");
  return match[0];
}

test.describe("Auth: signup, email verification, login, logout", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("signup requires email verification before onboarding, and rejects a wrong code", async ({ page }) => {
    const params = defaultAthleteParams("auth-verify");
    await signup(page, params);
    // getByText alone also matches Next.js's own route-announcer live
    // region (an accessibility feature, not app content) — scope to the
    // real heading.
    await expect(page.getByRole("heading", { name: /verify your email/i })).toBeVisible();

    // Wrong code: stays put, shows an error, never advances.
    await page.locator('[aria-label="Digit 1 of 6"]').click();
    await page.keyboard.type("000000", { delay: 30 });
    await expect(page.getByText(/isn.t correct|something went wrong/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/verify-email/);

    // Real code: verifies and lands on /onboarding — this is the exact
    // handoff this app previously had a client-router bug on, so landing
    // here for real (not stuck, not silently no-op'd) is the regression
    // this test exists to catch.
    const code = await readVerificationCode(params.email);
    await page.locator('[aria-label="Digit 1 of 6"]').fill("");
    await page.locator('[aria-label="Digit 1 of 6"]').click();
    await page.keyboard.type(code, { delay: 30 });
    await page.waitForURL("**/onboarding", { timeout: 15_000 });
    await page.waitForSelector(".onb-title", { timeout: 30_000 });
    await expect(page.getByText("What sport do you compete in?")).toBeVisible();
  });

  test("login with real credentials succeeds and logout actually revokes the session", async ({ page, request }) => {
    const params = defaultAthleteParams("auth-login");
    await signup(page, params);
    const code = await readVerificationCode(params.email);
    await page.locator('[aria-label="Digit 1 of 6"]').click();
    await page.keyboard.type(code, { delay: 30 });
    await page.waitForURL("**/onboarding");

    const loginRes = await request.post("/api/auth/login", {
      data: { email: params.email, password: params.password },
    });
    expect(loginRes.status()).toBe(200);
    const cookie = sessionCookieFromResponse(loginRes.headersArray());

    const authed = await request.get("/api/athlete/sport-contexts", { headers: { Cookie: cookie } });
    expect(authed.status()).toBe(200);

    const logoutRes = await request.post("/api/auth/logout", { headers: { Cookie: cookie } });
    expect(logoutRes.status()).toBe(200);

    const afterLogout = await request.get("/api/athlete/sport-contexts", { headers: { Cookie: cookie } });
    expect(afterLogout.status()).toBe(401);
  });

  test("wrong password is rejected with a generic error", async ({ page, request }) => {
    const params = defaultAthleteParams("auth-wrongpass");
    await signup(page, params);
    const res = await request.post("/api/auth/login", {
      data: { email: params.email, password: "definitely-not-the-password" },
    });
    expect(res.status()).toBe(401);
  });
});
