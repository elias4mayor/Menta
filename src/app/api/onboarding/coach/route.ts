import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { coachOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { countryCodeForName, stateCodeForName } from "@/lib/geo";
import { isCityCountryMismatch } from "@/lib/geo-server";
import { isSchoolStateMismatch } from "@/lib/schools-server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "COACH") {
    return NextResponse.json({ error: "This onboarding endpoint is for coach accounts." }, { status: 403 });
  }

  const parsed = coachOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { phone, sport, coachingRole, yearsCoaching, organizationName, schoolName, schoolType, country, state, city, focusAreas } = parsed.data;

  const countryCode = country ? countryCodeForName(country) : undefined;

  if (city && country) {
    if (countryCode && (await isCityCountryMismatch(countryCode, city))) {
      return NextResponse.json({ error: "That city doesn't match the selected country." }, { status: 400 });
    }
  }

  if (schoolName) {
    const schoolStateCode = countryCode === "US" && state ? stateCodeForName("US", state) : undefined;
    if (isSchoolStateMismatch(schoolStateCode, schoolName)) {
      return NextResponse.json({ error: "That school doesn't match the selected state." }, { status: 400 });
    }
  }

  await prisma.coachProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone: phone || undefined,
      sport: sport || undefined,
      coachingRole: coachingRole || undefined,
      yearsCoaching,
      organizationName: organizationName || undefined,
      schoolName,
      schoolType,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : undefined,
      onboardingCompletedAt: new Date(),
    },
    update: {
      phone: phone || undefined,
      sport: sport || undefined,
      coachingRole: coachingRole || undefined,
      yearsCoaching,
      organizationName: organizationName || undefined,
      schoolName,
      schoolType,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      focusAreas: focusAreas ? JSON.stringify(focusAreas) : undefined,
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to MENTA",
      body: "Your coach profile is set up. Create or join a team to get started.",
    },
  });

  await logAudit({ actorId: user.id, action: "onboarding.coach_completed" });

  return NextResponse.json({ ok: true });
}
