import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { aiChatSchema } from "@/lib/validation";
import { askMentaAi, buildAthleteContext, isAiConfigured } from "@/lib/ai";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const conversation = await prisma.aIConversation.findFirst({
    where: { userId: user.id, topic: null },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    configured: isAiConfigured(),
    conversation: conversation
      ? { id: conversation.id, messages: conversation.messages }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `ai:${user.id}`), {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  const parsed = aiChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  let conversation = parsed.data.conversationId
    ? await prisma.aIConversation.findUnique({
        where: { id: parsed.data.conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (conversation && (conversation.userId !== user.id || conversation.topic !== null)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: { userId: user.id },
      include: { messages: true },
    });
  }

  await prisma.aIMessage.create({
    data: { conversationId: conversation.id, role: "user", content: parsed.data.message },
  });

  if (!isAiConfigured()) {
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    const envVar = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";
    return NextResponse.json({
      configured: false,
      conversationId: conversation.id,
      reply: `MENTA AI isn't connected yet — an administrator needs to set ${envVar} on the server (AI_PROVIDER is "${provider}"). This isn't a real answer.`,
    });
  }

  try {
    const context = await buildAthleteContext(user);
    const history = [
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: parsed.data.message },
    ].slice(-16);

    const reply = await askMentaAi({ system: context, history });

    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: reply },
    });

    await logAudit({ actorId: user.id, action: "ai.message_sent", targetType: "AIConversation", targetId: conversation.id });

    return NextResponse.json({ configured: true, conversationId: conversation.id, reply });
  } catch (err) {
    console.error("[ai] request failed", err);
    return NextResponse.json(
      { error: "MENTA AI couldn't respond right now. Try again shortly." },
      { status: 502 }
    );
  }
}
