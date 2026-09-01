import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole } from "@/lib/permissions";
import { getSessionCompletionSummary } from "@/lib/live-sessions";

/** The Session Complete screen's one-shot read (terminal state, no polling) — same team-membership gate as the room-view GET. Always scoped to the caller's own athleteId for mySetsLogged, never another athlete's. */
export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const summary = await getSessionCompletionSummary(teamId, id, user.id);
  if (!summary) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(summary);
}
