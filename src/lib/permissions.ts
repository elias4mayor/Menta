import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/**
 * The permission model — this is the load-bearing wall (build plan §3).
 *
 *  - AI permissions = the requesting user's permissions. Never more.
 *  - Developer access ≠ athlete-data access, by default.
 *  - Coach access ≠ Athletic Director access.
 *  - Public profile ≠ private profile.
 *
 * Every function here runs server-side and is the actual authorization
 * boundary. Hiding a button in the UI is not security — these checks are
 * what API routes and server components must call before touching data.
 */

export const ROLES = [
  "SUPER_ADMIN",
  "DEVELOPER",
  "MENTA_STAFF",
  "ORG_ADMIN",
  "SCHOOL_ADMIN",
  "ATHLETIC_DIRECTOR",
  "COACH",
  "TRAINER",
  "ATHLETE",
  "PARENT",
] as const;

export type Role = (typeof ROLES)[number];

export const TEAM_ROLES = ["COACH", "ATHLETE", "TRAINER", "PARENT", "ADMIN"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Internal MENTA staff roles — these get product/admin access, never a free pass to athlete data. */
const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "DEVELOPER", "MENTA_STAFF"];

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as Role);
}

export function isMinor(dateOfBirth: Date | null | undefined): boolean {
  if (!dateOfBirth) return false;
  const age =
    (Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age < 18;
}

/**
 * Can `viewer` see `ownerId`'s athlete profile at the given visibility level?
 * Developer/staff roles do NOT get an automatic pass — see rule #2 above.
 */
export async function canViewAthleteProfile(
  viewer: SessionUser,
  ownerId: string,
  visibility: string
): Promise<boolean> {
  if (viewer.id === ownerId) return true;
  if (visibility === "PUBLIC") return true;

  if (viewer.role === "SUPER_ADMIN") return true; // narrowly: platform operations only

  const sharesTeam = await usersShareTeam(viewer.id, ownerId);
  if (visibility === "TEAM" && sharesTeam) return true;
  if (visibility === "ORGANIZATION" && sharesTeam) return true;
  if (visibility === "RECRUITING" && (sharesTeam || viewer.role === "COACH")) {
    return true;
  }

  // A parent/guardian may view the athlete they are approved for.
  const link = await prisma.guardianLink.findFirst({
    where: { guardianId: viewer.id, athleteId: ownerId, status: "APPROVED" },
  });
  if (link) return true;

  return false;
}

export async function usersShareTeam(userAId: string, userBId: string): Promise<boolean> {
  if (userAId === userBId) return true;
  const shared = await prisma.teamMembership.findFirst({
    where: {
      userId: userAId,
      team: { memberships: { some: { userId: userBId } } },
    },
  });
  return Boolean(shared);
}

export async function getTeamRole(userId: string, teamId: string): Promise<TeamRole | null> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return (membership?.teamRole as TeamRole) ?? null;
}

export async function isTeamCoachOrAdmin(userId: string, teamId: string): Promise<boolean> {
  const role = await getTeamRole(userId, teamId);
  return role === "COACH" || role === "ADMIN";
}

/**
 * Coach access ≠ Athletic Director access — a coach is scoped to the teams
 * they belong to, never the whole organization, even if they also happen to
 * hold a staff role elsewhere.
 */
export async function canManageTeam(user: SessionUser, teamId: string): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  return isTeamCoachOrAdmin(user.id, teamId);
}

/** Film/clip visibility follows the same PRIVATE/TEAM/PUBLIC pattern as calendar events. */
export async function canViewFilm(
  viewer: SessionUser,
  film: { uploadedById: string; visibility: string; teamId: string | null }
): Promise<boolean> {
  if (viewer.id === film.uploadedById) return true;
  if (film.visibility === "PUBLIC") return true;
  if (viewer.role === "SUPER_ADMIN") return true;
  if (film.visibility === "TEAM" && film.teamId) {
    const role = await getTeamRole(viewer.id, film.teamId);
    return role !== null;
  }
  return false;
}

/**
 * Document access — every document has exactly one of ownerId (a personal
 * document, about one athlete) or teamId (a team-level document) set.
 * Personal: the owner, the uploader, and an APPROVED guardian of the
 * owner can view. Team: any member can view (same pattern as
 * TeamSafetyProtocol), but only a coach/admin can manage — see
 * canManageDocument below.
 */
export async function canAccessDocument(
  viewer: SessionUser,
  doc: { ownerId: string | null; teamId: string | null; uploadedById: string }
): Promise<boolean> {
  if (viewer.id === doc.uploadedById) return true;
  if (viewer.role === "SUPER_ADMIN") return true;

  if (doc.ownerId) {
    if (viewer.id === doc.ownerId) return true;
    const link = await prisma.guardianLink.findFirst({
      where: { guardianId: viewer.id, athleteId: doc.ownerId, status: "APPROVED" },
    });
    return Boolean(link);
  }

  if (doc.teamId) {
    const role = await getTeamRole(viewer.id, doc.teamId);
    return role !== null;
  }

  return false;
}

/** Who may upload/edit/delete a document — the owner, the original
 * uploader, an APPROVED guardian of the owner (personal docs), or a
 * coach/admin of the team (team docs). Stricter than canAccessDocument:
 * a teammate can view a team document but not delete it. */
export async function canManageDocument(
  viewer: SessionUser,
  doc: { ownerId: string | null; teamId: string | null; uploadedById: string }
): Promise<boolean> {
  if (viewer.id === doc.uploadedById) return true;
  if (viewer.role === "SUPER_ADMIN") return true;

  if (doc.ownerId) {
    if (viewer.id === doc.ownerId) return true;
    const link = await prisma.guardianLink.findFirst({
      where: { guardianId: viewer.id, athleteId: doc.ownerId, status: "APPROVED" },
    });
    return Boolean(link);
  }

  if (doc.teamId) return isTeamCoachOrAdmin(viewer.id, doc.teamId);

  return false;
}

/** Who may ask an athlete to upload a document — a coach/trainer sharing
 * a team with them, or an APPROVED guardian. */
export async function canRequestDocumentFrom(requester: SessionUser, athleteId: string): Promise<boolean> {
  if (requester.id === athleteId) return false;
  if (requester.role === "SUPER_ADMIN") return true;

  if (requester.role === "PARENT") {
    const link = await prisma.guardianLink.findFirst({
      where: { guardianId: requester.id, athleteId, status: "APPROVED" },
    });
    if (link) return true;
  }

  if (requester.role === "COACH" || requester.role === "TRAINER") {
    if (await usersShareTeam(requester.id, athleteId)) return true;
  }

  return false;
}
