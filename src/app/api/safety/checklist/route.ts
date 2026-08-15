import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createSafetyChecklistItemSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const items = await prisma.safetyChecklistItem.findMany({
    where: { userId: user.id },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createSafetyChecklistItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const item = await prisma.safetyChecklistItem.create({
    data: { userId: user.id, ...parsed.data },
  });

  await logAudit({ actorId: user.id, action: "safety.checklist_item_created", targetType: "SafetyChecklistItem", targetId: item.id });

  return NextResponse.json({ item });
}
