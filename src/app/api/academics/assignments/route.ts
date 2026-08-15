import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createAssignmentSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const assignments = await prisma.assignment.findMany({
    where: { userId: user.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createAssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { dueDate, ...rest } = parsed.data;

  const assignment = await prisma.assignment.create({
    data: { userId: user.id, ...rest, dueDate: dueDate ? new Date(dueDate) : undefined },
  });

  await logAudit({ actorId: user.id, action: "academics.assignment_created", targetType: "Assignment", targetId: assignment.id });

  return NextResponse.json({ assignment });
}
