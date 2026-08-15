import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateSafetyChecklistItemSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateSafetyChecklistItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const result = await prisma.safetyChecklistItem.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "safety.checklist_item_updated", targetType: "SafetyChecklistItem", targetId: id });

  const item = await prisma.safetyChecklistItem.findUnique({ where: { id } });
  return NextResponse.json({ item });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.safetyChecklistItem.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "safety.checklist_item_deleted", targetType: "SafetyChecklistItem", targetId: id });

  return NextResponse.json({ ok: true });
}
