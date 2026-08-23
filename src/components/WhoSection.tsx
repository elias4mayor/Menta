"use client";

import Link from "next/link";
import { useState } from "react";

const ROLES: { role: string; blurb: string }[] = [
  {
    role: "Athlete",
    blurb: "Training, film, recovery, academics, and recruiting in one place — one profile, one AI.",
  },
  {
    role: "Coach",
    blurb: "See your whole roster's development, not just game stats. Scoped to your own teams.",
  },
  {
    role: "Parent",
    blurb: "Visibility into what matters, with consent controls — nothing shared without approval.",
  },
  {
    role: "Trainer",
    blurb: "Plug into an athlete's plan without becoming another disconnected app.",
  },
];

function article(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export function WhoSection() {
  const [active, setActive] = useState<string | null>(null);
  const selected = ROLES.find((r) => r.role === active);

  return (
    <section className="px-6 md:px-10 pt-20 pb-4 text-center border-t border-[var(--border-soft)]">
      <div className="mono text-text-3 mb-6 reveal reveal-scale">
        Built for every role in an athlete&rsquo;s development
      </div>
      <div
        className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto reveal reveal-scale"
        style={{ transitionDelay: "100ms" }}
      >
        {ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => setActive(active === r.role ? null : r.role)}
            className="text-sm font-medium rounded-full px-5 py-2.5 border transition-all duration-300"
            style={
              active === r.role
                ? { background: "var(--grad-signal)", color: "var(--on-signal)", borderColor: "transparent", fontWeight: 600 }
                : { background: "var(--surface)", color: "var(--text-2)", borderColor: "var(--border)" }
            }
          >
            I&rsquo;m {article(r.role)} {r.role}
          </button>
        ))}
      </div>
      <div
        className="max-w-lg mx-auto overflow-hidden transition-all duration-400"
        style={{ maxHeight: selected ? 200 : 0, marginTop: selected ? 32 : 0, opacity: selected ? 1 : 0 }}
      >
        {selected && (
          <div className="card p-7 text-left">
            <p className="text-text-2 text-sm leading-relaxed mb-4">{selected.blurb}</p>
            <Link href="/signup" className="btn-primary">
              Join Beta
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
