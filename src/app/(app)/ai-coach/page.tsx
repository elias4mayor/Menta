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

  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const aiEnvVar = aiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col dash-in dash-in-1">
      <AiChat
        initialCoachName={user.aiCoachName ?? null}
        configured={isAiConfigured()}
        envVar={aiEnvVar}
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
