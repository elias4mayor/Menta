import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import {
  exchangeClassroomCode,
  fetchGoogleIdentity,
  syncClassroomForUser,
  CLASSROOM_STATE_COOKIE,
} from "@/lib/integrations/google-classroom";

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function redirectTo(status: string, extra?: Record<string, string>): NextResponse {
  const url = new URL("/school", appUrl());
  url.searchParams.set("classroom", status);
  for (const [k, v] of Object.entries(extra ?? {})) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", appUrl()));

  const { searchParams } = new URL(request.url);
  const store = await cookies();
  const expectedState = store.get(CLASSROOM_STATE_COOKIE)?.value;
  store.delete(CLASSROOM_STATE_COOKIE);

  // The athlete declined Google's consent screen — not an error, just a "no".
  if (searchParams.get("error")) {
    return redirectTo("denied");
  }

  const state = searchParams.get("state");
  if (!state || !expectedState || state !== expectedState) {
    return redirectTo("error", { reason: "state_mismatch" });
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectTo("error", { reason: "missing_code" });
  }

  let tokens;
  try {
    tokens = await exchangeClassroomCode(code);
  } catch {
    return redirectTo("error", { reason: "exchange_failed" });
  }

  let identity;
  try {
    identity = await fetchGoogleIdentity(tokens.access_token);
  } catch {
    return redirectTo("error", { reason: "identity_failed" });
  }

  const existing = await prisma.googleClassroomIntegration.findUnique({ where: { userId: user.id } });

  await prisma.googleClassroomIntegration.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      googleUserId: identity.sub,
      googleEmail: identity.email ?? "",
      accessTokenEnc: encryptSecret(tokens.access_token),
      // Google only issues a refresh_token when we forced prompt=consent
      // (which connect/route.ts always does), so this should always be
      // present on a fresh connect — but never overwrite a working one
      // with null if Google ever omits it on a re-consent.
      refreshTokenEnc: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : (existing?.refreshTokenEnc ?? null),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope ?? null,
      status: "CONNECTED",
    },
    update: {
      googleUserId: identity.sub,
      googleEmail: identity.email ?? "",
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : (existing?.refreshTokenEnc ?? null),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope ?? null,
      status: "CONNECTED",
    },
  });

  await logAudit({ actorId: user.id, action: "integration.google_classroom.connected", targetType: "GoogleClassroomIntegration" });

  // Best-effort first sync so the athlete sees their classes immediately —
  // a failure here doesn't undo the connection; they can hit Sync Now.
  try {
    await syncClassroomForUser(user.id);
    return redirectTo("connected");
  } catch (err) {
    console.error("[google-classroom] initial sync after connect failed", err);
    return redirectTo("connected", { syncError: "1" });
  }
}
