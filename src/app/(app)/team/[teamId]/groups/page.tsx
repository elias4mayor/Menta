import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { hasTeamPermission, PERMISSIONS } from "@/lib/permissions";
import { GlowWaveText } from "@/components/GlowWaveText";
import { PositionGroupsManager } from "@/components/PositionGroupsManager";

export default async function PositionGroupsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();

  const canManage = await hasTeamPermission(user.id, teamId, "MANAGE_POSITION_GROUPS");
  if (!canManage) notFound();

  const canGrant = await hasTeamPermission(user.id, teamId, "GRANT_PERMISSIONS");

  const [groups, roster, grants] = await Promise.all([
    prisma.positionGroup.findMany({
      where: { teamId },
      include: {
        memberships: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { films: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    canGrant
      ? prisma.teamPermissionGrant.findMany({
          where: { teamId },
          include: { user: { select: { id: true, name: true } }, positionGroup: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">{team.name}</div>
      <h1 className="text-3xl font-semibold mb-2">
        <GlowWaveText intensity="strong">Position groups</GlowWaveText>
      </h1>
      <p className="text-text-2 text-sm mb-8 max-w-2xl">
        Coach-defined subgroups of your roster — a QB room, a line, a freshman development
        group, whatever your sport calls it. Film, playlists, and assignments can all be scoped
        to a group instead of the whole team.
      </p>

      <PositionGroupsManager
        teamId={teamId}
        canGrant={canGrant}
        initialGroups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          filmCount: g._count.films,
          members: g.memberships.map((m) => ({ userId: m.userId, name: m.user.name, groupRole: m.groupRole })),
        }))}
        roster={roster.map((m) => ({ userId: m.userId, name: m.user.name, teamRole: m.teamRole }))}
        initialGrants={grants.map((g) => ({
          id: g.id,
          userId: g.userId,
          userName: g.user.name,
          permission: g.permission,
          positionGroupId: g.positionGroupId,
          positionGroupName: g.positionGroup?.name ?? null,
        }))}
        allPermissions={PERMISSIONS}
      />
    </div>
  );
}
