import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { onboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { sport, position, graduationYear, schoolName, city, state, goals } = parsed.data;

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
      onboardingCompletedAt: new Date(),
    },
    update: {
      sport,
      position: position || undefined,
      graduationYear,
      schoolName: schoolName || undefined,
      city: city || undefined,
      state: state || undefined,
      onboardingCompletedAt: new Date(),
    },
  });

  if (goals && goals.length > 0) {
    await prisma.goal.createMany({
      data: goals.map((title) => ({ userId: user.id, title, category: "ONBOARDING" })),
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
