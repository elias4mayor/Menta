import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { requestGuardianLinkSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [asGuardian, asAthlete] = await Promise.all([
    prisma.guardianLink.findMany({
      where: { guardianId: user.id },
      include: { athlete: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guardianLink.findMany({
      where: { athleteId: user.id },
      include: { guardian: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ asGuardian, asAthlete });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (user.role !== "PARENT") {
    return NextResponse.json(
      { error: "Only a parent/guardian account can request athlete access." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestGuardianLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const athlete = await prisma.user.findUnique({ where: { email: parsed.data.athleteEmail } });
  if (!athlete) {
    return NextResponse.json({ error: "No MENTA account found with that email." }, { status: 404 });
  }
  if (athlete.id === user.id) {
    return NextResponse.json({ error: "You can't link yourself." }, { status: 400 });
  }

  const existing = await prisma.guardianLink.findUnique({
    where: { guardianId_athleteId: { guardianId: user.id, athleteId: athlete.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `A link with this athlete already exists (${existing.status}).` },
      { status: 409 }
    );
  }

  const link = await prisma.guardianLink.create({
    data: { guardianId: user.id, athleteId: athlete.id },
  });

  await prisma.notification.create({
    data: {
      userId: athlete.id,
      type: "SYSTEM",
      title: `${user.name} requested guardian access to your account`,
      body: "Approve or deny this from Settings.",
      link: "/settings",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "guardian.link_requested",
    targetType: "GuardianLink",
    targetId: link.id,
  });

  return NextResponse.json({ link });
}
