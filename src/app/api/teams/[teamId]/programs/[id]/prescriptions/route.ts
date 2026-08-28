import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canManageTrainingPrograms } from "@/lib/permissions";
import { athletePrescriptionInputSchema, clearAthletePrescriptionsSchema } from "@/lib/validation";
import { upsertPrescriptions, clearPrescriptions, toPrescriptionJson, PrescriptionValidationError } from "@/lib/athlete-prescriptions";
import { logAudit } from "@/lib/audit";

/**
 * One call sets/updates every athlete's number for one program exercise
 * at once — the same "whole document" reasoning as the Program Builder's
 * PATCH, and the shape that directly serves the fast-programming moves
 * Phase 5 asks for (apply the program default to a whole group, copy one
 * athlete's numbers to others): the client always sends the full set of
 * {athleteId, ...values} it wants written, whether that's one athlete
 * being overridden or thirty getting the same copied value.
 */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: programId } = await params;

  if (!(await canManageTrainingPrograms(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = athletePrescriptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid prescription." }, { status: 400 });
  }

  try {
    const rows = await upsertPrescriptions(teamId, programId, user.id, parsed.data);
    await logAudit({
      actorId: user.id,
      action: "athlete_prescription.set",
      targetType: "ProgramExercise",
      targetId: parsed.data.programExerciseId,
    });
    return NextResponse.json({ prescriptions: rows.map(toPrescriptionJson) });
  } catch (err) {
    if (err instanceof PrescriptionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: programId } = await params;

  if (!(await canManageTrainingPrograms(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clearAthletePrescriptionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    await clearPrescriptions(teamId, programId, parsed.data);
    await logAudit({
      actorId: user.id,
      action: "athlete_prescription.cleared",
      targetType: "ProgramExercise",
      targetId: parsed.data.programExerciseId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PrescriptionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
