"use client";

import { useState } from "react";
import type { RealityCheck as RealityCheckData } from "@/lib/recruiting/intelligence";

/**
 * MENTA's signature Known / Unknown / Next-move component. Glance level
 * (always visible) is deliberately thin — one known fact plus the next
 * move; "See details" reveals the rest. Built so provider-sourced facts
 * can populate the exact same `whatWeKnow`/`whatWeDontKnow` shape later
 * without any UI rework.
 */
export function RealityCheck({ whatWeKnow, whatWeDontKnow, nextMove }: RealityCheckData) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = whatWeKnow.length > 1 || whatWeDontKnow.length > 0;

  return (
    <div className="card p-4">
      <div className="mono text-text-3 text-xs mb-3">Reality Check</div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-text-3 text-xs mb-1">What we know</div>
          <p>{whatWeKnow[0] ?? "MENTA doesn't have enough saved yet to say."}</p>
        </div>
        <div>
          <div className="text-text-3 text-xs mb-1">Your next move</div>
          <p className="font-medium">{nextMove}</p>
        </div>
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-text-2 hover:text-text-1 mt-3"
        >
          {expanded ? "Hide details" : "See details"}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 space-y-3 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
          {whatWeKnow.length > 1 && (
            <div>
              <div className="text-text-3 text-xs mb-1">What we know</div>
              <ul className="list-disc list-inside space-y-1 text-text-2">
                {whatWeKnow.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          {whatWeDontKnow.length > 0 && (
            <div>
              <div className="text-text-3 text-xs mb-1">What we don&rsquo;t know</div>
              <ul className="list-disc list-inside space-y-1 text-text-2">
                {whatWeDontKnow.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
