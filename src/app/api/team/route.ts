import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createTeamSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let inviteCode = generateInviteCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await prisma.team.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const teamRole =
    user.role === "COACH" ? "COACH" : user.role === "TRAINER" ? "TRAINER" : user.role === "PARENT" ? "PARENT" : "ADMIN";

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name,
      sport: parsed.data.sport,
      inviteCode,
      createdById: user.id,
      memberships: { create: { userId: user.id, teamRole } },
      conversation: { create: { isGroup: true, title: parsed.data.name, participants: { create: { userId: user.id } } } },
    },
  });

  await logAudit({ actorId: user.id, action: "team.created", targetType: "Team", targetId: team.id });

  return NextResponse.json({ team });
}
