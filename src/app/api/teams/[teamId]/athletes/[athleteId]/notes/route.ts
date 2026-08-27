import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: Promise<{ teamId: string; athleteId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, athleteId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_COACH_NOTES"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const notes = await prisma.coachNote.findMany({
    where: { teamId, athleteId },
    include: { film: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const coachIds = Array.from(new Set(notes.map((n) => n.coachId)));
  const coaches = await prisma.user.findMany({ where: { id: { in: coachIds } }, select: { id: true, name: true } });
  const nameById = new Map(coaches.map((c) => [c.id, c.name]));

  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      coachId: n.coachId,
      coachName: nameById.get(n.coachId) ?? "Unknown",
      body: n.body,
      filmId: n.filmId,
      filmTitle: n.film?.title ?? null,
      createdAt: n.createdAt,
      isMine: n.coachId === user.id,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string; athleteId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId, athleteId } = await params;

  if (!(await hasTeamPermission(user.id, teamId, "MANAGE_COACH_NOTES"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const athleteMembership = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: athleteId, teamId } } });
  if (!athleteMembership) return NextResponse.json({ error: "That athlete isn't on this team." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const filmId = typeof body?.filmId === "string" ? body.filmId : undefined;
  const clipId = typeof body?.clipId === "string" ? body.clipId : undefined;
  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "Enter a note (up to 4000 characters)." }, { status: 400 });
  }

  const note = await prisma.coachNote.create({
    data: { coachId: user.id, athleteId, teamId, filmId, clipId, body: text },
  });

  await logAudit({ actorId: user.id, action: "coach_note.created", targetType: "CoachNote", targetId: note.id });

  return NextResponse.json({ note });
}
