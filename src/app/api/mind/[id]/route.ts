import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateMindCheckInSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

// See src/app/api/mind/route.ts for the sensitivity rules this file also
// follows (ownership-scoped only, no values ever passed to logAudit).

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateMindCheckInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const result = await prisma.mindCheckIn.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({
    actorId: user.id,
    action: "mind.checkin_updated",
    targetType: "MindCheckIn",
    targetId: id,
  });

  const checkIn = await prisma.mindCheckIn.findUnique({ where: { id } });
  return NextResponse.json({ checkIn });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.mindCheckIn.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({
    actorId: user.id,
    action: "mind.checkin_deleted",
    targetType: "MindCheckIn",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
