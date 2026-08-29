import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe";

/** Sends the signed-in user to Stripe's hosted billing portal to manage/cancel their own subscription. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing isn't connected yet." }, { status: 503 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  });
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found for this user yet." }, { status: 404 });
  }

  const stripe = getStripeClient();
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.APP_URL}/account/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
