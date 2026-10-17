import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
const schema = z.object({ teamId: z.string().min(1), title: z.string().trim().min(1).max(120), staffOnly: z.boolean().default(false) }).strict();
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a team and group name." }, { status: 400 });
  const member = await prisma.teamMembership.findUnique({ where: { userId_teamId: { userId: user.id, teamId: parsed.data.teamId } } });
  if (!member || (parsed.data.staffOnly && !["COACH", "ADMIN"].includes(member.teamRole))) return NextResponse.json({ error: "Not authorized to create this group." }, { status: 403 });
  const conversation = await prisma.conversation.create({ data: {
    isGroup: true, scopeTeamId: parsed.data.teamId, title: parsed.data.title, staffOnly: parsed.data.staffOnly,
    groupOwnerId: user.id, joinCode: crypto.randomBytes(10).toString("hex").toUpperCase(), participants: { create: { userId: user.id } },
  } });
  return NextResponse.json({ conversation: { id: conversation.id, joinCode: conversation.joinCode } });
}
