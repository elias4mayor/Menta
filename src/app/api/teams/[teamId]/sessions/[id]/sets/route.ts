import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canLogTrainingSetsForOthers } from "@/lib/permissions";
import { logSetInputSchema } from "@/lib/validation";
import { logSet, LiveSessionError } from "@/lib/live-sessions";

/**
 * Logs (or, for the same athlete/exercise/setNumber, updates) one set.
 * An athlete may only ever pass their own id as athleteId — anything
 * else requires LOG_TRAINING_SETS (no-phone-mode coach logging). See
 * src/lib/live-sessions.ts's logSet() for the upsert-by-key mechanics
 * that make duplicate submission safe without any idempotency-key
 * infrastructure.
 */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: sessionId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = logSetInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid set." }, { status: 400 });
  }

  const canLogForOthers = await canLogTrainingSetsForOthers(user.id, teamId);

  try {
    const set = await logSet(teamId, sessionId, user.id, canLogForOthers, parsed.data);
    return NextResponse.json({ set });
  } catch (err) {
    if (err instanceof LiveSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
