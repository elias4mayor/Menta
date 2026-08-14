import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createEventSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { canManageTeam } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { team: { memberships: { some: { userId: user.id } } } },
      ],
    },
    include: { team: true },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { teamId, visibility } = parsed.data;
  if (teamId) {
    const canManage = await canManageTeam(user, teamId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only coaches or team admins can add team events." },
        { status: 403 }
      );
    }
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
      location: parsed.data.location,
      teamId,
      visibility,
      createdById: user.id,
    },
  });

  if (teamId) {
    const members = await prisma.teamMembership.findMany({
      where: { teamId, userId: { not: user.id } },
    });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: "INFO",
          title: `New event: ${event.title}`,
          link: "/calendar",
        })),
      });
    }
  }

  await logAudit({ actorId: user.id, action: "calendar.event_created", targetType: "CalendarEvent", targetId: event.id });

  return NextResponse.json({ event });
}
