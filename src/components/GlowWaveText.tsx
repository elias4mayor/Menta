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

  // Group letters into words, each wrapped in its own non-breaking span,
  // with the space BETWEEN words rendered as a genuine breakable text
  // node — not wrapped in a <span>, and not replaced with a non-breaking
  // space the way the previous version did for every space. That
  // substitution meant a heading using this component had zero real
  // wrap opportunities at all: confirmed as the cause of a real overflow
  // bug where a sufficiently long heading rendered as one unbroken line
  // and spilled past its container on narrow viewports instead of
  // wrapping. Per-letter animation timing is unaffected: `order` still
  // increments across the whole string, not reset per word, so the wave
  // still flows continuously across word boundaries.
  const words: { letters: string[]; startIndex: number }[] = [];
  let word: string[] = [];
  let wordStart = 0;
  letters.forEach((ch, i) => {
    if (ch === " ") {
      if (word.length) words.push({ letters: word, startIndex: wordStart });
      words.push({ letters: [" "], startIndex: i });
      word = [];
      wordStart = i + 1;
    } else {
      if (word.length === 0) wordStart = i;
      word.push(ch);
    }
  });
  if (word.length) words.push({ letters: word, startIndex: wordStart });

  return (
    <Tag
      className={`glow-wave${hoverBoost ? " glow-wave-hover" : ""}${className ? ` ${className}` : ""}`}
      style={vars as React.CSSProperties}
    >
      {words.map((w, wi) => {
        if (w.letters[0] === " ") return " ";
        return (
          <span key={wi} style={{ whiteSpace: "nowrap" }}>
            {w.letters.map((ch, li) => {
              const globalIndex = w.startIndex + li;
              const order = direction === "ltr" ? globalIndex : letters.length - 1 - globalIndex;
              return (
                <span
                  key={li}
                  className="glow-wave-letter"
                  style={{ animationDuration: `${speedMs}ms`, animationDelay: `${order * staggerMs}ms` }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
