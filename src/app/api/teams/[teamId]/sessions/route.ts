import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole } from "@/lib/permissions";
import { listTeamSessions } from "@/lib/live-sessions";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "You're not on that team." }, { status: 403 });
  }

  const sessions = await listTeamSessions(teamId);
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      programTitle: s.program?.title ?? null,
      scheduledAt: s.scheduledAt,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      createdAt: s.createdAt,
    })),
  });
}
