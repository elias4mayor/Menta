import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createTeamSafetyProtocolSchema } from "@/lib/validation";
import { canManageTeam } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const protocols = await prisma.teamSafetyProtocol.findMany({
    where: { team: { memberships: { some: { userId: user.id } } } },
    include: { team: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ protocols });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createTeamSafetyProtocolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const canManage = await canManageTeam(user, parsed.data.teamId);
  if (!canManage) {
    return NextResponse.json(
      { error: "Only coaches or team admins can add a team emergency plan." },
      { status: 403 }
    );
  }

  const protocol = await prisma.teamSafetyProtocol.create({
    data: { ...parsed.data, createdById: user.id },
    include: { team: true },
  });

  const members = await prisma.teamMembership.findMany({
    where: { teamId: parsed.data.teamId, userId: { not: user.id } },
  });
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        type: "SAFETY",
        title: `New team emergency plan: ${protocol.title}`,
        link: "/safety",
      })),
    });
  }

  await logAudit({ actorId: user.id, action: "safety.team_protocol_created", targetType: "TeamSafetyProtocol", targetId: protocol.id });

  return NextResponse.json({ protocol });
}
