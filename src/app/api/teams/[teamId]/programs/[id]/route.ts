import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, canManageTrainingPrograms } from "@/lib/permissions";
import { trainingProgramInputSchema } from "@/lib/validation";
import {
  getTeamProgram,
  replaceTeamProgram,
  archiveTeamProgram,
  toProgramDetailJson,
  ProgramValidationError,
} from "@/lib/training-programs";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  const role = await getTeamRole(user.id, teamId);
  if (!role && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const program = await getTeamProgram(teamId, id);
  if (!program) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ program: toProgramDetailJson(program) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  if (!(await canManageTrainingPrograms(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = trainingProgramInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid program." }, { status: 400 });
  }

  try {
    await replaceTeamProgram(teamId, id, parsed.data);
    const full = await getTeamProgram(teamId, id);
    if (!full) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await logAudit({ actorId: user.id, action: "training_program.updated", targetType: "TrainingProgram", targetId: id });
    return NextResponse.json({ program: toProgramDetailJson(full) });
  } catch (err) {
    if (err instanceof ProgramValidationError) {
      const status = err.message === "Program not found." ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}

/** Archives, never hard-deletes — see the Phase 4 spec's Data Safety section: TrainingSession/TrainingSet history must never be at risk of a program row disappearing out from under it. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  if (!(await canManageTrainingPrograms(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const archived = await archiveTeamProgram(teamId, id);
  if (!archived) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "training_program.archived", targetType: "TrainingProgram", targetId: id });
  return NextResponse.json({ ok: true });
}
