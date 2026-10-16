import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ThreadView } from "@/components/ThreadView";
import { canReadConversation } from "@/lib/conversation-access";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const user = await requireUser();
  const { conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { team: true, participants: { include: { user: true } } },
  });

  const isParticipant = conversation?.participants.some((p) => p.userId === user.id);
  if (!conversation || !isParticipant || !(await canReadConversation(user.id, conversationId))) notFound();

  const other = conversation.participants.find((p) => p.userId !== user.id)?.user;
  const title = conversation.team?.name ?? (conversation.isGroup ? conversation.title : other?.name) ?? "Conversation";

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col dash-in dash-in-1">
      <div className="mono text-text-3 mb-1">Messages</div>
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      {conversation.joinCode && <p className="text-sm text-text-2 mb-4">Group code: <span className="font-mono select-all">{conversation.joinCode}</span>{conversation.staffOnly ? " · Approved staff only" : " · Team members only"}</p>}
      <ThreadView conversationId={conversationId} otherUserId={conversation.isGroup ? undefined : other?.id} />
    </div>
  );
}
