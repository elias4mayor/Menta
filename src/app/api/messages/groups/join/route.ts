import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { CHAT_STAFF_ROLES } from "@/lib/conversation-access";
const schema = z.object({ joinCode: z.string().trim().min(1).max(40) }).strict();
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a group code." }, { status: 400 });
  const group = await prisma.conversation.findUnique({ where: { joinCode: parsed.data.joinCode.toUpperCase() } });
  if (!group?.scopeTeamId || !group.isGroup) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  const member = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: user.id, teamId: group.scopeTeamId } } });
  if (!member || (group.staffOnly && !CHAT_STAFF_ROLES.includes(member.teamRole))) return NextResponse.json({ error: "Your team membership does not allow this group." }, { status: 403 });
  await prisma.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: group.id, userId: user.id } }, create: { conversationId: group.id, userId: user.id }, update: {} });
  return NextResponse.json({ conversation: { id: group.id } });
}
