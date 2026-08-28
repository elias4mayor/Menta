import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { doctorOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { countryCodeForName } from "@/lib/geo";
import { isCityCountryMismatch } from "@/lib/geo-server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "DOCTOR") {
    return NextResponse.json({ error: "This onboarding endpoint is for doctor/provider accounts." }, { status: 403 });
  }

  const parsed = doctorOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { phone, title, specialties, credentials, country, state, city } = parsed.data;

  if (city && country) {
    const countryCode = countryCodeForName(country);
    if (countryCode && (await isCityCountryMismatch(countryCode, city))) {
      return NextResponse.json({ error: "That city doesn't match the selected country." }, { status: 400 });
    }
  }

  await prisma.doctorProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone: phone || undefined,
      title,
      specialties: specialties ? JSON.stringify(specialties) : undefined,
      credentials: credentials || undefined,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      onboardingCompletedAt: new Date(),
    },
    update: {
      phone: phone || undefined,
      title,
      specialties: specialties ? JSON.stringify(specialties) : undefined,
      credentials: credentials || undefined,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to MENTA",
      body: "Your provider profile is set up. Join a team to start receiving care requests.",
    },
  });

  await logAudit({ actorId: user.id, action: "onboarding.doctor_completed" });

  return NextResponse.json({ ok: true });
}
