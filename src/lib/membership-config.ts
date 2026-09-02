import type { EntitlementKey } from "@/lib/entitlement-keys";

/**
 * The ONE canonical description of MENTA's 5 public-facing membership
 * tiers — positioning, longform description, and which entitlement keys
 * to feature as benefit bullets (with a display label). The homepage's
 * PricingSection and the /membership page both render from this; neither
 * hardcodes its own competing copy (see src/lib/membership.ts, which
 * joins this static config with live Plan/PlanEntitlement data).
 *
 * This file is presentation/curation data ONLY — plain, no "server-only",
 * safe to import from a client component. It never gates access by
 * itself: real authorization always goes through src/lib/entitlements.ts
 * reading live DB rows. The numbers shown alongside each bullet aren't
 * hardcoded here — they're resolved from that same live data at render
 * time (see resolveMembershipTiers in membership.ts), so marketing copy
 * can't silently drift out of sync with what a plan actually grants.
 *
 * MENTA_PLUS/MENTA_PRO are retired (Plan.active = false) and deliberately
 * absent from this file — this is the customer-facing 5, not the full
 * historical Plan table. ORGANIZATION still exists in the DB but is
 * intentionally excluded here too (kept for existing enterprise use,
 * never shown on the public membership experience).
 */

export type MembershipTierKey = "ROOKIE" | "UNDERDOG" | "MVP" | "ONYX" | "TEAM";

export const MEMBERSHIP_TIER_KEYS: MembershipTierKey[] = ["ROOKIE", "UNDERDOG", "MVP", "ONYX", "TEAM"];

export type BenefitSpec =
  | { kind: "entitlement"; key: EntitlementKey; label: (limit: number | null) => string | null }
  | { kind: "static"; text: string };

export type MembershipTierConfig = {
  key: MembershipTierKey;
  scope: "INDIVIDUAL" | "TEAM";
  displayName: string;
  positioning: string;
  description: string;
  benefits: BenefitSpec[];
};

function aiLabel(name: string, limit: number | null): string | null {
  if (limit === 0) return null;
  return limit === null ? `${name}: unlimited*` : `${name}: ${limit}/mo`;
}

function storageLabel(limit: number | null): string | null {
  if (limit === 0) return null;
  return limit === null ? "Unlimited* film storage" : `${limit}GB film storage`;
}

function highlightsLabel(limit: number | null): string | null {
  if (limit === 0) return null;
  return limit === null ? "Unlimited* highlight reels" : `${limit} highlight reel${limit === 1 ? "" : "s"}`;
}

function schoolsLabel(limit: number | null): string | null {
  if (limit === 0) return null;
  return limit === null ? "Unlimited* tracked recruiting schools" : `Track up to ${limit} recruiting schools`;
}

/** TRAINING_PROGRAMS/LIVE_SESSIONS are feature flags, not counts: limitValue is 0 (off) or null (on). */
function featureFlagLabel(text: string): (limit: number | null) => string | null {
  return (limit) => (limit === 0 ? null : text);
}

export const MEMBERSHIP_TIERS: Record<MembershipTierKey, MembershipTierConfig> = {
  ROOKIE: {
    key: "ROOKIE",
    scope: "INDIVIDUAL",
    displayName: "Rookie",
    positioning: "Start here.",
    description:
      "Build your MENTA profile, organize your goals, stay on top of your development, and start building the habits that separate athletes from everyone else.",
    benefits: [
      { kind: "static", text: "MENTA athlete profile & workout library" },
      { kind: "entitlement", key: "AI_COACH_CHAT_MONTHLY", label: (l) => aiLabel("AI Coach", l) },
      { kind: "entitlement", key: "FILM_STORAGE_GB", label: storageLabel },
      { kind: "entitlement", key: "RECRUITING_SCHOOLS_MAX", label: schoolsLabel },
    ],
  },
  UNDERDOG: {
    key: "UNDERDOG",
    scope: "INDIVIDUAL",
    displayName: "Underdog",
    positioning: "Build your edge.",
    description:
      "Turn potential into progress. UNDERDOG gives you the tools to train smarter, understand your performance, and build a development system around your goals—not someone else's.",
    // No TRAINING_PROGRAMS/LIVE_SESSIONS bullet here on purpose: since the
    // team-scope authorization fix, those two keys resolve ONLY from a
    // team's own MENTA TEAM subscription (hasTeamEntitlement) — an
    // individual UNDERDOG plan grants zero team programming/LIVE access
    // regardless of its own PlanEntitlement value. Advertising it here
    // would be a false claim about what buying UNDERDOG alone gets you.
    benefits: [
      { kind: "entitlement", key: "AI_COACH_CHAT_MONTHLY", label: (l) => aiLabel("AI Coach", l) },
      { kind: "entitlement", key: "FILM_STORAGE_GB", label: storageLabel },
      { kind: "entitlement", key: "HIGHLIGHT_REELS_MAX", label: highlightsLabel },
      { kind: "entitlement", key: "RECRUITING_SCHOOLS_MAX", label: schoolsLabel },
    ],
  },
  MVP: {
    key: "MVP",
    scope: "INDIVIDUAL",
    displayName: "MVP",
    positioning: "Own your development.",
    description:
      "Your training, film, goals, recovery, academics, and development—connected. MVP gives you a deeper understanding of how everything you're doing contributes to becoming a better athlete.",
    benefits: [
      { kind: "static", text: "Everything in Underdog, plus:" },
      { kind: "entitlement", key: "AI_COACH_CHAT_MONTHLY", label: (l) => aiLabel("AI Coach", l) },
      { kind: "entitlement", key: "FILM_STORAGE_GB", label: storageLabel },
      { kind: "entitlement", key: "HIGHLIGHT_REELS_MAX", label: highlightsLabel },
      { kind: "entitlement", key: "RECRUITING_SCHOOLS_MAX", label: schoolsLabel },
    ],
  },
  ONYX: {
    key: "ONYX",
    scope: "INDIVIDUAL",
    displayName: "Onyx",
    positioning: "Operate at your highest level.",
    description:
      "ONYX is MENTA at full power. Your training, performance, film, recovery, goals, and development come together inside one intelligent system designed around the athlete you are becoming.",
    // No "advanced film intelligence" bullet here: that line (inherited
    // from the pre-relaunch PricingSection copy) is wrong on two counts.
    // Film Intelligence (analysis templates, scouting reports, opponent
    // tracking, cross-team film sharing — see FilmIntelligenceManager)
    // already exists and already ships today, so "(coming soon)" is
    // false. It's also a team-scoped, permission-gated capability
    // (MANAGE_ANALYSIS_TEMPLATES/MANAGE_SCOUTING/etc.), never gated by
    // any individual Plan — an individual ONYX subscription couldn't
    // grant it even if it wanted to. Not re-added as a real ONYX benefit
    // either, since it isn't one.
    benefits: [
      { kind: "static", text: "Everything in MVP, plus:" },
      { kind: "entitlement", key: "AI_COACH_CHAT_MONTHLY", label: (l) => aiLabel("AI Coach", l) },
      { kind: "entitlement", key: "FILM_STORAGE_GB", label: storageLabel },
      { kind: "entitlement", key: "HIGHLIGHT_REELS_MAX", label: highlightsLabel },
      { kind: "entitlement", key: "RECRUITING_SCHOOLS_MAX", label: schoolsLabel },
    ],
  },
  TEAM: {
    key: "TEAM",
    scope: "TEAM",
    displayName: "MENTA Team",
    positioning: "One team. One system. One standard.",
    description:
      "Give your coaches and athletes one operating system for the entire performance environment. Program training, run LIVE sessions, monitor athletes, manage groups, analyze development, and keep your entire room moving together.",
    benefits: [
      { kind: "static", text: "Team roster, position groups & coach permissions" },
      { kind: "entitlement", key: "TRAINING_PROGRAMS", label: featureFlagLabel("Training programs & prescriptions") },
      { kind: "entitlement", key: "LIVE_SESSIONS", label: featureFlagLabel("MENTA LIVE") },
      { kind: "static", text: "Team film, assignments & film questions" },
      { kind: "static", text: "Team messaging & coach dashboards" },
    ],
  },
};

/** Renders a tier's benefit list against real, live entitlement limits — never against a hardcoded number. */
export function renderBenefits(
  tier: MembershipTierConfig,
  limitFor: (key: EntitlementKey) => number | null
): string[] {
  const out: string[] = [];
  for (const b of tier.benefits) {
    if (b.kind === "static") {
      out.push(b.text);
      continue;
    }
    const label = b.label(limitFor(b.key));
    if (label) out.push(label);
  }
  return out;
}
