import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { gameDayAccess } from "@/lib/permissions";
import { GameDayBoard } from "@/components/GameDayBoard";

export default async function TeamGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const user = await requireUser();
  const { gameId } = await params;
  const game = await prisma.gameDay.findUnique({ where: { id: gameId } });
  if (!game || !(await gameDayAccess(user.id, game)).member) notFound();
  const events = await prisma.calendarEvent.findMany({ where: { teamId: game.teamId, visibility: "TEAM", startsAt: { gte: new Date(game.startsAt.getTime() - 86400000), lte: new Date(game.startsAt.getTime() + 86400000) } }, orderBy: { startsAt: "asc" }, select: { id: true, title: true, startsAt: true, location: true } });
  return <main className="max-w-3xl mx-auto"><h1 className="text-3xl font-semibold mb-8">Your game day.</h1><GameDayBoard gameId={game.id} /><section className="mt-10"><h2 className="text-xl font-semibold mb-4">Team plans · Members only</h2><p className="text-sm text-text-2 mb-4">Team events within a day of kickoff. These are not included on the public game page.</p>{events.length === 0 && <p className="text-text-2">No team events published around this game.</p>}<ul className="divide-y divide-border">{events.map((event) => <li className="py-4" key={event.id}><p className="font-semibold">{event.title}</p><p>{event.startsAt.toLocaleString()}{event.location ? ` · ${event.location}` : ""}</p></li>)}</ul></section></main>;
}

