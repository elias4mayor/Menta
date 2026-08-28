import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, canManageTrainingPrograms } from "@/lib/permissions";
import { trainingProgramInputSchema } from "@/lib/validation";
import {
  listTeamPrograms,
  getTeamProgram,
  createTeamProgram,
  toProgramSummaryJson,
  toProgramDetailJson,
  ProgramValidationError,
} from "@/lib/training-programs";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  const role = await getTeamRole(user.id, teamId);
  if (!role && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const programs = await listTeamPrograms(teamId);
  return NextResponse.json({ programs: programs.map(toProgramSummaryJson) });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await canManageTrainingPrograms(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = trainingProgramInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid program." }, { status: 400 });
  }

  try {
    const created = await createTeamProgram(teamId, user.id, parsed.data);
    const full = await getTeamProgram(teamId, created.id);
    if (!full) return NextResponse.json({ error: "Program failed to save." }, { status: 500 });

    await logAudit({ actorId: user.id, action: "training_program.created", targetType: "TrainingProgram", targetId: created.id });
    return NextResponse.json({ program: toProgramDetailJson(full) });
  } catch (err) {
    if (err instanceof ProgramValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
