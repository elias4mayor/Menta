import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { defaultAthleteParams, signupAndVerify, waitForOnboardingStep, trackPageIssues } from "./fixtures";
import { testPrisma as prisma, cleanupE2eUsers } from "./db-helpers";

async function pickOption(page: Page, buttonId: string, label: string) {
  await page.locator(`#${buttonId}`).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test.describe("Athlete onboarding — multi-sport", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await prisma.$disconnect();
  });

  test("adding a second sport, choosing primary, and completing onboarding creates real AthleteSportContext rows", async ({
    page,
  }) => {
    const issues = trackPageIssues(page);
    const params = defaultAthleteParams("multisport");
    await signupAndVerify(page, params);

    // Landed on the real onboarding UI, on the sport step.
    await expect(page.getByText("What sport do you compete in?")).toBeVisible();

    // First sport.
    await pickOption(page, "onb-sport-0", "Football");
    await pickOption(page, "onb-position-0", "Running Back");

    // "Which is your primary sport?" must not appear yet with only one sport.
    await expect(page.locator("#onb-primary-sport")).toHaveCount(0);

    // + Add another sport.
    await page.getByRole("button", { name: "+ Add another sport" }).click();
    await expect(page.locator("#onb-sport-1")).toBeVisible();

    await pickOption(page, "onb-sport-1", "Track & Field");
    await pickOption(page, "onb-position-1", "100m");

    // Duplicate-sport prevention in the onboarding UI itself.
    await page.locator("#onb-sport-1").click();
    await page.getByRole("option", { name: "Football", exact: true }).click();
    await expect(page.getByText("You already added Football.")).toBeVisible();
    // Revert the duplicate before continuing.
    await pickOption(page, "onb-sport-1", "Track & Field");
    await pickOption(page, "onb-position-1", "100m");

    // Primary sport selector appears now that there are two, defaulting to
    // the first-entered sport.
    await expect(page.locator("#onb-primary-sport")).toContainText("Football");
    await pickOption(page, "onb-primary-sport", "Track & Field · 100m");
    await expect(page.locator("#onb-primary-sport")).toContainText("Track & Field");

    await page.locator("#onb-gradyear").fill("2027");
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);

    // School step — only schoolType + schoolName are required to advance.
    await expect(page.getByText("Where do you train?")).toBeVisible();
    await pickOption(page, "onb-school-type", "High School");
    await page.locator("#onb-school").fill("MENTA E2E Test High School");
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);

    // Goals step — nothing required, just continue.
    await expect(page.getByText("Select everything you want MENTA to help you improve.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);

    // Review step reflects both sports and the chosen primary.
    await expect(page.getByText("Football (Running Back), Track & Field (100m)")).toBeVisible();
    await expect(page.getByText("Primary sport")).toBeVisible();
    await expect(page.getByText("Track & Field", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Build my MENTA" }).click();

    // Reveal screen — primary sport shown, extra sport called out.
    await expect(page.getByText("Your MENTA is ready.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Track & Field · 100m")).toBeVisible();
    await expect(page.getByText("+ 1 more sport added")).toBeVisible();

    await page.getByRole("button", { name: "Enter MENTA" }).click();
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Sport Switcher renders in the topbar (>1 active sport) showing the
    // primary sport chosen during onboarding, not the first one entered.
    await expect(page.locator(".sport-switcher-trigger")).toContainText("Track & Field · 100m", {
      timeout: 10_000,
    });

    // Before switching, the server-rendered "Now" card reflects the
    // current primary sport (Track & Field).
    await expect(page.getByText("Track & Field — nothing scheduled today")).toBeVisible();

    // Switch to Football via the switcher popover — verify it updates,
    // no stale "Track & Field" text lingers, and normal navigation still
    // works afterward (page didn't crash).
    await page.locator(".sport-switcher-trigger").click();
    await page.getByRole("option", { name: "Football · Running Back" }).click();
    await expect(page.locator(".sport-switcher-trigger")).toContainText("Football · Running Back");
    await expect(page.locator(".sport-switcher-trigger")).not.toContainText("Track & Field");

    // The real regression check: without any navigation (no goto, no
    // reload), the "Now" card — a Server Component reading
    // AthleteProfile.sport — must already show Football. This only
    // passes if switching primary actually calls router.refresh();
    // stale local-only state would leave the old text in place.
    await expect(page.getByText("Football — nothing scheduled today")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Track & Field — nothing scheduled today")).toHaveCount(0);

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: params.name })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator(".sport-switcher-trigger")).toContainText("Football · Running Back");

    // A full page reload persists the switch (it's server-backed via
    // AthleteSportContext.isPrimary, not client-only UI state).
    await page.reload();
    await expect(page.locator(".sport-switcher-trigger")).toContainText("Football · Running Back", {
      timeout: 10_000,
    });

    // Switch back to Track & Field — the round trip works both ways.
    await page.locator(".sport-switcher-trigger").click();
    await page.getByRole("option", { name: "Track & Field · 100m" }).click();
    await expect(page.locator(".sport-switcher-trigger")).toContainText("Track & Field · 100m");

    // No hidden breakage: no console errors, uncaught exceptions, failed
    // requests, or 5xx responses anywhere across the whole flow above.
    expect(issues).toEqual([]);

    // Real database check: both sports exist, are active, Track & Field is
    // primary, and AthleteProfile's mirror matches the primary — not just
    // that the UI displayed the right thing.
    const user = await prisma.user.findUnique({ where: { email: params.email } });
    expect(user).not.toBeNull();

    const contexts = await prisma.athleteSportContext.findMany({
      where: { userId: user!.id },
      orderBy: { sport: "asc" },
    });
    expect(contexts).toHaveLength(2);
    const football = contexts.find((c) => c.sport === "Football")!;
    const track = contexts.find((c) => c.sport === "Track & Field")!;
    expect(football.isActive).toBe(true);
    expect(football.isPrimary).toBe(false);
    expect(football.position).toBe("Running Back");
    expect(track.isActive).toBe(true);
    expect(track.isPrimary).toBe(true);
    expect(track.position).toBe("100m");

    const profile = await prisma.athleteProfile.findUnique({ where: { userId: user!.id } });
    expect(profile?.sport).toBe("Track & Field");
    expect(profile?.position).toBe("100m");
  });

  test("a single-sport athlete never sees the primary-sport selector and gets exactly one active context", async ({
    page,
  }) => {
    const params = defaultAthleteParams("singlesport");
    await signupAndVerify(page, params);

    await pickOption(page, "onb-sport-0", "Basketball");
    await pickOption(page, "onb-position-0", "Point Guard");
    await expect(page.locator("#onb-primary-sport")).toHaveCount(0);
    await page.locator("#onb-gradyear").fill("2026");
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);

    await pickOption(page, "onb-school-type", "High School");
    await page.locator("#onb-school").fill("MENTA E2E Single Sport High School");
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await waitForOnboardingStep(page);

    await expect(page.getByText("Primary sport")).toHaveCount(0);
    await page.getByRole("button", { name: "Build my MENTA" }).click();
    await expect(page.getByText("Your MENTA is ready.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("+ 1 more sport added")).toHaveCount(0);

    const user = await prisma.user.findUnique({ where: { email: params.email } });
    const contexts = await prisma.athleteSportContext.findMany({ where: { userId: user!.id } });
    expect(contexts).toHaveLength(1);
    expect(contexts[0].sport).toBe("Basketball");
    expect(contexts[0].isPrimary).toBe(true);
    expect(contexts[0].isActive).toBe(true);
  });
});
