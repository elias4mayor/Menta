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
import { hasTeamEntitlement } from "@/lib/entitlements";

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

  // Team-scoped resolution only — a coach's own individual plan must
  // never unlock this for the whole roster. See the Scope Resolution
  // Design doc: every TrainingProgram is team-owned (teamId is
  // required), so there's no individual-only case to blend in.
  if (!(await hasTeamEntitlement(teamId, "TRAINING_PROGRAMS"))) {
    return NextResponse.json({
      error: "Training programs aren't included on this team's plan yet. Upgrade the team's MENTA membership to build one.",
    }, { status: 402 });
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
