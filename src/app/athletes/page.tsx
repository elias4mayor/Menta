import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { RevealInit } from "@/components/RevealInit";

const LINKS = [
  { name: "Training", href: "/train", desc: "Workout library and tracking." },
  { name: "Film", href: "/film", desc: "Upload, review, clip, and build highlight reels." },
  { name: "Performance", href: "/performance", desc: "Stats, PRs, and trends." },
  { name: "Recovery", href: "/recovery", desc: "Sleep, load, and wellness check-ins." },
  { name: "Mindset", href: "/mind", desc: "Mental performance check-ins and journaling." },
  { name: "Academics", href: "/school", desc: "GPA tracking and eligibility checklists." },
  { name: "Recruiting", href: "/recruit", desc: "Recruiting profile and outreach organizer." },
  { name: "AI Coach", href: "/ai-coach", desc: "Context-aware help, not a generic chatbot." },
];

export default function AthletesPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-16 text-center">
          <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">For athletes</div>
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 max-w-2xl mx-auto reveal reveal-scale" style={{ transitionDelay: "70ms" }}>
            Everything you need. One profile.
          </h1>
          <p className="text-text-2 max-w-lg mx-auto reveal reveal-scale" style={{ transitionDelay: "140ms" }}>
            Training, film, recovery, academics, and recruiting in one place — one profile, one AI.
          </p>
          <div className="mt-8 reveal reveal-scale" style={{ transitionDelay: "200ms" }}>
            <Link href="/signup" className="btn-primary">
              Join the MENTA Beta
            </Link>
          </div>
        </section>

        <section className="px-6 md:px-10 pb-24">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {LINKS.map((l, i) => (
              <Link
                key={l.name}
                href={l.href}
                className="card card-hover p-5 block reveal reveal-scale"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="font-heading font-semibold mb-1">{l.name}</div>
                <p className="text-text-2 text-sm">{l.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
