import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createMindCheckInSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

/**
 * HIGH-SENSITIVITY endpoint — see the MindCheckIn model doc comment in
 * schema.prisma for the full security-assumptions writeup. Same rules as
 * src/app/api/wellness/route.ts:
 *  - Every response is scoped to `userId: user.id`.
 *  - logAudit() calls never receive the actual check-in values
 *    (pressure/confidence/focus/readiness/todayGoal/notes) — only the fact
 *    that an access or mutation happened, and the record id.
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const checkIns = await prisma.mindCheckIn.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  await logAudit({ actorId: user.id, action: "mind.checkins_viewed", targetType: "MindCheckIn" });

  return NextResponse.json({ checkIns });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createMindCheckInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const checkIn = await prisma.mindCheckIn.create({
    data: { userId: user.id, ...parsed.data },
  });

  await logAudit({
    actorId: user.id,
    action: "mind.checkin_created",
    targetType: "MindCheckIn",
    targetId: checkIn.id,
  });

  return NextResponse.json({ checkIn });
}
