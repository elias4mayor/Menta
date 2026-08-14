import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const ROLES = [
  { role: "Athlete", blurb: "Training, film, recovery, academics, and recruiting in one place." },
  { role: "Coach", blurb: "See your whole roster's development, not just game stats." },
  { role: "Parent", blurb: "Visibility into what matters, with consent controls you control." },
  { role: "Trainer", blurb: "Plug into an athlete's plan without another disconnected app." },
];

const PILLARS = [
  { name: "Training", href: "/train", desc: "Workout library and tracking." },
  { name: "Performance", href: "/performance", desc: "Stats, PRs, and trends." },
  { name: "Film", href: "/film", desc: "Upload, review, and (beta) AI-assisted breakdown." },
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
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-20 pb-24 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] mb-6">
            Build the future of
            <br />
            <span className="signal-text">athlete development.</span>
          </h1>
          <p className="text-text-2 text-lg max-w-xl mb-8">
            MENTA is the AI operating system helping athletes improve performance, mindset,
            academics, recruiting, and recovery — all in one platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Join Beta
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/faq" className="btn-secondary">
              Read the FAQ
            </Link>
          </div>

          <div className="card mt-16 p-6 max-w-lg">
            <div className="mono text-text-3 mb-4">Example — My MENTA dashboard</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
                <div className="mono text-text-3 mb-2">Readiness</div>
                <div className="text-2xl font-semibold">92</div>
              </div>
              <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
                <div className="mono text-text-3 mb-2">Weekly load</div>
                <div className="flex items-end gap-1 h-8">
                  {[40, 65, 50, 85, 60, 95, 45].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: "var(--grad-signal)" }} />
                  ))}
                </div>
              </div>
              <div className="bg-surface-2 rounded-[var(--r-sm)] p-3">
                <div className="mono text-text-3 mb-2">GPA</div>
                <div className="text-2xl font-semibold">3.8</div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border)]">
          <div className="mono text-text-3 mb-6">Built for every role</div>
          <div className="grid md:grid-cols-4 gap-4">
            {ROLES.map((r) => (
              <div key={r.role} className="card p-5">
                <div className="font-heading font-semibold mb-2">I&rsquo;m a {r.role}</div>
                <p className="text-text-2 text-sm">{r.blurb}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Stat value="7" label="Development pillars" />
            <Stat value="100%" label="Parent-consent by default" />
            <Stat value="0" label="Athlete data ever sold" />
            <Stat value="1" label="Profile, one AI" />
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border)]">
          <div className="mono text-text-3 mb-6">The seven pillars</div>
          <div className="grid md:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.name} className="card p-5">
                <div className="font-heading font-semibold mb-1">{p.name}</div>
                <p className="text-text-2 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border)]">
          <div className="mono text-text-3 mb-2">Why we&rsquo;re building this</div>
          <h2 className="text-3xl font-semibold mb-2">The feedback MENTA is built to earn.</h2>
          <p className="text-text-3 text-sm mb-8">
            Illustrative examples — real athlete and coach stories will replace these as the beta grows.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.who} className="card p-5">
                <p className="text-sm mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-sm font-medium">{t.who}</div>
                <div className="text-text-3 text-xs">{t.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 md:px-10 py-16 border-t border-[var(--border)]">
          <div className="card p-8 max-w-2xl">
            <div className="mono text-text-3 mb-3">Our mission</div>
            <p className="text-text-2">
              Every athlete deserves the kind of support system that used to require money,
              connections, and luck. MENTA exists to make complete athlete development —
              performance, mind, academics, and opportunity — available to every kid willing to
              put in the work.
            </p>
          </div>
        </section>

        <section className="px-6 md:px-10 py-20 border-t border-[var(--border)] text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6">Ready to build?</h2>
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
      <div className="text-4xl font-semibold font-heading mb-1">{value}</div>
      <div className="text-text-2 text-sm">{label}</div>
    </div>
  );
}
