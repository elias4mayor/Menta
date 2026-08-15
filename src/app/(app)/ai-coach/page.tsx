import { requireUser } from "@/lib/auth-guards";
import { isAiConfigured } from "@/lib/ai";
import { AiChat } from "@/components/AiChat";
import { prisma } from "@/lib/prisma";

export default async function AiCoachPage() {
  const user = await requireUser();

  const conversation = await prisma.aIConversation.findFirst({
    where: { userId: user.id, topic: null },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="max-w-2xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="mono text-text-3 mb-1">MENTA AI</div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-semibold">Your intelligence layer</h1>
        {isAiConfigured() ? (
          <span className="badge badge-live">Connected</span>
        ) : (
          <span className="badge badge-demo">Not connected</span>
        )}
      </div>
      <AiChat
        configured={isAiConfigured()}
        initialConversationId={conversation?.id ?? null}
        initialMessages={(conversation?.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}
