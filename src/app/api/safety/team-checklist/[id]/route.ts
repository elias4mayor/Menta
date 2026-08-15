import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateTeamSafetyChecklistItemSchema } from "@/lib/validation";
import { canManageTeam } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const item = await prisma.teamSafetyChecklistItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageTeam(user, item.teamId))) {
    return NextResponse.json({ error: "Only coaches or team admins can edit this." }, { status: 403 });
  }

  const parsed = updateTeamSafetyChecklistItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await prisma.teamSafetyChecklistItem.update({ where: { id }, data: parsed.data });

  await logAudit({ actorId: user.id, action: "safety.team_checklist_item_updated", targetType: "TeamSafetyChecklistItem", targetId: id });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const item = await prisma.teamSafetyChecklistItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await canManageTeam(user, item.teamId))) {
    return NextResponse.json({ error: "Only coaches or team admins can remove this." }, { status: 403 });
  }

  await prisma.teamSafetyChecklistItem.delete({ where: { id } });

  await logAudit({ actorId: user.id, action: "safety.team_checklist_item_deleted", targetType: "TeamSafetyChecklistItem", targetId: id });

  return NextResponse.json({ ok: true });
}
