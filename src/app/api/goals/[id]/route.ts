import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateGoalSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { targetDate, ...rest } = parsed.data;

  const result = await prisma.goal.updateMany({
    where: { id, userId: user.id },
    data: {
      ...rest,
      ...(targetDate !== undefined
        ? { targetDate: targetDate ? new Date(targetDate) : null }
        : {}),
    },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "goal.updated", targetType: "Goal", targetId: id });

  const goal = await prisma.goal.findUnique({ where: { id } });
  return NextResponse.json({ goal });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.goal.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "goal.deleted", targetType: "Goal", targetId: id });

  return NextResponse.json({ ok: true });
}
