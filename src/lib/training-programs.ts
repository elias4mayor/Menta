import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { trainingProgramInputSchema } from "@/lib/validation";

type ProgramInput = z.infer<typeof trainingProgramInputSchema>;

export class ProgramValidationError extends Error {}

/**
 * MENTA LIVE (Phase 6) lock: once a program has a SCHEDULED, LIVE, or
 * PAUSED session, its blocks/exercises can no longer be edited or the
 * whole program archived — a live/about-to-run session must never
 * discover mid-workout that the thing it's running has been rewritten
 * out from under it. AthletePrescription is deliberately NOT locked by
 * this (see src/lib/athlete-prescriptions.ts) — individualized numbers
 * may keep changing while a session is live, per the Phase 6 spec, and
 * the live view re-resolves them on every poll. This never needs to
 * touch already-logged TrainingSet rows either way, since those store
 * their own weight/reps directly and never read live from ProgramExercise
 * — see replaceTeamProgram's own doc comment below.
 */
async function assertProgramNotLockedByLiveSession(programId: string): Promise<void> {
  const activeSessionCount = await prisma.trainingSession.count({
    where: { programId, status: { in: ["SCHEDULED", "LIVE", "PAUSED"] } },
  });
  if (activeSessionCount > 0) {
    throw new ProgramValidationError(
      "This program has a scheduled or live session and can't be edited until that session is completed or canceled."
    );
  }
}

export async function listTeamPrograms(teamId: string) {
  return prisma.trainingProgram.findMany({
    where: { teamId },
    include: {
      positionGroup: { select: { id: true, name: true } },
      blocks: { select: { id: true }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTeamProgram(teamId: string, programId: string) {
  return prisma.trainingProgram.findFirst({
    where: { id: programId, teamId },
    include: {
      positionGroup: { select: { id: true, name: true } },
      blocks: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: { exercise: { select: { id: true, name: true, category: true, sport: true } } },
          },
        },
      },
    },
  });
}

/**
 * Every exerciseId in a save request must be usable by *this* team —
 * global (teamId: null) or this exact team's own custom exercise. This
 * is deliberately stricter than Phase 3's visibleExerciseWhere(), which
 * answers "what can this user see" across every team they belong to —
 * a program belongs to one team and must never reference a *different*
 * team's custom exercise, even one the acting coach can otherwise browse
 * because they also coach that other team. See the Phase 4 spec.
 */
async function assertExercisesUsableByTeam(teamId: string, exerciseIds: string[]): Promise<void> {
  const unique = Array.from(new Set(exerciseIds));
  if (unique.length === 0) return;
  const usableCount = await prisma.exercise.count({
    where: { id: { in: unique }, OR: [{ teamId: null }, { teamId }] },
  });
  if (usableCount !== unique.length) {
    throw new ProgramValidationError("One or more exercises aren't available to this team.");
  }
}

async function assertPositionGroupBelongsToTeam(teamId: string, positionGroupId: string | undefined): Promise<void> {
  if (!positionGroupId) return;
  const group = await prisma.positionGroup.findFirst({ where: { id: positionGroupId, teamId }, select: { id: true } });
  if (!group) {
    throw new ProgramValidationError("That position group doesn't belong to this team.");
  }
}

function blocksCreateInput(input: ProgramInput) {
  return input.blocks.map((block) => ({
    title: block.title,
    blockType: block.blockType,
    order: block.order,
    exercises: {
      create: block.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetLoad: ex.targetLoad,
        targetLoadPercent: ex.targetLoadPercent,
        targetLoadUnit: ex.targetLoadUnit,
        tempo: ex.tempo,
        restSec: ex.restSec,
        durationSec: ex.durationSec,
        distanceMeters: ex.distanceMeters,
        rpeTarget: ex.rpeTarget,
        supersetGroup: ex.supersetGroup,
        notes: ex.notes,
      })),
    },
  }));
}

export async function createTeamProgram(teamId: string, createdById: string, input: ProgramInput) {
  const allExerciseIds = input.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId));
  await assertExercisesUsableByTeam(teamId, allExerciseIds);
  await assertPositionGroupBelongsToTeam(teamId, input.positionGroupId);

  return prisma.trainingProgram.create({
    data: {
      teamId,
      title: input.title,
      description: input.description,
      sport: input.sport,
      positionGroupId: input.positionGroupId,
      status: input.status ?? "DRAFT",
      createdById,
      blocks: { create: blocksCreateInput(input) },
    },
    include: { blocks: { include: { exercises: true } } },
  });
}

/**
 * Whole-document replace: deletes the program's existing blocks (cascades
 * to their ProgramExercise rows per the Phase 2 schema) and recreates
 * them from the request, without ever touching the TrainingProgram row's
 * own id — so a TrainingSession already pointing at this program, or at
 * one of its now-deleted blocks/exercises (SetNull on delete), keeps its
 * own historical TrainingSet data completely unaffected; only the
 * *template* changes. See the Phase 4 spec's "editing doesn't corrupt
 * session history" note — TrainingSet stores its own weight/reps/etc. at
 * log time and never reads live from ProgramExercise, so this is safe by
 * construction.
 */
export async function replaceTeamProgram(teamId: string, programId: string, input: ProgramInput) {
  await assertProgramNotLockedByLiveSession(programId);
  const allExerciseIds = input.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId));
  await assertExercisesUsableByTeam(teamId, allExerciseIds);
  await assertPositionGroupBelongsToTeam(teamId, input.positionGroupId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.trainingProgram.findFirst({ where: { id: programId, teamId }, select: { id: true } });
    if (!existing) throw new ProgramValidationError("Program not found.");

    await tx.trainingBlock.deleteMany({ where: { programId } });
    return tx.trainingProgram.update({
      where: { id: programId },
      data: {
        title: input.title,
        description: input.description,
        sport: input.sport,
        positionGroupId: input.positionGroupId ?? null,
        status: input.status,
        blocks: { create: blocksCreateInput(input) },
      },
      include: { blocks: { include: { exercises: true } } },
    });
  });
}

export async function archiveTeamProgram(teamId: string, programId: string) {
  const existing = await prisma.trainingProgram.findFirst({ where: { id: programId, teamId }, select: { id: true } });
  if (!existing) return null;
  await assertProgramNotLockedByLiveSession(programId);
  return prisma.trainingProgram.update({ where: { id: programId }, data: { status: "ARCHIVED" } });
}

type ProgramSummaryRecord = Awaited<ReturnType<typeof listTeamPrograms>>[number];
type ProgramDetailRecord = NonNullable<Awaited<ReturnType<typeof getTeamProgram>>>;

export function toProgramSummaryJson(p: ProgramSummaryRecord) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    sport: p.sport,
    status: p.status,
    positionGroupName: p.positionGroup?.name ?? null,
    blockCount: p.blocks.length,
    createdAt: p.createdAt,
  };
}

export function toProgramDetailJson(p: ProgramDetailRecord) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    sport: p.sport,
    status: p.status,
    positionGroupId: p.positionGroupId,
    positionGroupName: p.positionGroup?.name ?? null,
    blocks: p.blocks.map((b) => ({
      id: b.id,
      title: b.title,
      blockType: b.blockType,
      order: b.order,
      exercises: b.exercises.map((e) => ({
        id: e.id,
        order: e.order,
        exerciseId: e.exerciseId,
        exerciseName: e.exercise.name,
        exerciseCategory: e.exercise.category,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetLoad: e.targetLoad,
        targetLoadPercent: e.targetLoadPercent,
        targetLoadUnit: e.targetLoadUnit,
        tempo: e.tempo,
        restSec: e.restSec,
        durationSec: e.durationSec,
        distanceMeters: e.distanceMeters,
        rpeTarget: e.rpeTarget,
        supersetGroup: e.supersetGroup,
        notes: e.notes,
      })),
    })),
  };
}
