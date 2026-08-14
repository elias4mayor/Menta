import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "login"), {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const genericError = NextResponse.json(
    { error: "Incorrect email or password." },
    { status: 401 }
  );

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await logAudit({ action: "auth.login_failed", metadata: { email } });
    return genericError;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logAudit({ actorId: user.id, action: "auth.login_failed" });
    return genericError;
  }

  await createSession(user.id, request.headers.get("user-agent"));
  await logAudit({ actorId: user.id, action: "auth.login" });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
