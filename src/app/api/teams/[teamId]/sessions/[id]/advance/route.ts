import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canRunLiveSession } from "@/lib/permissions";
import { advanceInputSchema } from "@/lib/validation";
import { advanceWholeRoom, LiveSessionError } from "@/lib/live-sessions";

/** Advances every group in the session to the same target at once — the convenience wrapper for a simple, non-station session. */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: sessionId } = await params;

  if (!(await canRunLiveSession(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = advanceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid target." }, { status: 400 });
  }

  try {
    const session = await advanceWholeRoom(teamId, sessionId, parsed.data.programExerciseId);
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof LiveSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
