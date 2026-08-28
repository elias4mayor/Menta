import "server-only";
import { prisma } from "@/lib/prisma";
import { isTeamFilmStaff, hasTeamPermission } from "@/lib/permissions";

/** View access to a playlist: the owner, a member of its position group (or team staff), or any member of its team. */
export async function canAccessPlaylist(
  userId: string,
  playlist: { ownerId: string; teamId: string | null; positionGroupId: string | null }
): Promise<boolean> {
  if (playlist.ownerId === userId) return true;
  if (playlist.positionGroupId) {
    const membership = await prisma.positionGroupMembership.findUnique({
      where: { positionGroupId_userId: { positionGroupId: playlist.positionGroupId, userId } },
    });
    if (membership) return true;
    if (playlist.teamId) return isTeamFilmStaff(userId, playlist.teamId);
    return false;
  }
  if (playlist.teamId) {
    const membership = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId: playlist.teamId } } });
    return Boolean(membership);
  }
  return false;
}

/** Edit/delete a playlist or its items — the owner, or MANAGE_PLAYLISTS on the team (optionally scoped to its position group). */
export async function canManagePlaylist(
  userId: string,
  playlist: { ownerId: string; teamId: string | null; positionGroupId: string | null }
): Promise<boolean> {
  if (playlist.ownerId === userId) return true;
  if (!playlist.teamId) return false;
  return hasTeamPermission(userId, playlist.teamId, "MANAGE_PLAYLISTS", playlist.positionGroupId);
}
