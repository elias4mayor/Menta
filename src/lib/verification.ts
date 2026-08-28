import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashOpaqueToken } from "@/lib/session";
import { sendEmail } from "@/lib/email";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // crypto.randomInt is uniform over [0, 1_000_000), unlike Math.random().
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Creates a fresh 6-digit code for userId, invalidates any still-pending
 * codes for that user (so only the latest one can ever verify), and sends
 * it through the existing sendEmail() — which itself honestly falls back
 * to a console log (not a fake "sent" result) when RESEND_API_KEY isn't
 * configured. Callers should surface `sent: false` to the caller/dev, not
 * hide it.
 */
export async function issueVerificationCode(
  userId: string,
  email: string
): Promise<{ sent: boolean }> {
  const code = generateCode();

  await prisma.$transaction([
    prisma.emailVerificationCode.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash: hashOpaqueToken(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  const result = await sendEmail({
    to: email,
    subject: "Your MENTA verification code",
    text: `Your MENTA verification code is ${code}.\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  });

  return { sent: result.sent };
}

export type VerifyCodeResult =
  | "ok"
  | "invalid"
  | "expired"
  | "too_many_attempts"
  | "none_pending";

function timingSafeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function consumeVerificationCode(
  userId: string,
  submittedCode: string
): Promise<VerifyCodeResult> {
  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return "none_pending";
  if (record.expiresAt < new Date()) return "expired";
  if (record.attempts >= MAX_ATTEMPTS) return "too_many_attempts";

  const submittedHash = hashOpaqueToken(submittedCode);
  if (!timingSafeHashEqual(submittedHash, record.codeHash)) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return "invalid";
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return "ok";
}
