"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 when it scrolls into view.
 * Respects prefers-reduced-motion by jumping straight to the final value.
 */
export function CountUpValue({
  value,
  durationMs = 1200,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  durationMs?: number;
  /** Decimal places to keep in the animated display, e.g. 1 for "3.8". */
  decimals?: number;
  /** Appended after the number once formatted, e.g. "%". */
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        if (reduceMotion) {
          setDisplay(value);
          return;
        }

        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
          setDisplay(eased * value);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={spanRef}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
