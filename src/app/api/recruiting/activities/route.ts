import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createRecruitingActivitySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const activities = await prisma.recruitingActivity.findMany({
    where: { userId: user.id },
    include: { school: true, contact: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createRecruitingActivitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.schoolId) {
    const school = await prisma.recruitingSchool.findFirst({
      where: { id: parsed.data.schoolId, userId: user.id },
    });
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  }
  if (parsed.data.contactId) {
    const contact = await prisma.recruitingContact.findFirst({
      where: { id: parsed.data.contactId, userId: user.id },
    });
    if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const activity = await prisma.recruitingActivity.create({
    data: { userId: user.id, ...parsed.data },
    include: { school: true, contact: true },
  });

  await logAudit({ actorId: user.id, action: "recruiting.activity_logged", targetType: "RecruitingActivity", targetId: activity.id });

  return NextResponse.json({ activity });
}
