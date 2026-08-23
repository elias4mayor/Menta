import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { signupSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { issueVerificationCode } from "@/lib/verification";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "signup"), {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password, role, dateOfBirth } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    },
  });

  await createSession(user.id, request.headers.get("user-agent"));
  await logAudit({ actorId: user.id, action: "auth.signup", targetType: "User", targetId: user.id });
  const { sent } = await issueVerificationCode(user.id, user.email);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    emailSent: sent,
  });
}
