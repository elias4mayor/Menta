import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { careRequestUpdateSchema } from "@/lib/validation";
import { canManageCareRequest } from "@/lib/permissions";
import { hasSchedulingConflict } from "@/lib/care-server";
import { logAudit } from "@/lib/audit";

const FULL_SELECT = {
  id: true,
  reason: true,
  reasonNote: true,
  status: true,
  requestedStart: true,
  scheduledStart: true,
  scheduledEnd: true,
  followUpOfId: true,
  createdAt: true,
  updatedAt: true,
  athlete: { select: { id: true, name: true } },
  provider: { select: { id: true, name: true, role: true } },
  team: { select: { id: true, name: true } },
} as const;

async function notifyAthlete(athleteId: string, title: string, body: string) {
  await prisma.notification.create({
    data: { userId: athleteId, type: "SAFETY", title, body, link: "/care" },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const careRequest = await prisma.careRequest.findUnique({ where: { id } });
  if (!careRequest) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = careRequestUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { action, scheduledStart, scheduledEnd, providerNote, followUpStart } = parsed.data;

  // The athlete may only cancel their own still-pending request. Every
  // other action is the assigned provider's alone — never the athlete,
  // never a coach or parent.
  if (action === "CANCEL") {
    if (user.id !== careRequest.athleteId) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    if (careRequest.status !== "REQUESTED") {
      return NextResponse.json({ error: "Only a still-pending request can be cancelled." }, { status: 400 });
    }
    const updated = await prisma.careRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      select: FULL_SELECT,
    });
    await logAudit({ actorId: user.id, action: "care.cancelled", targetType: "CareRequest", targetId: id });
    return NextResponse.json({ careRequest: updated });
  }

  if (!canManageCareRequest(user, careRequest)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (action === "DECLINE") {
    const updated = await prisma.careRequest.update({
      where: { id },
      data: { status: "DECLINED" },
      select: FULL_SELECT,
    });
    await notifyAthlete(careRequest.athleteId, "Care request declined", "Your provider couldn't take that request. Try another time or provider.");
    await logAudit({ actorId: user.id, action: "care.declined", targetType: "CareRequest", targetId: id });
    return NextResponse.json({ careRequest: updated });
  }

  if (action === "ACCEPT" || action === "RESCHEDULE") {
    if (!scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: "scheduledStart and scheduledEnd are required." }, { status: 400 });
    }
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Invalid time range." }, { status: 400 });
    }
    if (await hasSchedulingConflict(careRequest.providerId, start, end, id)) {
      return NextResponse.json({ error: "That time conflicts with another scheduled appointment." }, { status: 409 });
    }
    const updated = await prisma.careRequest.update({
      where: { id },
      data: { status: "SCHEDULED", scheduledStart: start, scheduledEnd: end },
      select: FULL_SELECT,
    });
    await notifyAthlete(
      careRequest.athleteId,
      action === "ACCEPT" ? "Care appointment scheduled" : "Care appointment rescheduled",
      `Your appointment is now set for ${start.toLocaleString()}.`
    );
    await logAudit({ actorId: user.id, action: `care.${action.toLowerCase()}`, targetType: "CareRequest", targetId: id });
    return NextResponse.json({ careRequest: updated });
  }

  if (action === "SEEN") {
    const updated = await prisma.careRequest.update({
      where: { id },
      data: { status: "SEEN", providerNote: providerNote || careRequest.providerNote || undefined },
      select: FULL_SELECT,
    });
    await logAudit({ actorId: user.id, action: "care.seen", targetType: "CareRequest", targetId: id });
    return NextResponse.json({ careRequest: updated });
  }

  if (action === "CLOSE") {
    const updated = await prisma.careRequest.update({
      where: { id },
      data: { status: "CLOSED", providerNote: providerNote || careRequest.providerNote || undefined },
      select: FULL_SELECT,
    });
    await logAudit({ actorId: user.id, action: "care.closed", targetType: "CareRequest", targetId: id });
    return NextResponse.json({ careRequest: updated });
  }

  if (action === "FOLLOW_UP") {
    if (!followUpStart) return NextResponse.json({ error: "followUpStart is required." }, { status: 400 });
    const start = new Date(followUpStart);
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      return NextResponse.json({ error: "Choose a real, upcoming time." }, { status: 400 });
    }
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    if (await hasSchedulingConflict(careRequest.providerId, start, end)) {
      return NextResponse.json({ error: "That time conflicts with another scheduled appointment." }, { status: 409 });
    }
    const followUp = await prisma.careRequest.create({
      data: {
        athleteId: careRequest.athleteId,
        providerId: careRequest.providerId,
        teamId: careRequest.teamId,
        reason: careRequest.reason,
        status: "FOLLOW_UP",
        requestedStart: start,
        scheduledStart: start,
        scheduledEnd: end,
        followUpOfId: careRequest.id,
      },
      select: FULL_SELECT,
    });
    await notifyAthlete(careRequest.athleteId, "Follow-up scheduled", `Your provider scheduled a follow-up for ${start.toLocaleString()}.`);
    await logAudit({ actorId: user.id, action: "care.follow_up_scheduled", targetType: "CareRequest", targetId: followUp.id });
    return NextResponse.json({ careRequest: followUp });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
