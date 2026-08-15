import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createEmergencyContactSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ contacts });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createEmergencyContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { email, ...rest } = parsed.data;

  const contact = await prisma.emergencyContact.create({
    data: { userId: user.id, ...rest, email: email || undefined },
  });

  await logAudit({ actorId: user.id, action: "safety.contact_created", targetType: "EmergencyContact", targetId: contact.id });

  return NextResponse.json({ contact });
}
