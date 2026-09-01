import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  createLiveSessionInputSchema,
  createSessionGroupInputSchema,
  updateSessionGroupInputSchema,
  logSetInputSchema,
} from "@/lib/validation";

export class LiveSessionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type CreateSessionInput = z.infer<typeof createLiveSessionInputSchema>;
type CreateGroupInput = z.infer<typeof createSessionGroupInputSchema>;
type UpdateGroupInput = z.infer<typeof updateSessionGroupInputSchema>;
type LogSetInput = z.infer<typeof logSetInputSchema>;

/// The only valid state transitions — see the Phase 6 spec's lifecycle
/// section. COMPLETE and CANCELED are terminal: a completed/canceled
/// session can never be reopened, which is what makes "historical
/// integrity" an actual guarantee rather than a hope.
export const SESSION_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["LIVE", "CANCELED"],
  LIVE: ["PAUSED", "COMPLETE", "CANCELED"],
  PAUSED: ["LIVE", "COMPLETE", "CANCELED"],
  COMPLETE: [],
  CANCELED: [],
};

async function assertAthletesOnTeam(teamId: string, athleteIds: string[]): Promise<void> {
  const unique = Array.from(new Set(athleteIds));
  const count = await prisma.teamMembership.count({
    where: { teamId, teamRole: "ATHLETE", userId: { in: unique } },
  });
  if (count !== unique.length) {
    throw new LiveSessionError("One or more athletes aren't on this team.");
  }
}

async function getSessionOrThrow(teamId: string, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({ where: { id: sessionId, teamId } });
  if (!session) throw new LiveSessionError("Session not found.", 404);
  return session;
}

/// The first real (block, programExercise) pair in program order — what
/// a brand-new session/group starts pointed at. Skips any leading blocks
/// that have no exercises yet rather than assuming block 0 always has one.
async function firstProgramExercise(programId: string): Promise<{ blockId: string; programExerciseId: string } | null> {
  const blocks = await prisma.trainingBlock.findMany({
    where: { programId },
    orderBy: { order: "asc" },
    include: { exercises: { orderBy: { order: "asc" }, take: 1 } },
  });
  for (const block of blocks) {
    if (block.exercises[0]) return { blockId: block.id, programExerciseId: block.exercises[0].id };
  }
  return null;
}

async function assertProgramExerciseInSessionProgram(
  session: { programId: string | null },
  programExerciseId: string
) {
  if (!session.programId) throw new LiveSessionError("This session has no program.");
  const pe = await prisma.programExercise.findFirst({
    where: { id: programExerciseId, block: { programId: session.programId } },
  });
  if (!pe) throw new LiveSessionError("That exercise doesn't belong to this session's program.");
  return pe;
}

/**
 * Creates a session from a program — transactional, per the Phase 6
 * spec: an invalid athlete anywhere in the request means zero rows are
 * created, never a partial session. Always starts SCHEDULED; going LIVE
 * is a separate, explicit transitionSessionStatus() call. Every group
 * (auto-created "Everyone" group when the caller only supplies
 * athleteIds, or the caller's own named groups) starts pointed at the
 * same first program exercise as the session itself.
 */
export async function createLiveSession(
  teamId: string,
  programId: string,
  actorId: string,
  input: CreateSessionInput
) {
  const program = await prisma.trainingProgram.findFirst({ where: { id: programId, teamId } });
  if (!program) throw new LiveSessionError("Program not found.", 404);
  if (program.status === "ARCHIVED") throw new LiveSessionError("Can't start a session from an archived program.");

  const groupsInput: CreateGroupInput[] = input.groups ?? [{ name: "Everyone", athleteIds: input.athleteIds ?? [] }];
  const allAthleteIds = groupsInput.flatMap((g) => g.athleteIds);
  if (allAthleteIds.length === 0) throw new LiveSessionError("At least one athlete is required.");
  await assertAthletesOnTeam(teamId, allAthleteIds);

  const seen = new Set<string>();
  for (const athleteId of allAthleteIds) {
    if (seen.has(athleteId)) throw new LiveSessionError("An athlete can't be assigned to two groups in the same session.");
    seen.add(athleteId);
  }

  const start = await firstProgramExercise(programId);

  return prisma.$transaction(async (tx) => {
    const session = await tx.trainingSession.create({
      data: {
        teamId,
        programId,
        title: input.title,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        status: "SCHEDULED",
        currentBlockId: start?.blockId,
        currentProgramExerciseId: start?.programExerciseId,
        createdById: actorId,
      },
    });
    for (const g of groupsInput) {
      const group = await tx.trainingGroup.create({
        data: {
          sessionId: session.id,
          name: g.name,
          stationLabel: g.stationLabel,
          currentBlockId: start?.blockId,
          currentProgramExerciseId: start?.programExerciseId,
        },
      });
      await tx.trainingGroupMember.createMany({
        data: g.athleteIds.map((athleteId) => ({ groupId: group.id, sessionId: session.id, athleteId })),
      });
    }
    return session;
  });
}

export async function transitionSessionStatus(teamId: string, sessionId: string, targetStatus: string) {
  const session = await getSessionOrThrow(teamId, sessionId);
  const allowed = SESSION_TRANSITIONS[session.status] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new LiveSessionError(`Can't move a ${session.status} session to ${targetStatus}.`, 409);
  }

  const data: {
    status: string;
    startedAt?: Date;
    pausedAt?: Date | null;
    completedAt?: Date;
  } = { status: targetStatus };
  if (targetStatus === "LIVE" && session.status === "SCHEDULED") data.startedAt = new Date();
  if (targetStatus === "PAUSED") data.pausedAt = new Date();
  if (targetStatus === "LIVE" && session.status === "PAUSED") data.pausedAt = null;
  if (targetStatus === "COMPLETE") data.completedAt = new Date();

  return prisma.trainingSession.update({ where: { id: sessionId }, data });
}

export async function createSessionGroup(teamId: string, sessionId: string, input: CreateGroupInput) {
  const session = await getSessionOrThrow(teamId, sessionId);
  await assertAthletesOnTeam(teamId, input.athleteIds);

  const conflicting = await prisma.trainingGroupMember.findMany({
    where: { sessionId, athleteId: { in: input.athleteIds } },
    select: { athleteId: true },
  });
  if (conflicting.length > 0) {
    throw new LiveSessionError("One or more athletes already belong to a group in this session.");
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.trainingGroup.create({
      data: {
        sessionId,
        name: input.name,
        stationLabel: input.stationLabel,
        currentBlockId: session.currentBlockId,
        currentProgramExerciseId: session.currentProgramExerciseId,
      },
    });
    await tx.trainingGroupMember.createMany({
      data: input.athleteIds.map((athleteId) => ({ groupId: group.id, sessionId, athleteId })),
    });
    return group;
  });
}

export async function updateSessionGroup(
  teamId: string,
  sessionId: string,
  groupId: string,
  input: UpdateGroupInput
) {
  const group = await prisma.trainingGroup.findFirst({
    where: { id: groupId, sessionId, session: { teamId } },
  });
  if (!group) throw new LiveSessionError("Group not found.", 404);

  if (input.athleteIds) {
    await assertAthletesOnTeam(teamId, input.athleteIds);
    const conflicting = await prisma.trainingGroupMember.findMany({
      where: { sessionId, athleteId: { in: input.athleteIds }, groupId: { not: groupId } },
      select: { athleteId: true },
    });
    if (conflicting.length > 0) {
      throw new LiveSessionError("One or more athletes already belong to a different group in this session.");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (input.name !== undefined || input.stationLabel !== undefined) {
      await tx.trainingGroup.update({
        where: { id: groupId },
        data: { name: input.name, stationLabel: input.stationLabel },
      });
    }
    if (input.athleteIds) {
      await tx.trainingGroupMember.deleteMany({ where: { groupId } });
      await tx.trainingGroupMember.createMany({
        data: input.athleteIds.map((athleteId) => ({ groupId, sessionId, athleteId })),
      });
    }
    return tx.trainingGroup.findUniqueOrThrow({ where: { id: groupId } });
  });
}

/** Sets one group's live pointer. The client (which already has the full program loaded) computes "next"; the server only verifies the target genuinely belongs to this session's program. */
export async function advanceGroup(teamId: string, sessionId: string, groupId: string, programExerciseId: string) {
  const session = await getSessionOrThrow(teamId, sessionId);
  if (session.status !== "LIVE") throw new LiveSessionError("Session must be live to advance.", 409);
  const group = await prisma.trainingGroup.findFirst({ where: { id: groupId, sessionId } });
  if (!group) throw new LiveSessionError("Group not found.", 404);
  const pe = await assertProgramExerciseInSessionProgram(session, programExerciseId);
  return prisma.trainingGroup.update({
    where: { id: groupId },
    data: { currentBlockId: pe.blockId, currentProgramExerciseId: pe.id },
  });
}

/** The "advance the whole room" convenience — applies the same target to the session and every one of its groups in one transaction. */
export async function advanceWholeRoom(teamId: string, sessionId: string, programExerciseId: string) {
  const session = await getSessionOrThrow(teamId, sessionId);
  if (session.status !== "LIVE") throw new LiveSessionError("Session must be live to advance.", 409);
  const pe = await assertProgramExerciseInSessionProgram(session, programExerciseId);
  return prisma.$transaction(async (tx) => {
    await tx.trainingSession.update({
      where: { id: sessionId },
      data: { currentBlockId: pe.blockId, currentProgramExerciseId: pe.id },
    });
    await tx.trainingGroup.updateMany({
      where: { sessionId },
      data: { currentBlockId: pe.blockId, currentProgramExerciseId: pe.id },
    });
    return tx.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
  });
}

/**
 * Logs one set — upsert-by-(session, athlete, programExercise, setNumber),
 * never a blind insert. This is what makes duplicate submission safe
 * without any idempotency-key infrastructure: a double-tap or network
 * retry for "set 3" just updates set 3's row again with the same values.
 * A coach's deliberate correction afterward is the exact same call —
 * editedAt gets stamped, loggedAt (the original moment) never moves.
 */
export async function logSet(
  teamId: string,
  sessionId: string,
  actorId: string,
  actorCanLogForOthers: boolean,
  input: LogSetInput
) {
  const session = await getSessionOrThrow(teamId, sessionId);
  if (session.status !== "LIVE") throw new LiveSessionError("Session isn't live.", 409);

  const isSelf = input.athleteId === actorId;
  if (!isSelf && !actorCanLogForOthers) {
    throw new LiveSessionError("Not authorized to log a set for another athlete.", 403);
  }
  await assertAthletesOnTeam(teamId, [input.athleteId]);
  const pe = await assertProgramExerciseInSessionProgram(session, input.programExerciseId);

  if (input.groupId) {
    const member = await prisma.trainingGroupMember.findFirst({
      where: { groupId: input.groupId, sessionId, athleteId: input.athleteId },
    });
    if (!member) throw new LiveSessionError("Athlete isn't a member of that group in this session.");
  }

  const existing = await prisma.trainingSet.findFirst({
    where: {
      sessionId,
      athleteId: input.athleteId,
      programExerciseId: input.programExerciseId,
      setNumber: input.setNumber,
    },
  });

  const shared = {
    sessionId,
    teamId,
    exerciseId: pe.exerciseId,
    programExerciseId: pe.id,
    groupId: input.groupId,
    athleteId: input.athleteId,
    loggedById: actorId,
    setNumber: input.setNumber,
    reps: input.reps,
    weight: input.weight,
    weightUnit: input.weightUnit,
    rpe: input.rpe,
    durationSec: input.durationSec,
    distanceMeters: input.distanceMeters,
    completed: input.completed ?? true,
    notes: input.notes,
  };

  if (existing) {
    return prisma.trainingSet.update({ where: { id: existing.id }, data: { ...shared, editedAt: new Date() } });
  }
  return prisma.trainingSet.create({ data: shared });
}

/** parses "5" -> 5 but leaves "8-10"/"AMRAP"/"max" as null rather than guessing — see resolveActualPrefill. */
function parseIntReps(reps: string | null): number | null {
  if (!reps) return null;
  const n = Number(reps.trim());
  return Number.isInteger(n) ? n : null;
}

export type ResolvedPrescription = {
  source: "prescription" | "default";
  load: number | null;
  loadUnit: string | null;
  loadPercent: number | null;
  reps: string | null;
  sets: number | null;
  restSec: number | null;
};

/**
 * The strict resolution order the Phase 6 spec requires — AthletePrescription
 * beats ProgramExercise, never the reverse. restSec always comes from the
 * ProgramExercise regardless of source: AthletePrescription has no rest
 * field, and a coach adjusting rest verbally doesn't need one — see the
 * spec's rest-timer section.
 */
export async function resolvePrescribed(programExerciseId: string, athleteId: string): Promise<ResolvedPrescription> {
  const [prescription, pe] = await Promise.all([
    prisma.athletePrescription.findUnique({
      where: { programExerciseId_athleteId: { programExerciseId, athleteId } },
    }),
    prisma.programExercise.findUniqueOrThrow({ where: { id: programExerciseId } }),
  ]);
  const hasPrescription =
    prescription && (prescription.prescribedLoad != null || prescription.prescribedReps != null || prescription.prescribedSets != null);

  if (hasPrescription) {
    return {
      source: "prescription",
      load: prescription.prescribedLoad,
      loadUnit: prescription.prescribedLoadUnit,
      loadPercent: null,
      reps: prescription.prescribedReps,
      sets: prescription.prescribedSets,
      restSec: pe.restSec,
    };
  }
  return {
    source: "default",
    load: pe.targetLoad,
    loadUnit: pe.targetLoadUnit,
    loadPercent: pe.targetLoadPercent,
    reps: pe.targetReps,
    sets: pe.targetSets,
    restSec: pe.restSec,
  };
}

/**
 * What pre-fills the actual-entry inputs — distinct from the fixed
 * "PRESCRIBED" display above. Set 1 prefills from the prescription; every
 * set after that prefills from the athlete's own most recent logged set
 * this session, so a coach's live, verbal correction ("give him 225
 * instead") naturally carries forward without touching AthletePrescription
 * or ProgramExercise at all — the deliberate no-new-model answer to the
 * Phase 6 spec's live-adjustment question.
 */
export async function resolveActualPrefill(sessionId: string, athleteId: string, programExerciseId: string) {
  const lastSet = await prisma.trainingSet.findFirst({
    where: { sessionId, athleteId, programExerciseId },
    orderBy: { setNumber: "desc" },
  });
  if (lastSet) return { load: lastSet.weight, reps: lastSet.reps };
  const prescribed = await resolvePrescribed(programExerciseId, athleteId);
  return { load: prescribed.load, reps: parseIntReps(prescribed.reps) };
}

const BEHIND_SET_THRESHOLD = 2;

export type MemberStatus = "NOT_STARTED" | "IN_SET" | "RESTING" | "COMPLETE" | "BEHIND";

/**
 * The coach's full room state — the crow's-nest poll target. Status is
 * entirely inferred from TrainingSet timestamps/counts, never a stored
 * field: there's no server-side "started this set" event (the athlete's
 * "Start Set" tap is purely a client-side UI reveal, no network call,
 * per the fastest-possible-path requirement), so IN_SET is an honest
 * approximation ("has logged fewer than prescribed, isn't resting"), not
 * a precisely tracked state. BEHIND compares an athlete's completed-set
 * count against their own group's median — a deterministic comparison,
 * never a guess.
 */
export async function getSessionRoomView(teamId: string, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, teamId },
    include: {
      program: { select: { id: true, title: true } },
      currentBlock: { select: { id: true, title: true } },
      groups: {
        orderBy: { createdAt: "asc" },
        include: {
          currentProgramExercise: { include: { exercise: { select: { name: true } } } },
          members: { include: { athlete: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!session) return null;

  const groups = await Promise.all(
    session.groups.map(async (group) => {
      const programExerciseId = group.currentProgramExerciseId;
      let targetSets: number | null = null;
      let restSec: number | null = null;
      if (programExerciseId) {
        const pe = await prisma.programExercise.findUnique({
          where: { id: programExerciseId },
          select: { targetSets: true, restSec: true },
        });
        targetSets = pe?.targetSets ?? null;
        restSec = pe?.restSec ?? null;
      }

      const members = await Promise.all(
        group.members.map(async (m) => {
          if (!programExerciseId) {
            return { athleteId: m.athleteId, athleteName: m.athlete.name, status: "NOT_STARTED" as MemberStatus, completedSets: 0 };
          }
          const sets = await prisma.trainingSet.findMany({
            where: { sessionId, athleteId: m.athleteId, programExerciseId },
            orderBy: { loggedAt: "desc" },
          });
          const completedSets = sets.filter((s) => s.completed).length;
          const lastLoggedAt = sets[0]?.loggedAt ?? null;

          let status: MemberStatus;
          if (targetSets != null && completedSets >= targetSets) status = "COMPLETE";
          else if (lastLoggedAt && restSec != null && (Date.now() - lastLoggedAt.getTime()) / 1000 < restSec) status = "RESTING";
          else if (completedSets > 0) status = "IN_SET";
          else status = "NOT_STARTED";

          return { athleteId: m.athleteId, athleteName: m.athlete.name, status, completedSets, lastLoggedAt };
        })
      );

      const counts = members.map((m) => m.completedSets).sort((a, b) => a - b);
      const median = counts.length > 0 ? counts[Math.floor(counts.length / 2)] : 0;
      const withBehind = members.map((m) =>
        m.status !== "COMPLETE" && median - m.completedSets >= BEHIND_SET_THRESHOLD ? { ...m, status: "BEHIND" as MemberStatus } : m
      );

      return {
        id: group.id,
        name: group.name,
        stationLabel: group.stationLabel,
        currentExerciseName: group.currentProgramExercise?.exercise.name ?? null,
        members: withBehind,
      };
    })
  );

  return {
    id: session.id,
    title: session.title,
    status: session.status,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    programTitle: session.program?.title ?? null,
    currentBlockTitle: session.currentBlock?.title ?? null,
    groups,
  };
}

/** The athlete's own poll target — their current assignment, resolved prescription, and progress on it. Returns null if they aren't a participant in this session at all. */
export async function getMySessionView(teamId: string, sessionId: string, athleteId: string) {
  const member = await prisma.trainingGroupMember.findFirst({
    where: { sessionId, athleteId, session: { teamId } },
    include: {
      session: { select: { id: true, title: true, status: true } },
      group: {
        include: { currentProgramExercise: { include: { exercise: { select: { id: true, name: true, category: true } } } } },
      },
    },
  });
  if (!member) return null;

  const pe = member.group.currentProgramExercise;
  if (!pe) {
    return { session: member.session, groupId: member.groupId, exercise: null };
  }

  const [prescribed, prefill, sets] = await Promise.all([
    resolvePrescribed(pe.id, athleteId),
    resolveActualPrefill(sessionId, athleteId, pe.id),
    prisma.trainingSet.findMany({
      where: { sessionId, athleteId, programExerciseId: pe.id },
      orderBy: { setNumber: "asc" },
    }),
  ]);

  const completedCount = sets.filter((s) => s.completed).length;
  const lastSet = sets[sets.length - 1];

  return {
    session: member.session,
    groupId: member.groupId,
    exercise: { id: pe.id, name: pe.exercise.name, category: pe.exercise.category },
    prescribed,
    prefill,
    setsCompleted: completedCount,
    totalSets: prescribed.sets,
    nextSetNumber: completedCount + 1,
    lastLoggedAt: lastSet?.loggedAt ?? null,
  };
}

export type SessionCompletionSummary = {
  title: string;
  startedAt: Date | null;
  completedAt: Date | null;
  totalSetsLogged: number;
  athletesParticipating: number;
  mySetsLogged?: number;
};

/**
 * The Session Complete screen's read — deliberately its own function
 * rather than an addition to getSessionRoomView/getMySessionView, so
 * those two polled hot-paths stay untouched. Aggregates completed
 * TrainingSet rows for the whole session; mySetsLogged is only computed
 * when the caller passes their own athleteId, never another athlete's.
 */
export async function getSessionCompletionSummary(
  teamId: string,
  sessionId: string,
  athleteId?: string
): Promise<SessionCompletionSummary | null> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, teamId },
    select: { title: true, startedAt: true, completedAt: true },
  });
  if (!session) return null;

  const sets = await prisma.trainingSet.findMany({
    where: { sessionId, completed: true },
    select: { athleteId: true },
  });
  const athleteIds = new Set(sets.map((s) => s.athleteId));

  return {
    title: session.title,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalSetsLogged: sets.length,
    athletesParticipating: athleteIds.size,
    mySetsLogged: athleteId ? sets.filter((s) => s.athleteId === athleteId).length : undefined,
  };
}

export async function listTeamSessions(teamId: string) {
  return prisma.trainingSession.findMany({
    where: { teamId },
    include: { program: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export type TeamTodaySession = {
  id: string;
  title: string;
  status: "LIVE" | "SCHEDULED";
  scheduledAt: Date | null;
  startedAt: Date | null;
  athleteCount: number;
};

/**
 * Every session relevant to "today" for a whole team — the Coach Command
 * Center's read, as opposed to src/lib/my-day.ts's getTodaySession()
 * which is deliberately athlete-scoped (via TrainingGroupMember). This
 * one is scoped by teamId directly since a coach isn't necessarily a
 * participant in any session themselves. Same "what counts as today"
 * rule as the athlete version, kept independently here rather than
 * shared: LIVE always counts; SCHEDULED counts if scheduledAt falls
 * today, or has no scheduledAt but was created today. Sorted LIVE-first,
 * then earliest relevant timestamp — the caller decides how many to
 * feature vs. summarize.
 */
export async function getTeamTodaySessions(teamId: string, now: Date): Promise<TeamTodaySession[]> {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const sessions = await prisma.trainingSession.findMany({
    where: {
      teamId,
      OR: [
        { status: "LIVE" },
        { status: "SCHEDULED", scheduledAt: { gte: dayStart, lte: dayEnd } },
        { status: "SCHEDULED", scheduledAt: null, createdAt: { gte: dayStart, lte: dayEnd } },
      ],
    },
    include: { _count: { select: { groupMemberships: true } } },
  });

  const sorted = [...sessions].sort((a, b) => {
    const aLive = a.status === "LIVE" ? 0 : 1;
    const bLive = b.status === "LIVE" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    const aTime = (a.startedAt ?? a.scheduledAt ?? a.createdAt).getTime();
    const bTime = (b.startedAt ?? b.scheduledAt ?? b.createdAt).getTime();
    return aTime - bTime;
  });

  return sorted.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status as "LIVE" | "SCHEDULED",
    scheduledAt: s.scheduledAt,
    startedAt: s.startedAt,
    athleteCount: s._count.groupMemberships,
  }));
}
