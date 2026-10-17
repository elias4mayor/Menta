import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { usersShareTeam } from "@/lib/permissions";
import { z } from "zod";
import { conversationReadWhere } from "@/lib/conversation-access";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: conversationReadWhere(user.id),
    include: {
      team: true,
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { id: "desc" },
  });

  const shaped = conversations.map((c) => {
    const otherParticipant = c.participants.find((p) => p.userId !== user.id)?.user;
    return {
      id: c.id,
      title: c.team?.name ?? (c.isGroup ? c.title : otherParticipant?.name) ?? "Conversation",
      isGroup: c.isGroup,
      lastMessage: c.messages[0]
        ? { body: c.messages[0].body, createdAt: c.messages[0].createdAt }
        : null,
    };
  });

  return NextResponse.json({ conversations: shaped });
}

const startDmSchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = startDmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { userId: otherUserId } = parsed.data;
  if (otherUserId === user.id) {
    return NextResponse.json({ error: "Can't message yourself." }, { status: 400 });
  }

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: user.id },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "You can't message this person." }, { status: 403 });
  }

  const shareTeam = await usersShareTeam(user.id, otherUserId);
  const approvedGuardian = await prisma.guardianLink.findFirst({ where: { status: "APPROVED", OR: [{ guardianId: user.id, athleteId: otherUserId }, { guardianId: otherUserId, athleteId: user.id }] }, select: { id: true } });
  if (!shareTeam && !approvedGuardian) {
    return NextResponse.json(
      { error: "You can message current teammates or an approved guardian connection." },
      { status: 403 }
    );
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
  });
  if (existing) return NextResponse.json({ conversation: { id: existing.id } });

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      participants: { create: [{ userId: user.id }, { userId: otherUserId }] },
    },
  });

  return NextResponse.json({ conversation: { id: conversation.id } });
}
