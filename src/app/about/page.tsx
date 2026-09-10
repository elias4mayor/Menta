import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { FounderStory } from "@/components/FounderStory";
import { RevealInit } from "@/components/RevealInit";

// The founder story and mission statement, moved off the homepage — same
// components/copy as before, just given their own dedicated page.
export default function AboutPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="relative px-6 md:px-10 pt-40 pb-24 text-center overflow-hidden">
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

        <section className="px-6 md:px-10 py-24 text-center border-t border-[var(--border-soft)]">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 reveal reveal-scale">
            Want to be part of the beta?
          </h2>
          <div className="reveal reveal-scale" style={{ transitionDelay: "100ms" }}>
            <Link href="/signup" className="btn-primary">
              Join the MENTA Beta
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
