import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isTeamCoachOrAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const schema = z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(4000), important: z.boolean().default(false) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { teamId } = await params;
  if (!(await isTeamCoachOrAdmin(user.id, teamId))) return NextResponse.json({ error: "Only this team's coaches and administrators can publish announcements." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a title and announcement, up to 4,000 characters." }, { status: 400 });
  const post = await prisma.$transaction(async (tx) => {
    const post = await tx.teamAnnouncement.create({ data: { ...parsed.data, teamId, authorId: user.id } });
    const members = await tx.teamMembership.findMany({ where: { teamId, userId: { not: user.id } }, select: { userId: true } });
    await tx.notification.createMany({ data: members.map(({ userId }) => ({ userId, type: "INFO", title: parsed.data.title, link: "/announcements" })) });
    return post;
  });
  await logAudit({ actorId: user.id, action: "team.announcement_created", targetType: "TeamAnnouncement", targetId: post.id });
  return NextResponse.json({ announcement: post });
}
