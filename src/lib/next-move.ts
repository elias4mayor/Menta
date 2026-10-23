import "server-only";
import { prisma } from "@/lib/prisma";
import { hasGuardianScope, type GuardianScope, isVerifiedProvider, PROVIDER_TEAM_ROLES } from "@/lib/permissions";
import { CARE_OPERATIONAL_STATUS_LABELS } from "@/lib/care";

/**
 * MENTA's signature cross-domain recommendation engine.
 *
 * Every other feature in this app (Goals, Training, Performance, Film,
 * Academics, Recruiting) only ever reads its own table. This is the one
 * place that reads across all of them for a single athlete and asks: of
 * everything true about this person right now, what's the one thing most
 * worth doing next?
 *
 * Deliberately NOT an LLM guessing a priority — every candidate here is a
 * deterministic rule over the athlete's own real rows, with the exact
 * numbers that produced it kept as `evidence`. WellnessCheckIn/MindCheckIn
 * are never read here, same hard boundary as buildAthleteContext() in
 * src/lib/ai.ts — this engine has no access to that data at all.
 */

export const RECOMMENDATION_KINDS = [
  "GOAL_STALE",
  "TRAINING_GAP",
  "PERFORMANCE_STALE",
  "FILM_ASSIGNMENT_OVERDUE",
  "ACADEMIC_OVERDUE",
  "ELIGIBILITY_INCOMPLETE",
  "RECRUITING_STALE",
  /// Coach-only — see COACH_ONLY_KINDS and computeCoachCandidates below.
  /// Never appears in computeCandidates()'s athlete-facing output.
  "FILM_REVIEW_UNANSWERED",
  /// Parent-only — see PARENT_ONLY_KINDS and computeParentCandidates below.
  /// Deliberately PARENT_-prefixed even where a parallel athlete-facing
  /// kind exists (e.g. ELIGIBILITY_INCOMPLETE above) — same underlying
  /// condition, different viewer and wording, kept as a visually distinct
  /// kind rather than overloading one string for two audiences.
  "PARENT_CARE_APPOINTMENT_UPCOMING",
  "PARENT_DOCUMENT_REQUEST_OUTSTANDING",
  "PARENT_MESSAGE_AWAITING_REPLY",
  "PARENT_ELIGIBILITY_INCOMPLETE",
  "PARENT_ACADEMIC_ASSIGNMENT_OVERDUE",
  "PARENT_CALENDAR_UPCOMING",
  /// Trainer-only — see TRAINER_ONLY_KINDS and computeTrainerCandidates
  /// below. Care-related kinds here deliberately carry status/timing only
  /// — never CareRequest.reason/reasonNote/providerNote — even though a
  /// trainer-as-assigned-provider has full legitimate access to those on
  /// /care/provider itself; Next Move's own surface stays conservative
  /// across every role, not just the roles with a narrower page-level grant.
  "TRAINER_CARE_REQUEST_NEW",
  "TRAINER_CARE_APPOINTMENT_UPCOMING",
  "TRAINER_CARE_SCHEDULE_CONFLICT",
  "TRAINER_CARE_FOLLOWUP_DUE",
  "TRAINER_DOCUMENT_REQUEST_OUTSTANDING",
  "TRAINER_MESSAGE_AWAITING_REPLY",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

/**
 * Kinds that are ONLY ever shown to a coach, never to the athlete they're
 * about. Deliberately a short list: a coach's authorized view into an
 * athlete's data is narrower than the athlete's own (see the big comment
 * on computeCoachCandidates for exactly why Academics/Recruiting/Goals/
 * Performance are excluded, not just forgotten).
 */
export const COACH_ONLY_KINDS: RecommendationKind[] = ["FILM_REVIEW_UNANSWERED"];

/** Kinds that are ONLY ever shown to a parent/guardian — see computeParentCandidates below. */
export const PARENT_ONLY_KINDS: RecommendationKind[] = [
  "PARENT_CARE_APPOINTMENT_UPCOMING",
  "PARENT_DOCUMENT_REQUEST_OUTSTANDING",
  "PARENT_MESSAGE_AWAITING_REPLY",
  "PARENT_ELIGIBILITY_INCOMPLETE",
  "PARENT_ACADEMIC_ASSIGNMENT_OVERDUE",
  "PARENT_CALENDAR_UPCOMING",
];

/** Kinds that are ONLY ever shown to a trainer — see computeTrainerCandidates below. */
export const TRAINER_ONLY_KINDS: RecommendationKind[] = [
  "TRAINER_CARE_REQUEST_NEW",
  "TRAINER_CARE_APPOINTMENT_UPCOMING",
  "TRAINER_CARE_SCHEDULE_CONFLICT",
  "TRAINER_CARE_FOLLOWUP_DUE",
  "TRAINER_DOCUMENT_REQUEST_OUTSTANDING",
  "TRAINER_MESSAGE_AWAITING_REPLY",
];

export type EvidenceItem = { label: string; value: string };

export type Candidate = {
  kind: RecommendationKind;
  /** Stable id for the specific underlying record (goal id, assignment id, school id...) — lets us detect when THIS condition clears, not just "a goal somewhere." */
  resolutionKey: string;
  title: string;
  reasoning: string;
  evidence: EvidenceItem[];
  actionHref: string;
  score: number;
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** Every candidate next-move, across every domain, for one athlete. Returns an empty array when the athlete is genuinely caught up — never invents one to fill the slot. */
export async function computeCandidates(userId: string): Promise<Candidate[]> {
  const now = new Date();
  const candidates: Candidate[] = [];

  const [profile, activeGoals, lastCompletion, lastPerformanceEntry, overdueFilmTargets, overdueAssignments, incompleteEligibility, recruitingSchools] =
    await Promise.all([
      prisma.athleteProfile.findUnique({ where: { userId }, select: { trainingDaysPerWeek: true } }),
      prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { updatedAt: "asc" } }),
      prisma.workoutCompletion.findFirst({ where: { userId }, orderBy: { completedAt: "desc" } }),
      prisma.performanceEntry.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
      prisma.filmAssignmentTarget.findMany({
        where: { userId, status: { in: ["ASSIGNED", "WATCHED"] }, assignment: { dueAt: { lt: now } } },
        include: { assignment: { select: { id: true, title: true, dueAt: true, filmId: true, requiredViewing: true } } },
      }),
      prisma.assignment.findMany({ where: { userId, status: { not: "COMPLETED" }, dueDate: { lt: now } }, orderBy: { dueDate: "asc" } }),
      prisma.eligibilityChecklistItem.findMany({ where: { userId, status: { not: "COMPLETED" } } }),
      prisma.recruitingSchool.findMany({
        where: { userId, status: { in: ["TARGET", "INTERESTED", "CONTACTED"] } },
        include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { priority: "asc" },
      }),
    ]);

  // --- Goals: overdue first, then stalled (no update in 21+ days) ---
  for (const goal of activeGoals) {
    const overdueDays = goal.targetDate ? daysBetween(now, goal.targetDate) : -1;
    const staleDays = daysBetween(now, goal.updatedAt);
    // __baselineProgress: hidden evidence (stripped before display, see
    // toStored) — the only way to later say "progress went from X% to Y%"
    // is to record what it was right now, at the moment this was flagged.
    // Goal doesn't keep its own progress history.
    if (overdueDays > 0) {
      candidates.push({
        kind: "GOAL_STALE",
        resolutionKey: goal.id,
        title: `Your goal "${goal.title}" is overdue`,
        reasoning: `You set a target date for this goal and it has passed without being marked achieved or updated.`,
        evidence: [
          { label: "Goal", value: goal.title },
          { label: "Target date", value: goal.targetDate!.toLocaleDateString() },
          { label: "Days overdue", value: String(overdueDays) },
          { label: "Progress", value: `${goal.progress}%` },
          { label: "__baselineProgress", value: String(goal.progress) },
        ],
        actionHref: "/dashboard#goals",
        score: 55 + Math.min(overdueDays, 20),
      });
    } else if (staleDays >= 21) {
      candidates.push({
        kind: "GOAL_STALE",
        resolutionKey: goal.id,
        title: `Update your goal "${goal.title}"`,
        reasoning: `This goal hasn't been touched in ${staleDays} days. A goal with no progress updates isn't tracking anything real.`,
        evidence: [
          { label: "Goal", value: goal.title },
          { label: "Last updated", value: `${staleDays} days ago` },
          { label: "Progress", value: `${goal.progress}%` },
          { label: "__baselineProgress", value: String(goal.progress) },
        ],
        actionHref: "/dashboard#goals",
        score: 30 + Math.min(Math.floor(staleDays / 7), 15),
      });
    }
  }

  // --- Training: only fires when the athlete told us their own cadence ---
  if (profile?.trainingDaysPerWeek && profile.trainingDaysPerWeek > 0) {
    const expectedGapDays = Math.max(1, Math.round(7 / profile.trainingDaysPerWeek));
    const daysSinceLast = lastCompletion ? daysBetween(now, lastCompletion.completedAt) : null;
    const threshold = expectedGapDays * 2;
    if (daysSinceLast === null || daysSinceLast >= threshold) {
      candidates.push({
        kind: "TRAINING_GAP",
        resolutionKey: "training",
        title: daysSinceLast === null ? "Log your first training session" : "Get back into training",
        reasoning:
          daysSinceLast === null
            ? "You haven't logged a completed workout yet, even though you set a training schedule during onboarding."
            : `You said you train ${profile.trainingDaysPerWeek}x/week, which means roughly every ${expectedGapDays} day(s) — it's been ${daysSinceLast}.`,
        evidence: [
          { label: "Stated cadence", value: `${profile.trainingDaysPerWeek}x/week` },
          { label: "Last completed workout", value: daysSinceLast === null ? "Never" : `${daysSinceLast} days ago` },
        ],
        actionHref: "/train",
        score: daysSinceLast === null ? 50 : 40 + Math.min(daysSinceLast - threshold, 20),
      });
    }
  }

  // --- Performance: never logged, or stale 30+ days ---
  const perfStaleDays = lastPerformanceEntry ? daysBetween(now, lastPerformanceEntry.recordedAt) : null;
  if (perfStaleDays === null || perfStaleDays >= 30) {
    candidates.push({
      kind: "PERFORMANCE_STALE",
      resolutionKey: "performance",
      title: perfStaleDays === null ? "Log your first performance stat" : "Log a fresh performance number",
      reasoning:
        perfStaleDays === null
          ? "You have no performance entries yet — MENTA can't show real trends without at least one measurement."
          : `Your most recent performance entry is ${perfStaleDays} days old. Stale numbers stop being useful for tracking real progress.`,
      evidence: [{ label: "Last entry", value: perfStaleDays === null ? "Never" : `${perfStaleDays} days ago` }],
      actionHref: "/performance",
      score: perfStaleDays === null ? 35 : 25 + Math.min(Math.floor(perfStaleDays / 10), 15),
    });
  }

  // --- Film: overdue required-viewing assignments score highest of all (a coach is actively waiting) ---
  for (const target of overdueFilmTargets) {
    const overdueDays = daysBetween(now, target.assignment.dueAt!);
    candidates.push({
      kind: "FILM_ASSIGNMENT_OVERDUE",
      resolutionKey: target.id,
      title: `Watch "${target.assignment.title}"`,
      reasoning: `Your coach assigned this film and it's ${overdueDays} day(s) past due. ${target.assignment.requiredViewing ? "This one is marked required." : ""}`,
      evidence: [
        { label: "Assignment", value: target.assignment.title },
        { label: "Due", value: target.assignment.dueAt!.toLocaleDateString() },
        { label: "Status", value: target.status },
      ],
      actionHref: target.assignment.filmId ? `/film/${target.assignment.filmId}` : "/assignments",
      score: (target.assignment.requiredViewing ? 65 : 45) + Math.min(overdueDays * 3, 25),
    });
  }

  // --- Academics: overdue assignments ---
  for (const a of overdueAssignments) {
    const overdueDays = daysBetween(now, a.dueDate!);
    candidates.push({
      kind: "ACADEMIC_OVERDUE",
      resolutionKey: a.id,
      title: `Finish "${a.title}"`,
      reasoning: `This assignment${a.subject ? ` (${a.subject})` : ""} was due ${overdueDays} day(s) ago and isn't marked complete.`,
      evidence: [
        { label: "Assignment", value: a.title },
        { label: "Due", value: a.dueDate!.toLocaleDateString() },
        { label: "Status", value: a.status },
      ],
      actionHref: "/school",
      score: 60 + Math.min(overdueDays * 2, 25),
    });
  }

  // --- Eligibility: incomplete items, scored by how many are outstanding ---
  if (incompleteEligibility.length > 0) {
    candidates.push({
      kind: "ELIGIBILITY_INCOMPLETE",
      resolutionKey: "eligibility",
      title: incompleteEligibility.length === 1 ? "Finish your last eligibility item" : `Finish your eligibility checklist (${incompleteEligibility.length} left)`,
      reasoning: "Eligibility items left incomplete are the kind of thing that quietly becomes a real problem later in the season.",
      evidence: incompleteEligibility.slice(0, 3).map((i) => ({ label: i.category, value: i.title })),
      actionHref: "/school",
      score: 20 + Math.min(incompleteEligibility.length * 4, 20),
    });
  }

  // --- Recruiting: top-priority school with no recent activity ---
  const topSchool = recruitingSchools[0];
  if (topSchool) {
    const lastActivity = topSchool.activities[0];
    const staleDays = lastActivity ? daysBetween(now, lastActivity.createdAt) : null;
    if (staleDays === null || staleDays >= 14) {
      candidates.push({
        kind: "RECRUITING_STALE",
        resolutionKey: topSchool.id,
        title: `Follow up with ${topSchool.name}`,
        reasoning:
          staleDays === null
            ? `${topSchool.name} is on your list but you haven't logged any outreach yet.`
            : `It's been ${staleDays} days since your last logged activity with ${topSchool.name}, your top-priority school.`,
        evidence: [
          { label: "School", value: topSchool.name },
          { label: "Status", value: topSchool.status },
          { label: "Last activity", value: staleDays === null ? "None logged" : `${staleDays} days ago` },
        ],
        actionHref: "/recruit",
        score: staleDays === null ? 30 : 20 + Math.min(Math.floor(staleDays / 7), 20),
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export type StoredRecommendation = {
  id: string;
  kind: string;
  title: string;
  reasoning: string;
  evidence: EvidenceItem[];
  actionHref: string;
  createdAt: Date;
  acceptedAt: Date | null;
  /**
   * Internal bookkeeping, not display data — the same value matchesStored()
   * uses to detect whether a condition cleared. Exposed here (not folded
   * into `evidence`, which strips it) so a queue wrapper like
   * getTrainerQueue can re-fetch the specific underlying record a
   * persisted row refers to and re-verify authorization against it live,
   * rather than trusting the row's own stored content. UI components are
   * free to ignore this field; nothing renders it.
   */
  resolutionKey: string;
  /** Only ever set for RESOLVED rows — see getOutcomeEvidence. Honestly distinguishes "completed" from "measurably improved"; never fabricates the latter from the former. */
  outcome?: OutcomeEvidence;
};

export type NextMoveResult = {
  current: StoredRecommendation | null;
  /** How many OTHER real candidates existed at this read — the honest answer to "why this one, not something else." Recomputed live every call, not frozen at creation. */
  competingCount: number;
  recentlyResolved: StoredRecommendation[];
};

/**
 * Recomputes candidates, reconciles them against what's already persisted
 * (auto-resolving anything whose underlying condition cleared, promoting a
 * new top candidate only when it's actually different), and returns the
 * current recommendation plus a short recent-history feed. This is the
 * Development Loop: it's the only place "was this acted on" gets recorded.
 */
export async function getNextMove(userId: string): Promise<NextMoveResult> {
  const [candidates, active] = await Promise.all([
    computeCandidates(userId),
    prisma.nextMoveRecommendation.findFirst({ where: { userId, status: "ACTIVE" } }),
  ]);

  const topCandidate = candidates[0] ?? null;
  const activeCondition = active ? candidates.find((c) => matchesStored(c, active)) : undefined;
  const activeIsStillTopPriority = Boolean(activeCondition) && activeCondition === topCandidate;

  let current: typeof active | null = null;

  if (active) {
    if (!activeCondition) {
      // The underlying condition cleared — the athlete actually did the
      // thing. This is the Development Loop closing.
      await prisma.nextMoveRecommendation.update({
        where: { id: active.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    } else if (activeIsStillTopPriority) {
      current = active;
    } else {
      // Still a real, unresolved issue — just no longer the single most
      // urgent one. Supersede it rather than resolving it, so it can
      // resurface once whatever outranked it clears.
      await prisma.nextMoveRecommendation.update({
        where: { id: active.id },
        data: { status: "SUPERSEDED", resolvedAt: new Date() },
      });
    }
  }

  if (!current && topCandidate) {
    current = await prisma.nextMoveRecommendation.create({
      data: {
        userId,
        kind: topCandidate.kind,
        title: topCandidate.title,
        reasoning: topCandidate.reasoning,
        evidence: JSON.stringify([...topCandidate.evidence, { label: "resolutionKey", value: topCandidate.resolutionKey }]),
        actionHref: topCandidate.actionHref,
        score: topCandidate.score,
      },
    });
  }

  const recentlyResolved = await prisma.nextMoveRecommendation.findMany({
    where: { userId, status: { in: ["RESOLVED", "DISMISSED"] } },
    orderBy: { resolvedAt: "desc" },
    take: 5,
  });

  return {
    current: current ? toStored(current) : null,
    competingCount: Math.max(0, candidates.length - 1),
    recentlyResolved: await Promise.all(recentlyResolved.map(toStoredWithOutcome)),
  };
}

function matchesStored(candidate: Candidate, stored: { kind: string; evidence: string }): boolean {
  return candidate.kind === stored.kind && parseEvidence(stored.evidence, "resolutionKey") === candidate.resolutionKey;
}

function parseEvidence(evidenceJson: string, label: string): string | null {
  try {
    const parsed = JSON.parse(evidenceJson) as EvidenceItem[];
    return parsed.find((e) => e.label === label)?.value ?? null;
  } catch {
    return null;
  }
}

type StoredRow = {
  id: string;
  kind: string;
  title: string;
  reasoning: string;
  evidence: string;
  actionHref: string;
  createdAt: Date;
  acceptedAt: Date | null;
};

function toStored(row: StoredRow): StoredRecommendation {
  let evidence: EvidenceItem[] = [];
  let resolutionKey = "";
  try {
    const parsed = JSON.parse(row.evidence) as EvidenceItem[];
    resolutionKey = parsed.find((e) => e.label === "resolutionKey")?.value ?? "";
    // Every hidden bookkeeping field (resolutionKey, __baselineProgress,
    // ...) uses a reserved "__"-prefixed or exact "resolutionKey" label —
    // never shown to anyone, athlete or coach.
    evidence = parsed.filter((e) => e.label !== "resolutionKey" && !e.label.startsWith("__"));
  } catch {
    evidence = [];
  }
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    reasoning: row.reasoning,
    evidence,
    resolutionKey,
    actionHref: row.actionHref,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
  };
}

export type OutcomeEvidence = {
  status: "IMPROVED" | "DECLINED" | "NEW_DATA" | "COMPLETED_ONLY" | "INSUFFICIENT_DATA";
  detail: string;
};

/**
 * For a RESOLVED row only: what, if anything, can honestly be said
 * happened afterward. This is the line between "completed" and
 * "measurably improved" the whole engine is built never to blur —
 * IMPROVED/DECLINED only appear where there's a real before/after number
 * to compare (currently just Goal.progress, captured as a hidden baseline
 * at creation time, since Goal keeps no history of its own). Everything
 * else honestly reports completion only, or that there's nothing new to
 * show yet — never infers improvement from mere completion, and never
 * judges direction on a freeform PerformanceEntry stat where "higher is
 * better" isn't something this schema knows.
 */
async function getOutcomeEvidence(row: {
  kind: string;
  evidence: string;
  resolvedAt: Date | null;
  subjectAthleteId?: string | null;
  userId: string;
}): Promise<OutcomeEvidence | undefined> {
  if (!row.resolvedAt) return undefined;
  const resolutionKey = parseEvidence(row.evidence, "resolutionKey");
  const subjectUserId = row.subjectAthleteId ?? row.userId;
  if (!resolutionKey) return undefined;

  switch (row.kind) {
    case "GOAL_STALE": {
      const goal = await prisma.goal.findUnique({ where: { id: resolutionKey } });
      const baseline = parseEvidence(row.evidence, "__baselineProgress");
      if (!goal || baseline === null) return { status: "INSUFFICIENT_DATA", detail: "This goal no longer exists." };
      const before = Number(baseline);
      const after = goal.progress;
      if (after > before) return { status: "IMPROVED", detail: `Progress went from ${before}% to ${after}%.` };
      if (after < before) return { status: "DECLINED", detail: `Progress dropped from ${before}% to ${after}% since this was flagged.` };
      return { status: "COMPLETED_ONLY", detail: `Resolved, but progress is still ${after}% — worth a real check-in, not just a cleared flag.` };
    }
    case "PERFORMANCE_STALE": {
      const latest = await prisma.performanceEntry.findFirst({ where: { userId: subjectUserId }, orderBy: { recordedAt: "desc" } });
      if (!latest) return { status: "INSUFFICIENT_DATA", detail: "No performance entry found yet." };
      const previous = await prisma.performanceEntry.findFirst({
        where: { userId: subjectUserId, statName: latest.statName, id: { not: latest.id } },
        orderBy: { recordedAt: "desc" },
      });
      return {
        status: "NEW_DATA",
        detail: previous
          ? `New ${latest.statName} logged: ${latest.value}${latest.unit ?? ""} (previous: ${previous.value}${previous.unit ?? ""}). Not labeled better or worse — MENTA doesn't assume which direction is good for a freeform stat.`
          : `First ${latest.statName} measurement logged: ${latest.value}${latest.unit ?? ""}.`,
      };
    }
    case "TRAINING_GAP": {
      const resumed = await prisma.workoutCompletion.findFirst({ where: { userId: subjectUserId, completedAt: { gt: row.resolvedAt } } });
      return resumed
        ? { status: "COMPLETED_ONLY", detail: `Logged a workout on ${resumed.completedAt.toLocaleDateString()}.` }
        : { status: "INSUFFICIENT_DATA", detail: "Resolved, but no new workout completion found yet." };
    }
    case "ACADEMIC_OVERDUE": {
      const assignment = await prisma.assignment.findUnique({ where: { id: resolutionKey } });
      if (!assignment) return { status: "INSUFFICIENT_DATA", detail: "This assignment no longer exists." };
      return { status: "COMPLETED_ONLY", detail: assignment.grade ? `Completed — grade recorded: ${assignment.grade}.` : "Completed — no grade recorded yet." };
    }
    case "ELIGIBILITY_INCOMPLETE":
      return { status: "COMPLETED_ONLY", detail: "The outstanding eligibility items were completed." };
    case "RECRUITING_STALE": {
      const recent = await prisma.recruitingActivity.findFirst({
        where: { schoolId: resolutionKey, createdAt: { gt: row.resolvedAt } },
        orderBy: { createdAt: "desc" },
      });
      return recent
        ? { status: "COMPLETED_ONLY", detail: `New outreach logged on ${recent.createdAt.toLocaleDateString()}.` }
        : { status: "INSUFFICIENT_DATA", detail: "Resolved, but no newly logged activity found." };
    }
    case "FILM_ASSIGNMENT_OVERDUE": {
      const target = await prisma.filmAssignmentTarget.findUnique({ where: { id: resolutionKey } });
      if (!target) return { status: "INSUFFICIENT_DATA", detail: "This assignment target no longer exists." };
      return {
        status: "COMPLETED_ONLY",
        detail: `Marked ${target.status.toLowerCase()}${target.completedAt ? ` on ${target.completedAt.toLocaleDateString()}` : ""}.`,
      };
    }
    case "FILM_REVIEW_UNANSWERED": {
      const req = await prisma.filmReviewRequest.findUnique({ where: { id: resolutionKey } });
      if (!req?.response) return { status: "INSUFFICIENT_DATA", detail: "No response found yet." };
      return { status: "COMPLETED_ONLY", detail: `Answered${req.respondedAt ? ` on ${req.respondedAt.toLocaleDateString()}` : ""}.` };
    }
    default:
      return undefined;
  }
}

async function toStoredWithOutcome(row: StoredRow & { resolvedAt: Date | null; subjectAthleteId?: string | null; userId: string }): Promise<StoredRecommendation> {
  const stored = toStored(row);
  const outcome = await getOutcomeEvidence(row);
  return outcome ? { ...stored, outcome } : stored;
}

/** Athlete said "not now" — dismiss their own current recommendation. Ownership-checked. Also used by coaches to dismiss their own queue items — same ownership check (userId), nothing coach-specific needed. */
export async function dismissNextMove(userId: string, recommendationId: string): Promise<boolean> {
  const result = await prisma.nextMoveRecommendation.updateMany({
    where: { id: recommendationId, userId, status: "ACTIVE" },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  return result.count > 0;
}

/**
 * Marks "recommendation accepted" — the real click-through on the primary
 * action, the stage between "generated" and "completed." Only ever set by
 * this one call site (the UI's CTA click), never inferred from a page
 * view or any other passive signal. Idempotent: a second call on an
 * already-accepted row is a harmless no-op.
 */
export async function acceptNextMove(userId: string, recommendationId: string): Promise<boolean> {
  const row = await prisma.nextMoveRecommendation.findFirst({ where: { id: recommendationId, userId, status: "ACTIVE" } });
  if (!row) return false;
  if (!row.acceptedAt) {
    await prisma.nextMoveRecommendation.update({ where: { id: row.id }, data: { acceptedAt: new Date() } });
  }
  return true;
}

// =====================================================================
// Coach Next Move — the SAME engine, authorized for a narrower, explicit
// set of signals. This is deliberately not a parallel system: it reuses
// Candidate/EvidenceItem/StoredRecommendation, the same scoring approach,
// and the same NextMoveRecommendation table (via subjectAthleteId).
//
// Why the signal set is narrower than the athlete's own: a coach's
// legitimate view into an athlete's records is narrower than the
// athlete's own view of themselves. Today, nothing in src/lib/
// permissions.ts grants a coach read access to Goal, PerformanceEntry,
// Assignment (academics), EligibilityChecklistItem, or RecruitingSchool —
// CoachDashboard.tsx's own doc comment says as much ("film review queue,
// safety checklist status, academic alerts are later-phase work once
// those features have coach-facing views of their own"). Building those
// views is real, separate, privacy-sensitive work, not something this
// engine should quietly assume. So Coach Next Move only surfaces what a
// coach can ALREADY legitimately see today:
//   - FILM_ASSIGNMENT_OVERDUE: the coach's own team assigned this film;
//     FilmAssignmentTarget status is already visible to team film staff
//     (see isTeamFilmStaff in src/lib/permissions.ts).
//   - FILM_REVIEW_UNANSWERED: an athlete asked a question through
//     FilmReviewRequest, which is either directed at this coach by id or
//     explicitly open to any team coach (see that model's own doc
//     comment in prisma/schema.prisma) — never a confidential record.
// Never Wellness/Mind (same hard boundary as the athlete engine), never
// CareRequest.reasonNote/providerNote (only operational status is ever
// coach-visible, per canViewTeamCareStatus — and this engine doesn't even
// use that, since a coach can't act on a care request; only the assigned
// provider can per canManageCareRequest).
// =====================================================================

/**
 * Shared shape for any non-athlete viewer's queue — a candidate tagged
 * with which athlete it's about. Coach Next Move and Parent Next Move
 * both produce this; a future Trainer/Educator/Administrator/Organization
 * queue would too, rather than inventing its own candidate shape.
 */
export type SubjectCandidate = Candidate & { athleteId: string; athleteName: string };
export type CoachCandidate = SubjectCandidate;

/**
 * Every legitimate "this athlete needs your attention" candidate across
 * every team this user coaches or admins (TeamMembership.teamRole COACH
 * or ADMIN — the same coarse check CoachDashboard.tsx already uses, not a
 * new authorization path). Returns an empty array for a user who coaches
 * no team, or whose athletes have nothing outstanding.
 */
export async function computeCoachCandidates(coachUserId: string): Promise<CoachCandidate[]> {
  const now = new Date();

  const coachTeams = await prisma.teamMembership.findMany({
    where: { userId: coachUserId, teamRole: { in: ["COACH", "ADMIN"] } },
    select: { teamId: true },
  });
  const teamIds = coachTeams.map((t) => t.teamId);
  if (teamIds.length === 0) return [];

  const [overdueTargets, openReviewRequests] = await Promise.all([
    prisma.filmAssignmentTarget.findMany({
      where: {
        status: { in: ["ASSIGNED", "WATCHED"] },
        assignment: { teamId: { in: teamIds }, dueAt: { lt: now } },
      },
      include: {
        assignment: { select: { title: true, dueAt: true, filmId: true, requiredViewing: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.filmReviewRequest.findMany({
      where: {
        status: "OPEN",
        film: { teamId: { in: teamIds } },
        OR: [{ coachId: coachUserId }, { coachId: null }],
      },
      include: { athlete: { select: { id: true, name: true } } },
    }),
  ]);

  const candidates: CoachCandidate[] = [];

  for (const target of overdueTargets) {
    const overdueDays = daysBetween(now, target.assignment.dueAt!);
    candidates.push({
      kind: "FILM_ASSIGNMENT_OVERDUE",
      resolutionKey: target.id,
      athleteId: target.user.id,
      athleteName: target.user.name,
      title: `${target.user.name} hasn't watched "${target.assignment.title}"`,
      reasoning: `You assigned this film and it's ${overdueDays} day(s) past due. ${target.assignment.requiredViewing ? "It's marked required." : "It's optional, but still unopened."}`,
      evidence: [
        { label: "Athlete", value: target.user.name },
        { label: "Assignment", value: target.assignment.title },
        { label: "Due", value: target.assignment.dueAt!.toLocaleDateString() },
        { label: "Status", value: target.status },
      ],
      actionHref: target.assignment.filmId ? `/film/${target.assignment.filmId}` : "/assignments",
      score: (target.assignment.requiredViewing ? 65 : 45) + Math.min(overdueDays * 3, 25),
    });
  }

  for (const req of openReviewRequests) {
    const openDays = daysBetween(now, req.createdAt);
    const directedAtMe = req.coachId === coachUserId;
    candidates.push({
      kind: "FILM_REVIEW_UNANSWERED",
      resolutionKey: req.id,
      athleteId: req.athlete.id,
      athleteName: req.athlete.name,
      title: `Answer ${req.athlete.name}'s film question`,
      reasoning: `${req.athlete.name} asked this ${openDays} day(s) ago and it's still unanswered. ${directedAtMe ? "It was sent directly to you." : "It's open to any coach on the team."}`,
      evidence: [
        { label: "Athlete", value: req.athlete.name },
        { label: "Question", value: req.question.length > 80 ? `${req.question.slice(0, 80)}…` : req.question },
        { label: "Asked", value: `${openDays} day(s) ago` },
      ],
      actionHref: `/film/${req.filmId}`,
      score: (directedAtMe ? 55 : 40) + Math.min(openDays * 4, 25),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export type SubjectQueueItem = StoredRecommendation & { athleteId: string; athleteName: string };
export type CoachQueueItem = SubjectQueueItem;

export type SubjectQueueResult = {
  /** Every currently-active item, ranked — the first is "which athlete needs attention most right now." */
  queue: SubjectQueueItem[];
  recentlyResolved: SubjectQueueItem[];
};
export type CoachQueueResult = SubjectQueueResult;

function matchesSubjectStored(candidate: SubjectCandidate, stored: { kind: string; evidence: string }): boolean {
  return candidate.kind === stored.kind && parseEvidence(stored.evidence, "resolutionKey") === candidate.resolutionKey;
}

type SubjectStoredRow = StoredRow & { subjectAthleteId: string | null };

function toSubjectStored(row: SubjectStoredRow, nameByAthleteId: Map<string, string>): SubjectQueueItem {
  const stored = toStored(row);
  return {
    ...stored,
    athleteId: row.subjectAthleteId ?? "",
    athleteName: (row.subjectAthleteId && nameByAthleteId.get(row.subjectAthleteId)) || "Athlete",
  };
}

async function toSubjectStoredWithOutcome(
  row: SubjectStoredRow & { resolvedAt: Date | null; userId: string },
  nameByAthleteId: Map<string, string>
): Promise<SubjectQueueItem> {
  const base = toSubjectStored(row, nameByAthleteId);
  const outcome = await getOutcomeEvidence(row);
  return outcome ? { ...base, outcome } : base;
}

/**
 * Shared reconciliation core for every non-athlete "queue" viewer (Coach,
 * Parent, and any future role that follows the same pattern): auto-resolve
 * whatever cleared since the last read, persist whatever's newly true,
 * return the current ranked queue plus a short resolved-history feed.
 * Extracted from what was originally Coach-only logic — behavior,
 * ordering, scoring, and persistence semantics are unchanged from before
 * this was shared; only the viewerId and candidate list are now
 * parameters instead of being coach-specific.
 *
 * Never touches or depends on getNextMove()'s single-slot athlete-side
 * rows — same table, disjoint by subjectAthleteId being set at all.
 */
export async function reconcileSubjectQueue(
  viewerId: string,
  candidates: SubjectCandidate[]
): Promise<SubjectQueueResult> {
  const nameByAthleteId = new Map(candidates.map((c) => [c.athleteId, c.athleteName]));

  const activeRows = await prisma.nextMoveRecommendation.findMany({
    where: { userId: viewerId, status: "ACTIVE", subjectAthleteId: { not: null } },
  });

  const stillMatched = new Set<string>();
  for (const row of activeRows) {
    const match = candidates.find((c) => matchesSubjectStored(c, row));
    if (match) {
      stillMatched.add(row.id);
    } else {
      // The underlying condition cleared — the Development Loop closing.
      await prisma.nextMoveRecommendation.update({
        where: { id: row.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    }
  }

  const alreadyPersisted = new Set(
    activeRows.filter((r) => stillMatched.has(r.id)).map((r) => `${r.kind}:${parseEvidence(r.evidence, "resolutionKey")}`)
  );
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.resolutionKey}`;
    if (alreadyPersisted.has(key)) continue;
    await prisma.nextMoveRecommendation.create({
      data: {
        userId: viewerId,
        subjectAthleteId: candidate.athleteId,
        kind: candidate.kind,
        title: candidate.title,
        reasoning: candidate.reasoning,
        evidence: JSON.stringify([...candidate.evidence, { label: "resolutionKey", value: candidate.resolutionKey }]),
        actionHref: candidate.actionHref,
        score: candidate.score,
      },
    });
  }

  const [queueRows, recentlyResolvedRows] = await Promise.all([
    prisma.nextMoveRecommendation.findMany({
      where: { userId: viewerId, status: "ACTIVE", subjectAthleteId: { not: null } },
      orderBy: { score: "desc" },
    }),
    prisma.nextMoveRecommendation.findMany({
      where: { userId: viewerId, status: { in: ["RESOLVED", "DISMISSED"] }, subjectAthleteId: { not: null } },
      orderBy: { resolvedAt: "desc" },
      take: 5,
    }),
  ]);

  // A resolved row's athlete may no longer appear in the fresh candidate
  // list (that's the whole point — their condition cleared), so the name
  // map built from candidates alone would miss them. Fill the gap.
  const missingAthleteIds = [...queueRows, ...recentlyResolvedRows]
    .map((r) => r.subjectAthleteId)
    .filter((id): id is string => Boolean(id) && !nameByAthleteId.has(id!));
  if (missingAthleteIds.length > 0) {
    const missingUsers = await prisma.user.findMany({ where: { id: { in: missingAthleteIds } }, select: { id: true, name: true } });
    for (const u of missingUsers) nameByAthleteId.set(u.id, u.name);
  }

  return {
    queue: queueRows.map((r) => toSubjectStored(r, nameByAthleteId)),
    recentlyResolved: await Promise.all(recentlyResolvedRows.map((r) => toSubjectStoredWithOutcome(r, nameByAthleteId))),
  };
}

/**
 * Coach-side counterpart to getNextMove() — thin wrapper around the shared
 * reconciliation core with Coach's own candidate source.
 */
export async function getCoachQueue(coachUserId: string): Promise<CoachQueueResult> {
  const candidates = await computeCoachCandidates(coachUserId);
  return reconcileSubjectQueue(coachUserId, candidates);
}

// =====================================================================
// Parent Next Move — the third instance of the SubjectCandidate /
// reconcileSubjectQueue pattern established above for Coach. An APPROVED
// GuardianLink is a relationship, not blanket access (see GUARDIAN_SCOPES
// in src/lib/permissions.ts for the full reasoning) — three signal kinds
// below need nothing beyond APPROVED (the parent already legitimately
// owns or can already see this data through an existing, narrower check);
// three more require the athlete to have explicitly granted the matching
// GuardianScope, re-checked live both here AND again in getParentQueue
// after reconciliation, so a scope revoked since a row was created stops
// being visible on the very next read — not on the next recompute.
//
// IMPORTANT for any future per-subject candidate kind (this file or a
// later Trainer/Educator/Administrator/Organization queue): resolutionKey
// must be either a genuinely global-unique id (a real row's cuid) or
// explicitly athlete-scoped (prefixed with the athlete's id). Reconciliation
// matches candidates to stored rows purely on kind+resolutionKey across
// ALL subject athletes under one viewer at once, not per-athlete — two
// different athletes producing the same bare resolutionKey for a
// count-based (non-single-record) kind would collide and silently drop
// one athlete's real recommendation. PARENT_ELIGIBILITY_INCOMPLETE below
// is the one count-based kind here, and is scoped accordingly.
//
// Transportation/carpool signals are explicitly NOT part of this engine —
// no transportation concept exists in the data model yet; deferred to its
// own dedicated module, not bolted on here.
//
// Never Wellness/Mind/EmergencyContact/PersonalSafetyProfile (same hard
// boundary as every other Next Move surface), never
// CareRequest.reason/reasonNote/providerNote — status + scheduledStart
// only, the same scope canViewAthleteCareStatus already documents.
// =====================================================================

export type ParentCandidate = SubjectCandidate;

/** How many days out an upcoming calendar event still counts as worth a nudge, not noise. */
const CALENDAR_LOOKAHEAD_DAYS = 3;

/**
 * Every legitimate "needs your attention" candidate across every athlete
 * this parent is an APPROVED guardian of. Multi-athlete households fall
 * out naturally — this loops every linked athlete and returns one ranked
 * list, same shape computeCoachCandidates already produces for a coach's
 * team. Returns an empty array for a parent with no approved links.
 */
export async function computeParentCandidates(parentUserId: string): Promise<ParentCandidate[]> {
  const now = new Date();
  const links = await prisma.guardianLink.findMany({
    where: { guardianId: parentUserId, status: "APPROVED" },
    include: { athlete: { select: { id: true, name: true } } },
  });

  const candidates: ParentCandidate[] = [];
  for (const link of links) {
    const athlete = link.athlete;

    const [
      upcomingCare,
      outstandingRequests,
      canViewAcademicStatus,
      canViewAcademicAssignments,
      canViewCalendar,
    ] = await Promise.all([
      // Status + scheduledStart only — never reason/reasonNote/providerNote.
      prisma.careRequest.findMany({
        where: { athleteId: athlete.id, status: "SCHEDULED", scheduledStart: { gt: now } },
        select: { id: true, status: true, scheduledStart: true },
        orderBy: { scheduledStart: "asc" },
      }),
      // The parent's own request, about their own linked athlete — no
      // additional scope needed, they already own this record.
      prisma.documentRequest.findMany({
        where: { requestedById: parentUserId, athleteId: athlete.id, status: "PENDING" },
        orderBy: { createdAt: "asc" },
      }),
      hasGuardianScope(parentUserId, athlete.id, "VIEW_ACADEMIC_STATUS"),
      hasGuardianScope(parentUserId, athlete.id, "VIEW_ACADEMIC_ASSIGNMENTS"),
      hasGuardianScope(parentUserId, athlete.id, "VIEW_TEAM_CALENDAR"),
    ]);

    // --- Care: next scheduled appointment, if any ---
    const nextCare = upcomingCare[0];
    if (nextCare) {
      const daysOut = daysBetween(nextCare.scheduledStart!, now);
      candidates.push({
        kind: "PARENT_CARE_APPOINTMENT_UPCOMING",
          athleteId: athlete.id,
          athleteName: athlete.name,
        resolutionKey: nextCare.id,
        title: `${athlete.name} has a care appointment ${daysOut <= 1 ? "soon" : `in ${daysOut} days`}`,
        reasoning: `${CARE_OPERATIONAL_STATUS_LABELS.SCHEDULED} — you're seeing this because you're an approved guardian for ${athlete.name}. The reason for the visit stays private to ${athlete.name} and their provider.`,
        evidence: [
          { label: "Athlete", value: athlete.name },
          { label: "Status", value: CARE_OPERATIONAL_STATUS_LABELS.SCHEDULED },
          { label: "Scheduled", value: nextCare.scheduledStart!.toLocaleString() },
        ],
        actionHref: "/care",
        score: 55 + Math.max(0, 7 - daysOut) * 3,
      });
    }

    // --- Documents: a request the parent themselves made, still open ---
    for (const req of outstandingRequests) {
      const daysOpen = daysBetween(now, req.createdAt);
      candidates.push({
        kind: "PARENT_DOCUMENT_REQUEST_OUTSTANDING",
          athleteId: athlete.id,
          athleteName: athlete.name,
        resolutionKey: req.id,
        title: `Follow up on "${req.title}" for ${athlete.name}`,
        reasoning: `You requested this document ${daysOpen} day(s) ago and ${athlete.name} hasn't uploaded it yet.`,
        evidence: [
          { label: "Athlete", value: athlete.name },
          { label: "Document", value: req.title },
          { label: "Requested", value: req.createdAt.toLocaleDateString() },
        ],
        actionHref: "/documents",
        score: 35 + Math.min(daysOpen, 20),
      });
    }

    // --- Eligibility: gated behind VIEW_ACADEMIC_STATUS ---
    if (canViewAcademicStatus) {
      const incomplete = await prisma.eligibilityChecklistItem.findMany({
        where: { userId: athlete.id, status: { not: "COMPLETED" } },
      });
      if (incomplete.length > 0) {
        candidates.push({
          kind: "PARENT_ELIGIBILITY_INCOMPLETE",
          athleteId: athlete.id,
          athleteName: athlete.name,
          // Count-based, not tied to one row — must be athlete-scoped, see
          // the big comment above this section.
          resolutionKey: `eligibility:${athlete.id}`,
          title:
            incomplete.length === 1
              ? `${athlete.name} has one eligibility item left`
              : `${athlete.name} has ${incomplete.length} eligibility items left`,
          reasoning: `${athlete.name} shared eligibility status with you. Left incomplete, these quietly become a real problem later in the season.`,
          evidence: incomplete.slice(0, 3).map((i) => ({ label: i.category, value: i.title })),
          actionHref: `/parent/athletes/${athlete.id}/academics`,
          score: 20 + Math.min(incomplete.length * 4, 20),
        });
      }
    }

    // --- Academic assignments: gated behind VIEW_ACADEMIC_ASSIGNMENTS ---
    if (canViewAcademicAssignments) {
      const overdue = await prisma.assignment.findMany({
        where: { userId: athlete.id, status: { not: "COMPLETED" }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" },
      });
      for (const a of overdue) {
        const overdueDays = daysBetween(now, a.dueDate!);
        candidates.push({
          kind: "PARENT_ACADEMIC_ASSIGNMENT_OVERDUE",
          athleteId: athlete.id,
          athleteName: athlete.name,
          resolutionKey: a.id,
          title: `"${a.title}" is overdue for ${athlete.name}`,
          reasoning: `${athlete.name} shared assignment details with you. This one${a.subject ? ` (${a.subject})` : ""} was due ${overdueDays} day(s) ago and isn't marked complete.`,
          evidence: [
            { label: "Athlete", value: athlete.name },
            { label: "Assignment", value: a.title },
            { label: "Due", value: a.dueDate!.toLocaleDateString() },
          ],
          actionHref: `/parent/athletes/${athlete.id}/academics`,
          score: 60 + Math.min(overdueDays * 2, 25),
        });
      }
    }

    // --- Team calendar: gated behind VIEW_TEAM_CALENDAR, only near-term events ---
    if (canViewCalendar) {
      const lookaheadEnd = new Date(now.getTime() + CALENDAR_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
      const upcoming = await prisma.calendarEvent.findFirst({
        where: {
          team: { memberships: { some: { userId: athlete.id } } },
          visibility: { in: ["TEAM", "PUBLIC"] },
          startsAt: { gte: now, lte: lookaheadEnd },
        },
        orderBy: { startsAt: "asc" },
      });
      if (upcoming) {
        const daysOut = daysBetween(upcoming.startsAt, now);
        candidates.push({
          kind: "PARENT_CALENDAR_UPCOMING",
          athleteId: athlete.id,
          athleteName: athlete.name,
          resolutionKey: upcoming.id,
          title: `${upcoming.title} ${daysOut <= 0 ? "is today" : `in ${daysOut} day(s)`} for ${athlete.name}`,
          reasoning: `${athlete.name} shared team calendar access with you. ${upcoming.location ? `Location: ${upcoming.location}.` : ""}`,
          evidence: [
            { label: "Athlete", value: athlete.name },
            { label: "Event", value: upcoming.title },
            { label: "Starts", value: upcoming.startsAt.toLocaleString() },
          ],
          actionHref: `/parent/athletes/${athlete.id}/calendar`,
          score: 30 + Math.max(0, CALENDAR_LOOKAHEAD_DAYS - daysOut) * 10,
        });
      }
    }

    // --- Messages: a conversation tied to one of this athlete's teams,
    // where the parent participates and the latest message isn't theirs.
    // No per-message read-tracking exists in this schema (Message has no
    // readAt), so this is "awaiting your reply," not "unread" — the same
    // honest distinction FILM_REVIEW_UNANSWERED already draws from
    // req.response being null rather than a tracked read state. Limited to
    // team-linked conversations only: a 1:1 conversation with no teamId
    // can't be safely attributed to one specific linked athlete, so it's
    // left out of this engine rather than guessed.
    const athleteTeamIds = (
      await prisma.teamMembership.findMany({ where: { userId: athlete.id }, select: { teamId: true } })
    ).map((t) => t.teamId);
    if (athleteTeamIds.length > 0) {
      const parentConversations = await prisma.conversationParticipant.findMany({
        where: { userId: parentUserId, conversation: { teamId: { in: athleteTeamIds } } },
        select: {
          conversation: {
            select: {
              id: true,
              title: true,
              messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true, body: true } },
            },
          },
        },
      });
      for (const { conversation } of parentConversations) {
        const latest = conversation.messages[0];
        if (!latest || latest.senderId === parentUserId) continue;
        const daysOpen = daysBetween(now, latest.createdAt);
        candidates.push({
          kind: "PARENT_MESSAGE_AWAITING_REPLY",
          athleteId: athlete.id,
          athleteName: athlete.name,
          resolutionKey: conversation.id,
          title: `A message about ${athlete.name} is awaiting your reply`,
          reasoning: `The most recent message in ${conversation.title ?? "this conversation"} was sent ${daysOpen} day(s) ago and you haven't replied yet.`,
          evidence: [
            { label: "Athlete", value: athlete.name },
            { label: "Conversation", value: conversation.title ?? "Direct message" },
            { label: "Last message", value: latest.body.length > 80 ? `${latest.body.slice(0, 80)}…` : latest.body },
          ],
          actionHref: `/messages/${conversation.id}`,
          score: 40 + Math.min(daysOpen * 4, 25),
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Parent-side counterpart to getNextMove()/getCoachQueue() — same shared
 * reconciliation core, plus one extra step neither of the others need: a
 * live re-check of every permission-gated row's GuardianScope right
 * before returning. A scope revoked after a row was persisted (but before
 * the next full recompute) must not still show up here — this is what
 * makes that true, enforced at read time, not just at the next
 * reconciliation pass.
 */
export async function getParentQueue(parentUserId: string): Promise<SubjectQueueResult> {
  const candidates = await computeParentCandidates(parentUserId);
  const result = await reconcileSubjectQueue(parentUserId, candidates);

  const scopeByKind: Partial<Record<RecommendationKind, GuardianScope>> = {
    PARENT_ELIGIBILITY_INCOMPLETE: "VIEW_ACADEMIC_STATUS",
    PARENT_ACADEMIC_ASSIGNMENT_OVERDUE: "VIEW_ACADEMIC_ASSIGNMENTS",
    PARENT_CALENDAR_UPCOMING: "VIEW_TEAM_CALENDAR",
  };

  async function stillAuthorized(item: SubjectQueueItem): Promise<boolean> {
    const scope = scopeByKind[item.kind as RecommendationKind];
    if (!scope) return true; // not a permission-gated kind
    return hasGuardianScope(parentUserId, item.athleteId, scope);
  }

  const [queue, recentlyResolved] = await Promise.all([
    Promise.all(result.queue.map(async (item) => ((await stillAuthorized(item)) ? item : null))),
    Promise.all(result.recentlyResolved.map(async (item) => ((await stillAuthorized(item)) ? item : null))),
  ]);

  return {
    queue: queue.filter((i): i is SubjectQueueItem => i !== null),
    recentlyResolved: recentlyResolved.filter((i): i is SubjectQueueItem => i !== null),
  };
}

// =====================================================================
// Trainer Next Move — the fourth SubjectCandidate/reconcileSubjectQueue
// instance. Built on MENTA Care's existing provider model
// (isVerifiedProvider/canManageCareRequest in src/lib/permissions.ts),
// not a new authorization system: a trainer only ever sees a CareRequest
// where they are both the assigned provider (ownership) AND currently a
// verified provider on that specific request's team (isVerifiedProvider,
// re-checked live, never trusted as a historical fact — see
// getTrainerQueue below). Document-request and message signals use their
// own, already-existing authorization shapes (self-ownership for
// DocumentRequest; current TeamMembership for messages) rather than
// reusing the care-provider check where it doesn't apply — "appropriate
// ownership of the underlying resource" means a different check per
// resource, not one check reused everywhere it's convenient.
//
// Never CareRequest.reason/reasonNote/providerNote in title/reasoning/
// evidence — status and real timestamps only, the same restraint Coach's
// and Parent's care signals already apply, even though a trainer-as-
// provider has broader legitimate access to that detail on /care/provider
// itself. Next Move's own surface is deliberately the conservative one.
// =====================================================================

export type TrainerCandidate = SubjectCandidate;

/** Appointments further out than this don't need a Next Move nudge yet — same reasoning as CALENDAR_LOOKAHEAD_DAYS above. */
const CARE_APPOINTMENT_LOOKAHEAD_DAYS = 7;

/**
 * Every legitimate "needs your attention" candidate across every team
 * this trainer is a currently-verified care provider on, plus their own
 * outstanding document requests and 1:1 client messages awaiting a reply.
 * Returns an empty array for a trainer with no verified provider teams
 * and no other outstanding items — never fabricates one to fill the slot.
 */
export async function computeTrainerCandidates(trainerUserId: string): Promise<TrainerCandidate[]> {
  const now = new Date();
  const candidates: TrainerCandidate[] = [];

  const verifiedMemberships = await prisma.teamMembership.findMany({
    where: { userId: trainerUserId, teamRole: { in: PROVIDER_TEAM_ROLES }, verifiedAt: { not: null } },
    select: { teamId: true },
  });
  const verifiedTeamIds = verifiedMemberships.map((m) => m.teamId);

  if (verifiedTeamIds.length > 0) {
    const careRequests = await prisma.careRequest.findMany({
      where: { providerId: trainerUserId, teamId: { in: verifiedTeamIds }, status: { in: ["REQUESTED", "SCHEDULED", "FOLLOW_UP"] } },
      include: { athlete: { select: { id: true, name: true } }, followUps: { select: { id: true } } },
      orderBy: { updatedAt: "asc" },
    });

    for (const req of careRequests) {
      if (req.status === "REQUESTED") {
        const daysWaiting = daysBetween(now, req.requestedStart <= now ? req.requestedStart : req.createdAt);
        candidates.push({
          kind: "TRAINER_CARE_REQUEST_NEW",
          resolutionKey: req.id,
          athleteId: req.athlete.id,
          athleteName: req.athlete.name,
          title: `New care request from ${req.athlete.name}`,
          reasoning: `${req.athlete.name} requested care and it hasn't been scheduled or declined yet.`,
          evidence: [
            { label: "Athlete", value: req.athlete.name },
            { label: "Status", value: CARE_OPERATIONAL_STATUS_LABELS.REQUESTED },
            { label: "Requested", value: req.requestedStart.toLocaleString() },
          ],
          actionHref: "/care/provider",
          score: 60 + Math.min(Math.max(daysWaiting, 0) * 3, 20),
        });
      }

      if (req.status === "SCHEDULED" && req.scheduledStart && req.scheduledStart > now) {
        const daysOut = daysBetween(req.scheduledStart, now);
        if (daysOut <= CARE_APPOINTMENT_LOOKAHEAD_DAYS) {
          candidates.push({
            kind: "TRAINER_CARE_APPOINTMENT_UPCOMING",
            resolutionKey: req.id,
            athleteId: req.athlete.id,
            athleteName: req.athlete.name,
            title: `Appointment with ${req.athlete.name} ${daysOut <= 1 ? "soon" : `in ${daysOut} days`}`,
            reasoning: `${CARE_OPERATIONAL_STATUS_LABELS.SCHEDULED}.`,
            evidence: [
              { label: "Athlete", value: req.athlete.name },
              { label: "Scheduled", value: req.scheduledStart.toLocaleString() },
            ],
            actionHref: "/care/provider",
            score: 55 + Math.max(0, 7 - daysOut) * 3,
          });
        }
      }

      // Outstanding, never "overdue" — FOLLOW_UP has no stored deadline to
      // compare against, only how long it's sat in this status.
      if (req.status === "FOLLOW_UP" && req.followUps.length === 0) {
        const daysOutstanding = daysBetween(now, req.updatedAt);
        candidates.push({
          kind: "TRAINER_CARE_FOLLOWUP_DUE",
          resolutionKey: req.id,
          athleteId: req.athlete.id,
          athleteName: req.athlete.name,
          title: `Follow up with ${req.athlete.name}`,
          reasoning: `Marked for follow-up ${daysOutstanding <= 0 ? "today" : `${daysOutstanding} day(s) ago`} — no new follow-up request has been scheduled yet.`,
          evidence: [
            { label: "Athlete", value: req.athlete.name },
            { label: "Status", value: "Outstanding follow-up" },
          ],
          actionHref: "/care/provider",
          score: 30 + Math.min(Math.max(daysOutstanding, 0) * 2, 25),
        });
      }
    }

    // Schedule conflicts: pairwise comparison over requests that have a
    // real scheduledStart AND scheduledEnd — a request missing an end time
    // is never treated as conflicting with anything, since that would mean
    // inventing a duration it doesn't have. Same overlap condition
    // hasSchedulingConflict() in src/lib/care-server.ts already uses
    // (start < otherEnd && otherStart < end), applied pairwise here
    // because that helper only answers yes/no — this needs to know which
    // specific pair, to attribute and dedupe correctly.
    const windowed = careRequests.filter(
      (r): r is typeof r & { scheduledStart: Date; scheduledEnd: Date } =>
        r.status === "SCHEDULED" && r.scheduledStart !== null && r.scheduledEnd !== null
    );
    for (let i = 0; i < windowed.length; i++) {
      for (let j = i + 1; j < windowed.length; j++) {
        const a = windowed[i];
        const b = windowed[j];
        const overlaps = a.scheduledStart < b.scheduledEnd && b.scheduledStart < a.scheduledEnd;
        if (!overlaps) continue;
        // Anchor on whichever starts first; dedupe key is the sorted pair
        // so (a,b) and (b,a) never produce two candidates.
        const [first, second] = a.scheduledStart <= b.scheduledStart ? [a, b] : [b, a];
        const [keyA, keyB] = [first.id, second.id].sort();
        candidates.push({
          kind: "TRAINER_CARE_SCHEDULE_CONFLICT",
          resolutionKey: `${keyA}:${keyB}`,
          athleteId: first.athlete.id,
          athleteName: first.athlete.name,
          title: `${first.athlete.name} and ${second.athlete.name} are double-booked`,
          reasoning: `Two scheduled appointments overlap — this shouldn't normally happen (scheduling already checks for conflicts), so it's worth confirming which one is correct.`,
          evidence: [
            { label: first.athlete.name, value: `${first.scheduledStart.toLocaleString()} – ${first.scheduledEnd.toLocaleTimeString()}` },
            { label: second.athlete.name, value: `${second.scheduledStart.toLocaleString()} – ${second.scheduledEnd.toLocaleTimeString()}` },
          ],
          actionHref: "/care/provider",
          score: 75,
        });
      }
    }
  }

  // Document requests: self-ownership only — matches the existing
  // DocumentRequest authorization model (DocumentsPage gates creation by
  // account role, not care-provider verification), not the care-provider
  // check above.
  const outstandingDocs = await prisma.documentRequest.findMany({
    where: { requestedById: trainerUserId, status: "PENDING" },
    include: { athlete: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  for (const req of outstandingDocs) {
    const daysOpen = daysBetween(now, req.createdAt);
    candidates.push({
      kind: "TRAINER_DOCUMENT_REQUEST_OUTSTANDING",
      resolutionKey: req.id,
      athleteId: req.athlete.id,
      athleteName: req.athlete.name,
      title: `Follow up on "${req.title}" for ${req.athlete.name}`,
      reasoning: `You requested this document ${daysOpen} day(s) ago and ${req.athlete.name} hasn't uploaded it yet.`,
      evidence: [
        { label: "Athlete", value: req.athlete.name },
        { label: "Document", value: req.title },
        { label: "Requested", value: req.createdAt.toLocaleDateString() },
      ],
      actionHref: "/documents",
      score: 35 + Math.min(daysOpen, 20),
    });
  }

  // Messages: current TeamMembership (teamRole TRAINER), not care-provider
  // verification — messaging isn't a Care concept. Scoped to 1:1
  // (non-group) conversations with an actual current client only: a
  // team-wide group chat can't be attributed to one specific athlete
  // subject, which this engine's shape requires, so it's deliberately
  // left out of this kind rather than guessed at — same reasoning Parent
  // Next Move already applies to non-team-linked conversations.
  const trainerTeams = await prisma.teamMembership.findMany({
    where: { userId: trainerUserId, teamRole: "TRAINER" },
    select: { teamId: true },
  });
  if (trainerTeams.length > 0) {
    const clientIds = (
      await prisma.teamMembership.findMany({
        where: { teamId: { in: trainerTeams.map((t) => t.teamId) }, teamRole: "ATHLETE" },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    if (clientIds.length > 0) {
      const dmConversations = await prisma.conversationParticipant.findMany({
        where: {
          userId: trainerUserId,
          conversation: { isGroup: false, teamId: null, participants: { some: { userId: { in: clientIds } } } },
        },
        select: {
          conversation: {
            select: {
              id: true,
              title: true,
              participants: { select: { user: { select: { id: true, name: true } } } },
              messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true, body: true } },
            },
          },
        },
      });
      for (const { conversation } of dmConversations) {
        const latest = conversation.messages[0];
        if (!latest || latest.senderId === trainerUserId) continue;
        const other = conversation.participants.find((p) => p.user.id !== trainerUserId)?.user;
        if (!other || !clientIds.includes(other.id)) continue;
        const daysOpen = daysBetween(now, latest.createdAt);
        candidates.push({
          kind: "TRAINER_MESSAGE_AWAITING_REPLY",
          resolutionKey: conversation.id,
          athleteId: other.id,
          athleteName: other.name,
          title: `A message from ${other.name} is awaiting your reply`,
          reasoning: `Their most recent message was sent ${daysOpen} day(s) ago and you haven't replied yet.`,
          evidence: [
            { label: "Athlete", value: other.name },
            { label: "Last message", value: latest.body.length > 80 ? `${latest.body.slice(0, 80)}…` : latest.body },
          ],
          actionHref: `/messages/${conversation.id}`,
          score: 40 + Math.min(daysOpen * 4, 25),
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Trainer-side counterpart to getNextMove()/getCoachQueue()/getParentQueue().
 * Same shared reconciliation core, plus a live re-check before returning:
 * verification can be revoked, team membership can be removed, and a
 * stale CareRequest.providerId must never be trusted as still meaning
 * "currently authorized" on its own — "do not rely solely on providerId
 * or a historical assignment" is enforced here, not just at candidate
 * generation. No SUPER_ADMIN bypass: consistent with getCoachQueue and
 * getParentQueue, which don't have one either — this queue is scoped to
 * being this specific trainer, not a platform-wide view.
 */
export async function getTrainerQueue(trainerUserId: string): Promise<SubjectQueueResult> {
  const candidates = await computeTrainerCandidates(trainerUserId);
  const result = await reconcileSubjectQueue(trainerUserId, candidates);

  const SINGLE_CARE_KINDS: RecommendationKind[] = [
    "TRAINER_CARE_REQUEST_NEW",
    "TRAINER_CARE_APPOINTMENT_UPCOMING",
    "TRAINER_CARE_FOLLOWUP_DUE",
  ];

  /**
   * Re-derives authorization from the current database state for one
   * persisted row, using resolutionKey to look up the specific underlying
   * record it refers to — never trusting the row's own stored content
   * (title/evidence) as still being accurate, and never relying on
   * CareRequest.providerId alone without also re-checking isVerifiedProvider
   * on that request's actual team right now.
   */
  async function stillAuthorized(item: SubjectQueueItem): Promise<boolean> {
    const kind = item.kind as RecommendationKind;

    if (SINGLE_CARE_KINDS.includes(kind)) {
      const req = await prisma.careRequest.findUnique({
        where: { id: item.resolutionKey },
        select: { providerId: true, teamId: true },
      });
      if (!req || req.providerId !== trainerUserId) return false;
      return isVerifiedProvider(trainerUserId, req.teamId);
    }

    if (kind === "TRAINER_CARE_SCHEDULE_CONFLICT") {
      const [idA, idB] = item.resolutionKey.split(":");
      if (!idA || !idB) return false;
      const [reqA, reqB] = await Promise.all([
        prisma.careRequest.findUnique({ where: { id: idA }, select: { providerId: true, teamId: true } }),
        prisma.careRequest.findUnique({ where: { id: idB }, select: { providerId: true, teamId: true } }),
      ]);
      if (!reqA || !reqB || reqA.providerId !== trainerUserId || reqB.providerId !== trainerUserId) return false;
      const [verifiedA, verifiedB] = await Promise.all([
        isVerifiedProvider(trainerUserId, reqA.teamId),
        isVerifiedProvider(trainerUserId, reqB.teamId),
      ]);
      return verifiedA && verifiedB;
    }

    if (kind === "TRAINER_DOCUMENT_REQUEST_OUTSTANDING") {
      const req = await prisma.documentRequest.findUnique({
        where: { id: item.resolutionKey },
        select: { requestedById: true },
      });
      return Boolean(req && req.requestedById === trainerUserId);
    }

    if (kind === "TRAINER_MESSAGE_AWAITING_REPLY") {
      // No stored teamId on a 1:1 conversation — re-derive "is this still
      // a current client" the same way computeTrainerCandidates found them:
      // a shared team where the trainer currently holds teamRole TRAINER.
      const sharedTeam = await prisma.teamMembership.findFirst({
        where: {
          userId: trainerUserId,
          teamRole: "TRAINER",
          team: { memberships: { some: { userId: item.athleteId, teamRole: "ATHLETE" } } },
        },
        select: { teamId: true },
      });
      return Boolean(sharedTeam);
    }

    return true; // not a trainer-specific kind — shouldn't occur here, but never silently hide an unrecognized kind
  }

  const [queue, recentlyResolved] = await Promise.all([
    Promise.all(result.queue.map(async (item) => ((await stillAuthorized(item)) ? item : null))),
    Promise.all(result.recentlyResolved.map(async (item) => ((await stillAuthorized(item)) ? item : null))),
  ]);

  return {
    queue: queue.filter((i): i is SubjectQueueItem => i !== null),
    recentlyResolved: recentlyResolved.filter((i): i is SubjectQueueItem => i !== null),
  };
}
