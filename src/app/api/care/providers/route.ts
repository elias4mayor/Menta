import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { PROVIDER_TEAM_ROLES } from "@/lib/permissions";

/** Verified TRAINER/DOCTOR providers on teams the current user belongs to — what MENTA Care's "I need care" flow offers an athlete to book from. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const teamIdParam = new URL(request.url).searchParams.get("teamId");

  const myTeamIds = (
    await prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } })
  ).map((m) => m.teamId);
  if (myTeamIds.length === 0) return NextResponse.json({ providers: [] });

  const memberships = await prisma.teamMembership.findMany({
    where: {
      teamId: teamIdParam ? { in: myTeamIds.filter((id) => id === teamIdParam) } : { in: myTeamIds },
      teamRole: { in: PROVIDER_TEAM_ROLES },
      verifiedAt: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          doctorProfile: { select: { title: true, specialties: true } },
        },
      },
      team: { select: { id: true, name: true } },
    },
  });

  const providers = memberships.map((m) => {
    const profile = m.user.role === "DOCTOR" ? m.user.doctorProfile : null;
    return {
      id: m.user.id,
      name: m.user.name,
      role: m.user.role,
      teamId: m.team.id,
      teamName: m.team.name,
      title: profile?.title ?? (m.user.role === "TRAINER" ? "Athletic Trainer" : "Provider"),
      specialties: profile?.specialties ? JSON.parse(profile.specialties) : [],
    };
  });

  return NextResponse.json({ providers });
}
