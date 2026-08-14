import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createGoalSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createGoalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      actionPlan: parsed.data.actionPlan,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
    },
  });

  await logAudit({ actorId: user.id, action: "goal.created", targetType: "Goal", targetId: goal.id });

  return NextResponse.json({ goal });
}
