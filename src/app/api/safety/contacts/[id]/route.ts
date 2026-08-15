import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateEmergencyContactSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateEmergencyContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { email, ...rest } = parsed.data;

  const result = await prisma.emergencyContact.updateMany({
    where: { id, userId: user.id },
    data: { ...rest, ...(email !== undefined ? { email: email || null } : {}) },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "safety.contact_updated", targetType: "EmergencyContact", targetId: id });

  const contact = await prisma.emergencyContact.findUnique({ where: { id } });
  return NextResponse.json({ contact });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const result = await prisma.emergencyContact.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await logAudit({ actorId: user.id, action: "safety.contact_deleted", targetType: "EmergencyContact", targetId: id });

  return NextResponse.json({ ok: true });
}
