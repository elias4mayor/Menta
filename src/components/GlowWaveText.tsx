import type { ElementType, ReactNode } from "react";

type Intensity = "subtle" | "normal" | "strong";
type Direction = "ltr" | "rtl";

const INTENSITY_VARS: Record<Intensity, Record<string, string>> = {
  subtle: {
    "--glow-wave-rest-opacity": "0.94",
    "--glow-wave-peak-opacity": "1",
    "--glow-wave-shadow": "0 0 3px var(--glow-wave-color)",
    "--glow-wave-brightness": "1.06",
  },
  normal: {
    "--glow-wave-rest-opacity": "0.9",
    "--glow-wave-peak-opacity": "1",
    "--glow-wave-shadow": "0 0 5px var(--glow-wave-color)",
    "--glow-wave-brightness": "1.1",
  },
  strong: {
    "--glow-wave-rest-opacity": "0.86",
    "--glow-wave-peak-opacity": "1",
    "--glow-wave-shadow": "0 0 8px var(--glow-wave-color)",
    "--glow-wave-brightness": "1.16",
  },
};

/**
 * Subtle letter-by-letter light wave for select dashboard typography —
 * never the MENTA logo. Pure CSS (opacity/filter/text-shadow only, no
 * layout-affecting properties), gated behind prefers-reduced-motion via
 * a media query in globals.css rather than JS, and off entirely unless
 * this component is explicitly used — nothing here is applied globally.
 *
 * The animation cycle is mostly quiet: each letter's own keyframe spends
 * ~80% of its duration at rest and only pulses through a short window
 * near the start, so a full word's wave sweeps by quickly and then
 * pauses for seconds before repeating — "the dashboard breathes"
 * rather than a constant flashing loop.
 */
export function GlowWaveText({
  children,
  as: Tag = "span",
  intensity = "normal",
  speedMs = 3200,
  staggerMs = 60,
  direction = "ltr",
  hoverBoost = true,
  className,
}: {
  children: string;
  as?: ElementType;
  intensity?: Intensity;
  /** Full cycle length per letter, in ms — lower = wave repeats more often. */
  speedMs?: number;
  /** Delay between adjacent letters, in ms — lower = tighter overlap. */
  staggerMs?: number;
  direction?: Direction;
  hoverBoost?: boolean;
  className?: string;
}): ReactNode {
  const letters = Array.from(children);
  const vars = INTENSITY_VARS[intensity];

  return (
    <Tag
      className={`glow-wave${hoverBoost ? " glow-wave-hover" : ""}${className ? ` ${className}` : ""}`}
      style={vars as React.CSSProperties}
    >
      {letters.map((ch, i) => {
        const order = direction === "ltr" ? i : letters.length - 1 - i;
        return (
          <span
            key={i}
            className="glow-wave-letter"
            style={{ animationDuration: `${speedMs}ms`, animationDelay: `${order * staggerMs}ms` }}
          >
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </Tag>
  );
}
