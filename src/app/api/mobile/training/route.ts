import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SPORTS } from "@/lib/sports";
import { PERFORMANCE_METRICS } from "@/lib/performance-metrics";
import { buildStarterWorkouts } from "@/lib/generate-plan";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [measurements, sportContext, memberships] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id }, select: { heightCm: true, weightKg: true, trainingDaysPerWeek: true } }),
    prisma.athleteSportContext.findFirst({ where: { userId: user.id, isPrimary: true, isActive: true }, select: { sport: true, position: true } }),
    prisma.teamMembership.findMany({ where: { userId: user.id }, select: { team: { select: { id: true, name: true } }, teamRole: true } }),
  ]);
  const profile = measurements ? { ...measurements, sport: sportContext?.sport ?? null, position: sportContext?.position ?? null } : null;
  return NextResponse.json({
    profile,
    sports: SPORTS.map(({ id, name, roleLabel, roles }) => ({ id, name, roleLabel, roles })),
    metrics: PERFORMANCE_METRICS,
    teams: memberships.map(({ team, teamRole }) => ({ ...team, role: teamRole })),
    starterWorkouts: profile?.sport ? buildStarterWorkouts(profile.sport, profile.position) : [],
    generationMethod: "SPORT_POSITION_STARTER",
    loadGuidance: "Editable starter based on your sport and position. Body measurements are context, not a formula for lifting loads. Choose loads with your coach.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
