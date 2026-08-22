import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { documentRequestSchema } from "@/lib/validation";
import { canRequestDocumentFrom } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [asAthlete, asRequester] = await Promise.all([
    prisma.documentRequest.findMany({
      where: { athleteId: user.id },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.documentRequest.findMany({
      where: { requestedById: user.id },
      include: { athlete: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    asAthlete: asAthlete.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      notes: r.notes,
      status: r.status,
      requestedByName: r.requestedBy.name,
      createdAt: r.createdAt,
    })),
    asRequester: asRequester.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      athleteName: r.athlete.name,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = documentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { athleteEmail, title, category, notes } = parsed.data;
  const athlete = await prisma.user.findUnique({ where: { email: athleteEmail } });
  if (!athlete) {
    return NextResponse.json({ error: "No MENTA account found with that email." }, { status: 404 });
  }
  if (!(await canRequestDocumentFrom(user, athlete.id))) {
    return NextResponse.json(
      { error: "You can only request documents from an athlete you coach, train, or guardian." },
      { status: 403 }
    );
  }

  const docRequest = await prisma.documentRequest.create({
    data: { requestedById: user.id, athleteId: athlete.id, title, category, notes },
  });

  await prisma.notification.create({
    data: {
      userId: athlete.id,
      type: "SYSTEM",
      title: `${user.name} requested: ${title}`,
      body: notes || "Upload it from Documents.",
      link: "/documents",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "document.requested",
    targetType: "DocumentRequest",
    targetId: docRequest.id,
  });

  return NextResponse.json({ request: { id: docRequest.id } });
}
