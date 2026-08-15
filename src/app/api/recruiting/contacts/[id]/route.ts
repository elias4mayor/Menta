import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateRecruitingContactSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateRecruitingContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { lastContactedAt, email, ...rest } = parsed.data;

  const result = await prisma.recruitingContact.updateMany({
    where: { id, userId: user.id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(lastContactedAt !== undefined
        ? { lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null }
        : {}),
    },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "recruiting.contact_updated", targetType: "RecruitingContact", targetId: id });

  const contact = await prisma.recruitingContact.findUnique({ where: { id } });
  return NextResponse.json({ contact });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.recruitingContact.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "recruiting.contact_deleted", targetType: "RecruitingContact", targetId: id });

  return NextResponse.json({ ok: true });
}
