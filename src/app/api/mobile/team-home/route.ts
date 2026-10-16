import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const now = new Date();
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id }, orderBy: { joinedAt: "asc" },
    select: { teamRole: true, team: { select: {
      id: true, name: true, sport: true, inviteCode: true,
      conversation: { select: { id: true } },
      announcements: { orderBy: [{ important: "desc" }, { createdAt: "desc" }], take: 50,
        select: { id: true, title: true, body: true, important: true, createdAt: true, author: { select: { name: true } } } },
      events: { where: { startsAt: { gte: new Date(now.getTime() - 86400000), lte: new Date(now.getTime() + 14 * 86400000) } },
        orderBy: { startsAt: "asc" }, select: { id: true, title: true, startsAt: true, endsAt: true, location: true, kind: true } },
    } } },
  });
  return NextResponse.json({ teams: memberships.map(({ teamRole, team }) => ({
    id: team.id, name: team.name, sport: team.sport, role: teamRole,
    canPublish: ["COACH", "ADMIN"].includes(teamRole),
    inviteCode: ["COACH", "ADMIN"].includes(teamRole) ? team.inviteCode : null,
    conversationId: team.conversation?.id ?? null,
    announcements: team.announcements.map(({ author, ...post }) => ({ ...post, authorName: author.name })),
    events: team.events,
  })) }, { headers: { "Cache-Control": "private, no-store" } });
}
