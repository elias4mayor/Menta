import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateGuardianLinkSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateGuardianLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const link = await prisma.guardianLink.findUnique({ where: { id } });
  if (!link) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { status } = parsed.data;

  if (status === "APPROVED") {
    // Only the athlete being linked can consent — a guardian can never self-approve.
    if (user.id !== link.athleteId) {
      return NextResponse.json({ error: "Only the athlete can approve this." }, { status: 403 });
    }
    if (link.status !== "PENDING") {
      return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
    }
  } else {
    // REVOKED — either side can end the link (athlete revokes access, guardian cancels their own request).
    if (user.id !== link.athleteId && user.id !== link.guardianId) {
      return NextResponse.json({ error: "Not your link." }, { status: 403 });
    }
  }

  const updated = await prisma.guardianLink.update({ where: { id }, data: { status } });

  const notifyUserId = user.id === link.athleteId ? link.guardianId : link.athleteId;
  await prisma.notification.create({
    data: {
      userId: notifyUserId,
      type: "SYSTEM",
      title:
        status === "APPROVED"
          ? "Your guardian access request was approved"
          : "A guardian link was revoked",
      link: "/settings",
    },
  });

  await logAudit({
    actorId: user.id,
    action: status === "APPROVED" ? "guardian.link_approved" : "guardian.link_revoked",
    targetType: "GuardianLink",
    targetId: updated.id,
  });

  return NextResponse.json({ link: updated });
}
