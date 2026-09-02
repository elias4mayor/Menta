import { test, expect } from "@playwright/test";
import { createTestUser, cleanupE2eUsers, testPrisma } from "./db-helpers";
import { MEMBERSHIP_TIERS } from "../src/lib/membership-config";

/**
 * Security/behavior coverage for Phase 7 (Subscriptions & entitlements).
 * Stripe is intentionally unconfigured in this dev/test environment (no
 * STRIPE_SECRET_KEY), so the checkout/portal tests assert the honest
 * "not connected" degraded state — the same pattern this repo already
 * uses for AI providers and RESEND_API_KEY — not a live Stripe round trip.
 * src/lib/entitlements.ts itself has no HTTP-reachable surface yet (it
 * isn't wired into any existing feature route in this pass — see the
 * Phase 7 report), so it isn't covered here; these tests exercise only
 * the new routes that are actually live.
 */
test.describe("Subscriptions & partnerships (Phase 7)", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("1. GET /api/subscriptions/me requires a session", async ({ request }) => {
    const res = await request.get("/api/subscriptions/me");
    expect(res.status()).toBe(401);
  });

  test("2. a signed-in user with no Subscription row defaults to ROOKIE", async ({ request }) => {
    const user = await createTestUser("sub-default", "ATHLETE");
    const res = await request.get("/api/subscriptions/me", { headers: { Cookie: user.cookie } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.planKey).toBe("ROOKIE");
    expect(body.status).toBe("ACTIVE");
  });

  test("3. POST /api/subscriptions/checkout requires a session", async ({ request }) => {
    const res = await request.post("/api/subscriptions/checkout", { data: { planKey: "MVP" } });
    expect(res.status()).toBe(401);
  });

  test("4. checkout rejects the free plan with a clear message, not a Stripe error", async ({ request }) => {
    const user = await createTestUser("sub-free", "ATHLETE");
    const res = await request.post("/api/subscriptions/checkout", {
      headers: { Cookie: user.cookie },
      data: { planKey: "ROOKIE" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("free");
  });

  test("5. checkout rejects Team/Organization plans as not self-serve", async ({ request }) => {
    const user = await createTestUser("sub-team", "ATHLETE");
    const res = await request.post("/api/subscriptions/checkout", {
      headers: { Cookie: user.cookie },
      data: { planKey: "TEAM" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("self-serve");
  });

  test("6. checkout on a real paid plan returns an honest 'billing not configured' state", async ({ request }) => {
    const user = await createTestUser("sub-mvp", "ATHLETE");
    const res = await request.post("/api/subscriptions/checkout", {
      headers: { Cookie: user.cookie },
      data: { planKey: "MVP" },
    });
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Stripe");
  });

  test("7. checkout rejects an unknown plan key", async ({ request }) => {
    const user = await createTestUser("sub-bogus", "ATHLETE");
    const res = await request.post("/api/subscriptions/checkout", {
      headers: { Cookie: user.cookie },
      data: { planKey: "NOT_A_REAL_PLAN" },
    });
    expect(res.status()).toBe(400);
  });

  test("8. POST /api/subscriptions/portal requires a session", async ({ request }) => {
    const res = await request.post("/api/subscriptions/portal");
    expect(res.status()).toBe(401);
  });

  test("9. portal returns an honest 'not connected' state when Stripe isn't configured", async ({ request }) => {
    const user = await createTestUser("sub-portal", "ATHLETE");
    const res = await request.post("/api/subscriptions/portal", { headers: { Cookie: user.cookie } });
    expect(res.status()).toBe(503);
  });

  test("9b. the webhook endpoint returns an honest 'not connected' state when Stripe isn't configured, no session required", async ({ request }) => {
    // Locks in that the pre-Stripe hardening pass didn't touch this guard
    // — a real Stripe-signed payload can't be constructed without live
    // credentials, so this is the one webhook path testable here without
    // them. The malformed-payload logging branches added in this pass are
    // verified by code inspection only (see the audit report), not by an
    // automated test — they're unreachable without a validly signed event.
    const res = await request.post("/api/subscriptions/webhook", { data: {} });
    expect(res.status()).toBe(503);
  });

  test("10. partnerships inquiry succeeds with valid input, requires no session", async ({ request }) => {
    const res = await request.post("/api/partnerships", {
      data: { name: "Coach Test", email: "coach@example.test", organization: "Test Academy", message: "Interested in Team." },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("11. partnerships inquiry rejects invalid input with a specific message", async ({ request }) => {
    const res = await request.post("/api/partnerships", {
      data: { name: "", email: "not-an-email", organization: "" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  test("12. the homepage teases all five membership tiers and links to /membership", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("Choose your level");
    expect(html).toContain("Rookie");
    expect(html).toContain("Underdog");
    expect(html).toContain("MVP");
    expect(html).toContain("Onyx");
    expect(html).toContain("MENTA Team");
    expect(html).toContain('href="/membership"');
  });

  test("13. /membership renders all five tiers with real prices from the migrated plan data, not placeholders", async ({ request }) => {
    const res = await request.get("/membership");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("Choose your level");
    // Only the initially-focal tier (Rookie) renders a *formatted* price
    // string in plain DOM — the other 4 are streamed to the client as
    // React Server Components JSON (escaped inside a <script> string
    // literal, so raw substring-matching its exact quoting is fragile and
    // an implementation detail this test shouldn't depend on). What's
    // reliably plain-text regardless of which tier is focal: every tier
    // name, and the honest "not priced yet" copy for ONYX.
    expect(html).toContain("Rookie");
    expect(html).toContain("$0");
    expect(html).toContain("Underdog");
    expect(html).toContain("MVP");
    expect(html).toContain("Onyx");
    expect(html).toContain("MENTA Team");

    // The actual "real prices, not placeholders" claim — verified against
    // the migrated DB data directly (same pattern as test 15), not by
    // parsing the page's internal serialization format.
    const underdog = await testPrisma.plan.findUniqueOrThrow({ where: { key: "UNDERDOG" } });
    const mvp = await testPrisma.plan.findUniqueOrThrow({ where: { key: "MVP" } });
    const onyx = await testPrisma.plan.findUniqueOrThrow({ where: { key: "ONYX" } });
    // Post-relaunch pricing: UNDERDOG is the cheaper entry tier, MVP the
    // pricier one — see prisma/migrate-underdog-mvp-swap.ts.
    expect(underdog.priceCents).toBe(999);
    expect(mvp.priceCents).toBe(1999);
    // ONYX is honestly unpriced pre-launch — never a fabricated number.
    expect(onyx.priceCents).toBeNull();
  });

  test("14. ONYX's benefit list never claims Film Intelligence as an individual-plan benefit", async ({ request }) => {
    // Was: assert the page's rendered HTML contains "(coming soon)" — that
    // string existed only because of ONYX's old "Advanced film
    // intelligence (coming soon)" bullet. That bullet was itself wrong on
    // two counts: Film Intelligence (analysis templates, scouting reports,
    // opponent tracking, cross-team film sharing) already ships today, and
    // it's team-scoped/permission-gated (MANAGE_ANALYSIS_TEMPLATES etc.),
    // never gated by any individual Plan — an individual ONYX subscription
    // couldn't grant it even if it wanted to. Fixing that changed the
    // premise this test's assertion depended on, not just its wording.
    // The property worth locking in is the specific regression this fix
    // prevents: ONYX's config should never re-claim film intelligence as
    // something buying it individually gets you (shipped or "coming
    // soon" — either framing would be wrong for the same reason). Checked
    // against the source config directly, same as test 13 above, since
    // SSR only ever renders the initially-focal tier's benefit text.
    const onyxBenefitText = MEMBERSHIP_TIERS.ONYX.benefits
      .map((b) => (b.kind === "static" ? b.text : b.key))
      .join(" ")
      .toLowerCase();
    expect(onyxBenefitText).not.toContain("film intelligence");

    // Sanity: the page itself still renders successfully after the fix.
    const res = await request.get("/membership");
    expect(res.status()).toBe(200);
  });

  test("15. the retired MENTA_PLUS/MENTA_PRO plans are inactive but their rows and entitlements are preserved", async () => {
    const plus = await testPrisma.plan.findUnique({ where: { key: "MENTA_PLUS" }, include: { entitlements: true } });
    const pro = await testPrisma.plan.findUnique({ where: { key: "MENTA_PRO" }, include: { entitlements: true } });
    expect(plus?.active).toBe(false);
    expect(pro?.active).toBe(false);
    expect(plus?.entitlements.length).toBeGreaterThan(0);
    expect(pro?.entitlements.length).toBeGreaterThan(0);
  });

  test("16. UNDERDOG's benefit list never claims team programming/LIVE as an individual-plan benefit", async () => {
    // Regression coverage for the pre-Stripe cleanup pass: since the
    // team-scope authorization fix, TRAINING_PROGRAMS/LIVE_SESSIONS
    // resolve only from a team's own MENTA TEAM subscription — an
    // individual UNDERDOG plan's own PlanEntitlement value for either key
    // is never read by any runtime code path (see hasTeamEntitlement in
    // src/lib/entitlements.ts). The old UNDERDOG benefit bullet
    // ("Training programs & MENTA LIVE") predated that fix and became a
    // false claim the moment it shipped; this locks in that it stays gone.
    const underdogBenefitText = MEMBERSHIP_TIERS.UNDERDOG.benefits
      .map((b) => (b.kind === "static" ? b.text : b.key))
      .join(" ")
      .toLowerCase();
    expect(underdogBenefitText).not.toContain("training programs");
    expect(underdogBenefitText).not.toContain("menta live");
  });

  test("17. checkout/portal return-URL construction always has an APP_URL fallback, never a bare interpolation", async () => {
    // Regression guard for the pre-Stripe hardening pass: a missing
    // APP_URL used to silently produce a URL beginning with the literal
    // string "undefined", which Stripe's Checkout/Portal Session APIs
    // reject. That call only ever happens once Stripe is actually
    // configured, which this environment deliberately never is — so
    // rather than a live HTTP test, this asserts the invariant directly
    // against source: every process.env.APP_URL reference in these two
    // routes must be paired with the same `|| "http://localhost:3000"`
    // fallback already used elsewhere in this codebase (src/lib/oauth.ts,
    // the Google Classroom integration routes), never bare.
    const fs = await import("fs");
    const path = await import("path");
    for (const file of [
      "src/app/api/subscriptions/checkout/route.ts",
      "src/app/api/subscriptions/portal/route.ts",
    ]) {
      const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
      const bareInterpolation = /\$\{process\.env\.APP_URL\}/;
      expect(source).not.toMatch(bareInterpolation);
      expect(source).toContain('process.env.APP_URL || "http://localhost:3000"');
    }
  });
});
