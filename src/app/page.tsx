import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Hero } from "@/components/Hero";
import { DashboardPreview } from "@/components/DashboardPreview";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { WhoSection } from "@/components/WhoSection";
import { FounderStory } from "@/components/FounderStory";
import { RevealInit } from "@/components/RevealInit";
import { IntroBoot } from "@/components/IntroBoot";

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

const TESTIMONIALS = [
  {
    quote:
      "Everything used to live in five different apps and a group chat. Having film, workouts, and my grades in one place changed how I plan my week.",
    who: "Athlete",
    role: "Example — high school junior",
  },
  {
    quote:
      "I coach 60 kids. Knowing who's falling behind academically before it becomes an eligibility problem is worth more than any single feature.",
    who: "Coach",
    role: "Example — program head coach",
  },
  {
    quote:
      "The consent controls were the reason we said yes. I can see everything, and nothing gets shared without us approving it.",
    who: "Parent",
    role: "Example — parent of a sophomore",
  },
];

export default function HomePage() {
  return (
    <>
      <IntroBoot />
      <RevealInit />
      <MarketingNav />
      <main>
        <Hero />

        <section className="px-6 md:px-10 pt-20 pb-24 text-center">
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

        <WhoSection />

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border-soft)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto">
            <Stat value="7" label="Development pillars" delay={0} />
            <Stat value="100%" label="Parent-consent by default" delay={70} />
            <Stat value="0" label="Athlete data ever sold" delay={140} />
            <Stat value="1" label="Profile, one AI" delay={210} />
          </div>
        </section>

        <section id="platform" className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">
            The seven pillars
          </div>
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-6">
            {PILLARS.map((p, i) => (
              <div
                key={p.name}
                className="card card-hover p-5 reveal reveal-scale"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="font-heading font-semibold mb-1">{p.name}</div>
                <p className="text-text-2 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)] space-y-24 md:space-y-32 max-w-5xl mx-auto">
          {FEATURES.map((f, i) => (
            <FeatureShowcase
              key={f.eyebrow}
              {...f}
              reverse={i % 2 === 1}
              depth={f.eyebrow === "Performance" || f.eyebrow === "Recruiting"}
            />
          ))}
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)] text-center">
          <div className="max-w-2xl mx-auto">
            <div className="eyebrow justify-center reveal reveal-scale">MENTA Safety</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
              Preparedness. Not prediction.
            </h2>
            <p
              className="text-text-2 text-sm leading-relaxed reveal reveal-scale"
              style={{ transitionDelay: "160ms" }}
            >
              Emergency contacts, team protocols, and a real preparedness checklist — built calmly,
              for the moments that call for a plan instead of a guess.
            </p>
            <div className="mt-8 reveal reveal-scale" style={{ transitionDelay: "240ms" }}>
              <Link href="/safety" className="btn-secondary">
                Explore MENTA Safety
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center reveal reveal-scale">Why we&rsquo;re building this</div>
            <h2
              className="text-3xl font-semibold mb-2 reveal reveal-scale"
              style={{ transitionDelay: "80ms" }}
            >
              The feedback MENTA is built to earn.
            </h2>
            <p className="text-text-3 text-sm reveal reveal-scale" style={{ transitionDelay: "160ms" }}>
              Illustrative examples — real athlete and coach stories will replace these as the beta grows.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.who}
                className="card card-hover p-6 reveal reveal-scale"
                style={{ transitionDelay: `${240 + i * 80}ms` }}
              >
                <p className="text-sm mb-5 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-sm font-medium">{t.who}</div>
                <div className="text-text-3 text-xs">{t.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative px-6 md:px-10 py-32 border-t border-y border-[var(--border-soft)] text-center overflow-hidden">
          <div className="eyebrow justify-center reveal reveal-scale">Our mission</div>
          <p
            className="depth-visual serif-italic max-w-3xl mx-auto text-3xl md:text-5xl leading-tight text-text-1 reveal reveal-scale"
            style={{ transitionDelay: "100ms" }}
          >
            Every athlete deserves the kind of support system that used to require money,
            connections, and luck.
          </p>
          <p
            className="text-text-2 max-w-xl mx-auto mt-8 text-sm leading-relaxed reveal reveal-scale"
            style={{ transitionDelay: "220ms" }}
          >
            MENTA exists to make complete athlete development — performance, mind, academics, and
            opportunity — available to every kid willing to put in the work.
          </p>
        </section>

        <FounderStory />

        <section className="px-6 md:px-10 py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold mb-4 reveal reveal-scale">
            Your next level starts here.
          </h2>
          <p
            className="text-text-2 text-sm max-w-md mx-auto mb-8 reveal reveal-scale"
            style={{ transitionDelay: "100ms" }}
          >
            One intelligent system for the athlete you&rsquo;re becoming.
          </p>
          <div className="reveal reveal-scale" style={{ transitionDelay: "200ms" }}>
            <Link href="/signup" className="btn-primary">
              Join the MENTA Beta
            </Link>
          </div>
          <div className="mt-14 reveal reveal-scale" style={{ transitionDelay: "320ms" }}>
            <Image
              src="/logo.png"
              alt="MENTA"
              width={863}
              height={194}
              className="h-6 w-auto mx-auto"
              style={{ filter: "invert(1)", opacity: 0.4 }}
            />
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}

function Stat({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <div className="reveal reveal-scale" style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-4xl font-semibold font-heading signal-text mb-1">{value}</div>
      <div className="text-text-2 text-sm">{label}</div>
    </div>
  );
}
