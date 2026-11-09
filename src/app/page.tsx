import Link from "next/link";
import Image from "next/image";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Hero } from "@/components/Hero";
import { RevealInit } from "@/components/RevealInit";

export default function HomePage() {
  return (
    <div className="home-os-root">
      <RevealInit />
      <MarketingNav />
      <main>
        <Hero />

        <section
          id="menta-today"
          aria-labelledby="menta-today-title"
          className="scroll-mt-24 bg-black px-6 py-20 text-white md:px-10 md:py-28"
        >
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                A day in MENTA
              </p>
              <h2 id="menta-today-title" className="text-4xl font-semibold tracking-tight md:text-6xl">
                From the last bell to the first rep.
              </h2>
              <p className="mt-5 max-w-sm text-lg text-neutral-300">
                See when to leave class, what your coach wants you to work on, and what needs
                your attention before Friday.
              </p>
            </div>

            <div className="rounded-[2.5rem] bg-white p-7 text-black md:p-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-3xl font-semibold tracking-tight">Today</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Sample athlete view
                </span>
              </div>
              <dl className="divide-y divide-neutral-200">
                <div className="pb-4">
                  <dt className="text-sm font-semibold text-neutral-600">Team travel</dt>
                  <dd className="mt-1 text-lg font-medium">Leave class at 2:45. Bus at 3:05.</dd>
                </div>
                <div className="py-4">
                  <dt className="text-sm font-semibold text-neutral-600">Coach’s next move</dt>
                  <dd className="mt-1 text-lg font-medium">Watch your release rep before practice.</dd>
                </div>
                <div className="pt-4">
                  <dt className="text-sm font-semibold text-neutral-600">Academics</dt>
                  <dd className="mt-1 text-lg font-medium">Check in with your English teacher before Friday’s eligibility report.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

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
