import Link from "next/link";

/**
 * The premium black "operating system" hero — solid #08080a (via the
 * .home-os-root wrapper in page.tsx, same token values as .live-root),
 * no photo, no gradient. Entrance motion reuses the existing .reveal
 * scroll-reveal system (RevealInit's IntersectionObserver fires
 * immediately for already-in-viewport elements, which this is) rather
 * than introducing a second animation mechanism for one section.
 */
export function HomeHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 md:px-10 py-32">
      <h1
        className="text-5xl md:text-7xl lg:text-8xl font-semibold leading-[1.03] tracking-tight mb-6 reveal reveal-scale"
        style={{ transitionDelay: "0ms" }}
      >
        Your athlete
        <br />
        operating system.
      </h1>
      <p
        className="text-text-2 text-base md:text-lg max-w-lg mb-10 reveal"
        style={{ transitionDelay: "150ms" }}
      >
        Training. Film. Recovery. Academics. Recruiting. Mindset.
      </p>
      <div className="reveal" style={{ transitionDelay: "280ms" }}>
        <Link href="/signup" className="btn-primary">
          Enter MENTA
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
