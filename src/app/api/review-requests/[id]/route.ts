import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isTeamFilmStaff } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const reviewRequest = await prisma.filmReviewRequest.findUnique({ where: { id }, include: { film: true } });
  if (!reviewRequest) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isStaff = reviewRequest.film.teamId ? await isTeamFilmStaff(user.id, reviewRequest.film.teamId) : false;
  if (!isStaff && reviewRequest.coachId !== user.id) {
    return NextResponse.json({ error: "Not authorized to respond." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const response = typeof body?.response === "string" ? body.response.trim() : "";
  if (!response || response.length > 2000) {
    return NextResponse.json({ error: "Enter a response (up to 2000 characters)." }, { status: 400 });
  }

  const updated = await prisma.filmReviewRequest.update({
    where: { id },
    data: { response, status: "ANSWERED", respondedById: user.id, respondedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: reviewRequest.athleteId,
      type: "FILM",
      title: "Your film question was answered",
      link: `/film/${reviewRequest.filmId}`,
    },
  });

  return NextResponse.json({ request: updated });
}
