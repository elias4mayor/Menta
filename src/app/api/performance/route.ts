import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createPerformanceEntrySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const entries = await prisma.performanceEntry.findMany({
    where: { userId: user.id },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createPerformanceEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const entry = await prisma.performanceEntry.create({
    data: {
      userId: user.id,
      statName: parsed.data.statName,
      value: parsed.data.value,
      unit: parsed.data.unit,
      note: parsed.data.note,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : undefined,
    },
  });

  await logAudit({ actorId: user.id, action: "performance.entry_logged", targetType: "PerformanceEntry", targetId: entry.id });

  return NextResponse.json({ entry });
}
