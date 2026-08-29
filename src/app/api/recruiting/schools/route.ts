import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createRecruitingSchoolSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getCurrentStateLimit } from "@/lib/entitlements";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const schools = await prisma.recruitingSchool.findMany({
    where: { userId: user.id },
    include: { contacts: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ schools });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createRecruitingSchoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const schoolLimit = await getCurrentStateLimit(user.id, "RECRUITING_SCHOOLS_MAX");
  if (schoolLimit !== null) {
    const existingCount = await prisma.recruitingSchool.count({ where: { userId: user.id } });
    if (existingCount >= schoolLimit) {
      return NextResponse.json({
        error: `You've reached your limit of ${schoolLimit} tracked schools. Remove one or upgrade for more.`,
      }, { status: 402 });
    }
  }

  const school = await prisma.recruitingSchool.create({
    data: { userId: user.id, ...parsed.data },
    include: { contacts: true },
  });

  await logAudit({ actorId: user.id, action: "recruiting.school_created", targetType: "RecruitingSchool", targetId: school.id });

  return NextResponse.json({ school });
}
