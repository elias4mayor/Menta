import { test, expect } from "@playwright/test";
import { createTestUser, createTestTeam, cleanupE2eUsers, testPrisma, E2E_RUN_ID } from "./db-helpers";

test.afterAll(async () => {
  await testPrisma.team.deleteMany({ where: { createdBy: { email: { contains: E2E_RUN_ID } } } });
  await cleanupE2eUsers(); await testPrisma.$disconnect();
});

test("fans see the published scoreboard while coaches create and hide game pages", async ({ page, request }) => {
  const coach = await createTestUser("game-browser", "COACH");
  await testPrisma.coachProfile.create({ data: { userId: coach.userId, onboardingCompletedAt: new Date() } });
  await createTestTeam(coach.userId, [{ userId: coach.userId, teamRole: "COACH" }]);
  const baseURL = test.info().project.use.baseURL!;
  await page.context().addCookies([{ name: "menta_session", value: coach.cookie.split("=")[1], url: baseURL }]);
  await page.goto("/gameday");
  await expect(page.getByRole("heading", { name: "Game day, together." })).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(8, 8, 8)");
  await page.getByText("Schedule a game day", { exact: true }).click();
  await page.getByLabel("Home school name", { exact: true }).fill("MENTA Home");
  await page.getByLabel("Visiting school name").fill("MENTA Visitors");
  await page.getByLabel("Kickoff in your current time zone").fill("2026-11-06T19:00");
  await page.getByLabel("Venue", { exact: true }).fill("School Stadium");
  await page.getByLabel("Visitor guide").fill("Accessible entrance at the east gate.");
  await page.getByLabel("Official broadcast URL").fill("https://example.com/watch");
  await page.getByLabel("Official ticket URL").fill("https://example.com/tickets");
  await page.getByLabel("Publish a public fan page").check();
  await page.getByRole("button", { name: "Create game day", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your game day." })).toBeVisible();
  const gameId = new URL(page.url()).pathname.split("/").pop()!;
  await page.getByRole("button", { name: "Update or correct score" }).click();
  await page.getByLabel("MENTA Home", { exact: true }).fill("7");
  await page.getByLabel("Game status", { exact: true }).selectOption("LIVE");
  await page.getByLabel("Quarter / period").fill("Q1");
  await page.getByLabel("Public update", { exact: true }).fill("Touchdown and extra point.");
  await page.getByRole("button", { name: "Publish update", exact: true }).click();
  await expect(page.getByText("Touchdown and extra point.", { exact: true })).toBeVisible();
  await page.context().clearCookies();
  await page.goto(`/games/${gameId}`);
  await expect(page.getByRole("heading", { name: "Follow the game." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Watch official broadcast" })).toHaveAttribute("href", "https://example.com/watch");
  await expect(page.getByRole("button", { name: "Update or correct score" })).toHaveCount(0);
  await expect(page.getByText("Team plans · Members only")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("menta-public-game-day.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("menta-public-game-day-phone.png"), fullPage: true });
  expect((await request.delete(`/api/gameday/${gameId}`, { headers: { Cookie: coach.cookie } })).status()).toBe(200);
  expect((await page.goto(`/games/${gameId}`))?.status()).toBe(404);
});

test("game publication, scoring authority, concurrent edits and revocation stay isolated", async ({ request }) => {
  const coach = await createTestUser("game-coach", "COACH");
  const scorer = await createTestUser("game-scorer", "ATHLETE");
  const teammate = await createTestUser("game-member", "ATHLETE");
  const outsider = await createTestUser("game-outsider", "COACH");
  const team = await createTestTeam(coach.userId, [
    { userId: coach.userId, teamRole: "COACH" }, { userId: scorer.userId, teamRole: "ATHLETE" },
    { userId: teammate.userId, teamRole: "ATHLETE" },
  ]);
  const details = { teamId: team.id, opponentName: "Visitors", homeName: "Home school", homeLogo: null, awayLogo: null,
    startsAt: new Date(Date.now() + 3600000).toISOString(), venue: "Stadium", visitorInfo: "North gate",
    watchUrl: "https://example.com/watch", ticketUrl: "https://example.com/tickets", published: false, scorerId: scorer.userId };
  const auth = (cookie: string) => ({ Cookie: cookie });
  expect((await request.post("/api/gameday", { headers: auth(outsider.cookie), data: details })).status()).toBe(403);
  expect((await request.post("/api/gameday", { headers: auth(coach.cookie), data: { ...details, watchUrl: "javascript:alert(1)" } })).status()).toBe(400);
  expect((await request.post("/api/gameday", { headers: auth(coach.cookie), data: { ...details, scorerId: outsider.userId } })).status()).toBe(400);
  const created = await request.post("/api/gameday", { headers: auth(coach.cookie), data: details });
  expect(created.status()).toBe(201);
  const { game } = await created.json();
  const url = `/api/gameday/${game.id}`;
  expect((await request.get(url)).status()).toBe(404);
  expect((await request.get(url, { headers: auth(teammate.cookie) })).status()).toBe(200);
  const { teamId: _teamId, ...settings } = details;
  void _teamId;
  expect((await request.patch(url, { headers: auth(scorer.cookie), data: { ...settings, version: 0, published: true } })).status()).toBe(403);
  expect((await request.patch(url, { headers: auth(coach.cookie), data: { ...settings, version: 0, published: true } })).status()).toBe(200);
  const publicResponse = await (await request.get(url)).json();
  expect(publicResponse.canScore).toBe(false);
  expect(publicResponse.game).not.toHaveProperty("scorerId");
  const score = { version: 1, homeScore: 7, awayScore: 0, period: "Q1", status: "LIVE", note: "Touchdown and extra point" };
  expect((await request.post(url, { headers: auth(teammate.cookie), data: score })).status()).toBe(403);
  expect((await request.post(url, { headers: auth(outsider.cookie), data: score })).status()).toBe(403);
  const simultaneous = await Promise.all([1, 2].map(() => request.post(url, { headers: auth(scorer.cookie), data: score })));
  expect(simultaneous.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(await testPrisma.gameScoreUpdate.count({ where: { gameId: game.id } })).toBe(1);
  const after = await (await request.get(url)).json();
  expect(after.game.homeScore).toBe(7);
  expect(after.updates[0]).not.toHaveProperty("actorId");
  expect((await request.post(url, { headers: auth(scorer.cookie), data: { ...score, version: 2, homeScore: -1 } })).status()).toBe(400);
  await testPrisma.teamMembership.delete({ where: { userId_teamId: { userId: scorer.userId, teamId: team.id } } });
  expect((await request.post(url, { headers: auth(scorer.cookie), data: { ...score, version: 2 } })).status()).toBe(403);
  const hidden = await request.patch(url, { headers: auth(coach.cookie), data: { ...settings, scorerId: null, version: 2, published: false } });
  expect(hidden.status()).toBe(200);
  expect((await request.get(url)).status()).toBe(404);
  expect((await request.get(url, { headers: auth(scorer.cookie) })).status()).toBe(404);
  expect((await request.get("/api/gameday", { headers: auth(outsider.cookie) })).status()).toBe(200);
  expect((await (await request.get("/api/gameday", { headers: auth(outsider.cookie) })).json()).games).toEqual([]);
});
