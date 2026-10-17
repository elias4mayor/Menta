import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { gameDayAccess } from "@/lib/permissions";
import { gameSchema, publicGame, scoreSchema } from "@/lib/game-day";
import { z } from "zod";

const settingsSchema = gameSchema.omit({ teamId: true }).extend({ version: z.number().int().min(0) });

export async function DELETE(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { gameId } = await params;
  const game = await prisma.gameDay.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Game unavailable." }, { status: 404 });
  if (!(await gameDayAccess(user.id, game)).manage) return NextResponse.json({ error: "Team leadership only." }, { status: 403 });
  await prisma.gameDay.update({ where: { id: gameId }, data: { published: false, version: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { gameId } = await params;
  const game = await prisma.gameDay.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Game unavailable." }, { status: 404 });
  if (!(await gameDayAccess(user.id, game)).manage) return NextResponse.json({ error: "Team leadership only." }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the game details and HTTPS links." }, { status: 400 });
  const { version, ...settings } = parsed.data;
  if (settings.scorerId && !(await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: settings.scorerId, teamId: game.teamId } } }))) {
    return NextResponse.json({ error: "Choose a current team member as scorekeeper." }, { status: 400 });
  }
  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.gameDay.updateMany({ where: { id: gameId, version }, data: { ...settings, startsAt: new Date(settings.startsAt), version: { increment: 1 } } });
    if (!result.count) return false;
    await tx.calendarEvent.updateMany({ where: { teamId: game.teamId, source: "MENTA_GAME_DAY", externalId: gameId }, data: {
      title: `${game.status === "CANCELLED" ? "Cancelled: " : ""}${settings.homeName} vs ${settings.opponentName}`,
      startsAt: new Date(settings.startsAt), location: settings.venue,
    } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "The game changed. Refresh before saving." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await prisma.gameDay.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Game unavailable." }, { status: 404 });
  const user = await getSessionUser();
  const access = user ? await gameDayAccess(user.id, game) : { member: false, manage: false, score: false };
  if (!game.published && !access.member) return NextResponse.json({ error: "Game unavailable." }, { status: 404 });
  const updates = await prisma.gameScoreUpdate.findMany({ where: { gameId }, orderBy: { version: "desc" }, take: 50,
    select: { id: true, version: true, homeScore: true, awayScore: true, period: true, status: true, note: true, createdAt: true } });
  return NextResponse.json({ game: publicGame(game), updates, canScore: access.score }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = scoreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the score, period and update description." }, { status: 400 });
  const { gameId } = await params;
  const result = await prisma.$transaction(async (tx) => {
    const game = await tx.gameDay.findUnique({ where: { id: gameId } });
    if (!game) return { status: 404, error: "Game unavailable." };
    const member = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId: user.id, teamId: game.teamId } } });
    if (!member || (!["COACH", "ADMIN"].includes(member.teamRole) && game.scorerId !== user.id)) return { status: 403, error: "Only appointed scorekeepers or team leadership can update this game." };
    const { version, note, ...score } = parsed.data;
    const changed = await tx.gameDay.updateMany({ where: { id: gameId, version }, data: { ...score, version: { increment: 1 } } });
    if (changed.count !== 1) return { status: 409, error: "The score changed. Refresh before posting again." };
    await tx.gameScoreUpdate.create({ data: { ...score, version: version + 1, note, gameId, actorId: user.id } });
    await tx.calendarEvent.updateMany({ where: { teamId: game.teamId, source: "MENTA_GAME_DAY", externalId: gameId },
      data: { title: `${score.status === "CANCELLED" ? "Cancelled: " : ""}${game.homeName} vs ${game.opponentName}` } });
    return { status: 200 };
  });
  return NextResponse.json("error" in result ? { error: result.error } : { ok: true }, { status: result.status });
}
