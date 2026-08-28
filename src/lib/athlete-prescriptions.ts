import "server-only";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type { athletePrescriptionInputSchema, clearAthletePrescriptionsSchema } from "@/lib/validation";

export class PrescriptionValidationError extends Error {}

type PrescriptionInput = z.infer<typeof athletePrescriptionInputSchema>;
type ClearInput = z.infer<typeof clearAthletePrescriptionsSchema>;

/**
 * The roster a program's prescriptions page defaults to showing: the
 * program's own PositionGroup members when it's scoped to one (matching
 * TrainingProgram.positionGroupId's documented meaning), or the whole
 * team's roster when it's team-wide. This is a UI convenience only —
 * the actual write-time security boundary (assertAthletesOnProgramTeam
 * below) is deliberately broader, matching the literal Phase 5
 * requirement "an athlete may only receive a prescription if they
 * belong to the program's TEAM," not its position group.
 */
export async function getProgramRoster(teamId: string, positionGroupId: string | null) {
  if (positionGroupId) {
    const memberships = await prisma.positionGroupMembership.findMany({
      where: { positionGroupId, groupRole: "ATHLETE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    });
    return memberships.map((m) => m.user);
  }
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId, teamRole: "ATHLETE" },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => m.user);
}

/**
 * Every prescription in the request must target a real ATHLETE member of
 * the program's own team — never a different team's athlete, and never
 * a coach/trainer/staff member on the same team. Checked against
 * TeamMembership directly, not the (narrower) position-group roster
 * above, per the literal Phase 5 requirement.
 */
async function assertAthletesOnProgramTeam(teamId: string, athleteIds: string[]): Promise<void> {
  const unique = Array.from(new Set(athleteIds));
  const count = await prisma.teamMembership.count({
    where: { teamId, teamRole: "ATHLETE", userId: { in: unique } },
  });
  if (count !== unique.length) {
    throw new PrescriptionValidationError("One or more athletes aren't on this team.");
  }
}

/**
 * The programExerciseId in the request must actually belong to *this*
 * program (via its block), and this program must belong to *this* team —
 * both re-checked server-side against the URL's teamId/programId, never
 * trusted just because the client supplied a real-looking id. Returns
 * the row so callers can reuse it without a second query.
 */
async function assertProgramExerciseInProgram(teamId: string, programId: string, programExerciseId: string) {
  const programExercise = await prisma.programExercise.findFirst({
    where: { id: programExerciseId, block: { programId, program: { teamId } } },
    select: { id: true },
  });
  if (!programExercise) {
    throw new PrescriptionValidationError("That exercise doesn't belong to this program.");
  }
  return programExercise;
}

export async function listProgramPrescriptions(programId: string) {
  return prisma.athletePrescription.findMany({
    where: { programExercise: { block: { programId } } },
    include: { athlete: { select: { id: true, name: true } }, setBy: { select: { id: true, name: true } } },
  });
}

export async function upsertPrescriptions(
  teamId: string,
  programId: string,
  actorId: string,
  input: PrescriptionInput
) {
  await assertProgramExerciseInProgram(teamId, programId, input.programExerciseId);
  await assertAthletesOnProgramTeam(
    teamId,
    input.prescriptions.map((p) => p.athleteId)
  );

  return prisma.$transaction(
    input.prescriptions.map((p) =>
      prisma.athletePrescription.upsert({
        where: { programExerciseId_athleteId: { programExerciseId: input.programExerciseId, athleteId: p.athleteId } },
        update: {
          prescribedLoad: p.prescribedLoad,
          prescribedLoadUnit: p.prescribedLoadUnit,
          prescribedReps: p.prescribedReps,
          prescribedSets: p.prescribedSets,
          calculationBasis: p.calculationBasis ?? "MANUAL",
          setById: actorId,
        },
        create: {
          programExerciseId: input.programExerciseId,
          athleteId: p.athleteId,
          prescribedLoad: p.prescribedLoad,
          prescribedLoadUnit: p.prescribedLoadUnit,
          prescribedReps: p.prescribedReps,
          prescribedSets: p.prescribedSets,
          calculationBasis: p.calculationBasis ?? "MANUAL",
          setById: actorId,
        },
        include: { athlete: { select: { id: true, name: true } }, setBy: { select: { id: true, name: true } } },
      })
    )
  );
}

/** Clears an override so the athlete falls back to showing the program default in the UI — never a hard requirement to have a row at all. */
export async function clearPrescriptions(teamId: string, programId: string, input: ClearInput) {
  await assertProgramExerciseInProgram(teamId, programId, input.programExerciseId);
  await assertAthletesOnProgramTeam(teamId, input.athleteIds);

  await prisma.athletePrescription.deleteMany({
    where: { programExerciseId: input.programExerciseId, athleteId: { in: input.athleteIds } },
  });
}

type PrescriptionRecord = Awaited<ReturnType<typeof listProgramPrescriptions>>[number];

export function toPrescriptionJson(p: PrescriptionRecord) {
  return {
    id: p.id,
    programExerciseId: p.programExerciseId,
    athleteId: p.athleteId,
    athleteName: p.athlete.name,
    prescribedLoad: p.prescribedLoad,
    prescribedLoadUnit: p.prescribedLoadUnit,
    prescribedReps: p.prescribedReps,
    prescribedSets: p.prescribedSets,
    calculationBasis: p.calculationBasis,
    setByName: p.setBy.name,
    updatedAt: p.updatedAt,
  };
}
