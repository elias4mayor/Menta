import { requireUser } from "@/lib/auth-guards";
import { isAiConfigured } from "@/lib/ai";
import { AiChat } from "@/components/AiChat";
import { prisma } from "@/lib/prisma";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

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
    <div className="workspace-page workspace-chat flex flex-col dash-in dash-in-1">

      <WorkspaceHeader section="MENTA AI" title="Your intelligence layer" description="A conversation grounded in your athlete journey." icon="spark">
        {isAiConfigured() ? (
          <span className="badge badge-live">Connected</span>
        ) : (
          <span className="badge badge-demo">Not connected</span>
        )}
      </WorkspaceHeader>
      <AiChat
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
