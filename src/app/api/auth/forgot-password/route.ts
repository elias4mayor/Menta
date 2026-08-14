import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "forgot-password"), {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  const genericResponse = NextResponse.json({
    message: "If that email has an account, a reset link has been sent.",
  });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return genericResponse;

  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your MENTA password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });

  await logAudit({ actorId: user.id, action: "auth.password_reset_requested" });

  return genericResponse;
}
