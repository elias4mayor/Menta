import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createWellnessCheckInSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

/**
 * HIGH-SENSITIVITY endpoint — see the WellnessCheckIn model doc comment in
 * schema.prisma for the full security-assumptions writeup. Rules enforced
 * here specifically:
 *  - Every response is scoped to `userId: user.id` — there is no
 *    cross-athlete read path anywhere in this file.
 *  - logAudit() calls below never receive the actual check-in values
 *    (sleep/energy/soreness/stress/mood/readiness/notes) — only the fact
 *    that an access or mutation happened, and the record id.
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const checkIns = await prisma.wellnessCheckIn.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  await logAudit({ actorId: user.id, action: "wellness.checkins_viewed", targetType: "WellnessCheckIn" });

  return NextResponse.json({ checkIns });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createWellnessCheckInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const checkIn = await prisma.wellnessCheckIn.create({
    data: { userId: user.id, ...parsed.data },
  });

  await logAudit({
    actorId: user.id,
    action: "wellness.checkin_created",
    targetType: "WellnessCheckIn",
    targetId: checkIn.id,
  });

  return NextResponse.json({ checkIn });
}
