import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createTeamSafetyChecklistItemSchema } from "@/lib/validation";
import { canManageTeam } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const items = await prisma.teamSafetyChecklistItem.findMany({
    where: { team: { memberships: { some: { userId: user.id } } } },
    include: { team: true },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createTeamSafetyChecklistItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const canManage = await canManageTeam(user, parsed.data.teamId);
  if (!canManage) {
    return NextResponse.json(
      { error: "Only coaches or team admins can add a team safety checklist item." },
      { status: 403 }
    );
  }

  const item = await prisma.teamSafetyChecklistItem.create({
    data: { ...parsed.data, createdById: user.id },
    include: { team: true },
  });

  await logAudit({ actorId: user.id, action: "safety.team_checklist_item_created", targetType: "TeamSafetyChecklistItem", targetId: item.id });

  return NextResponse.json({ item });
}
