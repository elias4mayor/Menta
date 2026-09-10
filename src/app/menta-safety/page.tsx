import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { RevealInit } from "@/components/RevealInit";

// Moved off the homepage into its own page — same copy, not rewritten.
// Note: this lives at /menta-safety, not /safety — /safety is already the
// real, authenticated MENTA Safety product page for signed-in users
// (src/app/(app)/safety), and a public route can't share that URL.
export default function MentaSafetyPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-32 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="eyebrow justify-center reveal reveal-scale">MENTA Safety</div>
            <h1 className="text-4xl md:text-6xl font-semibold mb-6 reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
              Preparedness. Not prediction.
            </h1>
            <p className="text-text-2 leading-relaxed reveal reveal-scale" style={{ transitionDelay: "160ms" }}>
              Emergency contacts, team protocols, and a real preparedness checklist — built calmly,
              for the moments that call for a plan instead of a guess.
            </p>
            <p className="text-text-3 text-sm leading-relaxed mt-4 reveal reveal-scale" style={{ transitionDelay: "220ms" }}>
              MENTA Safety doesn&rsquo;t predict cardiac events, heat stroke, or concussions — no product
              can. It makes sure the people around an athlete already know what to do before something
              happens, instead of figuring it out in the moment.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3 reveal reveal-scale" style={{ transitionDelay: "300ms" }}>
              <Link href="/signup" className="btn-primary">
                Join the MENTA Beta
              </Link>
              <Link href="/platform" className="btn-secondary">
                Back to the platform
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
