"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SportContext = {
  id: string;
  sport: string;
  position: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

/**
 * Apple-style sport switcher for the topbar — ATHLETE-only, and only
 * rendered once there's more than one *active* sport (a single-sport
 * athlete sees nothing extra here, per spec). "Active" in this UI means
 * "the sport currently driving the rest of MENTA" — the AthleteSportContext
 * row with isPrimary=true — not the isActive DB column, which just means
 * "not removed" (every row shown here already passed that filter).
 */
export function SportSwitcher({ role }: { role: string }) {
  const router = useRouter();
  const [contexts, setContexts] = useState<SportContext[] | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "ATHLETE") return;
    const timer = setTimeout(() => {
      fetch("/api/athlete/sport-contexts")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setContexts(data.sportContexts);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, [role]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (role !== "ATHLETE" || !contexts) return null;
  const active = contexts.filter((c) => c.isActive);
  if (active.length <= 1) return null;

  const primary = active.find((c) => c.isPrimary) ?? active[0];

  async function switchTo(context: SportContext) {
    if (context.isPrimary) {
      setOpen(false);
      return;
    }
    setSwitching(context.id);
    const res = await fetch(`/api/athlete/sport-contexts/${context.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (res.ok) {
      const { sportContext } = await res.json();
      setContexts((prev) =>
        (prev ?? []).map((c) => ({ ...c, isPrimary: c.id === sportContext.id }))
      );
      // The PATCH already updated AthleteProfile's mirror in the same
      // transaction — router.refresh() re-runs this route's Server
      // Components (dashboard "Now" card, /profile, etc.) against that
      // fresh data without a full page reload, so the rest of the app
      // actually reflects the switch instead of only this popover doing so.
      router.refresh();
    }
    setSwitching(null);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className="sport-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {primary.sport}
          {primary.position ? ` · ${primary.position}` : ""}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="sport-switcher-panel" role="listbox" aria-label="Switch active sport">
          {active.map((context) => (
            <button
              key={context.id}
              type="button"
              role="option"
              aria-selected={context.isPrimary}
              className="sport-switcher-option"
              disabled={switching === context.id}
              onClick={() => switchTo(context)}
            >
              <span>
                {context.sport}
                {context.position ? ` · ${context.position}` : ""}
              </span>
              {context.isPrimary && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
          <Link
            href="/profile#your-sports"
            className="sport-switcher-option"
            style={{ color: "var(--text-2)" }}
            onClick={() => setOpen(false)}
          >
            + Add Sport
          </Link>
        </div>
      )}
    </div>
  );
}
