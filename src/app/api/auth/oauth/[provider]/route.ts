import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { OAUTH_PROVIDERS, isOAuthConfigured, buildAuthorizeUrl, type OAuthProviderId } from "@/lib/oauth";

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

  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(`oauth_state_${p}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthorizeUrl(p, state));
}
