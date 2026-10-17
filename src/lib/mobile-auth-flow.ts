import crypto from "node:crypto";

export const MOBILE_CALLBACK = "menta-ios://auth/callback";
export const MOBILE_FLOW_COOKIE = "menta_mobile_flow";
export type MobileFlow = { challenge: string; state: string; expiresAt: number };
export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("base64url");
export const validChallenge = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

export function signMobileFlow(flow: MobileFlow, secret: string): string {
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function readMobileFlow(value: string | undefined, secret: string, now = Date.now()): MobileFlow | null {
  if (!value || value.length > 2048) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const flow = JSON.parse(Buffer.from(payload, "base64url").toString()) as MobileFlow;
    if (!validChallenge(flow.challenge) || typeof flow.state !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(flow.state)
      || typeof flow.expiresAt !== "number" || flow.expiresAt <= now || flow.expiresAt > now + 10 * 60 * 1000) return null;
    return flow;
  } catch { return null; }
}
