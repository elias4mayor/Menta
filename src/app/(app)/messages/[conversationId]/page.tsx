import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ThreadView } from "@/components/ThreadView";

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
  if (!conversation || !isParticipant) notFound();

  const other = conversation.participants.find((p) => p.userId !== user.id)?.user;
  const title = conversation.team?.name ?? other?.name ?? "Conversation";

  return (
    <div className="max-w-2xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="mono text-text-3 mb-1">Messages</div>
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <ThreadView conversationId={conversationId} otherUserId={other?.id} />
    </div>
  );
}
