import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const VALID_STATUSES = ["WATCHED", "REVIEWED", "COMPLETED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id: assignmentId } = await params;

  const target = await prisma.filmAssignmentTarget.findUnique({
    where: { assignmentId_userId: { assignmentId, userId: user.id } },
  });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const status = typeof body?.status === "string" ? body.status : null;
  const comment = typeof body?.comment === "string" ? body.comment.trim() : undefined;
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await prisma.filmAssignmentTarget.update({
    where: { id: target.id },
    data: {
      status: status ?? undefined,
      comment,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ target: updated });
}
