import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createAcademicGoalSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const goals = await prisma.academicGoal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createAcademicGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { targetDate, ...rest } = parsed.data;

  const goal = await prisma.academicGoal.create({
    data: { userId: user.id, ...rest, targetDate: targetDate ? new Date(targetDate) : undefined },
  });

  await logAudit({ actorId: user.id, action: "academics.goal_created", targetType: "AcademicGoal", targetId: goal.id });

  return NextResponse.json({ goal });
}
