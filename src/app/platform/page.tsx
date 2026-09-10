import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { DashboardPreview } from "@/components/DashboardPreview";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { PricingSection } from "@/components/PricingSection";
import { RevealInit } from "@/components/RevealInit";
import { getSessionUser } from "@/lib/session";
import { resolveMembershipTiers } from "@/lib/membership";

const PILLARS = [
  { name: "Training", href: "/train", desc: "Workout library and tracking." },
  { name: "Performance", href: "/performance", desc: "Stats, PRs, and trends." },
  { name: "Film", href: "/film", desc: "Upload, review, clip, and build highlight reels." },
  { name: "Recovery", href: "/recovery", desc: "Sleep, load, and wellness check-ins." },
  { name: "Mindset", href: "/mind", desc: "Mental performance check-ins and journaling." },
  { name: "Academics", href: "/school", desc: "GPA tracking and eligibility checklists." },
  { name: "Recruiting", href: "/recruit", desc: "Recruiting profile and outreach organizer." },
];

const FEATURES = [
  {
    eyebrow: "Performance",
    heading: "See every rep, every PR, every trend.",
    description:
      "Log workouts, track personal records, and watch performance trends over time — so progress is visible, not just felt.",
    href: "/performance",
    cta: "Explore Performance",
    metrics: [
      { label: "40-yd", value: "4.6s" },
      { label: "Bench", value: "225 lb" },
      { label: "Vertical", value: "32in" },
    ],
  },
  {
    eyebrow: "Mindset",
    heading: "Mental performance, tracked like everything else.",
    description:
      "Quick check-ins on focus, confidence, and stress build a real picture of mental readiness over a season, not just game day.",
    href: "/mind",
    cta: "Explore Mindset",
    metrics: [
      { label: "Focus", value: "8/10" },
      { label: "Confidence", value: "7/10" },
      { label: "Stress", value: "Low" },
    ],
  },
  {
    eyebrow: "Academics",
    heading: "Grades and eligibility, before they become a problem.",
    description:
      "GPA tracking and eligibility checklists live next to training — so academics never fall through the cracks.",
    href: "/school",
    cta: "Explore Academics",
    metrics: [
      { label: "GPA", value: "3.8" },
      { label: "Eligibility", value: "On Track" },
      { label: "Credits", value: "18/24" },
    ],
  },
  {
    eyebrow: "Recruiting",
    heading: "One organized recruiting profile, not five spreadsheets.",
    description:
      "Track outreach, schools, and contacts in one recruiting profile built to travel with the athlete.",
    href: "/recruit",
    cta: "Explore Recruiting",
    metrics: [
      { label: "Schools", value: "6" },
      { label: "Contacts", value: "12" },
      { label: "Offers", value: "2" },
    ],
  },
  {
    eyebrow: "Recovery",
    heading: "Recovery treated as part of training, not an afterthought.",
    description:
      "Sleep, load, and wellness check-ins turn recovery into a habit that's actually tracked.",
    href: "/recovery",
    cta: "Explore Recovery",
    metrics: [
      { label: "Sleep", value: "7.5h" },
      { label: "Recovery", value: "87%" },
      { label: "Load", value: "Optimal" },
    ],
  },
];

export default async function PlatformPage() {
  const user = await getSessionUser();
  const tiers = await resolveMembershipTiers(user?.id ?? null);

  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-20 text-center">
          <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">The platform</div>
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 max-w-3xl mx-auto reveal reveal-scale" style={{ transitionDelay: "70ms" }}>
            One system for the complete athlete.
          </h1>
          <p className="text-text-2 max-w-xl mx-auto reveal reveal-scale" style={{ transitionDelay: "140ms" }}>
            Seven development pillars, one profile, one AI — training, performance, film, recovery,
            mindset, academics, and recruiting, all connected instead of scattered across separate apps.
          </p>
        </section>

        <section className="px-6 md:px-10 pb-24 text-center">
          <div className="mb-12">
            <div className="eyebrow justify-center flex mx-auto w-fit">See MENTA in action</div>
            <h2 className="text-3xl md:text-5xl font-semibold mb-2">One dashboard for the whole athlete.</h2>
            <p className="text-text-3 text-sm max-w-xl mx-auto">
              Illustrative example — your own dashboard reflects your real training, academics,
              recovery, and recruiting data.
            </p>
          </div>
          <div className="depth-visual">
            <DashboardPreview />
          </div>
        </section>

        <section id="pillars" className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="max-w-5xl mx-auto">
            <div className="rule-heading mb-6 reveal reveal-scale">The seven pillars</div>
            <div className="grid md:grid-cols-4 gap-4">
              {PILLARS.map((p, i) => (
                <Link
                  key={p.name}
                  href={p.href}
                  className="card card-hover p-5 reveal reveal-scale block"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="mono text-text-3 mb-3">{String(i + 1).padStart(2, "0")}</div>
                  <div className="font-heading font-semibold mb-1">{p.name}</div>
                  <p className="text-text-2 text-sm">{p.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="space-y-24 md:space-y-32 max-w-5xl mx-auto">
            {FEATURES.map((f, i) => (
              <FeatureShowcase
                key={f.eyebrow}
                {...f}
                reverse={i % 2 === 1}
                depth={f.eyebrow === "Performance" || f.eyebrow === "Recruiting"}
              />
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)] text-center">
          <div className="max-w-2xl mx-auto">
            <div className="eyebrow justify-center reveal reveal-scale">MENTA Safety</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
              Preparedness. Not prediction.
            </h2>
            <p className="text-text-2 text-sm leading-relaxed reveal reveal-scale" style={{ transitionDelay: "160ms" }}>
              Emergency contacts, team protocols, and a real preparedness checklist — part of every
              MENTA profile.
            </p>
            <div className="mt-8 reveal reveal-scale" style={{ transitionDelay: "240ms" }}>
              <Link href="/menta-safety" className="btn-secondary">
                Explore MENTA Safety
              </Link>
            </div>
          </div>
        </section>

        <PricingSection tiers={tiers} />
      </main>
      <MarketingFooter />
    </div>
  );
}
