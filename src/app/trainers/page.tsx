import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { RevealInit } from "@/components/RevealInit";

export default function TrainersPage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <section className="px-6 md:px-10 pt-40 pb-32 text-center">
          <div className="max-w-xl mx-auto">
            <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">For trainers</div>
            <h1 className="text-4xl md:text-6xl font-semibold mb-6 reveal reveal-scale" style={{ transitionDelay: "70ms" }}>
              Plug into the athlete&rsquo;s plan.
            </h1>
            <p className="text-text-2 reveal reveal-scale" style={{ transitionDelay: "140ms" }}>
              Plug into an athlete&rsquo;s plan without becoming another disconnected app.
            </p>
            <div className="mt-10 reveal reveal-scale" style={{ transitionDelay: "200ms" }}>
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
