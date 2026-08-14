import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { profileUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { isMinor } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const profile = await prisma.athleteProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = { ...parsed.data };
  if (data.visibility === "PUBLIC") {
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { dateOfBirth: true },
    });
    if (isMinor(account?.dateOfBirth)) {
      // Minors can't set an unrestricted-public profile — cap to the
      // recruiting tier (visible to coaches), which is the legitimate
      // use case a high-school athlete actually needs.
      data.visibility = "RECRUITING";
    }
  }

  const profile = await prisma.athleteProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  await logAudit({ actorId: user.id, action: "profile.updated", targetType: "AthleteProfile", targetId: profile.id });

  return NextResponse.json({ profile });
}
