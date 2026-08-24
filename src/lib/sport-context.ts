import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, AthleteSportContext } from "@prisma/client";

/**
 * The multi-sport foundation's write path. AthleteSportContext is the real
 * source of truth for an athlete's sport/position (see the deprecation
 * comment on AthleteProfile.sport/.position in schema.prisma); every
 * function here that changes which context is primary, or activates/
 * deactivates one, does the AthleteProfile.sport/.position mirror update in
 * the SAME transaction, so the ~7 read sites that predate multi-sport keep
 * seeing a consistent value without being rewritten.
 *
 * Ownership is checked by every exported function that takes a
 * sportContextId — never trust a client-provided id without verifying it
 * belongs to the calling athlete first (userId is always part of the
 * where-clause, never a bolt-on check after the fact).
 */

export class SportContextError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "DUPLICATE_SPORT"
      | "LAST_ACTIVE_SPORT"
      | "ALREADY_ACTIVE"
  ) {
    super(message);
    this.name = "SportContextError";
  }
}

type Tx = Prisma.TransactionClient;

async function syncAthleteProfileMirror(
  tx: Tx,
  userId: string,
  sport: string,
  position: string | null
) {
  await tx.athleteProfile.update({
    where: { userId },
    data: { sport, position },
  });
}

/** All of an athlete's sport contexts, active ones first, primary first within that. */
export async function listSportContexts(userId: string): Promise<AthleteSportContext[]> {
  return prisma.athleteSportContext.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

/** Fetches a context and verifies it belongs to `userId` — throws SportContextError("NOT_FOUND") otherwise. */
export async function getOwnedSportContext(
  userId: string,
  sportContextId: string
): Promise<AthleteSportContext> {
  const context = await prisma.athleteSportContext.findUnique({ where: { id: sportContextId } });
  if (!context || context.userId !== userId) {
    throw new SportContextError("Sport not found.", "NOT_FOUND");
  }
  return context;
}

/**
 * Creates a new sport for this athlete, or reactivates it if the athlete
 * had previously removed (deactivated) that exact sport — the
 * @@unique([userId, sport]) row is reused rather than duplicated. The
 * athlete's very first sport is always made primary regardless of what's
 * passed in; later ones default to non-primary unless makePrimary is set.
 */
export async function createOrReactivateSportContext(
  userId: string,
  params: { sport: string; position?: string | null; teamId?: string | null; makePrimary?: boolean }
): Promise<AthleteSportContext> {
  const position = params.position ?? null;
  const teamId = params.teamId ?? null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.athleteSportContext.findUnique({
      where: { userId_sport: { userId, sport: params.sport } },
    });

    if (existing?.isActive) {
      throw new SportContextError("You already have this sport.", "DUPLICATE_SPORT");
    }

    const activeCount = await tx.athleteSportContext.count({ where: { userId, isActive: true } });
    const isFirstSport = activeCount === 0;
    const makePrimary = isFirstSport || Boolean(params.makePrimary);

    if (makePrimary) {
      await tx.athleteSportContext.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const result = existing
      ? await tx.athleteSportContext.update({
          where: { id: existing.id },
          data: { position, teamId, isActive: true, isPrimary: makePrimary },
        })
      : await tx.athleteSportContext.create({
          data: { userId, sport: params.sport, position, teamId, isActive: true, isPrimary: makePrimary },
        });

    if (makePrimary) {
      await syncAthleteProfileMirror(tx, userId, result.sport, result.position);
    }

    return result;
  });
}

/** Updates position/teamId on an existing context the athlete owns. Does not touch isPrimary/isActive. */
export async function updateSportContextDetails(
  userId: string,
  sportContextId: string,
  params: { position?: string | null; teamId?: string | null }
): Promise<AthleteSportContext> {
  return prisma.$transaction(async (tx) => {
    const context = await tx.athleteSportContext.findUnique({ where: { id: sportContextId } });
    if (!context || context.userId !== userId) {
      throw new SportContextError("Sport not found.", "NOT_FOUND");
    }

    const position = params.position !== undefined ? params.position : context.position;
    const teamId = params.teamId !== undefined ? params.teamId : context.teamId;

    const result = await tx.athleteSportContext.update({
      where: { id: sportContextId },
      data: { position, teamId },
    });

    if (result.isPrimary && result.isActive) {
      await syncAthleteProfileMirror(tx, userId, result.sport, result.position);
    }

    return result;
  });
}

/**
 * Switches which active sport is primary. Transactional: unsets the old
 * primary, sets the new one, and mirror-syncs AthleteProfile.sport/
 * .position — all inside one transaction so a crash mid-switch can never
 * leave two primaries, zero primaries, or a mirror that disagrees with the
 * real primary context.
 */
export async function setPrimarySportContext(
  userId: string,
  sportContextId: string
): Promise<AthleteSportContext> {
  return prisma.$transaction(async (tx) => {
    const context = await tx.athleteSportContext.findUnique({ where: { id: sportContextId } });
    if (!context || context.userId !== userId) {
      throw new SportContextError("Sport not found.", "NOT_FOUND");
    }
    if (!context.isActive) {
      throw new SportContextError("Reactivate this sport before making it primary.", "NOT_FOUND");
    }

    if (!context.isPrimary) {
      await tx.athleteSportContext.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const result = await tx.athleteSportContext.update({
      where: { id: sportContextId },
      data: { isPrimary: true },
    });

    await syncAthleteProfileMirror(tx, userId, result.sport, result.position);

    return result;
  });
}

/**
 * Deactivates (never hard-deletes) a sport context, preserving every
 * historical Workout/PerformanceEntry/Goal/RecruitingSchool/Film row that
 * points at it. An athlete must always keep at least one active sport, so
 * deactivating their only remaining active context is rejected outright.
 * Deactivating the current primary promotes the next-oldest active context
 * to primary and mirror-syncs it — all in the same transaction.
 */
export async function deactivateSportContext(
  userId: string,
  sportContextId: string
): Promise<{ deactivated: AthleteSportContext; newPrimary: AthleteSportContext | null }> {
  return prisma.$transaction(async (tx) => {
    const context = await tx.athleteSportContext.findUnique({ where: { id: sportContextId } });
    if (!context || context.userId !== userId) {
      throw new SportContextError("Sport not found.", "NOT_FOUND");
    }
    if (!context.isActive) {
      throw new SportContextError("This sport is already removed.", "ALREADY_ACTIVE");
    }

    const otherActive = await tx.athleteSportContext.findMany({
      where: { userId, isActive: true, id: { not: sportContextId } },
      orderBy: { createdAt: "asc" },
    });

    if (otherActive.length === 0) {
      throw new SportContextError(
        "You need at least one active sport — add another before removing this one.",
        "LAST_ACTIVE_SPORT"
      );
    }

    const deactivated = await tx.athleteSportContext.update({
      where: { id: sportContextId },
      data: { isActive: false, isPrimary: false },
    });

    let newPrimary: AthleteSportContext | null = null;
    if (context.isPrimary) {
      const promoted = otherActive.find((c) => c.isPrimary) ?? otherActive[0];
      newPrimary = await tx.athleteSportContext.update({
        where: { id: promoted.id },
        data: { isPrimary: true },
      });
      await syncAthleteProfileMirror(tx, userId, newPrimary.sport, newPrimary.position);
    }

    return { deactivated, newPrimary };
  });
}
