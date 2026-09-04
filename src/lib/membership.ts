import "server-only";
import { prisma } from "@/lib/prisma";
import { getActivePlan } from "@/lib/entitlements";
import type { EntitlementKey } from "@/lib/entitlement-keys";
import {
  MEMBERSHIP_TIER_KEYS,
  MEMBERSHIP_TIERS,
  renderBenefits,
  type MembershipTierKey,
} from "@/lib/membership-config";

/** Rank order for comparing tiers (upgrade vs. downgrade), independent of price — ONYX has no price yet. */
const TIER_RANK: Record<MembershipTierKey, number> = { ROOKIE: 0, UNDERDOG: 1, MVP: 2, ONYX: 3, TEAM: -1 };

export type MembershipCtaState =
  | { kind: "signed-out" }
  | { kind: "current" }
  | { kind: "upgrade" }
  | { kind: "manage" } // viewing a lower tier than the user's current plan — no self-serve downgrade
  | { kind: "coming-soon" } // priced tier with no price set yet (e.g. ONYX pre-launch)
  | { kind: "team-contact" }
  | { kind: "already-on-team"; teamName: string; teamRole: string };

export type ResolvedMembershipTier = {
  key: MembershipTierKey;
  displayName: string;
  positioning: string;
  description: string;
  benefits: string[];
  priceCents: number | null;
  isCustomPricing: boolean;
  active: boolean;
  cta: MembershipCtaState;
};

/**
 * The single join point between the canonical membership config
 * (src/lib/membership-config.ts) and live Plan/PlanEntitlement/
 * Subscription data — what both PricingSection and the /membership page
 * render from, so neither computes its own competing view of "what plan
 * is this user on, what should the button say." This function itself
 * makes no authorization decisions — it's read-only presentation data;
 * every entitlement check a route performs still goes through
 * src/lib/entitlements.ts directly against the DB, never through this.
 */
export async function resolveMembershipTiers(userId: string | null): Promise<ResolvedMembershipTier[]> {
  const plans = await prisma.plan.findMany({
    where: { key: { in: MEMBERSHIP_TIER_KEYS } },
    include: { entitlements: true },
  });
  const planByKey = new Map(plans.map((p) => [p.key as MembershipTierKey, p]));

  let currentIndividualKey: MembershipTierKey | null = null;
  let teamMembership: { teamId: string; teamRole: string; teamName: string } | null = null;

  if (userId) {
    const [individualPlan, membership] = await Promise.all([
      getActivePlan("USER", userId),
      prisma.teamMembership.findFirst({
        where: { userId },
        select: { teamId: true, teamRole: true, team: { select: { name: true } } },
      }),
    ]);
    if (individualPlan && MEMBERSHIP_TIER_KEYS.includes(individualPlan.key as MembershipTierKey)) {
      currentIndividualKey = individualPlan.key as MembershipTierKey;
    }
    if (membership) {
      teamMembership = { teamId: membership.teamId, teamRole: membership.teamRole, teamName: membership.team.name };
    }
  }

  return MEMBERSHIP_TIER_KEYS.map((key) => {
    const config = MEMBERSHIP_TIERS[key];
    const plan = planByKey.get(key);
    // `?? 0` here would be wrong: it can't tell "no PlanEntitlement row for
    // this key" (should read as 0/not-included) apart from "row exists
    // with limitValue: null" (the DB's deliberate UNLIMITED sentinel,
    // same convention entitlements.ts's entitlementLimit() already
    // respects for real enforcement) — both are nullish, so `??` would
    // collapse a genuinely unlimited entitlement down to 0 and every
    // label helper below (aiLabel/highlightsLabel/schoolsLabel/
    // featureFlagLabel) would then silently omit it as "not included."
    const limitFor = (entitlementKey: EntitlementKey): number | null => {
      const entitlement = plan?.entitlements.find((e) => e.key === entitlementKey);
      return entitlement ? entitlement.limitValue : 0;
    };

    // "Not priced yet" (e.g. ONYX pre-launch) must win regardless of
    // sign-in state — a signed-out visitor must never see a working-
    // looking "Upgrade" button for a plan checkout would reject anyway.
    // Exception: a user actually already subscribed to that plan (a comped
    // account, e.g.) must still see "Current plan", not "Pricing coming
    // soon" on their own active plan — checked first, below.
    const notYetPriced = plan && plan.priceCents === null && !plan.isCustomPricing;

    const cta: MembershipCtaState =
      config.scope === "TEAM"
        ? teamMembership
          ? { kind: "already-on-team", teamName: teamMembership.teamName, teamRole: teamMembership.teamRole }
          : { kind: "team-contact" }
        : currentIndividualKey === key
          ? { kind: "current" }
          : notYetPriced
            ? { kind: "coming-soon" }
            : !userId
              ? { kind: "signed-out" }
              : currentIndividualKey && TIER_RANK[key] < TIER_RANK[currentIndividualKey]
                ? { kind: "manage" }
                : { kind: "upgrade" };

    return {
      key,
      displayName: config.displayName,
      positioning: config.positioning,
      description: config.description,
      benefits: renderBenefits(config, limitFor),
      priceCents: plan?.priceCents ?? null,
      isCustomPricing: plan?.isCustomPricing ?? false,
      active: plan?.active ?? false,
      cta,
    };
  });
}
