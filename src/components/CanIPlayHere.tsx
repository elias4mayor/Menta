"use client";

import { useState } from "react";
import {
  computeProfileFit,
  computeAcademicAlignment,
  buildRealityCheckForSchool,
  type AthleteFitContext,
} from "@/lib/recruiting/intelligence";
import { RealityCheck } from "@/components/RealityCheck";

type SchoolContext = {
  name: string;
  division: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  contactCount: number;
};

/**
 * MENTA's signature recruiting Q&A — a collapsed prompt that, on open,
 * answers "Can I play here?" as GLANCE (conclusion) → CONTEXT (why, behind
 * "See why") → ACTION (Reality Check's next move, always visible once
 * open). This is a presentation layer only: computeProfileFit/
 * computeAcademicAlignment/buildRealityCheckForSchool and RealityCheck
 * itself are unchanged and fully reused — nothing here recomputes or
 * reinterprets what those already establish. Never answers the literal
 * yes/no question; the conclusion is always a qualitative label from the
 * same vocabulary Profile Fit already uses (Strong profile fit / Potential
 * fit / Worth exploring / More information needed) — never a probability,
 * never a guarantee.
 */
export function CanIPlayHere({ athlete, school }: { athlete: AthleteFitContext; school: SchoolContext }) {
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card p-4 w-full text-left"
        style={{ cursor: "pointer" }}
      >
        <div className="font-medium">Can I play here?</div>
        <div className="text-text-3 text-xs mt-1">Get MENTA&rsquo;s read on {school.name}</div>
      </button>
    );
  }

  const fit = computeProfileFit(athlete);
  const academic = computeAcademicAlignment(athlete.gpa);
  const realityCheck = buildRealityCheckForSchool(athlete, school, fit, academic);

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="mono text-text-3 text-xs">Can I play here?</div>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-2 hover:text-text-1">
          Close
        </button>
      </div>

      <div className="text-2xl font-semibold font-heading">{fit.label}</div>

      <button type="button" onClick={() => setShowWhy((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
        {showWhy ? "Hide why" : "See why"}
      </button>
      {showWhy && (
        <div className="text-sm space-y-3">
          <div>
            <div className="text-text-3 text-xs mb-1">Athletic alignment</div>
            <p>{fit.reason}</p>
          </div>
          <div>
            <div className="text-text-3 text-xs mb-1">Academic alignment — {academic.label}</div>
            <p>{academic.reason}</p>
          </div>
        </div>
      )}

      <RealityCheck {...realityCheck} />
    </div>
  );
}
