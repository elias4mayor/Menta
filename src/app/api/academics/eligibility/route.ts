import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { createEligibilityItemSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const items = await prisma.eligibilityChecklistItem.findMany({
    where: { userId: user.id },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = createEligibilityItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const item = await prisma.eligibilityChecklistItem.create({
    data: { userId: user.id, ...parsed.data },
  });

  await logAudit({ actorId: user.id, action: "academics.eligibility_item_created", targetType: "EligibilityChecklistItem", targetId: item.id });

  return NextResponse.json({ item });
}
