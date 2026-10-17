import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GameDaySetup } from "@/components/GameDaySetup";
import { HideGamePage } from "@/components/HideGamePage";

export default async function GameDaysPage() {
  const user = await requireUser();
  const [memberships, games] = await Promise.all([
    prisma.teamMembership.findMany({ where: { userId: user.id, teamRole: { in: ["COACH", "ADMIN"] } }, select: { team: { select: { id: true, name: true, memberships: { select: { user: { select: { id: true, name: true } } } } } } } }),
    prisma.gameDay.findMany({ where: { team: { memberships: { some: { userId: user.id } } } }, orderBy: { startsAt: "desc" }, take: 100 }),
  ]);
  return <main className="max-w-3xl mx-auto space-y-8"><header><h1 className="text-3xl font-semibold">Game day, together.</h1><p className="text-text-2 mt-3">Your matchups, live scores, official watch links, and tickets.</p></header>
    <GameDaySetup teams={memberships.map(({ team }) => ({ id: team.id, name: team.name, members: team.memberships.map(({ user: member }) => ({ ...member, name: member.name ?? "Team member" })) }))} />
    {games.length === 0 && <p className="text-text-2">Your coach&apos;s next matchup will appear here. Coaches can schedule a game above.</p>}
    <ul className="divide-y divide-border">{games.map((game) => <li key={game.id} className="py-5 space-y-2"><Link className="text-xl font-semibold underline-offset-4 hover:underline" href={`/gameday/${game.id}`}>{game.homeName} vs {game.opponentName}</Link><p className="text-text-2">{game.startsAt.toLocaleString()} · {game.venue}</p><p>{game.status} · {game.homeScore} – {game.awayScore}</p>{game.published ? <><Link className="inline-block min-h-11 underline" href={`/games/${game.id}`}>Open public fan page</Link>{memberships.some((member) => member.team.id === game.teamId) && <HideGamePage gameId={game.id} />}</> : <p className="text-sm text-text-2">Team-only draft</p>}</li>)}</ul>
  </main>;
}

