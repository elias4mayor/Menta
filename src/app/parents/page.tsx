import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { RevealInit } from "@/components/RevealInit";

export default function ParentsPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-32 text-center">
          <div className="max-w-xl mx-auto">
            <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">For parents</div>
            <h1 className="text-4xl md:text-6xl font-semibold mb-6 reveal reveal-scale" style={{ transitionDelay: "70ms" }}>
              Visibility, with consent.
            </h1>
            <p className="text-text-2 reveal reveal-scale" style={{ transitionDelay: "140ms" }}>
              Visibility into what matters, with consent controls — nothing shared without approval.
            </p>
            <p className="text-text-3 text-sm mt-4 reveal reveal-scale" style={{ transitionDelay: "200ms" }}>
              Every athlete under 18 needs a parent or guardian to approve their account. From there,
              what you can see is scoped and controlled — never a blanket feed of everything.
            </p>
            <div className="mt-10 reveal reveal-scale" style={{ transitionDelay: "260ms" }}>
              <Link href="/signup" className="btn-primary">
                Join the MENTA Beta
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
