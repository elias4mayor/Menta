import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SchoolInstance } from "./config";
import { schoolCallback } from "./config";
import { schoolFetch } from "./http";
export function authorizeSchool(c: SchoolInstance, state: string, verifier: string) {
  const u = new URL(c.provider === "canvas" ? "/login/oauth2/auth" : "/learn/api/public/v1/oauth2/authorizationcode", c.baseUrl);
  u.search = new URLSearchParams({ client_id: c.clientId, redirect_uri: schoolCallback(c.id), response_type: "code", state,
    ...(c.provider === "canvas" ? { scope: "url:GET|/api/v1/courses url:GET|/api/v1/courses/:course_id/assignments" } : { scope: "read offline", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }) }).toString();
  return u;
}
export async function schoolTokens(c: SchoolInstance, grant: { code: string; code_verifier?: string } | { refresh_token: string }) {
  const body = new URLSearchParams({ grant_type: "code" in grant ? "authorization_code" : "refresh_token", redirect_uri: schoolCallback(c.id), ...grant });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (c.provider === "canvas") { body.set("client_id", c.clientId); body.set("client_secret", c.clientSecret); }
  else headers.Authorization = `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`;
  const { data } = await schoolFetch(new URL(c.provider === "canvas" ? "/login/oauth2/token" : "/learn/api/public/v1/oauth2/token", c.baseUrl), { method: "POST", body, headers });
  return z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), expires_in: z.number().positive().optional() }).parse(data);
}
