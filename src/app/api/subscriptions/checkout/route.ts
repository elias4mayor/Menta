import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { checkoutInputSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe";

/**
 * Starts a Stripe Checkout session for the signed-in user's own individual
 * plan. Team/Organization plans are custom-quoted (isCustomPricing) and are
 * never checked out here — see /api/partnerships for that path.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limited = rateLimit(clientKey(request, `subscriptions-checkout:${user.id}`), {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Slow down a little — try again in a few minutes." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { key: parsed.data.planKey } });
  if (!plan || !plan.active || plan.scope !== "INDIVIDUAL" || plan.isCustomPricing) {
    return NextResponse.json({ error: "That plan isn't available for self-serve checkout." }, { status: 400 });
  }

  if (!plan.priceCents) {
    return NextResponse.json({
      error: "This plan is free and doesn't go through checkout — downgrading isn't available from here yet.",
    }, { status: 400 });
  }

  if (!isStripeConfigured() || !plan.stripePriceId) {
    return NextResponse.json({
      error: "Billing isn't connected yet — an administrator needs to configure Stripe and this plan's price before checkout can run.",
    }, { status: 503 });
  }

  const stripe = getStripeClient();

  const existing = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, planKey: plan.key },
    success_url: `${process.env.APP_URL}/account/billing?checkout=success`,
    cancel_url: `${process.env.APP_URL}/account/billing?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
