import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

/** Playlists visible to the user: their own, plus team/group ones they belong to or staff for. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [memberships, groupMemberships] = await Promise.all([
    prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } }),
    prisma.positionGroupMembership.findMany({ where: { userId: user.id }, select: { positionGroupId: true } }),
  ]);
  const teamIds = memberships.map((m) => m.teamId);
  const positionGroupIds = groupMemberships.map((m) => m.positionGroupId);

  const playlists = await prisma.filmPlaylist.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { teamId: { in: teamIds }, positionGroupId: null },
        { positionGroupId: { in: positionGroupIds } },
      ],
    },
    include: { team: { select: { name: true } }, positionGroup: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    playlists: playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      visibility: p.visibility,
      teamName: p.team?.name ?? null,
      positionGroupName: p.positionGroup?.name ?? null,
      itemCount: p._count.items,
      isMine: p.ownerId === user.id,
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const teamId = typeof body?.teamId === "string" ? body.teamId : null;
  const positionGroupId = typeof body?.positionGroupId === "string" ? body.positionGroupId : null;
  const visibility = body?.visibility === "TEAM" || body?.visibility === "POSITION_GROUP" ? body.visibility : "PRIVATE";

  if (!title || title.length > 120) {
    return NextResponse.json({ error: "Enter a title (up to 120 characters)." }, { status: 400 });
  }

  if (teamId) {
    const membership = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: user.id, teamId } } });
    if (!membership) return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
    if (visibility !== "PRIVATE" && !(await hasTeamPermission(user.id, teamId, "CREATE_PLAYLIST", positionGroupId))) {
      return NextResponse.json({ error: "Not authorized to create a shared playlist for that team." }, { status: 403 });
    }
  }
  if (positionGroupId) {
    const group = await prisma.positionGroup.findUnique({ where: { id: positionGroupId } });
    if (!group || group.teamId !== teamId) return NextResponse.json({ error: "Invalid position group." }, { status: 400 });
  }

  const playlist = await prisma.filmPlaylist.create({
    data: {
      title,
      description,
      ownerId: user.id,
      teamId: visibility === "PRIVATE" ? null : teamId,
      positionGroupId: visibility === "POSITION_GROUP" ? positionGroupId : null,
      visibility,
    },
  });

  await logAudit({ actorId: user.id, action: "playlist.created", targetType: "FilmPlaylist", targetId: playlist.id });

  return NextResponse.json({ playlist });
}
