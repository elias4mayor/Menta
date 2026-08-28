import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole, canRunLiveSession } from "@/lib/permissions";
import { sessionStatusInputSchema } from "@/lib/validation";
import { getSessionRoomView, transitionSessionStatus, LiveSessionError } from "@/lib/live-sessions";
import { logAudit } from "@/lib/audit";

/** The coach/crow's-nest poll target — full room state. See the Phase 6 spec's Real-Time Architecture section for the 4s polling contract this backs. */
export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const room = await getSessionRoomView(teamId, id);
  if (!room) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ session: room });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  if (!(await canRunLiveSession(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sessionStatusInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status." }, { status: 400 });
  }

  try {
    const session = await transitionSessionStatus(teamId, id, parsed.data.status);
    await logAudit({
      actorId: user.id,
      action: `live_session.${parsed.data.status.toLowerCase()}`,
      targetType: "TrainingSession",
      targetId: id,
    });
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof LiveSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
