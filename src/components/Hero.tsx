import Link from "next/link";
import { LiveGallery, GALLERY_SLIDES } from "@/components/LiveGallery";
import { GlowWaveText } from "@/components/GlowWaveText";

export function Hero() {
  return (
    <section className="relative px-6 md:px-10 pt-40 md:pt-48 pb-32 text-center overflow-hidden">
      <LiveGallery slides={GALLERY_SLIDES} heroBg />
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center hero-on-dark">
        <h1 className="text-text-1 text-5xl md:text-7xl font-semibold leading-[1.05] mb-6 reveal">
          <GlowWaveText intensity="strong">Build the future of athlete development.</GlowWaveText>
        </h1>
        <p className="text-text-2 text-lg max-w-xl mb-8 reveal">
          MENTA is the AI Athlete Operating System helping athletes improve performance, mindset,
          academics, recruiting, recovery, and long-term development — all in one intelligent
          platform.
        </p>
        <div className="flex flex-wrap justify-center gap-3 reveal">
          <Link href="/signup" className="btn-primary">
            Join the MENTA Beta
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="#platform" className="btn-secondary">
            Explore MENTA
          </Link>
        </div>
        <p className="text-text-3 text-sm mt-6 reveal">
          Built for athletes. Designed for teams. Powered by AI.
        </p>
      </div>
    </section>
  );
}
