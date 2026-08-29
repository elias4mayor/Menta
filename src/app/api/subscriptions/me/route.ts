import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/** The signed-in user's own current plan — used by account/billing UI, never another user's. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
    include: { plan: true },
  });

  if (subscription) {
    return NextResponse.json({
      planKey: subscription.plan.key,
      planName: subscription.plan.name,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  }

  const rookie = await prisma.plan.findUnique({ where: { key: "ROOKIE" } });
  return NextResponse.json({
    planKey: rookie?.key ?? "ROOKIE",
    planName: rookie?.name ?? "Rookie",
    status: "ACTIVE",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}
