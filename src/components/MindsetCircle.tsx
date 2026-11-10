"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PROMPTS = [
  { quote: "Win the rep you’re in.", reflection: "What can you control on your next rep?" },
  { quote: "Make the next play count.", reflection: "What cue helps you reset after a mistake?" },
  { quote: "Bring your focus to the basics.", reflection: "Which small habit will you practice today?" },
];

export function MindsetCircle() {
  const [index, setIndex] = useState(0);
  const [reflecting, setReflecting] = useState(false);
  const [paused, setPaused] = useState(false);
  const prompt = PROMPTS[index];

  useEffect(() => {
    if (reflecting || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % PROMPTS.length);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [reflecting, paused]);

  return (
    <section className="context-card" aria-labelledby="mindset-circle-title">
      <h2 id="mindset-circle-title" className="mono text-text-3 mb-3">Circle</h2>
      <blockquote key={index} className="text-lg font-semibold motion-safe:animate-[onbFadeIn_500ms_ease-out]">
        {prompt.quote}
      </blockquote>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-text-2">
        <button type="button" aria-expanded={reflecting} onClick={() => setReflecting(!reflecting)}>
          {reflecting ? "Close reflection" : "Reflect"}
        </button>
        <button type="button" onClick={() => setIndex((current) => (current + 1) % PROMPTS.length)}>
          Next quote
        </button>
        <button type="button" onClick={() => setPaused(!paused)}>
          {paused ? "Resume rotation" : "Pause rotation"}
        </button>
      </div>
      {reflecting && (
        <div className="mt-3 text-sm text-text-2">
          <p>{prompt.reflection}</p>
          <Link href="/mind" className="underline mt-2 inline-block">Open my private check-in</Link>
        </div>
      )}
    </section>
  );
}
