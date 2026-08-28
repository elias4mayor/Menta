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
  "DOCTOR",
  "ATHLETE",
  "PARENT",
] as const;

export type Role = (typeof ROLES)[number];

export const TEAM_ROLES = ["COACH", "ATHLETE", "TRAINER", "DOCTOR", "PARENT", "ADMIN"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Team roles MENTA Care can route an athlete's request to. */
export const PROVIDER_TEAM_ROLES: TeamRole[] = ["TRAINER", "DOCTOR"];

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

/** Edit/delete/reassign a workout: the person who created it, or (for a team workout) a coach/admin of that team. */
export async function canManageWorkout(
  user: SessionUser,
  workout: { createdById: string; teamId: string | null }
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (workout.createdById === user.id) return true;
  if (workout.teamId) return isTeamCoachOrAdmin(user.id, workout.teamId);
  return false;
}

/**
 * Film visibility tiers: PRIVATE (uploader only), COACH_STAFF (any coach/
 * staff member of the team — head coach, assistant, position coach, video
 * analyst), POSITION_GROUP (members of the one group it's scoped to, plus
 * team coaching staff), TEAM (any roster member), SELECTED_ATHLETES
 * (explicit FilmSharedWithUser grants), RECRUITING (same as TEAM plus
 * anyone explicitly shared with — MENTA has no public recruiter directory,
 * so wider recruiting distribution is out of scope until that exists),
 * PUBLIC (anyone). Legacy rows may still say TEAM/PRIVATE/PUBLIC from
 * before this tier set existed — those fall through to the matching case
 * below unchanged.
 */
export async function canViewFilm(
  viewer: SessionUser,
  film: { uploadedById: string; visibility: string; teamId: string | null; positionGroupId?: string | null; id?: string }
): Promise<boolean> {
  if (viewer.id === film.uploadedById) return true;
  if (film.visibility === "PUBLIC") return true;
  if (viewer.role === "SUPER_ADMIN") return true;

  if (await canViewFilmByOwnVisibility(viewer, film)) return true;
  return film.id ? canViewSharedFilm(viewer.id, film.id) : false;
}

async function canViewFilmByOwnVisibility(
  viewer: SessionUser,
  film: { visibility: string; teamId: string | null; positionGroupId?: string | null; id?: string }
): Promise<boolean> {
  if (film.visibility === "PRIVATE") return false;

  if (film.visibility === "COACH_STAFF") {
    return film.teamId ? isTeamFilmStaff(viewer.id, film.teamId) : false;
  }

  if (film.visibility === "POSITION_GROUP") {
    if (!film.teamId) return false;
    if (await isTeamFilmStaff(viewer.id, film.teamId)) return true;
    if (!film.positionGroupId) return false;
    const membership = await prisma.positionGroupMembership.findUnique({
      where: { positionGroupId_userId: { positionGroupId: film.positionGroupId, userId: viewer.id } },
    });
    return Boolean(membership);
  }

  if (film.visibility === "TEAM" || film.visibility === "RECRUITING") {
    if (film.teamId) {
      const role = await getTeamRole(viewer.id, film.teamId);
      if (role !== null) return true;
    }
    if (film.visibility === "RECRUITING" && film.id) {
      const shared = await prisma.filmSharedWithUser.findUnique({
        where: { filmId_userId: { filmId: film.id, userId: viewer.id } },
      });
      if (shared) return true;
    }
    return false;
  }

  if (film.visibility === "SELECTED_ATHLETES") {
    if (!film.id) return false;
    const shared = await prisma.filmSharedWithUser.findUnique({
      where: { filmId_userId: { filmId: film.id, userId: viewer.id } },
    });
    return Boolean(shared);
  }

  return false;
}

/** A film explicitly shared with another team (FilmShareGrant) is visible to that team's roster regardless of its own visibility tier — the receiving team sees only what was explicitly granted, never the sending team's wider library. */
export async function canViewSharedFilm(viewerId: string, filmId: string): Promise<boolean> {
  const grants = await prisma.filmShareGrant.findMany({ where: { filmId, revokedAt: null }, select: { toTeamId: true } });
  if (grants.length === 0) return false;
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: viewerId, teamId: { in: grants.map((g) => g.toTeamId) } },
  });
  return Boolean(membership);
}

/** Coach/admin, or holds any Film Center permission grant, or is a COACH/ANALYST in one of the team's position groups — the set of people who "manage film" for a team, without requiring they hold every specific permission. */
export async function isTeamFilmStaff(userId: string, teamId: string): Promise<boolean> {
  if (await isTeamCoachOrAdmin(userId, teamId)) return true;
  const grant = await prisma.teamPermissionGrant.findFirst({ where: { userId, teamId }, select: { id: true } });
  if (grant) return true;
  const groupStaff = await prisma.positionGroupMembership.findFirst({
    where: { userId, groupRole: { in: ["COACH", "ANALYST"] }, positionGroup: { teamId } },
    select: { id: true },
  });
  return Boolean(groupStaff);
}

/** Upload film to a team (or a position group within it) — coach/admin, or an explicit UPLOAD_FILM grant. teamId null means a personal upload, always allowed for oneself. */
export async function canUploadFilmToTeam(
  userId: string,
  teamId: string | null,
  positionGroupId?: string | null
): Promise<boolean> {
  if (!teamId) return true;
  return hasTeamPermission(userId, teamId, "UPLOAD_FILM", positionGroupId);
}

/** Create a team-custom exercise in the MENTA TRAIN library — coach/admin, or an explicit MANAGE_EXERCISE_LIBRARY grant. Global (teamId null) exercises are never created through this check — they're seed data only. */
export async function canManageTeamExercises(userId: string, teamId: string): Promise<boolean> {
  return hasTeamPermission(userId, teamId, "MANAGE_EXERCISE_LIBRARY");
}

/** Create/edit/archive a team's MENTA TRAIN training programs — coach/admin, or an explicit MANAGE_TRAINING_PROGRAMS grant. */
export async function canManageTrainingPrograms(userId: string, teamId: string): Promise<boolean> {
  return hasTeamPermission(userId, teamId, "MANAGE_TRAINING_PROGRAMS");
}

/** Start/control a MENTA LIVE session and manage its groups — coach/admin, or an explicit RUN_LIVE_SESSION grant. */
export async function canRunLiveSession(userId: string, teamId: string): Promise<boolean> {
  return hasTeamPermission(userId, teamId, "RUN_LIVE_SESSION");
}

/** Log a TrainingSet on behalf of another athlete (no-phone mode) — coach/admin, or an explicit LOG_TRAINING_SETS grant. An athlete logging their own set bypasses this entirely (identity check, not a permission). */
export async function canLogTrainingSetsForOthers(userId: string, teamId: string): Promise<boolean> {
  return hasTeamPermission(userId, teamId, "LOG_TRAINING_SETS");
}

/** Edit/delete/re-tier a film — uploader, or MANAGE_FILM on the team (optionally scoped to the film's position group). */
export async function canManageFilm(
  viewer: SessionUser,
  film: { uploadedById: string; teamId: string | null; positionGroupId?: string | null }
): Promise<boolean> {
  if (viewer.id === film.uploadedById) return true;
  if (viewer.role === "SUPER_ADMIN") return true;
  if (!film.teamId) return false;
  return hasTeamPermission(viewer.id, film.teamId, "MANAGE_FILM", film.positionGroupId);
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

/**
 * MENTA Care: a provider is only bookable once a coach/admin of that
 * specific team has vouched for them (TeamMembership.verifiedAt) — role
 * alone (TRAINER/DOCTOR) isn't enough, since anyone can join a team with
 * an invite code. There's no org-level admin-approval queue yet
 * (ATHLETIC_DIRECTOR has no dashboard at all currently); this is the real,
 * narrower gate that ships this pass.
 */
export async function isVerifiedProvider(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return Boolean(
    membership &&
      PROVIDER_TEAM_ROLES.includes(membership.teamRole as TeamRole) &&
      membership.verifiedAt
  );
}

/** An athlete may request care from a provider only if both share the named team and that provider is verified on it. */
export async function canRequestCareFrom(
  athleteId: string,
  providerId: string,
  teamId: string
): Promise<boolean> {
  const athleteMembership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: athleteId, teamId } },
  });
  if (!athleteMembership) return false;
  return isVerifiedProvider(providerId, teamId);
}

/** Only the assigned provider (or SUPER_ADMIN) can accept/decline/reschedule/close a care request — never the athlete, coach, or parent. */
export function canManageCareRequest(user: SessionUser, careRequest: { providerId: string }): boolean {
  return user.role === "SUPER_ADMIN" || user.id === careRequest.providerId;
}

/** A coach sees operational status only for care requests on teams they coach/admin — never the reason, notes, or provider's private note. */
export async function canViewTeamCareStatus(user: SessionUser, teamId: string): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  return isTeamCoachOrAdmin(user.id, teamId);
}

/** A parent sees operational status only for an athlete they're an APPROVED guardian of. */
export async function canViewAthleteCareStatus(viewer: SessionUser, athleteId: string): Promise<boolean> {
  if (viewer.id === athleteId) return true;
  if (viewer.role === "SUPER_ADMIN") return true;
  const link = await prisma.guardianLink.findFirst({
    where: { guardianId: viewer.id, athleteId, status: "APPROVED" },
  });
  return Boolean(link);
}

// =====================================================================
// Granular team permissions — MENTA Film Center / Position Groups.
//
// TeamMembership.teamRole stays the coarse role and keeps working exactly
// as before (isTeamCoachOrAdmin/canManageTeam above are unchanged). This
// catalog adds finer-grained capabilities on top: a head coach (teamRole
// COACH/ADMIN) gets every permission team-wide for free (see
// hasTeamPermission below), so nothing that already worked requires new
// setup. A capability granted to someone who ISN'T a team COACH/ADMIN
// (an assistant coach, a position coach, a video analyst, team staff) is
// what TeamPermissionGrant rows are for, optionally scoped to one
// PositionGroup. This is the single source of truth every Film Center API
// route must call — never infer access from role name alone.
// =====================================================================

export const PERMISSIONS = [
  /** Create/rename/archive position groups; manage their membership. */
  "MANAGE_POSITION_GROUPS",
  /** Grant/revoke TeamPermissionGrant rows for other users on this team. */
  "GRANT_PERMISSIONS",
  /** Upload new film for the team (or a position group they're scoped to). */
  "UPLOAD_FILM",
  /** Edit/delete/re-tier the visibility of any film on the team (not just your own upload). */
  "MANAGE_FILM",
  /** Leave timestamped comments on film. */
  "COMMENT_FILM",
  /** Draw telestration/annotations on film. */
  "ANNOTATE_FILM",
  /** Tag moments on film using the team's tag definitions. */
  "TAG_FILM",
  /** Create/edit the team's tag-definition vocabulary. */
  "MANAGE_FILM_TAGS",
  /** Create playlists shared at team/position-group scope. */
  "CREATE_PLAYLIST",
  /** Edit/delete playlists you didn't create. */
  "MANAGE_PLAYLISTS",
  /** Assign film/playlists/clips to a team, group, or specific athletes. */
  "CREATE_ASSIGNMENT",
  /** Edit/delete assignments you didn't create. */
  "MANAGE_ASSIGNMENTS",
  /** Answer athlete film-review questions. */
  "RESPOND_REVIEW_REQUESTS",
  /** Write/read private coach notes about athletes. */
  "MANAGE_COACH_NOTES",
  /** Build/edit custom analysis (grading) templates. */
  "MANAGE_ANALYSIS_TEMPLATES",
  /** Grade athletes against an analysis template. */
  "GRADE_FILM",
  /** Generate team/athlete/position/game/season/opponent reports. */
  "GENERATE_REPORTS",
  /** Manage opponents and scouting reports. */
  "MANAGE_SCOUTING",
  /** Share this team's film/playlists with another team. */
  "MANAGE_FILM_SHARING",
  /** Create/edit the team's own custom exercises in the MENTA TRAIN exercise library. */
  "MANAGE_EXERCISE_LIBRARY",
  /** Create/edit/archive MENTA TRAIN training programs (blocks + program exercises) for the team. */
  "MANAGE_TRAINING_PROGRAMS",
  /** Start/pause/resume/complete/cancel a MENTA LIVE session, and create/edit/advance its groups. */
  "RUN_LIVE_SESSION",
  /** Log a TrainingSet on behalf of another athlete (no-phone mode). An athlete logging their own set never needs this — that's an identity check, not a permission. */
  "LOG_TRAINING_SETS",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Effective access check: does `userId` hold `permission` on `teamId`,
 * optionally scoped to `positionGroupId`?
 *
 *  1. SUPER_ADMIN always passes (platform operations only, same carve-out
 *     as the rest of this file).
 *  2. A team COACH/ADMIN (per TeamMembership.teamRole) holds every
 *     permission team-wide for free — this is the "head coach" case, and
 *     it's what keeps every existing coach workflow working unmodified.
 *  3. Otherwise, an explicit TeamPermissionGrant row must exist: either
 *     team-wide (positionGroupId null) or scoped to the exact group asked
 *     about.
 *
 * `positionGroupId` narrows what's being acted on, not the grant's scope —
 * a team-wide grant (positionGroupId null on the grant row) satisfies a
 * check for any group.
 */
export async function hasTeamPermission(
  userId: string,
  teamId: string,
  permission: Permission,
  positionGroupId?: string | null
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === "SUPER_ADMIN") return true;

  if (await isTeamCoachOrAdmin(userId, teamId)) return true;

  const grant = await prisma.teamPermissionGrant.findFirst({
    where: {
      teamId,
      userId,
      permission,
      OR: [{ positionGroupId: null }, ...(positionGroupId ? [{ positionGroupId }] : [])],
    },
    select: { id: true },
  });
  return Boolean(grant);
}

/** Same as hasTeamPermission, but accepts a SessionUser for call-site convenience. */
export async function userHasTeamPermission(
  user: SessionUser,
  teamId: string,
  permission: Permission,
  positionGroupId?: string | null
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  return hasTeamPermission(user.id, teamId, permission, positionGroupId);
}

/** All position groups (on this team) the user belongs to, or has a permission grant scoped to. */
export async function getUserPositionGroupIds(userId: string, teamId: string): Promise<string[]> {
  const [memberships, grants] = await Promise.all([
    prisma.positionGroupMembership.findMany({
      where: { userId, positionGroup: { teamId } },
      select: { positionGroupId: true },
    }),
    prisma.teamPermissionGrant.findMany({
      where: { userId, teamId, positionGroupId: { not: null } },
      select: { positionGroupId: true },
    }),
  ]);
  return Array.from(
    new Set(
      [...memberships.map((m) => m.positionGroupId), ...grants.map((g) => g.positionGroupId)].filter(
        (id): id is string => id !== null
      )
    )
  );
}

/**
 * Grant a permission — application-layer dedup because a team-wide grant
 * (positionGroupId null) can't be a DB unique constraint on SQLite (NULL is
 * distinct in unique indexes there). Silently no-ops if the exact same
 * (team, user, group, permission) row already exists.
 */
export async function grantTeamPermission(params: {
  teamId: string;
  userId: string;
  positionGroupId?: string | null;
  permission: Permission;
  grantedById: string;
}): Promise<void> {
  const existing = await prisma.teamPermissionGrant.findFirst({
    where: {
      teamId: params.teamId,
      userId: params.userId,
      positionGroupId: params.positionGroupId ?? null,
      permission: params.permission,
    },
    select: { id: true },
  });
  if (existing) return;
  await prisma.teamPermissionGrant.create({
    data: {
      teamId: params.teamId,
      userId: params.userId,
      positionGroupId: params.positionGroupId ?? null,
      permission: params.permission,
      grantedById: params.grantedById,
    },
  });
}

export async function revokeTeamPermissionGrant(grantId: string): Promise<void> {
  await prisma.teamPermissionGrant.delete({ where: { id: grantId } });
}
