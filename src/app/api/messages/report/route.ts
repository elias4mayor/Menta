import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { reportSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const report = await prisma.report.create({
    data: {
      reporterId: user.id,
      targetUserId: parsed.data.targetUserId,
      targetMessageId: parsed.data.targetMessageId,
      category: parsed.data.category,
      details: parsed.data.details,
    },
  });

  await logAudit({ actorId: user.id, action: "safety.report_filed", targetType: "Report", targetId: report.id });

  return NextResponse.json({ ok: true });
}
