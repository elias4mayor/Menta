import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Keep this in sync with SESSION_COOKIE in src/lib/session.ts. Duplicated
// (rather than imported) so this file doesn't pull in session.ts's
// next/headers dependency (cookies() there is request-scoped via
// AsyncLocalStorage and isn't the right API here — Proxy gets its own
// request/response cookie access instead).
const SESSION_COOKIE = "menta_session";

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

/**
 * Proxy (Next.js 16's renamed, now Node.js-runtime-by-default middleware —
 * see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
 * validates the session against the database, the same check
 * getSessionUser() does in src/lib/session.ts. It used to just check cookie
 * *presence*, on the old Edge-runtime assumption that a DB round trip here
 * was too slow/unsupported. That's no longer true (Proxy defaults to
 * Node.js), and the cheap check had a real bug: a stale cookie (session
 * revoked, expired, or its row gone after a `prisma migrate reset`) reads
 * as "has session" here while getSessionUser() correctly says "no session"
 * server-side — so a protected page's requireUser() redirects to /login,
 * this file's old "hasSession -> bounce /login to /dashboard" rule sends it
 * straight back, and the browser ping-pongs between the two indefinitely
 * (Chrome's "Throttling navigation to prevent the browser from hanging").
 * Validating for real here, and clearing the cookie the moment it's found
 * invalid, removes the mismatch at its source instead of racing it.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/profile",
  "/team",
  "/messages",
  "/calendar",
  "/ai-coach",
  "/settings",
  "/train",
  "/film",
  "/highlights",
  "/performance",
  "/recovery",
  "/mind",
  "/school",
  "/recruit",
  "/safety",
  "/notifications",
  "/care",
];

const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let hasValidSession = false;
  let emailVerified = false;
  let onboardingCompleted = false;
  if (token) {
    const tokenHash = hashToken(token);
    const session = tokenHash
      ? await prisma.session.findUnique({
          where: { tokenHash },
          select: {
            revokedAt: true,
            expiresAt: true,
            user: {
              select: {
                emailVerified: true,
                role: true,
                athleteProfile: { select: { onboardingCompletedAt: true } },
                coachProfile: { select: { onboardingCompletedAt: true } },
                trainerProfile: { select: { onboardingCompletedAt: true } },
                parentProfile: { select: { onboardingCompletedAt: true } },
                doctorProfile: { select: { onboardingCompletedAt: true } },
              },
            },
          },
        })
      : null;
    hasValidSession = Boolean(session && !session.revokedAt && session.expiresAt > new Date());
    emailVerified = Boolean(session?.user.emailVerified);
    // Each role has exactly one matching profile relation — that profile's
    // onboardingCompletedAt (set by the matching /api/onboarding/* route)
    // is the real, durable "has this user finished onboarding" signal, not
    // just a one-time redirect decided at signup time.
    const user = session?.user;
    if (user) {
      onboardingCompleted = Boolean(
        user.role === "COACH"
          ? user.coachProfile?.onboardingCompletedAt
          : user.role === "TRAINER"
            ? user.trainerProfile?.onboardingCompletedAt
            : user.role === "PARENT"
              ? user.parentProfile?.onboardingCompletedAt
              : user.role === "DOCTOR"
                ? user.doctorProfile?.onboardingCompletedAt
                : user.athleteProfile?.onboardingCompletedAt
      );
    }
  }

  // The cookie is present but doesn't correspond to a real, active session
  // (or SESSION_SECRET was missing so it couldn't even be checked) — clear
  // it on whatever response we're about to send, so the *next* request
  // reads "no session" here too and stops bouncing.
  const staleCookie = Boolean(token) && !hasValidSession;

  function withStaleCookieCleared(response: NextResponse) {
    if (staleCookie) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasValidSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return withStaleCookieCleared(NextResponse.redirect(url));
  }

  // A real, logged-in session that hasn't verified its email yet cannot
  // reach any protected route until it does — /verify-email is itself
  // excluded from PROTECTED_PREFIXES so this doesn't loop.
  if (
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    hasValidSession &&
    !emailVerified
  ) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // A verified session that hasn't finished onboarding yet gets sent there
  // instead of into the rest of the app — this is the actual, durable gate
  // that was missing: signup/OAuth only decided this once at redirect time,
  // so a user landing on /dashboard straight out of email verification (or
  // typing any protected URL directly) skipped onboarding entirely.
  // /onboarding is excluded from this check the same way /verify-email is
  // excluded from the check above it, so this can't loop.
  if (
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith("/onboarding") &&
    hasValidSession &&
    emailVerified &&
    !onboardingCompleted
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // The mirror image of the rule above: an athlete/coach/etc. who already
  // finished onboarding shouldn't be dropped back into the multi-step
  // wizard just because they navigated (or were bookmarked/linked) back to
  // /onboarding — send them to their real dashboard instead. Can't loop
  // with the rule above since onboardingCompleted is never true and false
  // at once.
  if (pathname.startsWith("/onboarding") && hasValidSession && emailVerified && onboardingCompleted) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && hasValidSession) {
    const dest = !emailVerified ? "/verify-email" : !onboardingCompleted ? "/onboarding" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname.startsWith("/verify-email")) {
    if (!hasValidSession) {
      return withStaleCookieCleared(NextResponse.redirect(new URL("/login", request.url)));
    }
    if (emailVerified) {
      return NextResponse.redirect(new URL(onboardingCompleted ? "/dashboard" : "/onboarding", request.url));
    }
  }

  return withStaleCookieCleared(NextResponse.next());
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/team/:path*",
    "/messages/:path*",
    "/calendar/:path*",
    "/ai-coach/:path*",
    "/settings/:path*",
    "/train/:path*",
    "/film/:path*",
    "/highlights/:path*",
    "/performance/:path*",
    "/recovery/:path*",
    "/mind/:path*",
    "/school/:path*",
    "/recruit/:path*",
    "/safety/:path*",
    "/notifications/:path*",
    "/care/:path*",
    "/login",
    "/signup",
    "/verify-email",
  ],
};
