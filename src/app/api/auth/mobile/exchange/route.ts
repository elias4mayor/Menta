import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sha256 } from "@/lib/mobile-auth-flow";
import { createSession } from "@/lib/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";

const input = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/), verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/) });
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, "mobile-auth-exchange"), { limit: 20, windowMs: 600000 }).allowed) {
    return NextResponse.json({ error: "Too many sign-in attempts." }, { status: 429 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 });
  const codeHash = sha256(parsed.data.code);
  const ticket = await prisma.mobileAuthCode.findUnique({ where: { codeHash } });
  if (!ticket || ticket.consumedAt || ticket.expiresAt <= new Date() || ticket.challenge !== sha256(parsed.data.verifier)) {
    return NextResponse.json({ error: "Sign-in expired. Please try again." }, { status: 401 });
  }
  const consumed = await prisma.mobileAuthCode.updateMany({ where: { codeHash, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return NextResponse.json({ error: "Sign-in already used." }, { status: 401 });
  await createSession(ticket.userId, request.headers.get("user-agent"));
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
