/**
 * Motivational lines shown one at a time while onboarding finishes saving.
 * Pure content selection based on keywords in the athlete's own goal text —
 * never invents anything about the athlete, just picks a relevant subset of
 * a fixed list. Falls back to the general set when goals are empty or don't
 * match a category, so it's never blank.
 */
type Category = "future" | "strength" | "confidence" | "recovery" | "general";

const MESSAGES: Record<Category, string[]> = {
  future: [
    "YOUR FUTURE IS BUILT TODAY.",
    "PLAY THE LONG GAME.",
    "GRADES MATTER. HEALTH MATTERS. THE WORK MATTERS.",
    "YOUR FUTURE PERFORMANCE STARTS TODAY.",
  ],
  strength: [
    "CONSISTENCY CREATES SEPARATION.",
    "THE WORK ADDS UP.",
    "ONE SESSION AT A TIME.",
    "THE NEXT LEVEL STARTS WITH THE NEXT REP.",
  ],
  confidence: [
    "IT'S YOU VS. YOU.",
    "KNOW YOURSELF. DEVELOP YOURSELF.",
    "BUILD YOUR EDGE.",
    "YOUR POTENTIAL NEEDS A PLAN.",
  ],
  recovery: [
    "TRAIN THE BODY. DEVELOP THE MIND.",
    "THE PROCESS IS THE ADVANTAGE.",
    "BUILD THE ATHLETE. BUILD THE PERSON.",
  ],
  general: [
    "BUILD THE ATHLETE.",
    "BUILD THE PERSON.",
    "YOUR GOALS NEED ACTION.",
    "YOUR DATA TELLS A STORY. YOUR WORK WRITES IT.",
    "MENTA SEES THE WHOLE ATHLETE.",
  ],
};

const KEYWORDS: Record<Exclude<Category, "general">, string[]> = {
  future: ["college", "d1", "d2", "d3", "juco", "recruit", "scholarship", "school", "academic", "gpa"],
  strength: ["strong", "strength", "power", "speed", "fast", "explosive", "muscle", "weight"],
  confidence: ["confidence", "confident", "mental", "focus", "pressure", "belief", "nerves", "leader"],
  recovery: ["recover", "injury", "rest", "sleep", "healthy", "patience", "consistent", "consistency"],
};

function categorize(goal: string): Category {
  const lower = goal.toLowerCase();
  for (const [category, words] of Object.entries(KEYWORDS) as [Exclude<Category, "general">, string[]][]) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  return "general";
}

/** Returns a short, de-duplicated sequence of lines relevant to the athlete's real goals. */
export function pickMotivationalMessages(goals: string[]): string[] {
  const categories = new Set<Category>(goals.map(categorize));
  if (categories.size === 0) categories.add("general");

  const picked: string[] = [];
  for (const category of categories) {
    picked.push(...MESSAGES[category].slice(0, 2));
  }
  // Always round out with a couple of general lines so the sequence feels
  // complete even when only one category matched.
  for (const line of MESSAGES.general) {
    if (picked.length >= 6) break;
    if (!picked.includes(line)) picked.push(line);
  }
  return Array.from(new Set(picked)).slice(0, 6);
}
