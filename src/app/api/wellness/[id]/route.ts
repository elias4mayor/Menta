import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateWellnessCheckInSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

// See src/app/api/wellness/route.ts for the sensitivity rules this file
// also follows (ownership-scoped only, no values ever passed to logAudit).

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateWellnessCheckInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const result = await prisma.wellnessCheckIn.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({
    actorId: user.id,
    action: "wellness.checkin_updated",
    targetType: "WellnessCheckIn",
    targetId: id,
  });

  const checkIn = await prisma.wellnessCheckIn.findUnique({ where: { id } });
  return NextResponse.json({ checkIn });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.wellnessCheckIn.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({
    actorId: user.id,
    action: "wellness.checkin_deleted",
    targetType: "WellnessCheckIn",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
