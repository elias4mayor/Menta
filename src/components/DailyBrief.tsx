"use client";

import { useEffect, useState } from "react";
import { GlowWaveText } from "@/components/GlowWaveText";

/**
 * Lives inside the dashboard's existing hero panel (not a card of its own)
 * — a one-time-per-day AI summary of the athlete's real schedule, cached
 * server-side so opening the dashboard never triggers a fresh AI call.
 * Generation only happens when the athlete explicitly asks for it.
 */
export function DailyBrief() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "not-configured" }
    | { status: "empty" }
    | { status: "ready"; brief: string }
    | { status: "generating" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/daily-brief")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.configured) setState({ status: "not-configured" });
        else if (data.brief) setState({ status: "ready", brief: data.brief });
        else setState({ status: "empty" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "empty" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate() {
    setState({ status: "generating" });
    try {
      const res = await fetch("/api/ai/daily-brief", { method: "POST" });
      const data = await res.json();
      if (!data.configured) {
        setState({ status: "not-configured" });
      } else if (data.brief) {
        setState({ status: "ready", brief: data.brief });
      } else {
        setState({ status: "error", message: data.error ?? "Couldn't generate a brief right now." });
      }
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    }
  }

  if (state.status === "loading" || state.status === "not-configured") return null;

  return (
    <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
      <div className="mono text-text-3 mb-2">
        <GlowWaveText intensity="subtle">Daily brief</GlowWaveText>
      </div>
      {state.status === "ready" && (
        <p className="text-text-2 text-sm whitespace-pre-wrap">{state.brief}</p>
      )}
      {state.status === "empty" && (
        <button onClick={generate} className="btn-secondary text-xs">
          Ask MENTA to brief my day
        </button>
      )}
      {state.status === "generating" && <p className="text-text-3 text-sm">Thinking about your day…</p>}
      {state.status === "error" && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: "var(--danger)" }}>{state.message}</p>
          <button onClick={generate} className="btn-secondary text-xs">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
