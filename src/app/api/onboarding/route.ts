import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { onboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { buildStarterWorkouts, ONBOARDING_PLAN_TAG } from "@/lib/generate-plan";
import { countryCodeForName } from "@/lib/geo";
import { isCityCountryMismatch } from "@/lib/geo-server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "ATHLETE") {
    return NextResponse.json(
      { error: "This onboarding endpoint is for athlete accounts. See /api/onboarding/coach, /trainer, or /parent." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { sport, position, graduationYear, schoolName, city, state, country, trainingDaysPerWeek, goals } = parsed.data;

  if (city && country) {
    const countryCode = countryCodeForName(country);
    if (countryCode && (await isCityCountryMismatch(countryCode, city))) {
      return NextResponse.json(
        { error: "That city doesn't match the selected country." },
        { status: 400 }
      );
    }
  }

  await prisma.athleteProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sport,
      position: position || undefined,
      graduationYear,
      schoolName: schoolName || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      trainingDaysPerWeek,
      onboardingCompletedAt: new Date(),
    },
    update: {
      sport,
      position: position || undefined,
      graduationYear,
      schoolName: schoolName || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      trainingDaysPerWeek,
      onboardingCompletedAt: new Date(),
    },
  });

  if (goals && goals.length > 0) {
    await prisma.goal.createMany({
      data: goals.map((title) => ({ userId: user.id, title, category: "ONBOARDING" })),
    });
  }

  // Real starter plan: deterministic workouts derived from the athlete's
  // actual sport/position via src/lib/sports.ts's demand config — see
  // src/lib/generate-plan.ts. Only generated once; re-running onboarding
  // (e.g. editing answers before finishing) shouldn't pile up duplicates.
  const alreadyHasPlan = await prisma.workout.findFirst({
    where: { createdById: user.id, planTag: ONBOARDING_PLAN_TAG },
    select: { id: true },
  });
  if (!alreadyHasPlan) {
    const starterWorkouts = buildStarterWorkouts(sport, position || undefined);
    await prisma.workout.createMany({
      data: starterWorkouts.map((w) => ({
        title: w.title,
        category: w.category,
        description: w.description,
        exercises: JSON.stringify(w.exercises),
        planTag: ONBOARDING_PLAN_TAG,
        createdById: user.id,
      })),
    });
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to MENTA",
      body: "Your profile is set up. Explore your dashboard to get started.",
    },
  });

  await logAudit({ actorId: user.id, action: "onboarding.completed" });

  return NextResponse.json({ ok: true });
}
