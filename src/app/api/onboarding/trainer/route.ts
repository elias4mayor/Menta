import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { trainerOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "TRAINER") {
    return NextResponse.json({ error: "This onboarding endpoint is for trainer accounts." }, { status: 403 });
  }

  const parsed = trainerOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const {
    phone,
    businessName,
    sport,
    specialties,
    trainingLocation,
    yearsExperience,
    certifications,
    trainingPhilosophy,
    country,
    state,
    goals,
  } = parsed.data;

  await prisma.trainerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone: phone || undefined,
      businessName: businessName || undefined,
      sport: sport || undefined,
      specialties: specialties ? JSON.stringify(specialties) : undefined,
      trainingLocation: trainingLocation || undefined,
      yearsExperience,
      certifications: certifications || undefined,
      trainingPhilosophy: trainingPhilosophy || undefined,
      country: country || undefined,
      state: state || undefined,
      goals: goals ? JSON.stringify(goals) : undefined,
      onboardingCompletedAt: new Date(),
    },
    update: {
      phone: phone || undefined,
      businessName: businessName || undefined,
      sport: sport || undefined,
      specialties: specialties ? JSON.stringify(specialties) : undefined,
      trainingLocation: trainingLocation || undefined,
      yearsExperience,
      certifications: certifications || undefined,
      trainingPhilosophy: trainingPhilosophy || undefined,
      country: country || undefined,
      state: state || undefined,
      goals: goals ? JSON.stringify(goals) : undefined,
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to MENTA",
      body: "Your trainer profile is set up. Start building programs for your athletes.",
    },
  });

  await logAudit({ actorId: user.id, action: "onboarding.trainer_completed" });

  return NextResponse.json({ ok: true });
}
