import Link from "next/link";
import type { ResolvedMembershipTier } from "@/lib/membership";

/**
 * Homepage teaser only — the detailed 5-tier membership experience lives
 * at /membership (the canonical, cinematic presentation). This section
 * deliberately doesn't reproduce prices/bullets/CTAs per tier; duplicating
 * that copy here would be exactly the "second competing pricing system"
 * this product is trying to avoid. See src/lib/membership.ts /
 * src/lib/membership-config.ts for the one shared source both this and
 * /membership read from.
 */
export function PricingSection({ tiers }: { tiers: ResolvedMembershipTier[] }) {
  const names = tiers.map((t) => t.displayName);

  return (
    <section id="pricing" className="px-6 md:px-10 py-24 border-t border-[var(--border-soft)] text-center">
      <div className="eyebrow justify-center flex mx-auto w-fit reveal reveal-scale">MENTA</div>
      <h2 className="text-3xl md:text-5xl font-semibold mb-4 reveal reveal-scale" style={{ transitionDelay: "80ms" }}>
        Choose your level.
      </h2>
      <p className="text-text-3 text-sm max-w-xl mx-auto mb-8 reveal reveal-scale" style={{ transitionDelay: "160ms" }}>
        Your development. Your system. Your next level.
      </p>
      <div
        className="mono text-text-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-10 reveal reveal-scale"
        style={{ transitionDelay: "220ms" }}
      >
        {names.map((name, i) => (
          <span key={name}>
            {name}
            {i < names.length - 1 && <span className="mx-3 text-[var(--border-strong)]">/</span>}
          </span>
        ))}
      </div>
      <div className="reveal reveal-scale" style={{ transitionDelay: "280ms" }}>
        <Link href="/membership" className="btn-primary">
          See memberships →
        </Link>
      </div>
    </section>
  );
}
