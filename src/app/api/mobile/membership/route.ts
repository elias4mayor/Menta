import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { resolveMembershipTiers } from "@/lib/membership";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const tiers = await resolveMembershipTiers(user.id);
  return NextResponse.json({
    externalCheckoutEnabled: process.env.IOS_US_STRIPE_CHECKOUT_ENABLED === "true" && isStripeConfigured(),
    tiers: tiers.filter(tier => tier.active && !tier.isCustomPricing).map(tier => ({
      key: tier.key, name: tier.displayName, description: tier.description, benefits: tier.benefits,
      priceCents: tier.priceCents, canUpgrade: tier.cta.kind === "upgrade",
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
