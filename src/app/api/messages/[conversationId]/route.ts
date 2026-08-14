import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";

async function assertParticipant(userId: string, conversationId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return Boolean(participant);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { conversationId } = await context.params;
  if (!(await assertParticipant(user.id, conversationId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderName: m.sender.name,
      mine: m.senderId === user.id,
    })),
  });
}

const bodySchema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `message:${user.id}`), {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }

  const { conversationId } = await context.params;
  if (!(await assertParticipant(user.id, conversationId))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });

  const message = await prisma.message.create({
    data: { conversationId, senderId: user.id, body: parsed.data.body },
  });

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: user.id } },
  });
  if (otherParticipants.length > 0) {
    await prisma.notification.createMany({
      data: otherParticipants.map((p) => ({
        userId: p.userId,
        type: "MESSAGE",
        title: `New message from ${user.name}`,
        body: parsed.data.body.slice(0, 140),
        link: `/messages/${conversationId}`,
      })),
    });
  }

  await logAudit({ actorId: user.id, action: "message.sent", targetType: "Conversation", targetId: conversationId });

  return NextResponse.json({
    message: { id: message.id, body: message.body, createdAt: message.createdAt, mine: true },
  });
}
