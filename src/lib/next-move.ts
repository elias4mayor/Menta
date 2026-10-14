import "server-only";
import { prisma } from "@/lib/prisma";

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
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

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
};

export type NextMoveResult = {
  current: StoredRecommendation | null;
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
    recentlyResolved: recentlyResolved.map(toStored),
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

function toStored(row: { id: string; kind: string; title: string; reasoning: string; evidence: string; actionHref: string; createdAt: Date }): StoredRecommendation {
  let evidence: EvidenceItem[] = [];
  try {
    evidence = (JSON.parse(row.evidence) as EvidenceItem[]).filter((e) => e.label !== "resolutionKey");
  } catch {
    evidence = [];
  }
  return { id: row.id, kind: row.kind, title: row.title, reasoning: row.reasoning, evidence, actionHref: row.actionHref, createdAt: row.createdAt };
}

/** Athlete said "not now" — dismiss their own current recommendation. Ownership-checked. */
export async function dismissNextMove(userId: string, recommendationId: string): Promise<boolean> {
  const result = await prisma.nextMoveRecommendation.updateMany({
    where: { id: recommendationId, userId, status: "ACTIVE" },
    data: { status: "DISMISSED", resolvedAt: new Date() },
  });
  return result.count > 0;
}
