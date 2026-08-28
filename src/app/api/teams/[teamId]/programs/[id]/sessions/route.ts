import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canRunLiveSession } from "@/lib/permissions";
import { createLiveSessionInputSchema } from "@/lib/validation";
import { createLiveSession, LiveSessionError } from "@/lib/live-sessions";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: programId } = await params;

  if (!(await canRunLiveSession(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLiveSessionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid session." }, { status: 400 });
  }

  try {
    const session = await createLiveSession(teamId, programId, user.id, parsed.data);
    await logAudit({ actorId: user.id, action: "live_session.created", targetType: "TrainingSession", targetId: session.id });
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof LiveSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
