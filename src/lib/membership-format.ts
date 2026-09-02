import type { ResolvedMembershipTier } from "@/lib/membership";

/**
 * Plain presentation helper — deliberately its own module, not exported
 * from MembershipExperience.tsx. That file is "use client"; every export
 * from a client module becomes a client reference on import, and a plain
 * (non-component) function can't be called from a Server Component across
 * that boundary — only rendered as JSX. MembershipStory.tsx renders on
 * the server, so this needs to live somewhere with no "use client".
 */
export function formatPrice(tier: ResolvedMembershipTier): { price: string; period: string } | null {
  if (tier.isCustomPricing) return { price: "Custom", period: "" };
  if (tier.priceCents === null) return null; // e.g. ONYX pre-launch — handled as its own "coming soon" state
  if (tier.priceCents === 0) return { price: "$0", period: "" };
  return { price: `$${(tier.priceCents / 100).toFixed(2)}`, period: "/mo" };
}
