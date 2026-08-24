import "server-only";

/**
 * In-memory fixed-window rate limiter. Good enough for a single Next.js
 * instance; resets on redeploy and doesn't coordinate across instances.
 * REQUIRES INFRASTRUCTURE UPGRADE before multi-instance production: swap
 * this for a shared store (e.g. Redis / Upstash) keyed the same way.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  // The permanent Playwright suite (e2e/) creates real accounts through the
  // real signup/login endpoints, all from one machine — clientKey() has no
  // way to tell those apart from a real attacker hammering the same route,
  // so without this they'd blow through the same-IP limits the moment the
  // suite runs more than a handful of signups. Only ever set by
  // playwright.config.ts's webServer env, never in a normal dev or
  // production start.
  if (process.env.MENTA_E2E_DISABLE_RATE_LIMIT === "1") {
    return { allowed: true, retryAfterMs: 0 };
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}
