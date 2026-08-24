import { expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { SERVER_LOG_PATH } from "../playwright.config";
import { E2E_RUN_ID } from "./db-helpers";

/**
 * Real, non-fabricated test accounts: a fresh email per test run so tests
 * never collide with each other or with real data. Not a mock — every
 * account created here goes through the actual signup → verify → onboard
 * API path against the actual dev database. Embeds E2E_RUN_ID so
 * cleanupE2eUsers() (db-helpers.ts) only ever deletes what this run itself
 * created — the dev database has years of unrelated leftover @example.test
 * rows from older, unrelated QA scripts.
 */
export function uniqueEmail(tag: string): string {
  return `e2e-${E2E_RUN_ID}-${tag}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

/**
 * Reads the real 6-digit verification code MENTA just generated, the same
 * way a developer running `npm run dev` locally would: src/lib/email.ts's
 * honest RESEND_API_KEY-not-configured fallback prints "Would send to
 * <email>... Your MENTA verification code is <code>" to the server
 * console, which playwright.config.ts redirects to SERVER_LOG_PATH. This
 * is the real code the app issued — never a bypass or a hardcoded value.
 */
export async function readVerificationCode(email: string): Promise<string> {
  const pattern = new RegExp(
    `Would send to ${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?verification code is (\\d{6})`
  );

  for (let attempt = 0; attempt < 50; attempt++) {
    if (existsSync(SERVER_LOG_PATH)) {
      const log = readFileSync(SERVER_LOG_PATH, "utf8");
      const matches = [...log.matchAll(new RegExp(pattern, "g"))];
      if (matches.length > 0) return matches[matches.length - 1][1];
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No verification code appeared in ${SERVER_LOG_PATH} for ${email} within 10s.`);
}

export type SignupRole = "ATHLETE" | "COACH" | "TRAINER" | "PARENT" | "DOCTOR";

/** Fills and submits the real signup form. Leaves the browser on /verify-email. */
export async function signup(
  page: Page,
  params: { name: string; email: string; password: string; role: SignupRole; dateOfBirth?: string }
) {
  await page.goto("/signup");
  await page.locator("#name").fill(params.name);
  await page.locator("#email").fill(params.email);
  await page.locator("#password").fill(params.password);
  if (params.dateOfBirth) await page.locator("#dob").fill(params.dateOfBirth);
  await page.locator("#role").selectOption(params.role);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/verify-email");
}

/**
 * Reads the real code from the server log and completes /verify-email.
 * Leaves the browser on /onboarding, past OnboardingGate's one-time
 * MentaIntro cinematic (a real, deliberately-paced ~13s boot sequence —
 * see MentaIntro.tsx's T_REVEAL/REVEAL_MS — that plays before the actual
 * onboarding questions mount, for every role). Waiting for `.onb-title`
 * is the real signal that hand-off finished, not a fixed sleep guess.
 */
export async function verifyEmail(page: Page, email: string) {
  const code = await readVerificationCode(email);
  await page.locator('[aria-label="Digit 1 of 6"]').click();
  await page.keyboard.type(code, { delay: 30 });
  await page.waitForURL("**/onboarding", { timeout: 15_000 });
  await page.waitForSelector(".onb-title", { timeout: 30_000 });
}

/** Full signup + verify in one call — the common entry point every onboarding test starts from. */
export async function signupAndVerify(
  page: Page,
  params: { name: string; email: string; password: string; role: SignupRole; dateOfBirth?: string }
) {
  await signup(page, params);
  await verifyEmail(page, params.email);
}

const DEFAULT_PASSWORD = "correct-horse-battery-9";

export function defaultAthleteParams(tag: string) {
  return {
    name: "E2E Athlete",
    email: uniqueEmail(tag),
    password: DEFAULT_PASSWORD,
    role: "ATHLETE" as const,
    dateOfBirth: "2006-05-01",
  };
}

/** Waits for the onboarding cinematic step transition (fade out/in) to settle before interacting. */
export async function waitForOnboardingStep(page: Page) {
  await page.waitForTimeout(320);
}

/**
 * Attaches listeners that collect real browser-console errors, uncaught
 * exceptions, and failed network requests for the rest of this page's
 * life — call this right after the page is created, then assert the
 * returned array is empty at the end of a flow. A green Playwright
 * assertion doesn't mean the UI is clean; this is how we actually check.
 */
// Avatar.tsx's own doc comment: "<img> just points at /api/users/[id]/avatar
// and falls back to initials on load error (404 when the user has no
// avatarKey)" — a documented, by-design 404 that fires for every user who
// hasn't uploaded a photo, everywhere Avatar renders. Not a defect; the
// UI already handles it (confirmed via the initials fallback rendering).
const EXPECTED_404_PATTERN = /\/api\/users\/[^/]+\/avatar/;

export function trackPageIssues(page: Page): string[] {
  const issues: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const loc = msg.location();
    if (EXPECTED_404_PATTERN.test(loc.url)) return;
    issues.push(`console.error: ${msg.text()} (${loc.url}:${loc.lineNumber})`);
  });
  page.on("pageerror", (err) => {
    issues.push(`pageerror: ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    // net::ERR_ABORTED on its own (no real network/server error underneath)
    // is the browser's normal way of saying "this in-flight request was
    // cancelled by navigation," not a failure — a fetch/video request from
    // a page we've since navigated away from cancels exactly like this in
    // any web app. A real failure has a more specific errorText.
    const errorText = req.failure()?.errorText;
    if (errorText === "net::ERR_ABORTED") return;
    issues.push(`requestfailed: ${req.method()} ${req.url()} — ${errorText}`);
  });
  page.on("response", (res) => {
    if (res.status() < 400) return;
    if (res.status() === 404 && EXPECTED_404_PATTERN.test(res.url())) return;
    issues.push(`response ${res.status()}: ${res.request().method()} ${res.url()}`);
  });
  return issues;
}

export { expect };
