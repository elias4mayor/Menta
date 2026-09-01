import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ENTITLEMENT_KEYS, type EntitlementKey, type PlanKey } from "../src/lib/entitlement-keys";

/**
 * Seeds the Phase 7 Plan/PlanEntitlement rows. This file is the source of
 * truth for pricing/limits — changing a price or a limit is an edit here
 * + a re-run, never a code change at a call site (see src/lib/entitlements.ts).
 * Idempotent: upserts by Plan.key, and prunes any PlanEntitlement row whose
 * key is no longer in ENTITLEMENT_KEYS, so re-running always matches this
 * file exactly instead of accumulating stale rows from an earlier pass.
 *
 * Copy (name/tagline) intentionally mirrors the pricing section on the
 * homepage — see src/components/PricingSection.tsx. Every key below has a
 * real enforcement point (see entitlement-keys.ts's "Enforced at" comments)
 * — this file only ever holds numbers for capabilities that actually exist.
 */

const prisma = new PrismaClient();

type EntitlementMap = Partial<Record<EntitlementKey, number | null>>;

const UNLIMITED = null;

const plans: {
  key: PlanKey;
  name: string;
  tagline: string;
  scope: "INDIVIDUAL" | "TEAM" | "ORGANIZATION";
  priceCents: number | null;
  billingInterval: "MONTH" | "NONE";
  isCustomPricing: boolean;
  sortOrder: number;
  /** Defaults true. false = retired from self-serve checkout and public listing (see checkout/route.ts and the homepage's `where: { active: true }` query) while the row, its id, and any existing Subscription referencing it stay fully intact — entitlement resolution (getActivePlan in src/lib/entitlements.ts) never checks this flag. */
  active?: boolean;
  entitlements: EntitlementMap;
}[] = [
  {
    key: "ROOKIE",
    name: "Rookie",
    tagline: "Because everybody has to start somewhere.",
    scope: "INDIVIDUAL",
    priceCents: 0,
    billingInterval: "NONE",
    isCustomPricing: false,
    sortOrder: 0,
    entitlements: {
      AI_COACH_CHAT_MONTHLY: 10,
      AI_DAILY_BRIEF_MONTHLY: 10,
      AI_STUDY_HELP_MONTHLY: 10,
      AI_RECRUITING_OUTREACH_MONTHLY: 5,
      FILM_STORAGE_GB: 1,
      HIGHLIGHT_REELS_MAX: 1,
      RECRUITING_SCHOOLS_MAX: 3,
      TRAINING_PROGRAMS: 0,
      LIVE_SESSIONS: 0,
      // Explicitly unlimited (not merely unconfigured) so a team with no
      // Subscription of its own — which falls back to this ROOKIE row in
      // getTeamRosterLimit — is never retroactively capped. A real number
      // only appears once a team has a purchased Team plan.
      TEAM_MAX_ATHLETES: UNLIMITED,
    },
  },
  {
    // MENTA Membership relaunch (5-tier): this row's id previously held
    // key="MVP" at $9.99 — prisma/migrate-underdog-mvp-swap.ts rotated
    // the key, this seed pass sets the rest. Entitlements below are the
    // former "MVP" tier's values, carried over as-is since UNDERDOG is
    // now the more modest of the two entry paid tiers.
    key: "UNDERDOG",
    name: "Underdog",
    tagline: "Build your edge.",
    scope: "INDIVIDUAL",
    priceCents: 999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 1,
    entitlements: {
      AI_COACH_CHAT_MONTHLY: 50,
      AI_DAILY_BRIEF_MONTHLY: 30,
      AI_STUDY_HELP_MONTHLY: 50,
      AI_RECRUITING_OUTREACH_MONTHLY: 20,
      FILM_STORAGE_GB: 5,
      HIGHLIGHT_REELS_MAX: 3,
      RECRUITING_SCHOOLS_MAX: 10,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
    },
  },
  {
    // MENTA Membership relaunch (5-tier): this row's id previously held
    // key="UNDERDOG" at $19.99 — prisma/migrate-underdog-mvp-swap.ts
    // rotated the key, this seed pass sets the rest. Its entitlements
    // below are the former "UNDERDOG" tier's values, carried over as-is
    // since MVP is now the richer of the two entry paid tiers.
    key: "MVP",
    name: "MVP",
    tagline: "Own your development.",
    scope: "INDIVIDUAL",
    priceCents: 1999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 2,
    entitlements: {
      AI_COACH_CHAT_MONTHLY: 150,
      AI_DAILY_BRIEF_MONTHLY: 60,
      AI_STUDY_HELP_MONTHLY: 150,
      AI_RECRUITING_OUTREACH_MONTHLY: 50,
      FILM_STORAGE_GB: 15,
      HIGHLIGHT_REELS_MAX: 5,
      RECRUITING_SCHOOLS_MAX: 25,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
    },
  },
  {
    // Retired from the public membership page (see the new canonical
    // membership config) but kept active:false rather than deleted —
    // preserves the row/id and any historical Subscription referencing
    // it. Entitlements below are unchanged from before the relaunch.
    key: "MENTA_PLUS",
    name: "MENTA+",
    tagline: "Your entire athletic life. One place.",
    scope: "INDIVIDUAL",
    priceCents: 3999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 3,
    active: false,
    entitlements: {
      // "Unlimited" is sold with a fair-use footnote on the homepage —
      // null here means no hard monthly cap, not literally infinite
      // infrastructure.
      AI_COACH_CHAT_MONTHLY: UNLIMITED,
      AI_DAILY_BRIEF_MONTHLY: UNLIMITED,
      AI_STUDY_HELP_MONTHLY: UNLIMITED,
      AI_RECRUITING_OUTREACH_MONTHLY: UNLIMITED,
      FILM_STORAGE_GB: 50,
      HIGHLIGHT_REELS_MAX: 15,
      RECRUITING_SCHOOLS_MAX: UNLIMITED,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
    },
  },
  {
    // Retired — see MENTA_PLUS comment above. This plan's own entitlement
    // set is reused (unchanged) as ONYX's *provisional* starting point
    // below; that reuse is intentionally not final, see ONYX's comment.
    key: "MENTA_PRO",
    name: "MENTA PRO",
    tagline: "For athletes treating development like a business.",
    scope: "INDIVIDUAL",
    priceCents: 7999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 4,
    active: false,
    entitlements: {
      AI_COACH_CHAT_MONTHLY: UNLIMITED,
      AI_DAILY_BRIEF_MONTHLY: UNLIMITED,
      AI_STUDY_HELP_MONTHLY: UNLIMITED,
      AI_RECRUITING_OUTREACH_MONTHLY: UNLIMITED,
      FILM_STORAGE_GB: 100,
      HIGHLIGHT_REELS_MAX: UNLIMITED,
      RECRUITING_SCHOOLS_MAX: UNLIMITED,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
    },
  },
  {
    // New top individual tier. priceCents/billingInterval/stripePriceId
    // are intentionally unset — no price has been decided, and none is
    // invented here. isCustomPricing stays false (this isn't a
    // contact-sales plan, just not-yet-priced) — checkout/route.ts
    // distinguishes priceCents === null ("pricing not set") from
    // priceCents === 0 ("free plan") and returns an honest, distinct
    // message for each rather than the misleading "this plan is free."
    // Entitlements below are ONLY a provisional starting point (copied
    // from the retired MENTA_PRO row) — explicitly NOT a final decision,
    // revisit before production launch.
    key: "ONYX",
    name: "Onyx",
    tagline: "Operate at your highest level.",
    scope: "INDIVIDUAL",
    priceCents: null,
    billingInterval: "NONE",
    isCustomPricing: false,
    sortOrder: 3,
    active: true,
    entitlements: {
      AI_COACH_CHAT_MONTHLY: UNLIMITED,
      AI_DAILY_BRIEF_MONTHLY: UNLIMITED,
      AI_STUDY_HELP_MONTHLY: UNLIMITED,
      AI_RECRUITING_OUTREACH_MONTHLY: UNLIMITED,
      FILM_STORAGE_GB: 100,
      HIGHLIGHT_REELS_MAX: UNLIMITED,
      RECRUITING_SCHOOLS_MAX: UNLIMITED,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
    },
  },
  {
    key: "TEAM",
    name: "MENTA Team",
    tagline: "One team. One system. One standard.",
    scope: "TEAM",
    priceCents: null,
    billingInterval: "NONE",
    isCustomPricing: true,
    sortOrder: 5,
    entitlements: {
      FILM_STORAGE_GB: 250,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
      // Custom-priced: the actual roster size a team buys is negotiated
      // per customer, not a single number every Team-plan customer
      // shares. Left unlimited on this shared Plan template until a
      // per-subscription override exists; a specific deal's cap can be
      // set today by adjusting that one team's PlanEntitlement directly.
      TEAM_MAX_ATHLETES: UNLIMITED,
    },
  },
  {
    key: "ORGANIZATION",
    name: "MENTA for Organizations",
    tagline: "Your athletes shouldn’t need seven different systems to develop.",
    scope: "ORGANIZATION",
    priceCents: null,
    billingInterval: "NONE",
    isCustomPricing: true,
    sortOrder: 6,
    entitlements: {
      FILM_STORAGE_GB: UNLIMITED,
      TRAINING_PROGRAMS: UNLIMITED,
      LIVE_SESSIONS: UNLIMITED,
      TEAM_MAX_ATHLETES: UNLIMITED,
    },
  },
];

async function main() {
  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        scope: p.scope,
        priceCents: p.priceCents,
        billingInterval: p.billingInterval,
        isCustomPricing: p.isCustomPricing,
        sortOrder: p.sortOrder,
        active: p.active ?? true,
      },
      update: {
        name: p.name,
        tagline: p.tagline,
        scope: p.scope,
        priceCents: p.priceCents,
        billingInterval: p.billingInterval,
        isCustomPricing: p.isCustomPricing,
        sortOrder: p.sortOrder,
        active: p.active ?? true,
      },
    });

    for (const key of ENTITLEMENT_KEYS) {
      if (!(key in p.entitlements)) {
        await prisma.planEntitlement.deleteMany({ where: { planId: plan.id, key } });
        continue;
      }
      await prisma.planEntitlement.upsert({
        where: { planId_key: { planId: plan.id, key } },
        create: { planId: plan.id, key, limitValue: p.entitlements[key] ?? null },
        update: { limitValue: p.entitlements[key] ?? null },
      });
    }

    // Prune any entitlement row for a key that no longer exists at all
    // (renamed/removed since an earlier seed run).
    await prisma.planEntitlement.deleteMany({
      where: { planId: plan.id, key: { notIn: [...ENTITLEMENT_KEYS] } },
    });
  }

  const total = await prisma.plan.count();
  console.log(JSON.stringify({ plansSeeded: plans.length, totalPlansInDb: total }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
