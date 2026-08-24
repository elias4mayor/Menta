import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isTeamCoachOrAdmin, PROVIDER_TEAM_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const membershipId = typeof body?.membershipId === "string" ? body.membershipId : null;
  if (!membershipId) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const membership = await prisma.teamMembership.findUnique({ where: { id: membershipId } });
  if (!membership) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!PROVIDER_TEAM_ROLES.includes(membership.teamRole as "TRAINER" | "DOCTOR")) {
    return NextResponse.json({ error: "Only trainer/doctor members can be verified as providers." }, { status: 400 });
  }
  if (!(await isTeamCoachOrAdmin(user.id, membership.teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.teamMembership.update({
    where: { id: membershipId },
    data: { verifiedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: membership.userId,
      type: "SYSTEM",
      title: "You're a verified MENTA Care provider",
      body: "A coach on your team confirmed you — athletes can now book care with you.",
      link: "/care/provider",
    },
  });

  await logAudit({ actorId: user.id, action: "team.provider_verified", targetType: "TeamMembership", targetId: membershipId });

  return NextResponse.json({ ok: true });
}
