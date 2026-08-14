import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { usersShareTeam } from "@/lib/permissions";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
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
      title: c.team?.name ?? otherParticipant?.name ?? "Conversation",
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
  if (!shareTeam) {
    return NextResponse.json(
      { error: "You can only message people who share a team with you." },
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
