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
    key: "MVP",
    name: "MVP",
    tagline: "For athletes who are done “just working hard.”",
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
    key: "UNDERDOG",
    name: "Underdog",
    tagline: "For the ones nobody is watching yet.",
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
    key: "MENTA_PLUS",
    name: "MENTA+",
    tagline: "Your entire athletic life. One place.",
    scope: "INDIVIDUAL",
    priceCents: 3999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 3,
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
    key: "MENTA_PRO",
    name: "MENTA PRO",
    tagline: "For athletes treating development like a business.",
    scope: "INDIVIDUAL",
    priceCents: 7999,
    billingInterval: "MONTH",
    isCustomPricing: false,
    sortOrder: 4,
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
    tagline: "Stop managing athletes across six different apps.",
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
      },
      update: {
        name: p.name,
        tagline: p.tagline,
        scope: p.scope,
        priceCents: p.priceCents,
        billingInterval: p.billingInterval,
        isCustomPricing: p.isCustomPricing,
        sortOrder: p.sortOrder,
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
