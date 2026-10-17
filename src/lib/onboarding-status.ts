import "server-only";
import { prisma } from "@/lib/prisma";

export async function hasCompletedOnboarding(userId: string, role: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: {
    athleteProfile: { select: { onboardingCompletedAt: true } },
    coachProfile: { select: { onboardingCompletedAt: true } },
    trainerProfile: { select: { onboardingCompletedAt: true } },
    doctorProfile: { select: { onboardingCompletedAt: true } },
    parentProfile: { select: { onboardingCompletedAt: true } },
    schoolProfile: { select: { onboardingCompletedAt: true } },
  } });
  if (!user) return false;
  const dates: Record<string, Date | null | undefined> = {
    ATHLETE: user.athleteProfile?.onboardingCompletedAt, COACH: user.coachProfile?.onboardingCompletedAt,
    TRAINER: user.trainerProfile?.onboardingCompletedAt, DOCTOR: user.doctorProfile?.onboardingCompletedAt,
    PARENT: user.parentProfile?.onboardingCompletedAt, TEACHER: user.schoolProfile?.onboardingCompletedAt,
    STUDENT: user.schoolProfile?.onboardingCompletedAt, STAFF: user.schoolProfile?.onboardingCompletedAt,
  };
  return role in dates ? Boolean(dates[role]) : true;
}
