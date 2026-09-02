import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/entitlements";
import { GlowWaveText } from "@/components/GlowWaveText";
import { BillingActions } from "@/components/BillingActions";

const AI_USAGE_ROWS: { key: "AI_COACH_CHAT_MONTHLY" | "AI_DAILY_BRIEF_MONTHLY" | "AI_STUDY_HELP_MONTHLY" | "AI_RECRUITING_OUTREACH_MONTHLY"; label: string }[] = [
  { key: "AI_COACH_CHAT_MONTHLY", label: "AI Coach messages" },
  { key: "AI_DAILY_BRIEF_MONTHLY", label: "Daily Briefs" },
  { key: "AI_STUDY_HELP_MONTHLY", label: "Study Help questions" },
  { key: "AI_RECRUITING_OUTREACH_MONTHLY", label: "AI outreach drafts" },
];

function formatUsage(used: number, limit: number | null): string {
  return limit === null ? `${used} used — unlimited*` : `${used} / ${limit} used this month`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser();
  const { checkout } = await searchParams;

  const [subscription, filmBytes, highlightCount, schoolCount, usage] = await Promise.all([
    prisma.subscription.findUnique({
      where: { ownerType_ownerId: { ownerType: "USER", ownerId: user.id } },
      include: { plan: { include: { entitlements: true } } },
    }),
    prisma.film.aggregate({ where: { uploadedById: user.id }, _sum: { sizeBytes: true } }),
    prisma.highlight.count({ where: { userId: user.id } }),
    prisma.recruitingSchool.count({ where: { userId: user.id } }),
    Promise.all(AI_USAGE_ROWS.map((row) => checkUsageLimit("USER", user.id, row.key))),
  ]);

  const plan = subscription?.plan ?? (await prisma.plan.findUnique({ where: { key: "ROOKIE" }, include: { entitlements: true } }));
  const entitlement = (key: string) => plan?.entitlements.find((e) => e.key === key)?.limitValue ?? 0;

  const filmLimitGb = entitlement("FILM_STORAGE_GB");
  const filmUsedGb = (filmBytes._sum.sizeBytes ?? 0) / (1024 * 1024 * 1024);
  const highlightLimit = entitlement("HIGHLIGHT_REELS_MAX");
  const schoolLimit = entitlement("RECRUITING_SCHOOLS_MAX");

  return (
    <div className="max-w-2xl mx-auto space-y-8 dash-in dash-in-1">
      <div>
        <div className="mono text-text-3 mb-2">Account</div>
        <h1 className="text-3xl font-semibold"><GlowWaveText intensity="strong">Billing</GlowWaveText></h1>
      </div>

      {checkout === "success" && (
        <p className="text-sm" style={{ color: "var(--success)" }}>
          Payment received — your plan will update in a moment. Refresh if it doesn&rsquo;t change right away.
        </p>
      )}
      {checkout === "canceled" && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          Checkout was canceled — you weren&rsquo;t charged.
        </p>
      )}

      <section className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="mono text-text-3">Current plan</div>
          {subscription && <span className="badge">{subscription.status}</span>}
        </div>
        <h2 className="text-xl font-semibold mb-1">{plan?.name ?? "Rookie"}</h2>
        {subscription?.currentPeriodEnd && (
          <p className="text-text-3 text-sm">
            {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
            {subscription.currentPeriodEnd.toLocaleDateString()}
          </p>
        )}
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Usage this month</div>
        <ul className="space-y-2 text-sm">
          {AI_USAGE_ROWS.map((row, i) => (
            <li key={row.key} className="flex items-center justify-between">
              <span className="text-text-2">{row.label}</span>
              <span>{formatUsage(usage[i].used, usage[i].limit)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Storage & content</div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-text-2">Film storage</span>
            <span>
              {filmUsedGb.toFixed(2)}GB {filmLimitGb === null ? "used — unlimited*" : `/ ${filmLimitGb}GB used`}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-text-2">Highlight reels</span>
            <span>{highlightCount}{highlightLimit === null ? " — unlimited" : ` / ${highlightLimit}`}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-text-2">Tracked recruiting schools</span>
            <span>{schoolCount}{schoolLimit === null ? " — unlimited" : ` / ${schoolLimit}`}</span>
          </li>
        </ul>
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Manage</div>
        <BillingActions hasStripeCustomer={Boolean(subscription?.stripeCustomerId)} />
        <div className="mt-4">
          <Link href="/#pricing" className="text-sm text-text-2 hover:text-text-1 underline">
            {subscription ? "Change plan →" : "Upgrade your plan →"}
          </Link>
        </div>
      </section>

      <p className="text-text-3 text-xs">
        *&ldquo;Unlimited&rdquo; means no hard monthly cap, subject to fair use.
      </p>
    </div>
  );
}
