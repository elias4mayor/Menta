/**
 * MENTA Opportunities — a ranked read of RosterChange/RecruitingSignal
 * (Phase 3's provider-independent tables) against the athlete's own
 * sport/position and tracked-school list. Pure functions only: no DB
 * access, no provider calls — the caller fetches rows and hands them in,
 * same separation as intelligence.ts.
 *
 * These tables are populated only once a provider adapter actually runs
 * ingestion (nothing does yet), and this feature is gated behind
 * isRecruitingIntelligenceConnected() regardless of whether the tables
 * happen to have rows — see that file's comment for why configuration
 * alone never implies athlete-facing display is licensed. In practice
 * this always computes over an empty input today; the ranking logic
 * exists so the feature is real the moment ingestion + the license both
 * land, not something built twice.
 */

export type OpportunityProgramContext = {
  sport: string;
  schoolName: string;
  division: string | null;
  collegeId: string | null;
};

export type OpportunityRosterChangeInput = {
  id: string;
  changeType: string;
  subjectName: string | null;
  subjectPosition: string | null;
  publishedAt: Date | null;
  observedAt: Date;
  program: OpportunityProgramContext;
};

export type OpportunitySignalInput = {
  id: string;
  signalType: string;
  title: string;
  summary: string | null;
  isHeadCoach: boolean | null;
  publishedAt: Date | null;
  observedAt: Date;
  program: OpportunityProgramContext;
};

export type OpportunityAthleteContext = {
  sport: string | null;
  position: string | null;
  trackedCollegeIds: string[];
};

export type Opportunity = {
  id: string;
  kind: "roster_opening" | "coaching_change";
  schoolName: string;
  division: string | null;
  headline: string;
  reason: string;
  publishedAt: string | null;
  score: number;
  isTrackedSchool: boolean;
};

/** Departure-shaped events only — additions/incoming commits don't represent an opening. */
const OPENING_CHANGE_TYPES = new Set(["player_removed", "transfer_entry"]);

function daysAgo(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

/** Decays to 0 by day 60 — recent signals dominate the ranking, stale ones fall away rather than being excluded outright. */
function recencyScore(date: Date): number {
  return Math.max(0, 60 - daysAgo(date));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function positionMatches(athletePosition: string | null, subjectPosition: string | null): boolean {
  if (!athletePosition || !subjectPosition) return false;
  const a = normalize(athletePosition);
  const s = normalize(subjectPosition);
  return a === s || a.includes(s) || s.includes(a);
}

function effectiveDate(publishedAt: Date | null, observedAt: Date): Date {
  return publishedAt ?? observedAt;
}

/**
 * Ranked, sport-filtered opportunities. Callers should already have
 * restricted `rosterChanges`/`signals` to the athlete's sport (Program.sport
 * match) — this function re-checks it defensively but does the actual
 * position/tracked-school scoring.
 */
export function computeOpportunities(input: {
  rosterChanges: OpportunityRosterChangeInput[];
  signals: OpportunitySignalInput[];
  athlete: OpportunityAthleteContext;
}): Opportunity[] {
  const { athlete } = input;
  if (!athlete.sport) return [];
  const tracked = new Set(athlete.trackedCollegeIds);

  const opportunities: Opportunity[] = [];

  for (const rc of input.rosterChanges) {
    if (normalize(rc.program.sport) !== normalize(athlete.sport)) continue;
    if (!OPENING_CHANGE_TYPES.has(rc.changeType)) continue;

    const isTrackedSchool = Boolean(rc.program.collegeId && tracked.has(rc.program.collegeId));
    const matched = positionMatches(athlete.position, rc.subjectPosition);
    const date = effectiveDate(rc.publishedAt, rc.observedAt);
    const score = 20 + recencyScore(date) + (matched ? 40 : 0) + (isTrackedSchool ? 15 : 0);

    const positionLabel = rc.subjectPosition ? `${rc.subjectPosition} ` : "";
    const who = rc.subjectPosition ? `${positionLabel}player` : "player";
    opportunities.push({
      id: `roster_opening:${rc.id}`,
      kind: "roster_opening",
      schoolName: rc.program.schoolName,
      division: rc.program.division,
      headline: `${positionLabel ? positionLabel + "opening" : "Roster movement"} at ${rc.program.schoolName}`,
      reason: rc.subjectName
        ? `${rc.subjectName}${rc.subjectPosition ? ` (${rc.subjectPosition})` : ""} left the program — programs often reassess needs after a departure like this.`
        : `A ${who} left the program — programs often reassess needs after a departure like this.`,
      publishedAt: date.toISOString(),
      score,
      isTrackedSchool,
    });
  }

  for (const sig of input.signals) {
    if (sig.signalType !== "coach_added") continue;
    if (normalize(sig.program.sport) !== normalize(athlete.sport)) continue;

    const isTrackedSchool = Boolean(sig.program.collegeId && tracked.has(sig.program.collegeId));
    const date = effectiveDate(sig.publishedAt, sig.observedAt);
    const score = 15 + recencyScore(date) * 0.5 + (isTrackedSchool ? 15 : 0) + (sig.isHeadCoach ? 10 : 0);

    opportunities.push({
      id: `coaching_change:${sig.id}`,
      kind: "coaching_change",
      schoolName: sig.program.schoolName,
      division: sig.program.division,
      headline: sig.title,
      reason:
        sig.summary ??
        "New coaching staff often means a fresh look at recruiting priorities — worth researching before you reach out.",
      publishedAt: date.toISOString(),
      score,
      isTrackedSchool,
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}
