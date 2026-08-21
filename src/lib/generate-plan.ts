import { demandsFor, type WorkoutCategory } from "@/lib/sports";

/**
 * Deterministic starter-workout generator, run once at the end of
 * onboarding. Not AI, not random — a pure function of the athlete's real
 * sport/position (via src/lib/sports.ts's demand config), so the same
 * inputs always produce the same real, inspectable plan. Every exercise
 * name here is a genuine, generic exercise-programming term; nothing about
 * the specific athlete is invented.
 */

export type PlanExercise = { name: string; sets?: string; reps?: string };
export type GeneratedWorkout = {
  title: string;
  category: WorkoutCategory;
  description: string;
  exercises: PlanExercise[];
};

const CATEGORY_TITLES: Record<WorkoutCategory, string> = {
  STRENGTH: "Strength Foundation",
  SPEED: "Speed Development",
  AGILITY: "Agility & Change of Direction",
  CONDITIONING: "Conditioning",
  MOBILITY: "Mobility",
  SKILL: "Skill Work",
  RECOVERY: "Recovery Session",
};

const CATEGORY_DESCRIPTIONS: Record<WorkoutCategory, string> = {
  STRENGTH: "General strength base — adjust loads to your current level and coach's program.",
  SPEED: "Short, high-quality sprint work. Full recovery between reps matters more than volume.",
  AGILITY: "Change-of-direction drills at game speed.",
  CONDITIONING: "Builds the aerobic/anaerobic base your sport demands.",
  MOBILITY: "Keeps the joints and tissue your sport stresses most moving well.",
  SKILL: "Sport-specific technique work.",
  RECOVERY: "Low-intensity work to help the body absorb training.",
};

const CATEGORY_EXERCISES: Record<Exclude<WorkoutCategory, "SKILL">, PlanExercise[]> = {
  STRENGTH: [
    { name: "Back Squat", sets: "4", reps: "5" },
    { name: "Romanian Deadlift", sets: "3", reps: "8" },
    { name: "Bench Press", sets: "4", reps: "6" },
    { name: "Pull-Ups", sets: "3", reps: "max" },
    { name: "Core Circuit", sets: "3 rounds" },
  ],
  SPEED: [
    { name: "Sprint Starts", sets: "6", reps: "20m" },
    { name: "Flying 20s", sets: "4", reps: "20m" },
    { name: "Resisted Sprints", sets: "5", reps: "15m" },
    { name: "A-Skips", sets: "3", reps: "20m" },
  ],
  AGILITY: [
    { name: "5-10-5 Pro Agility Shuttle", sets: "5", reps: "1" },
    { name: "Ladder Drills", sets: "4", reps: "1 pattern" },
    { name: "Cone Weave", sets: "5", reps: "1" },
    { name: "Reactive Cuts", sets: "3", reps: "10" },
  ],
  CONDITIONING: [
    { name: "Interval Runs", sets: "6", reps: "400m" },
    { name: "Tempo Run", sets: "1", reps: "20 min" },
    { name: "Circuit Training", sets: "4 rounds" },
    { name: "Bike Intervals", sets: "8", reps: "1 min" },
  ],
  MOBILITY: [
    { name: "Dynamic Warm-Up", sets: "1", reps: "10 min" },
    { name: "Hip Mobility Flow", sets: "1", reps: "10 min" },
    { name: "Foam Rolling", sets: "1", reps: "10 min" },
    { name: "Shoulder Mobility Circuit", sets: "1", reps: "8 min" },
  ],
  RECOVERY: [
    { name: "Foam Rolling", sets: "1", reps: "15 min" },
    { name: "Stretching Routine", sets: "1", reps: "15 min" },
    { name: "Active Recovery Walk", sets: "1", reps: "20 min" },
  ],
};

const GENERIC_SKILL_EXERCISES: PlanExercise[] = [
  { name: "Sport-Specific Technique Drills" },
  { name: "Film Study Session" },
  { name: "Technique Repetition" },
];

const SPORT_SKILL_EXERCISES: Record<string, PlanExercise[]> = {
  Football: [
    { name: "Route Running" },
    { name: "Tackling Technique (form only)" },
    { name: "Ball Security Drills" },
    { name: "Position-Specific Footwork" },
  ],
  Basketball: [
    { name: "Ball Handling Circuit" },
    { name: "Shooting Form Reps" },
    { name: "Defensive Slide Drills" },
    { name: "Finishing at the Rim" },
  ],
  Baseball: [
    { name: "Batting Tee Work" },
    { name: "Fielding Ground Balls" },
    { name: "Throwing Long Toss" },
    { name: "Bullpen/Pitching Reps" },
  ],
  Softball: [
    { name: "Batting Tee Work" },
    { name: "Fielding Ground Balls" },
    { name: "Throwing Long Toss" },
    { name: "Pitching Reps" },
  ],
  Soccer: [
    { name: "First-Touch Drills" },
    { name: "1v1 Moves" },
    { name: "Finishing Practice" },
    { name: "Passing Circuit" },
  ],
  Volleyball: [
    { name: "Serving Reps" },
    { name: "Passing/Digging Drills" },
    { name: "Approach & Hitting Reps" },
    { name: "Blocking Footwork" },
  ],
  "Track & Field": [
    { name: "Event-Specific Technique Work" },
    { name: "Block Starts" },
    { name: "Approach Run Reps" },
    { name: "Throwing/Jumping Technique" },
  ],
  Swimming: [
    { name: "Stroke Technique Drills" },
    { name: "Turn & Start Practice" },
    { name: "Pace Work" },
    { name: "Kick Sets" },
  ],
  Tennis: [
    { name: "Serve Repetition" },
    { name: "Groundstroke Rally Drills" },
    { name: "Footwork Patterns" },
    { name: "Match Play Points" },
  ],
  Golf: [
    { name: "Short Game Practice" },
    { name: "Full Swing Reps" },
    { name: "Putting Drills" },
    { name: "On-Course Practice Round" },
  ],
  Wrestling: [
    { name: "Live Wrestling (controlled)" },
    { name: "Takedown Repetition" },
    { name: "Escape/Reversal Drills" },
    { name: "Positional Sparring" },
  ],
  Lacrosse: [
    { name: "Stick Skills Circuit" },
    { name: "Shooting Reps" },
    { name: "Ground Ball Drills" },
    { name: "1v1 Dodging" },
  ],
  Hockey: [
    { name: "Stickhandling Circuit" },
    { name: "Shooting Reps" },
    { name: "Edge Work" },
    { name: "Small-Area Games" },
  ],
  Gymnastics: [
    { name: "Skill Progressions" },
    { name: "Routine Run-Throughs" },
    { name: "Landing Drills" },
    { name: "Flexibility & Handstand Work" },
  ],
};

function exercisesFor(category: WorkoutCategory, sport: string): PlanExercise[] {
  if (category === "SKILL") return SPORT_SKILL_EXERCISES[sport] ?? GENERIC_SKILL_EXERCISES;
  return CATEGORY_EXERCISES[category];
}

/** The plan tag stamped on every workout this generator creates — see the Workout.planTag doc comment in schema.prisma. */
export const ONBOARDING_PLAN_TAG = "ONBOARDING_STARTER";

export function buildStarterWorkouts(sport: string, position?: string | null): GeneratedWorkout[] {
  const demands = demandsFor(sport, position);
  const positionSuffix = position ? ` — ${position}` : "";
  return demands.priorityCategories.map((category) => ({
    title: CATEGORY_TITLES[category],
    category,
    description:
      category === "SKILL"
        ? `Sport-specific skill work for ${sport}${positionSuffix}.`
        : CATEGORY_DESCRIPTIONS[category],
    exercises: exercisesFor(category, sport),
  }));
}
