import "server-only";
import { prisma } from "@/lib/prisma";
import {
  OWNER_TYPES,
  SUBSCRIPTION_STATUSES,
  PLAN_KEYS,
  ENTITLEMENT_KEYS,
  type OwnerType,
  type SubscriptionStatus,
  type PlanKey,
  type EntitlementKey,
} from "@/lib/entitlement-keys";

/**
 * Centralized subscription/entitlement checks — the billing analogue of
 * permissions.ts. Route handlers and server components must call
 * `hasEntitlement`/`assertEntitlement`/`checkUsageLimit` here; never write
 * `if (plan === "PRO")` inline. A plan's limits are Plan/PlanEntitlement
 * rows (see prisma/seed-plans.ts), so a new tier, price, or limit is a
 * data change, not a code change.
 */

export { OWNER_TYPES, SUBSCRIPTION_STATUSES, PLAN_KEYS, ENTITLEMENT_KEYS };
export type { OwnerType, SubscriptionStatus, PlanKey, EntitlementKey };

/** A subscription still grants its plan's entitlements in these statuses. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE"];

const ROOKIE_FALLBACK: { key: PlanKey } = { key: "ROOKIE" };

/**
 * The plan an owner is actually on, defaulting to ROOKIE (free) when no
 * Subscription row exists — every user is implicitly on the free plan
 * rather than needing a backfilled row, matching the rest of this app's
 * "missing config degrades to an honest default state" pattern.
 */
async function getActivePlan(ownerType: OwnerType, ownerId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { ownerType_ownerId: { ownerType, ownerId } },
    include: { plan: { include: { entitlements: true } } },
  });
  if (sub && ACTIVE_STATUSES.includes(sub.status as SubscriptionStatus)) {
    return sub.plan;
  }
  return prisma.plan.findUnique({ where: { key: ROOKIE_FALLBACK.key }, include: { entitlements: true } });
}

function entitlementLimit(plan: { entitlements: { key: string; limitValue: number | null }[] } | null, key: EntitlementKey): number | null | undefined {
  if (!plan) return undefined; // ROOKIE plan itself missing from DB — see seed-plans.ts
  const row = plan.entitlements.find((e) => e.key === key);
  return row ? row.limitValue : undefined; // undefined = key not configured for this plan at all
}

/**
 * Collapses "key not configured for this plan" (undefined) down to 0
 * (disabled) while leaving a real null (unlimited) alone. Never use `?? 0`
 * on an entitlementLimit() result directly — `null ?? 0` evaluates to 0
 * in JS, which would silently turn every plan's "unlimited" into
 * "disabled". This function exists specifically to avoid that mistake.
 */
function resolvedLimit(limit: number | null | undefined): number | null {
  return limit === undefined ? 0 : limit;
}

/**
 * The more generous of a user's individual plan and their team's plan —
 * a MENTA+ athlete on a free Team roster still gets their own limits, and
 * an athlete on a paid Team roster gets the team's limits even on a free
 * individual plan. Organization-level entitlements are expected to be
 * applied to a Team's own Subscription by an org admin (no separate
 * Organization -> Team cascade yet — a deliberate simplification for this
 * foundation pass, not an oversight).
 */
export async function getEffectiveLimit(userId: string, teamId: string | null, key: EntitlementKey): Promise<number | null> {
  const userPlan = await getActivePlan("USER", userId);
  const userLimit = resolvedLimit(entitlementLimit(userPlan, key));

  if (!teamId) return userLimit;

  const teamPlan = await getActivePlan("TEAM", teamId);
  const teamLimit = resolvedLimit(entitlementLimit(teamPlan, key));

  return maxLimit(userLimit, teamLimit);
}

/** null (unlimited) beats any finite number; otherwise the larger number wins. */
function maxLimit(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Math.max(a, b);
}

export async function hasEntitlement(userId: string, teamId: string | null, key: EntitlementKey): Promise<boolean> {
  const limit = await getEffectiveLimit(userId, teamId, key);
  return limit === null || limit > 0;
}

/**
 * A team's own roster cap (TEAM_MAX_ATHLETES) — resolved only from the
 * TEAM's own Subscription, never combined with an individual member's
 * plan (a coach's personal AI plan has no bearing on how many athletes
 * their team can hold). Falls back to ROOKIE, which leaves this
 * unlimited by default (see prisma/seed-plans.ts) so no existing team
 * is retroactively capped — a real number only appears once a team
 * actually has a purchased Team plan Subscription row.
 */
export async function getTeamRosterLimit(teamId: string): Promise<number | null> {
  const teamPlan = await getActivePlan("TEAM", teamId);
  return resolvedLimit(entitlementLimit(teamPlan, "TEAM_MAX_ATHLETES"));
}

/**
 * The raw configured limit for a current-state cap (FILM_STORAGE_GB,
 * HIGHLIGHT_REELS_MAX, RECRUITING_SCHOOLS_MAX) — the caller computes the
 * live count/sum itself (there's no UsageCounter row for these; deleting
 * content frees the cap back up immediately) and compares it here.
 */
export async function getCurrentStateLimit(userId: string, key: EntitlementKey): Promise<number | null> {
  const plan = await getActivePlan("USER", userId);
  return resolvedLimit(entitlementLimit(plan, key));
}

export class EntitlementError extends Error {
  constructor(public key: EntitlementKey) {
    super(`Not entitled: ${key}`);
  }
}

export async function assertEntitlement(userId: string, teamId: string | null, key: EntitlementKey): Promise<void> {
  if (!(await hasEntitlement(userId, teamId, key))) throw new EntitlementError(key);
}

/** Start of the current calendar month, UTC — the fixed window UsageCounter rows anchor to. */
function currentPeriodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Checks a metered entitlement without consuming it. Returns whether the
 * owner is under their limit and what the limit/used values are, so a
 * caller can show "3 of 5 used" before deciding to call recordUsage.
 */
export async function checkUsageLimit(
  ownerType: OwnerType,
  ownerId: string,
  key: EntitlementKey,
  now: Date = new Date()
): Promise<{ allowed: boolean; limit: number | null; used: number }> {
  const plan = await getActivePlan(ownerType, ownerId);
  const limit = resolvedLimit(entitlementLimit(plan, key));
  if (limit === null) return { allowed: true, limit: null, used: 0 };

  const periodStart = currentPeriodStart(now);
  const counter = await prisma.usageCounter.findUnique({
    where: { ownerType_ownerId_key_periodStart: { ownerType, ownerId, key, periodStart } },
  });
  const used = counter?.count ?? 0;
  return { allowed: used < limit, limit, used };
}

/** Increments a metered entitlement's usage for the current period. Call only after the action actually happens. */
export async function recordUsage(ownerType: OwnerType, ownerId: string, key: EntitlementKey, now: Date = new Date()): Promise<void> {
  const periodStart = currentPeriodStart(now);
  await prisma.usageCounter.upsert({
    where: { ownerType_ownerId_key_periodStart: { ownerType, ownerId, key, periodStart } },
    create: { ownerType, ownerId, key, periodStart, count: 1 },
    update: { count: { increment: 1 } },
  });
}
