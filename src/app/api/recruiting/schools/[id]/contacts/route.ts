import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createRecruitingContactSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: schoolId } = await context.params;
  const school = await prisma.recruitingSchool.findFirst({ where: { id: schoolId, userId: user.id } });
  if (!school) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = createRecruitingContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { lastContactedAt, email, ...rest } = parsed.data;

  const contact = await prisma.recruitingContact.create({
    data: {
      userId: user.id,
      schoolId,
      email: email || undefined,
      ...rest,
      lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : undefined,
    },
  });

  await logAudit({ actorId: user.id, action: "recruiting.contact_created", targetType: "RecruitingContact", targetId: contact.id });

  return NextResponse.json({ contact });
}
