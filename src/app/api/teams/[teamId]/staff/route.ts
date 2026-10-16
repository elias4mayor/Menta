import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canApproveTeamStaff } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const staffSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  teamRole: z.enum(["COACH", "TRAINER", "DOCTOR", "TEACHER", "STAFF"]),
}).strict().refine((value) => Boolean(value.userId) !== Boolean(value.email));

/** An explicit appointment of a known, verified account by team leadership.
 * This does not verify a care provider or delegate administrative authority. */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } });
  if (!actor?.emailVerified) {
    return NextResponse.json({ error: "Verify your email first." }, { status: 403 });
  }
  const { teamId } = await params;
  if (!(await canApproveTeamStaff(user.id, teamId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = staffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  const { teamRole } = parsed.data;
  const target = await prisma.user.findUnique({
    where: parsed.data.userId ? { id: parsed.data.userId } : { email: parsed.data.email! }, select: { id: true, role: true, emailVerified: true },
  });
  if (target?.id === user.id) return NextResponse.json({ error: "You cannot appoint yourself." }, { status: 403 });
  if (!target || !target.emailVerified || target.role !== teamRole) {
    return NextResponse.json({ error: "Choose a verified account with the matching staff role." }, { status: 400 });
  }
  const userId = target.id;

  const membership = await prisma.$transaction(async (tx) => {
    // Do not overwrite an existing membership, administrator, or verified
    // provider. Repeated appointments are idempotent only for the same role.
    const member = await tx.teamMembership.upsert({
      where: { userId_teamId: { userId, teamId } },
      create: { userId, teamId, teamRole },
      update: {},
    });
    if (member.teamRole !== teamRole) return null;
    const conversation = await tx.conversation.findUnique({ where: { teamId }, select: { id: true } });
    if (conversation) {
      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {},
      });
    }
    return member;
  });
  if (!membership) {
    return NextResponse.json({ error: "That account already has a different role on this team." }, { status: 409 });
  }
  await logAudit({
    actorId: user.id, action: "team.staff_approved", targetType: "TeamMembership", targetId: membership.id,
    metadata: { teamId, userId, teamRole },
  });
  return NextResponse.json({ membership: { id: membership.id, userId, teamId, teamRole } });
}
