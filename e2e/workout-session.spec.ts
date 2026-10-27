import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestAthlete, cleanupE2eUsers, testPrisma } from "./db-helpers";

const workoutIds: string[] = [];

async function setup() {
  const athlete = await createTestAthlete("workout-sheet", "Football", "Quarterback");
  const workout = await testPrisma.workout.create({ data: {
    title: "Lower body power", category: "STRENGTH", createdById: athlete.userId,
    description: "Coach instructions: move with control and rest between sets.",
    exercises: JSON.stringify([{ name: "Squat", sets: "3", reps: "5", notes: "Controlled lowering" }, { name: "Lunge", sets: "2", reps: "8" }]),
  } });
  workoutIds.push(workout.id);
  return { athlete, workout, url: `/api/workouts/${workout.id}/complete` };
}

test.afterAll(async () => {
  await testPrisma.workout.deleteMany({ where: { id: { in: workoutIds } } });
  await cleanupE2eUsers();
  await testPrisma.$disconnect();
});

test("review, keyboard focus, progress resume, and real completion history", async ({ page, context }) => {
  const { athlete, workout } = await setup();
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  await page.goto("/train");
  const open = page.getByRole("button", { name: "Open workout", exact: true });
  await open.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Coach instructions");
  await expect(sheet).toContainText("Controlled lowering");
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await sheet.getByRole("button", { name: "Start workout", exact: true }).click();
  await sheet.getByRole("checkbox").first().check();
  await sheet.getByLabel("Effort (optional)").selectOption("7");
  await sheet.getByLabel("Workout notes (optional)").fill("Kept control throughout.");
  await sheet.getByRole("button", { name: "Continue later" }).click();
  await page.reload();
  await open.click();
  await expect(sheet.getByRole("checkbox").first()).toBeChecked();
  await expect(sheet.getByLabel("Workout notes (optional)")).toHaveValue("Kept control throughout.");
  await sheet.getByRole("button", { name: "Finish and save workout" }).click();
  await expect(sheet.getByRole("heading", { name: "Workout saved" })).toBeVisible();
  const completions = await testPrisma.workoutCompletion.findMany({ where: { workoutId: workout.id } });
  expect(completions).toHaveLength(1);
  expect(completions[0]).toMatchObject({ userId: athlete.userId, effort: 7, notes: "Kept control throughout." });
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText(/Done 1×/)).toBeVisible();
});

test("a lost save response can be retried after reload without a duplicate", async ({ page, context }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const { athlete, workout, url } = await setup();
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  await page.goto("/train");
  await page.getByRole("button", { name: "Open workout" }).click();
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.route(`**${url}`, async (route) => { await route.fetch(); await route.abort("connectionfailed"); }, { times: 1 });
  await page.getByRole("button", { name: "Finish and save workout" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("couldn't confirm");
  await page.reload();
  await page.getByRole("button", { name: "Open workout" }).click();
  await page.getByRole("button", { name: "Finish and save workout" }).click();
  await expect(page.getByRole("heading", { name: "Workout saved" })).toBeVisible();
  expect(await testPrisma.workoutCompletion.count({ where: { workoutId: workout.id } })).toBe(1);
  expect(browserErrors).toEqual([]);
});

test("a saved workout clears Next Move and reports the completion that resolved it", async ({ page, context }) => {
  const { athlete, workout } = await setup();
  await testPrisma.athleteProfile.update({ where: { userId: athlete.userId }, data: { trainingDaysPerWeek: 3 } });
  await testPrisma.performanceEntry.create({ data: { userId: athlete.userId, statName: "Vertical jump", value: 24 } });
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  const before = await page.request.get("/api/next-move");
  expect(before.status()).toBe(200);
  const { current } = await before.json();
  expect(current.kind).toBe("TRAINING_GAP");

  await page.goto("/train");
  await page.getByRole("button", { name: "Open workout", exact: true }).click();
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByRole("button", { name: "Finish and save workout" }).click();
  await expect(page.getByRole("heading", { name: "Workout saved" })).toBeVisible();
  expect(await testPrisma.workoutCompletion.count({ where: { workoutId: workout.id, userId: athlete.userId } })).toBe(1);

  const after = await page.request.get("/api/next-move");
  expect(after.status()).toBe(200);
  const result = await after.json();
  expect(result.current).toBeNull();
  const resolved = result.recentlyResolved.find((item: { id: string }) => item.id === current.id);
  expect(resolved.outcome.status).toBe("COMPLETED_ONLY");
  expect(resolved.outcome.detail).toContain("Logged a workout on");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "You’re caught up." })).toBeVisible();
  await expect(page.getByText("Logged a workout on", { exact: false })).toBeVisible();
});

test("concurrent retries share one completion and cannot reuse another athlete's ID", async ({ request }) => {
  const { athlete, workout, url } = await setup();
  const completionId = randomUUID();
  const options = { headers: { Cookie: athlete.cookie }, data: { completionId, effort: 6 } };
  const responses = await Promise.all(Array.from({ length: 4 }, () => request.post(url, options)));
  for (const response of responses) expect(response.status()).toBe(200);
  expect(await testPrisma.workoutCompletion.count({ where: { workoutId: workout.id } })).toBe(1);
  const other = await setup();
  const collision = await request.post(other.url, { headers: { Cookie: other.athlete.cookie }, data: { completionId } });
  expect(collision.status()).toBe(409);
  expect(await testPrisma.workoutCompletion.count({ where: { workoutId: other.workout.id } })).toBe(0);
});

test("an edited workout never reuses checkmarks for different movements", async ({ page, context }) => {
  const { athlete, workout } = await setup();
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  await page.goto("/train");
  await page.getByRole("button", { name: "Open workout" }).click();
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Continue later" }).click();
  await testPrisma.workout.update({ where: { id: workout.id }, data: { exercises: JSON.stringify([{ name: "Step up", sets: "2", reps: "6" }]) } });
  await page.reload();
  await page.getByRole("button", { name: "Open workout" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("workout changed");
  await expect(page.getByRole("button", { name: "Finish and save workout" })).toBeDisabled();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
});

test("completion requires access, valid input, and a real workout", async ({ request }) => {
  const { athlete, workout, url } = await setup();
  const other = await setup();
  expect((await request.post(url, { data: {} })).status()).toBe(401);
  expect((await request.post(url, { headers: { Cookie: other.athlete.cookie }, data: {} })).status()).toBe(403);
  expect((await request.post(url, { headers: { Cookie: athlete.cookie }, data: "{", })).status()).toBe(400);
  expect((await request.post(url, { headers: { Cookie: athlete.cookie }, data: { completionId: "invalid" } })).status()).toBe(400);
  // Directly assigned workouts are already listed by /train, even without a team.
  await testPrisma.workout.update({ where: { id: workout.id }, data: { assignedToId: other.athlete.userId } });
  expect((await request.post(url, { headers: { Cookie: other.athlete.cookie }, data: { completionId: randomUUID() } })).status()).toBe(200);
  await testPrisma.workout.update({ where: { id: workout.id }, data: { isTemplate: true } });
  expect((await request.post(url, { headers: { Cookie: athlete.cookie }, data: {} })).status()).toBe(400);
});

test("swipe requires reaching the end; cancellation never starts a workout", async ({ page, context }, testInfo) => {
  const { athlete } = await setup();
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  await page.goto("/train");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open workout" }).click();
  await page.screenshot({ path: testInfo.outputPath("workout-sheet-swipe.png") });
  const thumb = page.locator('dialog button[tabindex="-1"]');
  const bounds = (await thumb.boundingBox())!;
  await page.mouse.move(bounds.x + 24, bounds.y + 24);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 45, bounds.y + 24);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Start workout", exact: true })).toBeVisible();
  await page.mouse.move(bounds.x + 24, bounds.y + 24);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 24);
  await thumb.dispatchEvent("pointercancel");
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Start workout", exact: true })).toBeVisible();
  await expect(thumb).toHaveAttribute("data-dragging", "false");
  await expect(thumb).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const track = (await thumb.locator("..").boundingBox())!;
  await page.mouse.move(bounds.x + 24, bounds.y + 24);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width - 24, bounds.y + 24, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Finish and save workout" })).toBeVisible();
});

test("responsive sheet, reduced motion, corrupt storage, and denied device saves", async ({ page, context }, testInfo) => {
  const { athlete, workout } = await setup();
  await context.addCookies([{ name: "menta_session", value: athlete.cookie.split("=")[1], domain: "localhost", path: "/" }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/train");
  for (const [width, height] of [[1440, 900], [820, 1180], [390, 844], [360, 800], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "Open workout" }).click();
    const sheet = page.getByRole("dialog");
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(await sheet.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await sheet.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    await expect(sheet.getByRole("button", { name: "Start workout", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`workout-sheet-${width}.png`) });
    await page.keyboard.press("Escape");
  }
  await page.evaluate(({ userId, workoutId }) => localStorage.setItem(`menta:workout:v1:${userId}:${workoutId}`, "corrupt"), { userId: athlete.userId, workoutId: workout.id });
  await page.getByRole("button", { name: "Open workout" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("could not be read");
  await expect(page.getByRole("button", { name: "Start workout", exact: true })).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear local progress" }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.getByRole("button", { name: "Start workout", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("could not be saved on this device");
  await expect(page.getByRole("button", { name: "Finish and save workout" })).not.toBeVisible();
});
