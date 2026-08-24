import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { careRequestCreateSchema } from "@/lib/validation";
import { canRequestCareFrom, canViewTeamCareStatus, canViewAthleteCareStatus, PROVIDER_TEAM_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { CARE_OPERATIONAL_STATUS_LABELS, type CareStatus } from "@/lib/care";

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

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const mode = params.get("mode");

  if (mode === "team-status") {
    const teamId = params.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId is required." }, { status: 400 });
    if (!(await canViewTeamCareStatus(user, teamId))) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const requests = await prisma.careRequest.findMany({
      where: { teamId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, scheduledStart: true, athlete: { select: { id: true, name: true } } },
    });
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        athlete: r.athlete,
        statusLabel: CARE_OPERATIONAL_STATUS_LABELS[r.status as CareStatus],
        scheduledStart: r.scheduledStart,
      })),
    });
  }

  if (mode === "athlete-status") {
    const athleteId = params.get("athleteId");
    if (!athleteId) return NextResponse.json({ error: "athleteId is required." }, { status: 400 });
    if (!(await canViewAthleteCareStatus(user, athleteId))) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const requests = await prisma.careRequest.findMany({
      where: { athleteId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, scheduledStart: true },
    });
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        statusLabel: CARE_OPERATIONAL_STATUS_LABELS[r.status as CareStatus],
        scheduledStart: r.scheduledStart,
      })),
    });
  }

  // Default: the signed-in user's own care activity — their requests as an
  // athlete, or the ones assigned to them as a provider. Full detail
  // (reason, notes) is only ever returned here, to the athlete who wrote
  // it or the provider handling it — never through the status-only modes
  // above.
  const isProvider = PROVIDER_TEAM_ROLES.includes(user.role as "TRAINER" | "DOCTOR");
  const requests = await prisma.careRequest.findMany({
    where: isProvider ? { providerId: user.id } : { athleteId: user.id },
    orderBy: { updatedAt: "desc" },
    select: FULL_SELECT,
  });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = careRequestCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { providerId, teamId, reason, reasonNote, requestedStart } = parsed.data;

  if (!(await canRequestCareFrom(user.id, providerId, teamId))) {
    return NextResponse.json({ error: "That provider isn't available to you." }, { status: 403 });
  }

  const requestedDate = new Date(requestedStart);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate <= new Date()) {
    return NextResponse.json({ error: "Choose a real, upcoming time." }, { status: 400 });
  }

  const careRequest = await prisma.careRequest.create({
    data: {
      athleteId: user.id,
      providerId,
      teamId,
      reason,
      reasonNote: reasonNote || undefined,
      requestedStart: requestedDate,
    },
    select: FULL_SELECT,
  });

  await prisma.notification.create({
    data: {
      userId: providerId,
      type: "SAFETY",
      title: "New care request",
      body: `${user.name} requested care for ${requestedDate.toLocaleString()}.`,
      link: "/care/provider",
    },
  });

  await logAudit({ actorId: user.id, action: "care.requested", targetType: "CareRequest", targetId: careRequest.id });

  return NextResponse.json({ careRequest });
}
