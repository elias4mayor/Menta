import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isTeamCoachOrAdmin } from "@/lib/permissions";
import { gameSchema, publicGame } from "@/lib/game-day";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const games = await prisma.gameDay.findMany({
    where: { team: { memberships: { some: { userId: user.id } } } },
    orderBy: { startsAt: "desc" }, take: 100,
  });
  return NextResponse.json({ games: games.map(publicGame) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = gameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the names, date, location and HTTPS links." }, { status: 400 });
  if (!(await isTeamCoachOrAdmin(user.id, parsed.data.teamId))) return NextResponse.json({ error: "Team leadership only." }, { status: 403 });
  if (parsed.data.scorerId && !(await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: parsed.data.scorerId, teamId: parsed.data.teamId } } }))) {
    return NextResponse.json({ error: "Choose a current team member as scorekeeper." }, { status: 400 });
  }
  const game = await prisma.gameDay.create({ data: { ...parsed.data, startsAt: new Date(parsed.data.startsAt) } });
  return NextResponse.json({ game: publicGame(game) }, { status: 201 });
}
