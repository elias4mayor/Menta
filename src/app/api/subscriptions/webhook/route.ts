import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe";

/**
 * Stripe webhook — the only place Subscription rows are written from
 * billing events. Signature-verified; never trusts an unsigned or
 * unverifiable payload. checkout.session.completed creates/attaches the
 * row; customer.subscription.updated/deleted keep status/period in sync.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook isn't configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? session.client_reference_id;
      const planKey = session.metadata?.planKey;
      const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && planKey && stripeSubscriptionId && stripeCustomerId) {
        const plan = await prisma.plan.findUnique({ where: { key: planKey } });
        if (plan) {
          await prisma.subscription.upsert({
            where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
            create: {
              ownerType: "USER",
              ownerId: userId,
              planId: plan.id,
              status: "ACTIVE",
              stripeCustomerId,
              stripeSubscriptionId,
            },
            update: {
              planId: plan.id,
              status: "ACTIVE",
              stripeCustomerId,
              stripeSubscriptionId,
            },
          });
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (existing) {
        const periodEnd = sub.items.data[0]?.current_period_end;
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: mapStripeStatus(sub.status),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : existing.currentPeriodEnd,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
