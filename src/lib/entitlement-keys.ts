/**
 * Plain constant data for the entitlement system — no "server-only" guard
 * because prisma/seed-plans.ts (a build-time script, not a request path)
 * needs to import these too. src/lib/entitlements.ts re-exports all of
 * this; import from there in application code, from here only in scripts.
 *
 * Every key here maps to a real, already-shipped MENTA capability with an
 * actual enforcement point in a route handler — see the "Enforced at"
 * comment on each. Capabilities with no differentiated code path today
 * (coach messaging, position groups, "detailed" training history, a
 * support-ticket system, an early-access flag) are deliberately NOT
 * modeled here — see the Phase 7 report for the full reasoning. Selling
 * points like "priority support" or "early access" that are fulfilled by
 * people/process rather than code stay in marketing copy only
 * (src/components/PricingSection.tsx), never as a fake entitlement key.
 */

export const OWNER_TYPES = ["USER", "TEAM", "ORGANIZATION"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "INCOMPLETE"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLAN_KEYS = ["ROOKIE", "MVP", "UNDERDOG", "MENTA_PLUS", "MENTA_PRO", "TEAM", "ORGANIZATION"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const ENTITLEMENT_KEYS = [
  // --- Usage-metered, monthly (UsageCounter). Checked via checkUsageLimit,
  // consumed via recordUsage only after a real AI reply is generated.
  "AI_COACH_CHAT_MONTHLY", // Enforced at: POST /api/ai (the general "Ask MENTA" chat)
  "AI_DAILY_BRIEF_MONTHLY", // Enforced at: POST /api/ai/daily-brief
  "AI_STUDY_HELP_MONTHLY", // Enforced at: POST /api/academics/study-help
  "AI_RECRUITING_OUTREACH_MONTHLY", // Enforced at: POST /api/recruiting/outreach

  // --- Current-state caps (checked against a live count/sum, not a
  // rolling counter — deleting content frees the cap back up).
  "FILM_STORAGE_GB", // Enforced at: POST /api/films — sum of Film.sizeBytes for this uploader
  "HIGHLIGHT_REELS_MAX", // Enforced at: POST /api/highlights — count of this user's Highlight rows
  "RECRUITING_SCHOOLS_MAX", // Enforced at: POST /api/recruiting/schools — count of this user's RecruitingSchool rows

  // --- Team-scoped feature flags. Resolved via getEffectiveLimit(userId,
  // teamId, key) — the more generous of the acting user's own individual
  // plan and their team's plan, so either a coach's personal upgrade or
  // the team's own paid plan turns these on for that team.
  "TRAINING_PROGRAMS", // Enforced at: POST /api/teams/[teamId]/programs (also gates AthletePrescription, which requires a program to exist)
  "LIVE_SESSIONS", // Enforced at: POST /api/teams/[teamId]/programs/[id]/sessions

  // --- Team roster cap. Resolved only from the TEAM's own subscription
  // (never an individual's plan — see getTeamRosterLimit).
  "TEAM_MAX_ATHLETES", // Enforced at: POST /api/team/join (ATHLETE role only)
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];
