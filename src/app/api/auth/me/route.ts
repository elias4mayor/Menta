import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const profile = await prisma.athleteProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  return NextResponse.json({
    user: sessionUser,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
  });
}
