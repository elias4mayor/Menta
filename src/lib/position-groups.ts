import "server-only";
import { prisma } from "@/lib/prisma";
import { isTeamCoachOrAdmin, hasTeamPermission, type Permission } from "@/lib/permissions";

/** groupRole values — see PositionGroupMembership doc-comment in schema.prisma. */
export const GROUP_ROLES = ["COACH", "ATHLETE", "ANALYST"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/** Create a position group. Caller must already hold MANAGE_POSITION_GROUPS (checked by the route). */
export async function createPositionGroup(params: {
  teamId: string;
  name: string;
  description?: string | null;
  createdById: string;
}) {
  return prisma.positionGroup.create({
    data: {
      teamId: params.teamId,
      name: params.name,
      description: params.description ?? undefined,
      createdById: params.createdById,
    },
  });
}

export async function renamePositionGroup(groupId: string, data: { name?: string; description?: string | null }) {
  return prisma.positionGroup.update({
    where: { id: groupId },
    data: { name: data.name, description: data.description ?? undefined },
  });
}

/** Hard delete — position groups have no downstream data that should survive their removal on its own (film/playlists/assignments scoped to a deleted group become team-wide via SetNull/Cascade per schema). */
export async function deletePositionGroup(groupId: string) {
  return prisma.positionGroup.delete({ where: { id: groupId } });
}

/** Idempotent — re-adding an existing member just updates their groupRole. */
export async function addPositionGroupMember(params: {
  positionGroupId: string;
  userId: string;
  groupRole?: GroupRole;
}) {
  return prisma.positionGroupMembership.upsert({
    where: { positionGroupId_userId: { positionGroupId: params.positionGroupId, userId: params.userId } },
    create: {
      positionGroupId: params.positionGroupId,
      userId: params.userId,
      groupRole: params.groupRole ?? "ATHLETE",
    },
    update: { groupRole: params.groupRole ?? "ATHLETE" },
  });
}

export async function removePositionGroupMember(positionGroupId: string, userId: string) {
  await prisma.positionGroupMembership.deleteMany({ where: { positionGroupId, userId } });
}

/** Every position group on a team, with member + film counts, for the management UI. */
export async function listPositionGroups(teamId: string) {
  return prisma.positionGroup.findMany({
    where: { teamId },
    include: {
      memberships: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { films: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Effective permission summary for one user on one team — what a "manage
 * access" screen needs to render. Distinguishes "coach/admin, gets
 * everything for free" from real explicit grants, so the UI never implies
 * a head coach has grants they don't actually hold rows for.
 */
export async function getEffectiveAccess(userId: string, teamId: string) {
  const [isCoachOrAdmin, grants, groupIds] = await Promise.all([
    isTeamCoachOrAdmin(userId, teamId),
    prisma.teamPermissionGrant.findMany({ where: { userId, teamId } }),
    getUserPositionGroupIdsForTeam(userId, teamId),
  ]);
  return { isCoachOrAdmin, grants, positionGroupIds: groupIds };
}

async function getUserPositionGroupIdsForTeam(userId: string, teamId: string): Promise<string[]> {
  const memberships = await prisma.positionGroupMembership.findMany({
    where: { userId, positionGroup: { teamId } },
    select: { positionGroupId: true },
  });
  return memberships.map((m) => m.positionGroupId);
}

/** Convenience wrapper most Film Center routes call directly. */
export async function requirePermission(
  userId: string,
  teamId: string,
  permission: Permission,
  positionGroupId?: string | null
): Promise<boolean> {
  return hasTeamPermission(userId, teamId, permission, positionGroupId);
}
