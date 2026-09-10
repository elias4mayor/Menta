import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { RevealInit } from "@/components/RevealInit";

const LINKS = [
  { name: "Team", href: "/team", desc: "Roster, position groups, and permissions." },
  { name: "Film", href: "/film", desc: "Tiered visibility, tagging, and film reports." },
  { name: "Training", href: "/train", desc: "Programs, prescriptions, and live sessions." },
];

export default function CoachesPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-16 text-center">
          <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">For coaches</div>
          <h1 className="text-4xl md:text-6xl font-semibold mb-5 max-w-2xl mx-auto reveal reveal-scale" style={{ transitionDelay: "70ms" }}>
            Your whole roster&rsquo;s development, not just game stats.
          </h1>
          <p className="text-text-2 max-w-lg mx-auto reveal reveal-scale" style={{ transitionDelay: "140ms" }}>
            See your whole roster&rsquo;s development, not just game stats — scoped to your own teams.
          </p>
          <div className="mt-8 reveal reveal-scale" style={{ transitionDelay: "200ms" }}>
            <Link href="/signup" className="btn-primary">
              Join the MENTA Beta
            </Link>
          </div>
        </section>

        <section className="px-6 md:px-10 pb-24">
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {LINKS.map((l, i) => (
              <Link
                key={l.name}
                href={l.href}
                className="card card-hover p-5 block reveal reveal-scale"
                style={{ transitionDelay: `${i * 60}ms` }}
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
