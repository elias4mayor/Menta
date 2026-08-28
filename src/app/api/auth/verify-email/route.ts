import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { verifyEmailSchema } from "@/lib/validation";
import { consumeVerificationCode } from "@/lib/verification";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const limited = rateLimit(clientKey(request, "verify-email"), {
    limit: 15,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });
  if (dbUser?.emailVerified) {
    return NextResponse.json({ verified: true, alreadyVerified: true });
  }

  const result = await consumeVerificationCode(user.id, parsed.data.code);

  switch (result) {
    case "ok":
      await logAudit({ actorId: user.id, action: "auth.email_verified", targetType: "User", targetId: user.id });
      return NextResponse.json({ verified: true });
    case "invalid":
      return NextResponse.json({ error: "That code isn't correct. Try again." }, { status: 400 });
    case "expired":
      return NextResponse.json(
        { error: "That code has expired. Request a new one." },
        { status: 400 }
      );
    case "too_many_attempts":
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    case "none_pending":
      return NextResponse.json(
        { error: "No verification code is pending. Request a new one." },
        { status: 400 }
      );
  }
}
