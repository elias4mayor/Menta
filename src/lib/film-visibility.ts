import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Team ids where the user is "film staff" — see isTeamFilmStaff's doc comment in permissions.ts. Computed in bulk since list views can't afford one query per team per candidate film. */
export async function getStaffTeamIds(userId: string): Promise<string[]> {
  const [coachAdminTeams, grantTeams, groupStaffTeams] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId, teamRole: { in: ["COACH", "ADMIN"] } },
      select: { teamId: true },
    }),
    prisma.teamPermissionGrant.findMany({ where: { userId }, select: { teamId: true } }),
    prisma.positionGroupMembership.findMany({
      where: { userId, groupRole: { in: ["COACH", "ANALYST"] } },
      select: { positionGroup: { select: { teamId: true } } },
    }),
  ]);
  return Array.from(
    new Set([
      ...coachAdminTeams.map((t) => t.teamId),
      ...grantTeams.map((t) => t.teamId),
      ...groupStaffTeams.map((t) => t.positionGroup.teamId),
    ])
  );
}

/**
 * The Prisma `where` clause matching every Film the given user is allowed
 * to see, across every visibility tier — the single source of truth for
 * "what film shows up in my library," used by both the list API route and
 * the /film page's server-rendered initial data so the two can never drift.
 * See canViewFilm in permissions.ts for the equivalent single-film check.
 */
export async function visibleFilmWhere(userId: string): Promise<Prisma.FilmWhereInput> {
  const [memberships, groupMemberships, sharedFilms, staffTeamIds, shareGrants] = await Promise.all([
    prisma.teamMembership.findMany({ where: { userId }, select: { teamId: true } }),
    prisma.positionGroupMembership.findMany({ where: { userId }, select: { positionGroupId: true } }),
    prisma.filmSharedWithUser.findMany({ where: { userId }, select: { filmId: true } }),
    getStaffTeamIds(userId),
    prisma.filmShareGrant.findMany({ where: { revokedAt: null }, select: { filmId: true, toTeamId: true } }),
  ]);
  const teamIds = memberships.map((m) => m.teamId);
  const positionGroupIds = groupMemberships.map((m) => m.positionGroupId);
  const sharedFilmIds = sharedFilms.map((s) => s.filmId);
  const teamIdSet = new Set(teamIds);
  const sharedWithMyTeamFilmIds = shareGrants
    .filter((g): g is typeof g & { filmId: string } => g.filmId !== null && teamIdSet.has(g.toTeamId))
    .map((g) => g.filmId);

  return {
    status: { not: "ARCHIVED" },
    OR: [
      { uploadedById: userId },
      { visibility: "PUBLIC" },
      { visibility: { in: ["TEAM", "RECRUITING"] }, teamId: { in: teamIds } },
      { visibility: "COACH_STAFF", teamId: { in: staffTeamIds } },
      {
        visibility: "POSITION_GROUP",
        OR: [{ teamId: { in: staffTeamIds } }, { positionGroupId: { in: positionGroupIds } }],
      },
      { visibility: { in: ["SELECTED_ATHLETES", "RECRUITING"] }, id: { in: sharedFilmIds } },
      { id: { in: sharedWithMyTeamFilmIds } },
    ],
  };
}
