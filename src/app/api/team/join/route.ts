import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { joinTeamSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getTeamRosterLimit } from "@/lib/entitlements";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
    include: { conversation: true },
  });

  if (!team) {
    return NextResponse.json({ error: "No team found with that invite code." }, { status: 404 });
  }

  const existing = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: team.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "You're already on this team." }, { status: 409 });
  }

  const teamRole =
    user.role === "COACH"
      ? "COACH"
      : user.role === "TRAINER"
        ? "TRAINER"
        : user.role === "DOCTOR"
          ? "DOCTOR"
          : user.role === "PARENT"
            ? "PARENT"
            : "ATHLETE";

  if (teamRole === "ATHLETE") {
    const rosterLimit = await getTeamRosterLimit(team.id);
    if (rosterLimit !== null) {
      const athleteCount = await prisma.teamMembership.count({ where: { teamId: team.id, teamRole: "ATHLETE" } });
      if (athleteCount >= rosterLimit) {
        return NextResponse.json({
          error: `This team is at its ${rosterLimit}-athlete plan limit. Ask the coach to upgrade the team's plan.`,
        }, { status: 402 });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMembership.create({ data: { userId: user.id, teamId: team.id, teamRole } });
    if (team.conversation) {
      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: team.conversation.id, userId: user.id } },
        create: { conversationId: team.conversation.id, userId: user.id },
        update: {},
      });
    }
  });

  await logAudit({ actorId: user.id, action: "team.joined", targetType: "Team", targetId: team.id });

  return NextResponse.json({ team: { id: team.id, name: team.name } });
}
