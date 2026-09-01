import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * One-time migration for the MENTA Membership relaunch (5-tier: ROOKIE ->
 * UNDERDOG -> MVP -> ONYX -> MENTA TEAM). The live DB's cheaper paid tier
 * was keyed "MVP" ($9.99) and the pricier one "UNDERDOG" ($19.99) — exactly
 * backwards from the new brand's tier order, where UNDERDOG sits below MVP.
 *
 * This swaps ONLY the `key` column between those two specific rows (by
 * their captured original ids, not by key — key is what's being swapped),
 * inside one transaction, via a temp key to avoid the unique-key collision.
 * Plan.id never changes, so Subscription.planId (the actual FK) is
 * untouched — any existing subscriber on either row keeps the exact same
 * row/entitlements they had before this ran, just under its new brand name.
 * prisma/seed-plans.ts (run after this) then writes the final
 * name/tagline/price/entitlement values onto each key — this script's only
 * job is the identity swap.
 *
 * Idempotent by construction: re-running after a successful swap is a
 * no-op (the guard below detects the post-swap state and returns early).
 * Run once: `npx tsx prisma/migrate-underdog-mvp-swap.ts`.
 */

const prisma = new PrismaClient();

// Captured directly from the live DB before this migration ever ran.
const ORIGINAL_MVP_ID = "cmtdwumlj000vrxobinb990rf"; // was key="MVP", $9.99 -> becomes key="UNDERDOG"
const ORIGINAL_UNDERDOG_ID = "cmtdwumlz001qrxobizn6bja9"; // was key="UNDERDOG", $19.99 -> becomes key="MVP"
const TEMP_KEY = "__MIGRATING_UNDERDOG_MVP_SWAP__";

async function main() {
  const rowThatWasMvp = await prisma.plan.findUnique({ where: { id: ORIGINAL_MVP_ID } });
  const rowThatWasUnderdog = await prisma.plan.findUnique({ where: { id: ORIGINAL_UNDERDOG_ID } });

  if (!rowThatWasMvp || !rowThatWasUnderdog) {
    throw new Error(
      `Expected original Plan rows not found by id (${ORIGINAL_MVP_ID}, ${ORIGINAL_UNDERDOG_ID}) — the guard can't verify current state. Aborting without changing anything.`
    );
  }

  if (rowThatWasMvp.key === "UNDERDOG" && rowThatWasUnderdog.key === "MVP") {
    console.log(
      JSON.stringify({ alreadyMigrated: true, note: "Swap already applied — no changes made." }, null, 2)
    );
    return;
  }

  if (rowThatWasMvp.key !== "MVP" || rowThatWasUnderdog.key !== "UNDERDOG") {
    throw new Error(
      `Unexpected plan key state — id ${ORIGINAL_MVP_ID} has key "${rowThatWasMvp.key}", id ${ORIGINAL_UNDERDOG_ID} has key "${rowThatWasUnderdog.key}". Refusing to swap blindly; investigate before re-running.`
    );
  }

  await prisma.$transaction([
    prisma.plan.update({ where: { id: ORIGINAL_UNDERDOG_ID }, data: { key: TEMP_KEY } }),
    prisma.plan.update({ where: { id: ORIGINAL_MVP_ID }, data: { key: "UNDERDOG" } }),
    prisma.plan.update({ where: { id: ORIGINAL_UNDERDOG_ID }, data: { key: "MVP" } }),
  ]);

  console.log(
    JSON.stringify(
      {
        swapped: true,
        originalMvpIdIsNowKeyedUnderdog: ORIGINAL_MVP_ID,
        originalUnderdogIdIsNowKeyedMvp: ORIGINAL_UNDERDOG_ID,
      },
      null,
      2
    )
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
