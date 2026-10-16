import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function academicSupportCandidates(ownerId: string) {
  const memberships = await prisma.teamMembership.findMany({ where: { userId: ownerId }, select: { teamId: true } });
  return prisma.user.findMany({ where: { id: { not: ownerId }, emailVerified: { not: null }, OR: [
    { memberships: { some: { teamId: { in: memberships.map((m) => m.teamId) }, teamRole: { in: ["COACH", "ADMIN", "TEACHER"] } } } },
    { guardianOf: { some: { athleteId: ownerId, status: "APPROVED" } } },
  ] }, select: { id: true, name: true, role: true } });
}

/// Alerts share only a request for support, never course names, grade values,
/// private notes, or the underlying academic records. Relationships are checked
/// again when sending so a revoked guardian/team membership stops future alerts.
export async function recordAcademicGrade(userId: string, source: string, score: number, scale: number) {
  if (!Number.isFinite(score) || !Number.isFinite(scale) || scale <= 0 || score < 0) return;
  const percent = score / scale * 100;
  const key = crypto.createHash("sha256").update(`${userId}:${source}`).digest("hex");
  const settings = await prisma.academicSupportSettings.findUnique({ where: { userId } });
  const previous = await prisma.academicGradeState.findUnique({ where: { id: key } });
  const candidates = settings?.enabled ? await academicSupportCandidates(userId) : [];
  await prisma.$transaction(async (tx) => {
    await tx.academicGradeState.upsert({ where: { id: key }, create: { id: key, userId, percent }, update: { percent } });
    if (!settings?.enabled || !(percent < settings.threshold || (previous && previous.percent - percent >= 5))) return;
    const signalId = crypto.createHash("sha256").update(`${key}:${percent}`).digest("hex");
    const created = await tx.academicAlertSignal.createMany({ data: [{ id: signalId, userId }], skipDuplicates: true });
    if (!created.count) return;
    const grants = await tx.academicSupportGrant.findMany({ where: { ownerId: userId, supporterId: { in: candidates.map((c) => c.id) } } });
    const owner = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await tx.notification.createMany({ data: [
      { userId, type: "ACADEMICS", title: "Check your academic progress", body: "An updated record is below your alert threshold or has moved lower. Review it in Academics.", link: "/school" },
      ...grants.map(({ supporterId }) => ({ userId: supporterId, type: "ACADEMICS", title: `${owner.name} may need academic support`, body: "They opted to share support alerts with you. Reach out to check in; individual grades and coursework are private.", link: "/messages" })),
    ] });
  });
}
