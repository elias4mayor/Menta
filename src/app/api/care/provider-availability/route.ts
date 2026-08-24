import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { providerAvailabilitySchema } from "@/lib/validation";
import { PROVIDER_TEAM_ROLES, getTeamRole } from "@/lib/permissions";

/** A provider's own weekly availability windows, across every team they provide care on. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const windows = await prisma.providerAvailability.findMany({
    where: { providerId: user.id },
    include: { team: { select: { id: true, name: true } } },
    orderBy: [{ teamId: "asc" }, { dayOfWeek: "asc" }, { startMinute: "asc" }],
  });
  return NextResponse.json({ windows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = providerAvailabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { teamId, dayOfWeek, startMinute, endMinute, slotMinutes } = parsed.data;

  if (endMinute <= startMinute) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const teamRole = await getTeamRole(user.id, teamId);
  if (!teamRole || !PROVIDER_TEAM_ROLES.includes(teamRole)) {
    return NextResponse.json({ error: "You're not a trainer/doctor on that team." }, { status: 403 });
  }

  const window = await prisma.providerAvailability.create({
    data: { providerId: user.id, teamId, dayOfWeek, startMinute, endMinute, slotMinutes },
  });
  return NextResponse.json({ window });
}
