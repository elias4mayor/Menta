import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Hero } from "@/components/Hero";
import { DashboardPreview } from "@/components/DashboardPreview";
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
  { name: "Safety", href: "/safety", desc: "Preparedness — emergency plans, not predictions." },
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
          <DashboardPreview />
        </section>

        <WhoSection />

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border-soft)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto">
            <Stat value="7" label="Development pillars" />
            <Stat value="100%" label="Parent-consent by default" />
            <Stat value="0" label="Athlete data ever sold" />
            <Stat value="1" label="Profile, one AI" />
          </div>
        </section>

        <section id="platform" className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="eyebrow justify-center flex mx-auto w-fit">The seven pillars</div>
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-6">
            {PILLARS.map((p) => (
              <div key={p.name} className="card card-hover p-5">
                <div className="font-heading font-semibold mb-1">{p.name}</div>
                <p className="text-text-2 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)]">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center">Why we&rsquo;re building this</div>
            <h2 className="text-3xl font-semibold mb-2">The feedback MENTA is built to earn.</h2>
            <p className="text-text-3 text-sm">
              Illustrative examples — real athlete and coach stories will replace these as the beta grows.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div key={t.who} className="card card-hover p-6">
                <p className="text-sm mb-5 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-sm font-medium">{t.who}</div>
                <div className="text-text-3 text-xs">{t.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative px-6 md:px-10 py-32 border-t border-y border-[var(--border-soft)] text-center overflow-hidden">
          <div className="eyebrow justify-center">Our mission</div>
          <p className="serif-italic max-w-3xl mx-auto text-3xl md:text-5xl leading-tight text-text-1">
            Every athlete deserves the kind of support system that used to require money,
            connections, and luck.
          </p>
          <p className="text-text-2 max-w-xl mx-auto mt-8 text-sm leading-relaxed">
            MENTA exists to make complete athlete development — performance, mind, academics, and
            opportunity — available to every kid willing to put in the work.
          </p>
        </section>

        <FounderStory />

        <section className="px-6 md:px-10 py-24 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold mb-8">Ready to build?</h2>
          <Link href="/signup" className="btn-primary">
            Join the beta
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-semibold font-heading signal-text mb-1">{value}</div>
      <div className="text-text-2 text-sm">{label}</div>
    </div>
  );
}
