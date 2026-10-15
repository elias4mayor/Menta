import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, getStripeClient } from "@/lib/stripe";

/**
 * Stripe webhook — the only place Subscription rows are written from
 * billing events. Signature-verified; never trusts an unsigned or
 * unverifiable payload. checkout.session.completed creates/attaches the
 * row from the subscription's real status; customer.subscription.* keep
 * status/period/plan in sync (and attach the row if they arrive first);
 * invoice.payment_failed adds an in-app notice.
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
      if (session.mode !== "subscription") break; // one-time Payment Links are fulfilled manually for now
      const userId = session.metadata?.userId ?? session.client_reference_id;
      const planKey = session.metadata?.planKey;
      const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (!(userId && planKey && stripeSubscriptionId && stripeCustomerId)) {
        // IDs only, never the full session object or any secret.
        console.error(
          "[stripe-webhook] checkout.session.completed missing required fields",
          { eventId: event.id, hasUserId: Boolean(userId), hasPlanKey: Boolean(planKey), hasSubscriptionId: Boolean(stripeSubscriptionId), hasCustomerId: Boolean(stripeCustomerId) }
        );
        break;
      }

      const plan = await prisma.plan.findUnique({ where: { key: planKey } });
      if (!plan) {
        console.error("[stripe-webhook] checkout.session.completed referenced an unknown plan key", { eventId: event.id, planKey });
        break;
      }

      // Don't assume ACTIVE: Stripe's guidance is to provision from the
      // subscription's real status (it can be incomplete, e.g. pending
      // authentication). Retrieve it rather than trusting the session.
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const periodEnd = sub.items.data[0]?.current_period_end;
      const fields = {
        planId: plan.id,
        status: mapStripeStatus(sub.status),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        stripeCustomerId,
        stripeSubscriptionId,
      };

      // Upsert by the unique (ownerType, ownerId) — idempotent on duplicate delivery.
      await prisma.subscription.upsert({
        where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
        create: { ownerType: "USER", ownerId: userId, ...fields },
        update: fields,
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const periodEnd = sub.items.data[0]?.current_period_end;
      const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // Keep planId in sync when the price changes (e.g. an upgrade or
      // downgrade in the Billing portal). Unknown prices leave the plan as-is.
      const priceId = sub.items.data[0]?.price?.id;
      const planForPrice = priceId ? await prisma.plan.findFirst({ where: { stripePriceId: priceId } }) : null;

      const data = {
        status: mapStripeStatus(sub.status),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
        ...(planForPrice ? { planId: planForPrice.id } : {}),
      };

      const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
      if (existing) {
        await prisma.subscription.update({ where: { id: existing.id }, data });
        break;
      }

      // Out-of-order delivery: this event beat checkout.session.completed.
      // Attach via the metadata copied onto the subscription at checkout.
      const userId = sub.metadata?.userId;
      const plan = planForPrice ?? (sub.metadata?.planKey ? await prisma.plan.findUnique({ where: { key: sub.metadata.planKey } }) : null);
      if (!userId || !plan) {
        console.error("[stripe-webhook] subscription event for an unknown stripeSubscriptionId", { eventId: event.id, eventType: event.type, stripeSubscriptionId: sub.id });
        break;
      }
      await prisma.subscription.upsert({
        where: { ownerType_ownerId: { ownerType: "USER", ownerId: userId } },
        create: { ownerType: "USER", ownerId: userId, ...data, planId: plan.id, stripeCustomerId, stripeSubscriptionId: sub.id },
        update: { ...data, planId: plan.id, stripeCustomerId, stripeSubscriptionId: sub.id },
      });
      break;
    }
    case "invoice.payment_failed": {
      // Stripe Smart Retries + failed-payment emails do the recovery
      // (Dashboard settings); this only adds an in-app heads-up.
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!stripeCustomerId) break;
      const subRow = await prisma.subscription.findFirst({ where: { stripeCustomerId, ownerType: "USER" } });
      if (!subRow) break;
      await prisma.notification.create({
        data: {
          userId: subRow.ownerId,
          type: "SYSTEM",
          title: "Your MENTA payment didn't go through",
          body: "Update your payment method to keep your plan. Stripe will retry automatically.",
          link: "/account/billing",
        },
      });
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
      // Grace period while Stripe retries — still entitled (entitlements.ts).
      return "PAST_DUE";
    case "unpaid":
    case "canceled":
    case "incomplete_expired":
      // Stripe guidance: revoke access once retries are exhausted (unpaid).
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
