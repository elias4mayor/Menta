import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateGuardianScopeSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

/**
 * Lists or changes which GUARDIAN_SCOPES a specific guardian currently
 * holds for the athlete on this link. Only the athlete can read or change
 * this — never the guardian themselves, same "only the athlete consents"
 * rule src/app/api/guardian/[id]/route.ts already enforces for APPROVED.
 * Granting/revoking here never touches the GuardianLink's own status.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const link = await prisma.guardianLink.findUnique({ where: { id } });
  if (!link) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (user.id !== link.athleteId) {
    return NextResponse.json({ error: "Only the athlete can view this." }, { status: 403 });
  }

  const grants = await prisma.guardianScopeGrant.findMany({
    where: { guardianId: link.guardianId, athleteId: link.athleteId },
    select: { scope: true },
  });
  return NextResponse.json({ scopes: grants.map((g) => g.scope) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateGuardianScopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const link = await prisma.guardianLink.findUnique({ where: { id } });
  if (!link) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (user.id !== link.athleteId) {
    return NextResponse.json({ error: "Only the athlete can change this." }, { status: 403 });
  }
  if (link.status !== "APPROVED") {
    return NextResponse.json({ error: "This guardian link isn't approved." }, { status: 409 });
  }

  const { scope, grant } = parsed.data;

  if (grant) {
    await prisma.guardianScopeGrant.upsert({
      where: { guardianId_athleteId_scope: { guardianId: link.guardianId, athleteId: link.athleteId, scope } },
      create: { guardianId: link.guardianId, athleteId: link.athleteId, scope },
      update: {},
    });
  } else {
    // Deleting the row is the only revocation mechanism — the same
    // row-existence-is-the-only-state convention TeamPermissionGrant uses.
    // No-op (deleteMany, not delete) if it was never granted.
    await prisma.guardianScopeGrant.deleteMany({
      where: { guardianId: link.guardianId, athleteId: link.athleteId, scope },
    });
  }

  await logAudit({
    actorId: user.id,
    action: grant ? "guardian.scope_granted" : "guardian.scope_revoked",
    targetType: "GuardianScopeGrant",
    targetId: link.guardianId,
    metadata: { scope, athleteId: link.athleteId },
  });

  const grants = await prisma.guardianScopeGrant.findMany({
    where: { guardianId: link.guardianId, athleteId: link.athleteId },
    select: { scope: true },
  });
  return NextResponse.json({ scopes: grants.map((g) => g.scope) });
}
