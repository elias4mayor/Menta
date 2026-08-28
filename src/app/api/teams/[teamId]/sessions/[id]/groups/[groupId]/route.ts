import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canRunLiveSession } from "@/lib/permissions";
import { updateSessionGroupInputSchema } from "@/lib/validation";
import { updateSessionGroup, LiveSessionError } from "@/lib/live-sessions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; id: string; groupId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id: sessionId, groupId } = await params;

  if (!(await canRunLiveSession(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSessionGroupInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  try {
    const group = await updateSessionGroup(teamId, sessionId, groupId, parsed.data);
    return NextResponse.json({ group });
  } catch (err) {
    if (err instanceof LiveSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
