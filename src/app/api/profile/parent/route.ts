import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { parentOnboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "PARENT") {
    return NextResponse.json({ error: "This endpoint is for parent/guardian accounts." }, { status: 403 });
  }

  const parsed = parentOnboardingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { phone, relationship } = parsed.data;
  const data = {
    phone: phone || undefined,
    relationship: relationship || undefined,
  };

  const profile = await prisma.parentProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  await logAudit({ actorId: user.id, action: "profile.updated", targetType: "ParentProfile", targetId: profile.id });

  return NextResponse.json({ profile });
}
