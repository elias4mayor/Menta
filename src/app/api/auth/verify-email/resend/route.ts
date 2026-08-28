import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { issueVerificationCode } from "@/lib/verification";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const RESEND_COOLDOWN_MS = 45 * 1000;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Broad per-IP abuse cap, same shape as every other auth endpoint...
  const ipLimited = rateLimit(clientKey(request, "verify-email-resend"), {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // ...plus a short per-user cooldown so the UI's countdown is authoritative,
  // not just a client-side timer the user could bypass by re-clicking.
  const cooldownLimited = rateLimit(`verify-email-resend-user:${user.id}`, {
    limit: 1,
    windowMs: RESEND_COOLDOWN_MS,
  });
  if (!cooldownLimited.allowed) {
    return NextResponse.json(
      {
        error: "Please wait before requesting another code.",
        retryAfterMs: cooldownLimited.retryAfterMs,
      },
      { status: 429 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, emailVerified: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (dbUser.emailVerified) {
    return NextResponse.json({ verified: true, alreadyVerified: true });
  }

  const { sent } = await issueVerificationCode(user.id, dbUser.email);
  await logAudit({ actorId: user.id, action: "auth.email_verification_resent", targetType: "User", targetId: user.id });

  return NextResponse.json({ sent, cooldownMs: RESEND_COOLDOWN_MS });
}
