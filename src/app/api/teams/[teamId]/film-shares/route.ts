import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, hasTeamPermission, canViewFilm } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [sent, received] = await Promise.all([
    prisma.filmShareGrant.findMany({
      where: { fromTeamId: teamId, revokedAt: null },
      include: { film: { select: { id: true, title: true } }, toTeam: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.filmShareGrant.findMany({
      where: { toTeamId: teamId, revokedAt: null },
      include: { film: { select: { id: true, title: true } }, fromTeam: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    sent: sent.map((g) => ({ id: g.id, filmId: g.filmId, filmTitle: g.film?.title ?? null, toTeamName: g.toTeam.name })),
    received: received.map((g) => ({ id: g.id, filmId: g.filmId, filmTitle: g.film?.title ?? null, fromTeamName: g.fromTeam.name })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_FILM_SHARING"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const filmId = typeof body?.filmId === "string" ? body.filmId : null;
  const toInviteCode = typeof body?.toInviteCode === "string" ? body.toInviteCode.trim().toUpperCase() : "";
  if (!filmId || !toInviteCode) {
    return NextResponse.json({ error: "Choose a film and enter the receiving team's invite code." }, { status: 400 });
  }

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || film.teamId !== teamId || !(await canViewFilm(user, film))) {
    return NextResponse.json({ error: "Film not found on this team." }, { status: 404 });
  }

  const toTeam = await prisma.team.findUnique({ where: { inviteCode: toInviteCode } });
  if (!toTeam) return NextResponse.json({ error: "No team found with that invite code." }, { status: 404 });
  if (toTeam.id === teamId) return NextResponse.json({ error: "Can't share film with your own team." }, { status: 400 });

  const grant = await prisma.filmShareGrant.create({
    data: { filmId, fromTeamId: teamId, toTeamId: toTeam.id, grantedById: user.id },
  });

  return NextResponse.json({ grant: { id: grant.id, toTeamName: toTeam.name } });
}
