import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { createTestAthlete, cleanupE2eUsers, testPrisma } from "./db-helpers";
import { sha256 } from "../src/lib/mobile-auth-flow";

const users: string[] = [];
async function ticket(expiresAt = new Date(Date.now() + 60000)) {
  const athlete = await createTestAthlete("mobile-login", "Football", "RB");
  users.push(athlete.userId);
  const code = crypto.randomBytes(32).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  await testPrisma.mobileAuthCode.create({ data: { codeHash: sha256(code), userId: athlete.userId, challenge: sha256(verifier), expiresAt } });
  return { ...athlete, code, verifier };
}

test.afterAll(async () => {
  await testPrisma.mobileAuthCode.deleteMany({ where: { userId: { in: users } } });
  await cleanupE2eUsers();
  await testPrisma.$disconnect();
});

test("mobile configuration is public and memberships require authentication", async ({ request }) => {
  const config = await request.get("/api/mobile/config");
  expect(config.status()).toBe(200);
  expect(typeof (await config.json()).providers.apple).toBe("boolean");
  expect((await request.get("/api/mobile/membership")).status()).toBe(401);
  expect((await request.get("/api/auth/mobile/start?provider=google&challenge=invalid&state=invalid")).status()).toBe(400);
});

test("PKCE exchange rejects the wrong verifier, creates an HttpOnly session, and rejects replay", async ({ request }) => {
  const data = await ticket();
  const wrong = await request.post("/api/auth/mobile/exchange", { data: { code: data.code, verifier: "x".repeat(43) } });
  expect(wrong.status()).toBe(401);
  const correct = await request.post("/api/auth/mobile/exchange", { data: { code: data.code, verifier: data.verifier } });
  expect(correct.status()).toBe(200);
  expect(correct.headers()["set-cookie"]).toMatch(/menta_session=.*httponly/i);
  const me = await request.get("/api/auth/me");
  expect((await me.json()).user.id).toBe(data.userId);
  const replay = await request.post("/api/auth/mobile/exchange", { data: { code: data.code, verifier: data.verifier } });
  expect(replay.status()).toBe(401);
});

test("only one concurrent exchange succeeds and expired tickets cannot sign in", async ({ request }) => {
  const data = await ticket();
  const responses = await Promise.all([
    request.post("/api/auth/mobile/exchange", { data: { code: data.code, verifier: data.verifier } }),
    request.post("/api/auth/mobile/exchange", { data: { code: data.code, verifier: data.verifier } }),
  ]);
  expect(responses.map(response => response.status()).sort()).toEqual([200, 401]);
  const expired = await ticket(new Date(Date.now() - 1000));
  expect((await request.post("/api/auth/mobile/exchange", { data: { code: expired.code, verifier: expired.verifier } })).status()).toBe(401);
});
