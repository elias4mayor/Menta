import Link from "next/link";

type Metric = { label: string; value: string };

/**
 * One alternating heading/description/visual/stats reveal block for the
 * homepage's feature-storytelling section. Metrics are clearly-labeled
 * illustrative examples (same convention as DashboardPreview and the
 * testimonials section) — never presented as real user data.
 */
export function FeatureShowcase({
  eyebrow,
  heading,
  description,
  href,
  cta,
  metrics,
  reverse = false,
  delayBase = 0,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  href: string;
  cta: string;
  metrics: Metric[];
  reverse?: boolean;
  delayBase?: number;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      <div className={reverse ? "md:order-2" : undefined}>
        <div className="eyebrow reveal reveal-scale" style={{ transitionDelay: `${delayBase}ms` }}>
          {eyebrow}
        </div>
        <h3
          className="text-2xl md:text-3xl font-semibold mt-2 mb-3 reveal reveal-scale"
          style={{ transitionDelay: `${delayBase + 80}ms` }}
        >
          {heading}
        </h3>
        <p
          className="text-text-2 text-sm leading-relaxed mb-6 max-w-md reveal reveal-scale"
          style={{ transitionDelay: `${delayBase + 160}ms` }}
        >
          {description}
        </p>
        <div className="reveal reveal-scale" style={{ transitionDelay: `${delayBase + 240}ms` }}>
          <Link href={href} className="btn-secondary">
            {cta}
          </Link>
        </div>
      </div>

      <div
        className={`card p-6 reveal reveal-scale${reverse ? " md:order-1" : ""}`}
        style={{ transitionDelay: `${delayBase + 200}ms` }}
      >
        <div className="mono text-text-3 mb-4 text-xs">Illustrative example</div>
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="bg-surface-2 rounded-[var(--r-sm)] p-3 text-center">
              <div className="mono text-text-3 mb-1 text-[10px]">{m.label}</div>
              <div className="text-lg font-semibold leading-tight">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
