import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { PartnershipContactForm } from "@/components/PartnershipContactForm";

type PlanRow = { key: string; name: string; priceCents: number | null; isCustomPricing: boolean };

/**
 * Hand-authored marketing copy per plan — price/existence comes from the
 * DB (src/lib/entitlements.ts / prisma/seed-plans.ts) so a price change is
 * a seed edit, but the sales copy itself lives here like the rest of this
 * page's content. Bullets list only what MENTA actually ships today —
 * "Highlight Reel Assistant" and "advanced film intelligence" are AI
 * capabilities that don't exist yet (see README), so they're marked
 * "coming soon" rather than sold as live features.
 */
const PLAN_COPY: Record<string, { tagline: string; bestFor: string; bullets: string[] }> = {
  ROOKIE: {
    tagline: "Because everybody has to start somewhere.",
    bestFor: "Best for: trying MENTA out.",
    bullets: [
      "Athlete profile & workout library",
      "AI Coach: 10 messages/mo",
      "Daily Brief: 10/mo · Study Help: 10/mo",
      "5 AI recruiting outreach drafts/mo",
      "1GB film storage, 1 highlight reel",
      "Track up to 3 recruiting schools",
    ],
  },
  MVP: {
    tagline: "For athletes who are done “just working hard.”",
    bestFor: "Best for: athletes ready to train with structure.",
    bullets: [
      "Everything in Rookie, plus:",
      "AI Coach: 50/mo · Daily Brief: 30/mo · Study Help: 50/mo",
      "20 AI outreach drafts/mo",
      "Training programs & MENTA LIVE",
      "5GB film storage, 3 highlight reels",
      "Track up to 10 recruiting schools",
    ],
  },
  UNDERDOG: {
    tagline: "For the ones nobody is watching yet.",
    bestFor: "Best for: athletes building a real recruiting case.",
    bullets: [
      "Everything in MVP, plus:",
      "AI Coach: 150/mo · Daily Brief: 60/mo · Study Help: 150/mo",
      "50 AI outreach drafts/mo",
      "15GB film storage, 5 highlight reels",
      "Track up to 25 recruiting schools",
    ],
  },
  MENTA_PLUS: {
    tagline: "Your entire athletic life. One place.",
    bestFor: "Best for: athletes who want it all in one place.",
    bullets: [
      "Everything in Underdog, plus:",
      "Unlimited* AI Coach, Daily Brief, Study Help & outreach drafts",
      "50GB film storage, 15 highlight reels",
      "Unlimited* tracked recruiting schools",
      "Priority support",
      "Highlight Reel Assistant (coming soon)",
    ],
  },
  MENTA_PRO: {
    tagline: "For athletes treating development like a business.",
    bestFor: "Best for: athletes with a recruiting deadline.",
    bullets: [
      "Everything in MENTA+, plus:",
      "100GB film storage, unlimited* highlight reels",
      "Priority support & early access to new capabilities",
      "Advanced film intelligence (coming soon)",
    ],
  },
};

function formatPrice(plan: PlanRow): { price: string; period: string } {
  if (plan.isCustomPricing) return { price: plan.key === "TEAM" ? "Custom" : "Contact us", period: "" };
  if (!plan.priceCents) return { price: "$0", period: "" };
  return { price: `$${(plan.priceCents / 100).toFixed(2)}`, period: "/mo" };
}

export function PricingSection({
  plans,
  isSignedIn,
  currentPlanKey,
}: {
  plans: PlanRow[];
  isSignedIn: boolean;
  currentPlanKey: string | null;
}) {
  const individualPlans = plans.filter((p) => !["TEAM", "ORGANIZATION"].includes(p.key));
  const teamPlan = plans.find((p) => p.key === "TEAM");
  const orgPlan = plans.find((p) => p.key === "ORGANIZATION");

  return (
    <section id="pricing" className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
      <div className="text-center mb-14">
        <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">MENTA</div>
        <h2 className="text-3xl md:text-5xl font-semibold mb-2 reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
          Pick your level.
        </h2>
        <p className="text-text-3 text-sm max-w-xl mx-auto reveal reveal-scale" style={{ transitionDelay: "160ms" }}>
          Whether you&rsquo;re taking your first snap or chasing the next level, there&rsquo;s a MENTA for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl mx-auto items-stretch">
        {individualPlans.map((plan, i) => {
          const copy = PLAN_COPY[plan.key];
          const { price, period } = formatPrice(plan);
          const isFeatured = plan.key === "MENTA_PLUS";
          return (
            <div
              key={plan.key}
              className={`card p-6 flex flex-col reveal reveal-scale ${isFeatured ? "border-[var(--text-1)]" : ""}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {isFeatured && <span className="badge mb-3 w-fit">Most popular</span>}
              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
              <p className="text-text-3 text-xs mb-1 leading-relaxed">{copy?.tagline}</p>
              <p className="text-text-3 text-[11px] font-medium mb-4">{copy?.bestFor}</p>
              <div className="mb-5">
                <span className="text-3xl font-semibold font-heading">{price}</span>
                <span className="text-text-3 text-sm">{period}</span>
              </div>
              <ul className="text-xs text-text-2 space-y-2 mb-6 flex-1">
                {copy?.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <PricingCheckoutButton
                planKey={plan.key}
                isSignedIn={isSignedIn}
                isCurrentPlan={currentPlanKey === plan.key}
                isFree={plan.key === "ROOKIE"}
                className={isFeatured ? "btn-primary w-full justify-center" : "btn-secondary w-full justify-center"}
              >
                {plan.key === "ROOKIE" ? "Start free" : `Get ${plan.name}`}
              </PricingCheckoutButton>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-10 max-w-lg mx-auto reveal reveal-scale">
        <p className="text-text-2 text-sm font-medium">
          No contracts. No “call us for pricing” nonsense. Cancel anytime.
        </p>
        <p className="text-text-3 text-xs mt-1">
          Taxes may exist because apparently governments also want to be part of your development.
        </p>
        <p className="text-text-3 text-[11px] mt-3">
          *&ldquo;Unlimited&rdquo; means no hard monthly cap, subject to fair use — not literally infinite servers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-20">
        <div className="card p-8 text-center reveal reveal-scale">
          <h3 className="text-xl font-semibold mb-1">MENTA Team</h3>
          <p className="text-text-3 text-sm mb-6">Stop managing athletes across six different apps.</p>
          <ul className="text-xs text-text-2 space-y-2 mb-6 text-left max-w-xs mx-auto">
            <li>Team roster, position groups & coach permissions</li>
            <li>Training programs, prescriptions & MENTA LIVE</li>
            <li>Team film, assignments & film questions</li>
            <li>Team messaging & coach dashboards</li>
          </ul>
          <div className="text-2xl font-semibold font-heading mb-4">{teamPlan ? formatPrice(teamPlan).price : "Custom"}</div>
          <details className="text-left">
            <summary className="btn-secondary w-full justify-center cursor-pointer list-none text-center">
              Talk to MENTA →
            </summary>
            <div className="mt-4">
              <PartnershipContactForm defaultInterest="Team" />
            </div>
          </details>
        </div>

        <div className="card p-8 text-center reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
          <h3 className="text-xl font-semibold mb-1">MENTA for Organizations</h3>
          <p className="text-text-3 text-sm mb-6">Your athletes shouldn&rsquo;t need seven different systems to develop.</p>
          <ul className="text-xs text-text-2 space-y-2 mb-6 text-left max-w-xs mx-auto">
            <li>Multiple teams & organization administration</li>
            <li>Centralized athlete development & permissions</li>
            <li>Custom onboarding & data migration</li>
            <li>Dedicated support & custom contracts</li>
          </ul>
          <div className="text-2xl font-semibold font-heading mb-4">{orgPlan ? formatPrice(orgPlan).price : "Contact us"}</div>
          <details className="text-left">
            <summary className="btn-secondary w-full justify-center cursor-pointer list-none text-center">
              Contact MENTA →
            </summary>
            <div className="mt-4">
              <PartnershipContactForm defaultInterest="Organization" />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
