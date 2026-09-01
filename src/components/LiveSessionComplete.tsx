"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  title: string;
  startedAt: string | null;
  completedAt: string | null;
  totalSetsLogged: number;
  athletesParticipating: number;
  mySetsLogged?: number;
};

function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * The one screen every LIVE surface (athlete/coach/display) renders once
 * a session hits COMPLETE — terminal state, so this fetches the summary
 * exactly once rather than joining the 4s poll loop. "variant" is the
 * only thing that changes which numbers are the headline: an athlete
 * cares about their own sets, a coach/display cares about the room.
 */
export function LiveSessionComplete({
  teamId,
  sessionId,
  title,
  variant,
  backHref,
  backLabel,
  showBackLink = true,
}: {
  teamId: string;
  sessionId: string;
  title: string;
  variant: "athlete" | "room";
  backHref: string;
  backLabel: string;
  /** false on the wall-mounted display — nothing there should ever be clickable. */
  showBackLink?: boolean;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/teams/${teamId}/sessions/${sessionId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [teamId, sessionId]);

  const duration = summary ? formatDuration(summary.startedAt, summary.completedAt) : null;

  return (
    <div className="live-shell live-fade-enter">
      <div className="live-complete-mark">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div className="live-eyebrow">SESSION COMPLETE</div>
      <h1 className="live-focal-title" style={{ fontSize: "clamp(28px, 6vw, 44px)" }}>
        {title}
      </h1>
      <p className="live-sub">
        {variant === "athlete" ? "Nice work. Logged in Progress." : "Nice work, team."}
      </p>

      {summary && (
        <div className="live-complete-stats">
          {variant === "athlete" ? (
            <Stat value={summary.mySetsLogged ?? 0} label="SETS LOGGED" />
          ) : (
            <>
              <Stat value={summary.athletesParticipating} label="ATHLETES" />
              <Stat value={summary.totalSetsLogged} label="TOTAL SETS" />
            </>
          )}
          {duration && <Stat value={duration} label="DURATION" />}
        </div>
      )}

      {showBackLink && (
        <div style={{ marginTop: 40 }}>
          <Link href={backHref} className="live-ghost-btn">
            {backLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="live-complete-stat-value">{value}</div>
      <div className="live-eyebrow live-complete-stat-label">{label}</div>
    </div>
  );
}
