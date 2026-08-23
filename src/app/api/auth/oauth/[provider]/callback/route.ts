import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import {
  OAUTH_PROVIDERS,
  isOAuthConfigured,
  exchangeCodeForProfile,
  type OAuthProviderId,
} from "@/lib/oauth";

const ID_FIELD: Record<OAuthProviderId, "googleId" | "facebookId"> = {
  google: "googleId",
  facebook: "facebookId",
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
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const stateCookieName = `oauth_state_${p}`;
  const expectedState = store.get(stateCookieName)?.value;
  store.delete(stateCookieName);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/login?oauthError=invalid_state&provider=${p}`);
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(p, code);
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
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { [idField]: profile.providerId, emailVerified: existingByEmail.emailVerified ?? new Date() },
      });
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

  return NextResponse.redirect(`${origin}${isNewUser ? "/onboarding" : "/dashboard"}`);
}
