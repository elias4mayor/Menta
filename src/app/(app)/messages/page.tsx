import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage() {
  const user = await requireUser();

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      team: true,
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mono text-text-3 mb-2">Messages</div>
      <h1 className="text-3xl font-semibold mb-8">Conversations</h1>

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
            const title = c.team?.name ?? other?.name ?? "Conversation";
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
