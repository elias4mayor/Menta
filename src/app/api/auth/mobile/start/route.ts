import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isOAuthConfigured } from "@/lib/oauth";
import { MOBILE_FLOW_COOKIE, signMobileFlow, validChallenge } from "@/lib/mobile-auth-flow";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const challenge = url.searchParams.get("challenge") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if ((provider !== "google" && provider !== "apple") || !validChallenge(challenge) || !/^[A-Za-z0-9_-]{32,128}$/.test(state)) {
    return NextResponse.json({ error: "Invalid mobile sign-in request." }, { status: 400 });
  }
  if (!rateLimit(clientKey(request, "mobile-auth-start"), { limit: 20, windowMs: 600000 }).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts." }, { status: 429 });
  }
  if (!process.env.SESSION_SECRET || !isOAuthConfigured(provider)) {
    return NextResponse.json({ error: "This sign-in provider is not configured yet." }, { status: 503 });
  }
  await prisma.mobileAuthCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  (await cookies()).set(MOBILE_FLOW_COOKIE, signMobileFlow({ challenge, state, expiresAt: Date.now() + 600000 }, process.env.SESSION_SECRET), {
    httpOnly: true, secure: true, sameSite: provider === "apple" ? "none" : "lax", path: "/", maxAge: 600,
  });
  return NextResponse.redirect(new URL(`/api/auth/oauth/${provider}`, request.url));
}
