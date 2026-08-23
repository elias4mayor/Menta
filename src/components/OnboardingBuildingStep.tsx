"use client";

import { useEffect, useState } from "react";

export type OnboardingRole = "ATHLETE" | "COACH" | "TRAINER" | "PARENT";

// Fixed for the whole "building" screen — no longer part of the cycling
// list (it used to be both the opening and, in a "…IS READY" form, the
// closing beat of that list; now the opening is this static headline and
// the closing is the dedicated "ready" phase below).
const HEADLINE: Record<OnboardingRole, string> = {
  ATHLETE: "BUILDING YOUR ATHLETE SYSTEM",
  COACH: "BUILDING YOUR COACHING SYSTEM",
  TRAINER: "BUILDING YOUR PERFORMANCE SYSTEM",
  PARENT: "BUILDING YOUR ATHLETE SUPPORT SYSTEM",
};

// The cycling sub-line under the fixed headline — role-specific vocabulary,
// trimmed to what isn't already said by HEADLINE or the closing READY_LINE.
const STATUS_LINES: Record<OnboardingRole, string[]> = {
  ATHLETE: [
    "LEARNING YOUR SPORT",
    "MAPPING YOUR PERFORMANCE PRIORITIES",
    "UNDERSTANDING YOUR GOALS",
    "PREPARING YOUR TRAINING SYSTEM",
    "PERSONALIZING YOUR NEXT MOVE",
  ],
  COACH: [
    "BUILDING YOUR TEAM WORKSPACE",
    "ORGANIZING YOUR ROSTER",
    "PREPARING YOUR ATHLETE VIEWS",
    "SETTING YOUR TEAM PRIORITIES",
    "CONNECTING YOUR COACHING TOOLS",
  ],
  TRAINER: [
    "PREPARING YOUR CLIENT GROUPS",
    "ORGANIZING ATHLETE PROFILES",
    "BUILDING YOUR TRAINING ENVIRONMENT",
    "PREPARING PERFORMANCE TRACKING",
    "CONNECTING YOUR TRAINING SYSTEM",
  ],
  PARENT: [
    "CONNECTING YOUR ATHLETE’S JOURNEY",
    "ORGANIZING THEIR PRIORITIES",
    "PREPARING THEIR DEVELOPMENT PROFILE",
    "SETTING UP THEIR SUPPORT SYSTEM",
    "CREATING A CLEARER PICTURE",
  ],
};

type ChecklistItem = { label: string; status: "COMPLETE" | "READY" };

// The "technical metadata" readout — real areas of that role's MENTA. Two
// items per role are marked COMPLETE (the profile fields and goals this
// role's onboarding form actually just submitted); the rest are marked
// READY, not COMPLETE — real areas of the app that exist, but weren't
// literally filled in during onboarding, so they aren't claimed as done.
// This is still a choreographed reveal timed to the building screen's
// window, not a live per-field progress feed — same convention the status
// line itself already uses.
const CHECKLIST_ITEMS: Record<OnboardingRole, ChecklistItem[]> = {
  ATHLETE: [
    { label: "SPORT PROFILE", status: "COMPLETE" },
    { label: "GOALS", status: "COMPLETE" },
    { label: "PERFORMANCE", status: "READY" },
    { label: "RECOVERY", status: "READY" },
    { label: "MENTAL", status: "READY" },
    { label: "NEXT MOVE", status: "READY" },
  ],
  COACH: [
    { label: "COACH PROFILE", status: "COMPLETE" },
    { label: "GOALS", status: "COMPLETE" },
    { label: "TEAM WORKSPACE", status: "READY" },
    { label: "ROSTER", status: "READY" },
    { label: "ATHLETE VIEWS", status: "READY" },
  ],
  TRAINER: [
    { label: "TRAINER PROFILE", status: "COMPLETE" },
    { label: "GOALS", status: "COMPLETE" },
    { label: "CLIENT GROUPS", status: "READY" },
    { label: "TRAINING LIBRARY", status: "READY" },
    { label: "PERFORMANCE TRACKING", status: "READY" },
  ],
  PARENT: [
    { label: "PARENT PROFILE", status: "COMPLETE" },
    { label: "GOALS", status: "COMPLETE" },
    { label: "ATHLETE CONNECTION", status: "READY" },
    { label: "SUPPORT VIEW", status: "READY" },
    { label: "PROGRESS ACCESS", status: "READY" },
  ],
};

// Shared verbatim across all four roles — the one line that's deliberately
// NOT role-flavored, so the screen closes on "this is the same MENTA
// product" before handing off to that role's own next step.
const READY_LINE = "YOUR MENTA SYSTEM IS READY.";

const STATUS_INTERVAL_MS = 1300;
const CHECKLIST_INTERVAL_MS = 900;
// How long the closing READY_LINE holds before the parent's own timer
// (durationMs) actually navigates away — see each onboarding component's
// BUILD_MIN_MS.
const READY_HOLD_MS = 900;

/**
 * The cinematic "we're assembling your MENTA" screen shown right after a
 * real profile save and before the next real step (team/group/guardian
 * connection, or — for Athlete — the reveal). Hierarchy: a fixed
 * role-specific headline, a cycling role-specific sub-line under it, a
 * looping "technical metadata" checklist (reusing the same .mono/
 * --font-mono treatment already used for dashboard stat labels elsewhere,
 * not a new visual language) — then, timed to end just before the parent
 * navigates away, a shared closing line every role converges on.
 *
 * `durationMs` should match the parent's own BUILD_MIN_MS exactly, so this
 * component's internal "ready" beat lands right before that real
 * navigation, not noticeably before or after it.
 */
export function OnboardingBuildingStep({ role, durationMs }: { role: OnboardingRole; durationMs: number }) {
  const headline = HEADLINE[role];
  const lines = STATUS_LINES[role];
  const items = CHECKLIST_ITEMS[role];

  const [statusIndex, setStatusIndex] = useState(0);
  const [checklistIndex, setChecklistIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readyTimer = setTimeout(() => setReady(true), Math.max(0, durationMs - READY_HOLD_MS));
    return () => clearTimeout(readyTimer);
  }, [durationMs]);

  useEffect(() => {
    if (ready) return;
    const timer = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, lines.length - 1));
    }, STATUS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lines.length, ready]);

  useEffect(() => {
    if (ready) return;
    const timer = setInterval(() => {
      setChecklistIndex((i) => (i + 1) % items.length);
    }, CHECKLIST_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [items.length, ready]);

  if (ready) {
    return <h1 className="onb-title">{READY_LINE}</h1>;
  }

  return (
    <>
      <h1 className="onb-title">{headline}</h1>

      <div className="onb-status">
        <div key={statusIndex} className="onb-status-line">
          {lines[statusIndex]}
        </div>
      </div>

      <div className="onb-checklist">
        <div key={checklistIndex} className="onb-checklist-row">
          <span className="onb-checklist-label">{items[checklistIndex].label}</span>
          <span className="onb-checklist-status">{items[checklistIndex].status}</span>
        </div>
      </div>
    </>
  );
}
