import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.userId === user.id) {
    return NextResponse.json({ error: "Can't block yourself." }, { status: 400 });
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.userId } },
    create: { blockerId: user.id, blockedId: parsed.data.userId },
    update: {},
  });

  await logAudit({ actorId: user.id, action: "safety.user_blocked", targetType: "User", targetId: parsed.data.userId });

  return NextResponse.json({ ok: true });
}
