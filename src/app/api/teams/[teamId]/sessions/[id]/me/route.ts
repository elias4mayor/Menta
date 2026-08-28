import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getMySessionView } from "@/lib/live-sessions";

/** The athlete's own poll target — no team-membership check beyond "are you actually a participant," since getMySessionView already scopes strictly to this session/team/athlete. */
export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, id } = await params;

  const view = await getMySessionView(teamId, id, user.id);
  if (!view) return NextResponse.json({ error: "Not in this session." }, { status: 404 });

  return NextResponse.json(view);
}
