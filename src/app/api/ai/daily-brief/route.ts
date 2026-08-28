import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { generateDailyBrief, isAiConfigured } from "@/lib/ai";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const TOPIC = "DAILY_BRIEF";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Reads today's already-generated brief, if one exists — no AI call, cheap enough to check on every dashboard load. */
async function todaysBrief(userId: string) {
  const conversation = await prisma.aIConversation.findFirst({
    where: { userId, topic: TOPIC },
    orderBy: { createdAt: "desc" },
    include: { messages: { where: { role: "assistant" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const latest = conversation?.messages[0];
  if (!latest || latest.createdAt < startOfToday()) return null;
  return { brief: latest.content, generatedAt: latest.createdAt };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const cached = await todaysBrief(user.id);
  return NextResponse.json({
    configured: isAiConfigured(),
    brief: cached?.brief ?? null,
    generatedAt: cached?.generatedAt ?? null,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `ai-daily-brief:${user.id}`), {
    limit: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  if (!isAiConfigured()) {
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    const envVar = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";
    return NextResponse.json({
      configured: false,
      brief: null,
      error: `MENTA AI isn't connected yet — an administrator needs to set ${envVar} on the server (AI_PROVIDER is "${provider}"). No brief was generated.`,
    });
  }

  // Don't regenerate (and don't spend another AI call) if today's brief already exists.
  const existing = await todaysBrief(user.id);
  if (existing) {
    return NextResponse.json({ configured: true, brief: existing.brief, generatedAt: existing.generatedAt });
  }

  try {
    const brief = await generateDailyBrief(user);

    const conversation = await prisma.aIConversation.create({ data: { userId: user.id, topic: TOPIC } });
    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "user", content: "Generate my daily brief." },
    });
    const assistantMessage = await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: brief },
    });

    await logAudit({ actorId: user.id, action: "ai.daily_brief_generated", targetType: "AIConversation", targetId: conversation.id });

    return NextResponse.json({ configured: true, brief, generatedAt: assistantMessage.createdAt });
  } catch (err) {
    console.error("[ai/daily-brief] request failed", err);
    return NextResponse.json(
      { error: "MENTA AI couldn't generate your brief right now. Try again shortly." },
      { status: 502 }
    );
  }
}
