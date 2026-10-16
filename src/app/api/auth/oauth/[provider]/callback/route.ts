import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, destroyAllSessions } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import crypto from "node:crypto";
import { MOBILE_CALLBACK, MOBILE_FLOW_COOKIE, readMobileFlow, sha256 } from "@/lib/mobile-auth-flow";
import {
  OAUTH_PROVIDERS,
  isOAuthConfigured,
  exchangeCodeForProfile,
  type OAuthProviderId,
} from "@/lib/oauth";

const ID_FIELD: Record<OAuthProviderId, "googleId" | "facebookId" | "appleId"> = {
  google: "googleId",
  facebook: "facebookId",
  apple: "appleId",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;

  if (!OAUTH_PROVIDERS.includes(provider as OAuthProviderId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const p = provider as OAuthProviderId;

  if (!isOAuthConfigured(p)) {
    return NextResponse.redirect(`${origin}/login?oauthError=not_configured&provider=${p}`);
  }

  const url = new URL(request.url);
  const form = request.method === "POST" ? await request.formData().catch(() => null) : null;
  const code = form ? String(form.get("code") ?? "") : url.searchParams.get("code");
  const state = form ? String(form.get("state") ?? "") : url.searchParams.get("state");

  const store = await cookies();
  const stateCookieName = `oauth_state_${p}`;
  const expectedState = store.get(stateCookieName)?.value;
  store.delete(stateCookieName);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/login?oauthError=invalid_state&provider=${p}`);
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(p, code, expectedState);
  } catch {
    return NextResponse.redirect(`${origin}/login?oauthError=exchange_failed&provider=${p}`);
  }

  if (!profile.email) {
    return NextResponse.redirect(`${origin}/login?oauthError=no_email&provider=${p}`);
  }

  const idField = ID_FIELD[p];
  let user = await prisma.user.findFirst({ where: { [idField]: profile.providerId } });
  let isNewUser = false;

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      // The OAuth provider already verified this email address, so linking
      // it here is as good a verification signal as our own code flow —
      // don't leave a pre-existing unverified account stuck behind
      // /verify-email just because it's now also linked to a provider.
      //
      // But: signup creates a usable session before email verification, so
      // an attacker can pre-register the victim's email with a password
      // they control and simply never verify it — a known "pre-hijacking"
      // pattern. If this account has a password that was never proven to
      // belong to anyone (emailVerified was never set), we can't trust it
      // just because it happens to share this email. This OAuth login is
      // the first real ownership proof the account has had, so invalidate
      // that unproven password and kick out any existing sessions rather
      // than silently handing control of the account to whoever set it.
      const hadUnverifiedPassword = Boolean(existingByEmail.passwordHash) && !existingByEmail.emailVerified;

      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          [idField]: profile.providerId,
          emailVerified: existingByEmail.emailVerified ?? new Date(),
          ...(hadUnverifiedPassword ? { passwordHash: null } : {}),
        },
      });

      if (hadUnverifiedPassword) {
        await destroyAllSessions(existingByEmail.id);
        await logAudit({
          actorId: user.id,
          action: "auth.oauth_link_invalidated_unverified_password",
          targetType: "User",
          targetId: user.id,
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? profile.email.split("@")[0],
          role: "ATHLETE",
          [idField]: profile.providerId,
          emailVerified: new Date(),
        },
      });
      isNewUser = true;
    }
  }

  await createSession(user.id, request.headers.get("user-agent"));
  await logAudit({ actorId: user.id, action: `auth.oauth_login_${p}` });

  const mobileFlow = process.env.SESSION_SECRET ? readMobileFlow(store.get(MOBILE_FLOW_COOKIE)?.value, process.env.SESSION_SECRET) : null;
  store.delete(MOBILE_FLOW_COOKIE);
  if (mobileFlow) {
    const handoffCode = crypto.randomBytes(32).toString("base64url");
    await prisma.mobileAuthCode.create({ data: {
      codeHash: sha256(handoffCode), userId: user.id, challenge: mobileFlow.challenge, expiresAt: new Date(Date.now() + 60000),
    } });
    const callback = new URL(MOBILE_CALLBACK);
    callback.searchParams.set("code", handoffCode);
    callback.searchParams.set("state", mobileFlow.state);
    return NextResponse.redirect(callback, 303);
  }

  return NextResponse.redirect(`${origin}${isNewUser ? "/onboarding" : "/dashboard"}`);
}

export const POST = GET;
