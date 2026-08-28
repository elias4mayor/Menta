import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
import { PlaylistsManager } from "@/components/PlaylistsManager";

export default async function PlaylistsPage() {
  const user = await requireUser();

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

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Film</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Playlists</GlowWaveText></h1>
      <PlaylistsManager
        initialPlaylists={playlists.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          visibility: p.visibility,
          teamName: p.team?.name ?? null,
          positionGroupName: p.positionGroup?.name ?? null,
          itemCount: p._count.items,
          isMine: p.ownerId === user.id,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
