import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readMobileFlow, sha256, signMobileFlow, validChallenge, MOBILE_CALLBACK } from "../src/lib/mobile-auth-flow";

const now = 1792100000000;
const secret = "test-only-secret-not-used-in-production";
const flow = { challenge: sha256("test-verifier"), state: "a".repeat(43), expiresAt: now + 60000 };

test("valid signed mobile flow round-trips", () => {
  assert.deepEqual(readMobileFlow(signMobileFlow(flow, secret), secret, now), flow);
});
test("modified challenge is rejected even with the original signature", () => {
  const token = signMobileFlow(flow, secret);
  const signature = token.split(".")[1];
  const changed = Buffer.from(JSON.stringify({ ...flow, challenge: "b".repeat(43) })).toString("base64url");
  assert.equal(readMobileFlow(`${changed}.${signature}`, secret, now), null);
});
test("a different signing secret is rejected", () => {
  assert.equal(readMobileFlow(signMobileFlow(flow, secret), "different-secret", now), null);
});
test("expired flows and unbounded future flows are rejected", () => {
  assert.equal(readMobileFlow(signMobileFlow({ ...flow, expiresAt: now }, secret), secret, now), null);
  assert.equal(readMobileFlow(signMobileFlow({ ...flow, expiresAt: now + 600001 }, secret), secret, now), null);
});
test("malformed state, extra segments, and oversized inputs are rejected", () => {
  for (const value of [undefined, "", "a", "a.b.c", "x".repeat(2049), signMobileFlow({ ...flow, state: "short" }, secret)]) {
    assert.equal(readMobileFlow(value, secret, now), null);
  }
});
test("PKCE digest is a valid base64url SHA-256 challenge", () => {
  assert.equal(sha256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.equal(validChallenge("x".repeat(43)), true);
  assert.equal(validChallenge("x".repeat(42)), false);
  assert.equal(validChallenge("/".repeat(43)), false);
});
test("callback target is fixed and never supplied by a request", () => {
  assert.equal(MOBILE_CALLBACK, "menta-ios://auth/callback");
});
