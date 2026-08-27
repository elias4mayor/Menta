import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { syncClassroomForUser } from "@/lib/integrations/google-classroom";

const FRIENDLY_ERRORS: Record<string, { status: number; message: string }> = {
  classroom_not_connected: { status: 404, message: "Google Classroom isn't connected yet." },
  classroom_reauthorization_required: {
    status: 401,
    message: "Google Classroom needs to be reconnected — your access has expired.",
  },
  classroom_access_denied: { status: 403, message: "Google denied access to your Classroom data." },
  classroom_rate_limited: { status: 429, message: "Google Classroom is rate-limiting requests — try again shortly." },
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `classroom-sync:${user.id}`), {
    limit: 5,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  try {
    const summary = await syncClassroomForUser(user.id);
    await logAudit({
      actorId: user.id,
      action: "integration.google_classroom.synced",
      targetType: "GoogleClassroomIntegration",
      metadata: summary,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const key = err instanceof Error ? err.message : "unknown";
    const friendly = FRIENDLY_ERRORS[key];
    console.error("[google-classroom] sync failed", key);
    if (friendly) {
      return NextResponse.json({ success: false, error: friendly.message }, { status: friendly.status });
    }
    return NextResponse.json(
      { success: false, error: "Couldn't sync Google Classroom right now. Try again." },
      { status: 502 }
    );
  }
}
