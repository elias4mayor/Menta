import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { hasCompletedOnboarding } from "@/lib/onboarding-status";
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user, onboardingCompleted: user ? await hasCompletedOnboarding(user.id, user.role) : false });
}
