import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
import { ChatGroupActions } from "@/components/ChatGroupActions";
import { conversationReadWhere } from "@/lib/conversation-access";

export default async function MessagesPage() {
  const user = await requireUser();

  const conversations = await prisma.conversation.findMany({
    where: conversationReadWhere(user.id),
    include: {
      team: true,
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const memberships = await prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamRole: true, team: { select: { id: true, name: true } } } });
  return (
    <div className="max-w-2xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Messages</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Conversations</GlowWaveText></h1>
      <ChatGroupActions teams={memberships.map(({ team, teamRole }) => ({ ...team, canCreateStaff: ["COACH", "ADMIN"].includes(teamRole) }))} />

      {conversations.length === 0 ? (
        <div className="card p-6">
          <p className="text-text-2 text-sm">
            No conversations yet. Join a team to get a team chat, or message a teammate from your team roster.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => {
            const other = c.participants.find((p) => p.userId !== user.id)?.user;
            const title = c.team?.name ?? (c.isGroup ? c.title : other?.name) ?? "Conversation";
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="card p-4 flex items-center justify-between block hover:border-[var(--border-strong)]">
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-text-3 text-xs mt-1 line-clamp-1">
                      {c.messages[0]?.body ?? "No messages yet"}
                    </div>
                  </div>
                  {c.isGroup && <span className="badge">Team</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
