import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewFilm, isTeamFilmStaff } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isStaff = film.teamId ? await isTeamFilmStaff(user.id, film.teamId) : false;

  const requests = await prisma.filmReviewRequest.findMany({
    where: { filmId, ...(isStaff ? {} : { athleteId: user.id }) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: filmId } = await context.params;
  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (!film || !(await canViewFilm(user, film))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const timestampSec = typeof body?.timestampSec === "number" ? body.timestampSec : null;
  const clipId = typeof body?.clipId === "string" ? body.clipId : null;
  const coachId = typeof body?.coachId === "string" ? body.coachId : null;
  if (!question || question.length > 1000) {
    return NextResponse.json({ error: "Enter a question (up to 1000 characters)." }, { status: 400 });
  }
  if (coachId && film.teamId) {
    const isCoach = await isTeamFilmStaff(coachId, film.teamId);
    if (!isCoach) return NextResponse.json({ error: "That person isn't coaching staff on this team." }, { status: 400 });
  }

  const reviewRequest = await prisma.filmReviewRequest.create({
    data: { filmId, clipId, athleteId: user.id, coachId, timestampSec, question },
  });

  const notifyTargets = coachId
    ? [coachId]
    : film.teamId
      ? (await prisma.teamMembership.findMany({ where: { teamId: film.teamId, teamRole: { in: ["COACH", "ADMIN"] } }, select: { userId: true } })).map((m) => m.userId)
      : [];
  if (notifyTargets.length > 0) {
    await prisma.notification.createMany({
      data: notifyTargets.map((userId) => ({
        userId,
        type: "FILM",
        title: `Film question on ${film.title}`,
        link: `/film/${filmId}`,
      })),
    });
  }

  await logAudit({ actorId: user.id, action: "film_review_request.created", targetType: "FilmReviewRequest", targetId: reviewRequest.id });

  return NextResponse.json({ request: reviewRequest });
}
