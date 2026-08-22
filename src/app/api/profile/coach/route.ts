import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { coachOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "COACH") {
    return NextResponse.json({ error: "This endpoint is for coach accounts." }, { status: 403 });
  }

  const parsed = coachOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { phone, sport, coachingRole, yearsCoaching, organizationName, schoolName, country, focusAreas } = parsed.data;
  const data = {
    phone: phone || undefined,
    sport: sport || undefined,
    coachingRole: coachingRole || undefined,
    yearsCoaching,
    organizationName: organizationName || undefined,
    schoolName: schoolName || undefined,
    country: country || undefined,
    focusAreas: focusAreas ? JSON.stringify(focusAreas) : undefined,
  };

  const profile = await prisma.coachProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  await logAudit({ actorId: user.id, action: "profile.updated", targetType: "CoachProfile", targetId: profile.id });

  return NextResponse.json({ profile });
}
