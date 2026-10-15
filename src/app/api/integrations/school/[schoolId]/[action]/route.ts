import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { schoolInstance, schoolCallback } from "@/lib/school/config";
import { authorizeSchool, schoolTokens } from "@/lib/school/oauth";
import { readSchool } from "@/lib/school/adapters";
import { SchoolHttpError } from "@/lib/school/http";
import { rateLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
const location = (status: string) => NextResponse.redirect(new URL(`/school?schoolConnection=${status}`, process.env.APP_URL || "http://localhost:3000"));
type Context = { params: Promise<{ schoolId: string; action: string }> };

export async function GET(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return location("sign_in_required");
  const { schoolId, action } = await params;
  if (action !== "connect" && action !== "callback") return new Response(null, { status: 405 });
  try {
    const config = schoolInstance(schoolId);
    const store = await cookies();
    const cookie = `school_oauth_${schoolId}`;
    if (action === "connect") {
      const nonce = randomBytes(32).toString("hex");
      const verifier = randomBytes(32).toString("base64url");
      store.set(cookie, encryptSecret(JSON.stringify({ nonce, verifier, userId: user.id, schoolId, expires: Date.now() + 600000 })), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: new URL(schoolCallback(schoolId)).pathname, maxAge: 600 });
      return NextResponse.redirect(authorizeSchool(config, nonce, verifier));
    }
    const encrypted = store.get(cookie)?.value;
    store.set(cookie, "", { path: new URL(schoolCallback(schoolId)).pathname, maxAge: 0 });
    const query = new URL(request.url).searchParams;
    if (!encrypted) return location("invalid_state");
    const state = JSON.parse(decryptSecret(encrypted));
    if (state.userId !== user.id || state.schoolId !== schoolId || state.expires < Date.now() || state.nonce !== query.get("state")) return location("invalid_state");
    if (query.has("error")) return location("declined");
    const code = query.get("code");
    if (!code) return location("missing_code");
    const tokens = await schoolTokens(config, { code, ...(config.provider === "blackboard" ? { code_verifier: state.verifier } : {}) });
    // A successful delegated read verifies the token before replacing a connection.
    const snapshot = await readSchool(config, tokens.access_token);
    const data = { provider: config.provider, accessTokenEnc: encryptSecret(tokens.access_token), refreshTokenEnc: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, snapshot, lastSyncedAt: new Date(), status: "CONNECTED" };
    await prisma.schoolConnection.upsert({ where: { userId_schoolId: { userId: user.id, schoolId } }, create: { userId: user.id, schoolId, ...data }, update: data });
    return location("connected");
  } catch { return location("connection_failed"); } // Never reflect provider errors, URLs, codes, or secrets.
}

export async function POST(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const origin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
  if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Request origin not allowed." }, { status: 403 });
  const { schoolId, action } = await params;
  if (action !== "sync" && action !== "disconnect") return new Response(null, { status: 405 });
  if (!rateLimit(`school:${user.id}:${action}`, { limit: 5, windowMs: 300000 }).allowed) return NextResponse.json({ error: "Try again in a few minutes." }, { status: 429 });
  const where = { userId: user.id, schoolId };
  if (action === "disconnect") {
    await prisma.schoolConnection.deleteMany({ where });
    return NextResponse.json({ success: true }); // Deletes tokens and cached grades; provider consent can be revoked separately.
  }
  const connection = await prisma.schoolConnection.findFirst({ where });
  if (!connection) return NextResponse.json({ error: "School is not connected." }, { status: 404 });
  try {
    const config = schoolInstance(schoolId);
    if (config.provider !== connection.provider) throw new Error("school_config_changed");
    let token = decryptSecret(connection.accessTokenEnc);
    if (connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60000) {
      if (!connection.refreshTokenEnc) throw new SchoolHttpError(401);
      const refreshed = await schoolTokens(config, { refresh_token: decryptSecret(connection.refreshTokenEnc) });
      token = refreshed.access_token;
      const updated = await prisma.schoolConnection.updateMany({ where: { ...where, id: connection.id }, data: { accessTokenEnc: encryptSecret(token), refreshTokenEnc: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : connection.refreshTokenEnc, expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null } });
      if (!updated.count) return NextResponse.json({ error: "Connection was removed." }, { status: 409 });
    }
    const snapshot = await readSchool(config, token);
    const saved = await prisma.schoolConnection.updateMany({ where: { ...where, id: connection.id }, data: { snapshot, lastSyncedAt: new Date(), status: "CONNECTED" } });
    if (!saved.count) return NextResponse.json({ error: "Connection was removed." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const reauth = error instanceof SchoolHttpError && error.status === 401;
    await prisma.schoolConnection.updateMany({ where: { ...where, id: connection.id }, data: { status: reauth ? "REAUTH_REQUIRED" : "SYNC_ERROR" } });
    return NextResponse.json({ error: reauth ? "Reconnect your school to renew access." : "Sync failed. Your previous data is unchanged. Your school may need to approve access." }, { status: reauth ? 401 : 502 });
  }
}
