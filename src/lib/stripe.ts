import "server-only";
import Stripe from "stripe";

/**
 * Same "honest not-connected state, never fabricated" pattern as
 * isAiConfigured()/RESEND_API_KEY: Plans and entitlements work (and are
 * enforced) with zero Stripe keys set — checkout/portal routes are the
 * only thing that need this, and they must degrade to a clear
 * "billing not configured" response rather than throwing or faking success.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

/** Throws if called without STRIPE_SECRET_KEY set — callers must check isStripeConfigured() first. */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured — check isStripeConfigured() before calling getStripeClient().");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
