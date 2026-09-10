import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Hero } from "@/components/Hero";
import { RevealInit } from "@/components/RevealInit";
import { IntroBoot } from "@/components/IntroBoot";

// The homepage is deliberately short — hero, then one final CTA, then the
// footer. Everything that used to live here (dashboard preview, the seven
// pillars, feature deep-dives, MENTA Safety, testimonials, mission, the
// founder story, membership tiers) moved to its own dedicated page rather
// than being deleted — see /platform, /athletes, /coaches, /parents,
// /trainers, /menta-safety, /about, /membership.
export default function HomePage() {
  return (
    <div className="home-os-root">
      <IntroBoot />
      <RevealInit />
      <MarketingNav />
      <main>
        <Hero />

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
              style={{ filter: "invert(0)", opacity: 0.4 }}
            />
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
