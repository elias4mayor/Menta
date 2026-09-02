/**
 * MENTA Profile Fit + Academic Alignment + Reality Check — pure functions
 * over data MENTA already has (the athlete's own profile/sport-context/
 * performance/film, plus their own RecruitingSchool entry). No network
 * calls, no DB access, no external recruiting data — deliberately, since
 * no licensed recruiting data provider is connected yet (see the
 * provider-neutral data contract discussion). Runs identically on server
 * or client.
 *
 * Scope discipline: this can only honestly assess how COMPLETE and
 * CONSISTENT the athlete's own profile is, and how it relates to what the
 * athlete themselves entered about a school (division, location, notes).
 * It CANNOT compare the athlete against a program's actual roster,
 * recruiting standards, or needs — MENTA has no connected data for that.
 * Every label/reason below is written to stay honest about that boundary;
 * don't add copy that implies a real program-level comparison.
 */

export type FitLabel = "Strong profile fit" | "Potential fit" | "Worth exploring" | "More information needed";

export type AlignmentLabel = "Strong" | "Potential" | "More information needed";

export type ProfileFitResult = {
  label: FitLabel;
  reason: string;
};

export type AcademicAlignmentResult = {
  label: AlignmentLabel;
  reason: string;
};

export type RealityCheck = {
  whatWeKnow: string[];
  whatWeDontKnow: string[];
  nextMove: string;
};

export type AthleteFitContext = {
  sport: string | null;
  position: string | null;
  graduationYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  gpa: number | null;
  city: string | null;
  state: string | null;
  hasRecentPerformanceData: boolean;
  hasFilm: boolean;
};

export type SchoolFitContext = {
  name: string;
  division: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  contactCount: number;
};

/**
 * "Strong"/"Potential"/"Worth exploring" all describe how documented the
 * athlete's own profile is for evaluation purposes — never a claim about
 * how competitive they are for a specific roster, which MENTA has no data
 * to assess yet.
 */
export function computeProfileFit(athlete: AthleteFitContext): ProfileFitResult {
  const hasCoreProfile = Boolean(athlete.sport && athlete.position && athlete.graduationYear);
  const hasMeasurables = Boolean(athlete.heightCm || athlete.weightKg);
  const strengths: string[] = [];
  if (hasCoreProfile) strengths.push("your sport, position, and graduation year");
  if (athlete.hasRecentPerformanceData) strengths.push("recent performance data");
  if (athlete.hasFilm) strengths.push("film");
  if (hasMeasurables) strengths.push("your measurables");

  if (!hasCoreProfile) {
    return {
      label: "More information needed",
      reason: "Add your sport, position, and graduation year to your profile so MENTA has enough to work with.",
    };
  }

  if (athlete.hasRecentPerformanceData && athlete.hasFilm) {
    return {
      label: "Strong profile fit",
      reason: `Your profile is well-documented — ${joinList(strengths)} give MENTA a clear picture to work from.`,
    };
  }

  if (athlete.hasRecentPerformanceData || athlete.hasFilm) {
    return {
      label: "Potential fit",
      reason: `MENTA has ${joinList(strengths)} to go on. Adding ${athlete.hasFilm ? "recent performance data" : "film"} would sharpen this further.`,
    };
  }

  return {
    label: "Worth exploring",
    reason: "Your core profile is set, but there's no recent performance data or film yet — both would give MENTA a fuller picture.",
  };
}

/**
 * Deliberately only three tiers, and deliberately never a "Limited"/"weak"
 * label — a GPA never disqualifies or shames, per house rule. "Potential"
 * covers everything from borderline to genuinely low, always framed as
 * something worth researching or still improvable, never as a verdict.
 */
export function computeAcademicAlignment(gpa: number | null): AcademicAlignmentResult {
  if (gpa === null) {
    return {
      label: "More information needed",
      reason: "Add your GPA to your profile — academics are one of the things coaches weigh alongside athletic ability.",
    };
  }

  if (gpa >= 3.0) {
    return {
      label: "Strong",
      reason: "A GPA like yours is often read as a sign you can balance the classroom with a demanding athletic schedule.",
    };
  }

  return {
    label: "Potential",
    reason: "Academic expectations vary a lot by program. Researching this school's specific requirements will give you a clearer picture — and grades are always something you can keep building on.",
  };
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * The single most useful next action, in priority order — one concrete
 * thing, not a checklist. Missing-profile gaps come first since they
 * unlock everything else; a saved-but-unworked school comes last.
 */
function pickNextMove(athlete: AthleteFitContext, school: SchoolFitContext): string {
  if (!athlete.sport || !athlete.position || !athlete.graduationYear) {
    return "Finish your athlete profile — sport, position, and graduation year — so MENTA can say more here.";
  }
  if (athlete.gpa === null) {
    return "Add your GPA to your profile to see academic alignment for this school.";
  }
  if (!athlete.hasFilm) {
    return "Upload film — it's one of the fastest ways to strengthen how MENTA can evaluate this.";
  }
  if (!athlete.hasRecentPerformanceData) {
    return "Log recent performance data to keep your profile current.";
  }
  if (school.contactCount === 0) {
    return "Research this program's coaching staff and add a contact when you find one.";
  }
  if (school.status === "TARGET" || school.status === "INTERESTED") {
    return "When you're ready, prepare an outreach draft for this school.";
  }
  return "Keep this school's status updated as things change.";
}

export function buildRealityCheckForSchool(
  athlete: AthleteFitContext,
  school: SchoolFitContext,
  fit: ProfileFitResult,
  academic: AcademicAlignmentResult
): RealityCheck {
  const whatWeKnow: string[] = [];
  if (athlete.sport && athlete.position) {
    whatWeKnow.push(`You play ${athlete.position} in ${athlete.sport}.`);
  }
  if (athlete.graduationYear) {
    whatWeKnow.push(`You're graduating in ${athlete.graduationYear}.`);
  }
  whatWeKnow.push(`You've marked ${school.name} as a school you're tracking.`);
  if (school.division || school.location) {
    whatWeKnow.push(`You noted this program as ${[school.division, school.location].filter(Boolean).join(", ")}.`);
  }
  if (academic.label !== "More information needed") {
    whatWeKnow.push(`Your academic alignment reads as ${academic.label.toLowerCase()}.`);
  }
  if (school.contactCount > 0) {
    whatWeKnow.push(`You have ${school.contactCount} contact${school.contactCount === 1 ? "" : "s"} saved for this school.`);
  }

  const whatWeDontKnow: string[] = [
    "MENTA doesn't have a connected view of this program's roster, coaching staff, or current recruiting needs.",
    "Whether anyone on staff has seen your profile.",
  ];
  if (fit.label === "More information needed" || academic.label === "More information needed") {
    whatWeDontKnow.push("A fuller picture of your own profile, until the missing details above are filled in.");
  }

  return {
    whatWeKnow,
    whatWeDontKnow,
    nextMove: pickNextMove(athlete, school),
  };
}
