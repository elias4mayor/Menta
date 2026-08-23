import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { parentOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { countryCodeForName } from "@/lib/geo";
import { isCityCountryMismatch } from "@/lib/geo-server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "PARENT") {
    return NextResponse.json({ error: "This onboarding endpoint is for parent/guardian accounts." }, { status: 403 });
  }

  const parsed = parentOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { phone, relationship, country, state, city, goals } = parsed.data;

  if (city && country) {
    const countryCode = countryCodeForName(country);
    if (countryCode && (await isCityCountryMismatch(countryCode, city))) {
      return NextResponse.json({ error: "That city doesn't match the selected country." }, { status: 400 });
    }
  }

  await prisma.parentProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone: phone || undefined,
      relationship: relationship || undefined,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      goals: goals ? JSON.stringify(goals) : undefined,
      onboardingCompletedAt: new Date(),
    },
    update: {
      phone: phone || undefined,
      relationship: relationship || undefined,
      country: country || undefined,
      state: state || undefined,
      city: city || undefined,
      goals: goals ? JSON.stringify(goals) : undefined,
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to MENTA",
      body: "Your account is set up. Connect your athlete from Settings to see their MENTA.",
    },
  });

  await logAudit({ actorId: user.id, action: "onboarding.parent_completed" });

  return NextResponse.json({ ok: true });
}
