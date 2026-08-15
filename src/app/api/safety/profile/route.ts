import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updatePersonalSafetyProfileSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

/**
 * HIGH-SENSITIVITY endpoint — see the PersonalSafetyProfile model doc
 * comment in schema.prisma. Rules enforced here specifically:
 *  - Always scoped to `userId: user.id` — no cross-athlete read path.
 *  - logAudit() calls never receive the actual field values (allergies,
 *    medical/medication/emergency-plan notes) — only that an access or
 *    mutation happened, mirroring src/app/api/wellness/route.ts exactly.
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const profile = await prisma.personalSafetyProfile.findUnique({ where: { userId: user.id } });

  await logAudit({ actorId: user.id, action: "safety.profile_viewed", targetType: "PersonalSafetyProfile" });

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = updatePersonalSafetyProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const profile = await prisma.personalSafetyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  await logAudit({
    actorId: user.id,
    action: "safety.profile_updated",
    targetType: "PersonalSafetyProfile",
    targetId: profile.id,
  });

  return NextResponse.json({ profile });
}
