import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateRecruitingSchoolSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateRecruitingSchoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const result = await prisma.recruitingSchool.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "recruiting.school_updated", targetType: "RecruitingSchool", targetId: id });

  const school = await prisma.recruitingSchool.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ school });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.recruitingSchool.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "recruiting.school_deleted", targetType: "RecruitingSchool", targetId: id });

  return NextResponse.json({ ok: true });
}
