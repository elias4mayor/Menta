import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep this in sync with SESSION_COOKIE in src/lib/session.ts. Duplicated
// (rather than imported) so this file stays free of the Prisma/DB module
// graph that session.ts pulls in.
const SESSION_COOKIE = "menta_session";

/**
 * Optimistic route protection only (per Next.js guidance, Proxy shouldn't do
 * slow data fetching like a DB lookup) — it just checks whether a session
 * cookie is present and redirects accordingly. The real authorization check
 * happens server-side in each page/route via requireUser()/getSessionUser(),
 * which validates the session against the database. This layer exists to
 * avoid flashing protected UI before that check runs, nothing more.
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
  "/performance",
  "/recovery",
  "/mind",
  "/school",
  "/recruit",
  "/safety",
];

const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
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
    "/performance/:path*",
    "/recovery/:path*",
    "/mind/:path*",
    "/school/:path*",
    "/recruit/:path*",
    "/safety/:path*",
    "/login",
    "/signup",
  ],
};
