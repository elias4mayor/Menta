import "server-only";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

/**
 * Real Google/Facebook OAuth — architecturally complete, gated behind
 * env vars exactly like MENTA AI (ANTHROPIC_API_KEY) and email
 * (RESEND_API_KEY): when the client id/secret aren't set, the login/signup
 * buttons redirect back with an honest "not configured" message instead of
 * pretending to sign the user in. See .env.example.
 */
export type OAuthProviderId = "google" | "facebook" | "apple";

export const OAUTH_PROVIDERS: OAuthProviderId[] = ["google", "facebook", "apple"];
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
};

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function config(provider: OAuthProviderId): ProviderConfig {
  if (provider === "apple") return {
    authorizeUrl: "https://appleid.apple.com/auth/authorize", tokenUrl: "https://appleid.apple.com/auth/token",
    profileUrl: "", scope: "name email", clientId: process.env.APPLE_CLIENT_ID,
  };
  if (provider === "google") {
    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_LOGIN_CLIENT_ID,
      clientSecret: process.env.GOOGLE_LOGIN_CLIENT_SECRET,
    };
  }
  return {
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me?fields=id,name,email",
    scope: "email public_profile",
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  };
}

export function isOAuthConfigured(provider: OAuthProviderId): boolean {
  if (provider === "apple") return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
  const c = config(provider);
  return Boolean(c.clientId && c.clientSecret);
}

export function redirectUri(provider: OAuthProviderId): string {
  return `${appUrl()}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: OAuthProviderId, state: string): string {
  const c = config(provider);
  const params = new URLSearchParams({
    client_id: c.clientId ?? "",
    redirect_uri: redirectUri(provider),
    response_type: "code",
    scope: c.scope,
    state,
  });
  if (provider === "apple") { params.set("response_mode", "form_post"); params.set("nonce", state); }
  return `${c.authorizeUrl}?${params.toString()}`;
}

export type OAuthProfile = { providerId: string; email: string | null; name: string | null };

export async function exchangeCodeForProfile(
  provider: OAuthProviderId,
  code: string,
  expectedNonce?: string
): Promise<OAuthProfile> {
  const c = config(provider);
  let clientSecret = c.clientSecret ?? "";
  if (provider === "apple") {
    const key = await importPKCS8((process.env.APPLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"), "ES256");
    clientSecret = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
      .setIssuer(process.env.APPLE_TEAM_ID!).setAudience("https://appleid.apple.com").setSubject(c.clientId!)
      .setIssuedAt().setExpirationTime("5m").sign(key);
  }
  const tokenParams = new URLSearchParams({
    client_id: c.clientId ?? "",
    client_secret: clientSecret,
    redirect_uri: redirectUri(provider),
    code,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: tokenParams.toString(),
  });
  if (!tokenRes.ok) throw new Error("oauth_token_exchange_failed");
  const tokenBody: { access_token?: string; id_token?: string } = await tokenRes.json();
  if (provider === "apple") {
    if (!tokenBody.id_token || !expectedNonce) throw new Error("apple_identity_missing");
    const { payload } = await jwtVerify(tokenBody.id_token, appleKeys, {
      algorithms: ["RS256"], issuer: "https://appleid.apple.com", audience: c.clientId,
    });
    if (!payload.sub || payload.nonce !== expectedNonce || !(payload.email_verified === true || payload.email_verified === "true")) throw new Error("apple_identity_invalid");
    return { providerId: payload.sub, email: typeof payload.email === "string" ? payload.email : null, name: null };
  }
  if (!tokenBody.access_token) throw new Error("oauth_token_exchange_failed");

  const profileRes = await fetch(c.profileUrl, {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (!profileRes.ok) throw new Error("oauth_profile_fetch_failed");
  const profile: Record<string, unknown> = await profileRes.json();

  if (provider === "google") {
    if (!profile.sub || profile.email_verified !== true) throw new Error("google_email_not_verified");
    return {
      providerId: String(profile.sub ?? ""),
      email: typeof profile.email === "string" ? profile.email : null,
      name: typeof profile.name === "string" ? profile.name : null,
    };
  }
  return {
    providerId: String(profile.id ?? ""),
    email: typeof profile.email === "string" ? profile.email : null,
    name: typeof profile.name === "string" ? profile.name : null,
  };
}
