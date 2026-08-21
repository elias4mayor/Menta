import { WORKOUT_CATEGORIES, type WorkoutCategory } from "@/lib/sports";
import { CATEGORY_TITLES } from "@/lib/generate-plan";

/**
 * The MENTA Workout Generator — deterministic, not AI. Same inputs always
 * produce the same real workout, built from a fixed library of genuine
 * exercise-programming and position-drill content below. Nothing here
 * claims to be computed from an athlete's actual performance data; it's
 * generic, sound programming filtered by the inputs the athlete gives it.
 */

export type Goal = WorkoutCategory;
export const GOALS: Goal[] = WORKOUT_CATEGORIES;
export function goalLabel(goal: Goal): string {
  return CATEGORY_TITLES[goal];
}

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type Experience = (typeof EXPERIENCE_LEVELS)[number];

export const INTENSITY_LEVELS = ["Low", "Moderate", "High"] as const;
export type Intensity = (typeof INTENSITY_LEVELS)[number];

export const DURATION_OPTIONS = [20, 30, 45, 60] as const;

export const EQUIPMENT_OPTIONS = [
  "Cones",
  "Agility Ladder",
  "Resistance Band",
  "Dumbbells",
  "Barbell",
  "Reaction Ball",
  "Sled",
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export type GeneratorInput = {
  sport: string;
  position?: string | null;
  goal: Goal;
  experience: Experience;
  equipment: Equipment[];
  durationMinutes: number;
  intensity: Intensity;
  trainingDaysPerWeek?: number | null;
};

export type Drill = {
  name: string;
  volume: string;
  instructions: string;
  cue: string;
  equipment: Equipment[];
};

export type GeneratedWorkout = {
  name: string;
  objective: string;
  warmup: Drill[];
  drills: Drill[];
  cooldown: Drill[];
  estimatedDurationMinutes: number;
  intensity: Intensity;
  equipment: Equipment[];
  category: WorkoutCategory;
};

/* ---------------- Warm-up / cooldown pools (category-agnostic) ---------------- */

const WARM_UP_POOL: Drill[] = [
  {
    name: "Dynamic Leg Swings",
    volume: "10 ea. dir/leg",
    instructions: "Hold something stable, swing one leg forward-back then side-to-side, controlled range.",
    cue: "Tall posture — let the hip move, not the low back.",
    equipment: [],
  },
  {
    name: "High Knees",
    volume: "2 x 20 yd",
    instructions: "Quick, light-footed knee drive down the field.",
    cue: "Land under your hips, not out in front.",
    equipment: [],
  },
  {
    name: "Walking Lunge with Twist",
    volume: "2 x 10 yd",
    instructions: "Step into a lunge, rotate torso toward the front leg, repeat alternating sides.",
    cue: "Front knee tracks over the toe.",
    equipment: [],
  },
  {
    name: "Arm Circles & Band Pull-Aparts",
    volume: "2 x 15",
    instructions: "Loosen shoulders with circles, then band pull-aparts for upper-back activation.",
    cue: "Squeeze shoulder blades together, don't just move your hands.",
    equipment: ["Resistance Band"],
  },
];

const COOLDOWN_POOL: Drill[] = [
  {
    name: "Easy Walk",
    volume: "3–5 min",
    instructions: "Walk at a relaxed pace to bring the heart rate down gradually.",
    cue: "Breathe slow and deep — in through the nose.",
    equipment: [],
  },
  {
    name: "Static Stretch Circuit",
    volume: "30 sec ea. group",
    instructions: "Hamstrings, quads, hips, calves, shoulders — hold each without bouncing.",
    cue: "Stretch to mild tension, never pain.",
    equipment: [],
  },
];

/* ---------------- FOOTWORK (also the AGILITY-goal pool) ---------------- */

const FOOTWORK_DRILLS: Drill[] = [
  {
    name: "Ladder In-In-Out-Out",
    volume: "4 x through",
    instructions: "Two feet in each box, then out, moving down the ladder without touching the rungs.",
    cue: "Quiet feet, quick ground contact — don't stomp.",
    equipment: ["Agility Ladder"],
  },
  {
    name: "Lateral Shuffle Ladder",
    volume: "4 x through",
    instructions: "Shuffle sideways through the ladder, one foot in each box.",
    cue: "Stay low, hips under shoulders the whole time.",
    equipment: ["Agility Ladder"],
  },
  {
    name: "5-10-5 Pro Agility Shuttle",
    volume: "5 reps",
    instructions: "Sprint 5 yd, touch the line, sprint 10 yd the other way, touch, finish 5 yd back through the start.",
    cue: "Plant hard and turn the hips first — the feet follow.",
    equipment: ["Cones"],
  },
  {
    name: "Cone Weave (Change of Direction)",
    volume: "5 x through",
    instructions: "Weave through 5 cones set 3 yd apart at game speed.",
    cue: "Short, choppy steps right at the cut — don't round it off.",
    equipment: ["Cones"],
  },
  {
    name: "Acceleration / Deceleration Sprints",
    volume: "6 x 15 yd",
    instructions: "Sprint 15 yd, then decelerate under control over the next 5 yd instead of running through.",
    cue: "Sink the hips and chop your steps down to a stop — don't just coast.",
    equipment: [],
  },
  {
    name: "Reaction Ball Footwork",
    volume: "3 x 30 sec",
    instructions: "Drop or toss a reaction ball and react to its bounce with quick feet before it gets away.",
    cue: "Stay on the balls of your feet, knees bent, ready position.",
    equipment: ["Reaction Ball"],
  },
  {
    name: "Single-Leg Balance & Hop",
    volume: "3 x 30 sec per leg",
    instructions: "Hold a single-leg balance, then add small controlled hops in place.",
    cue: "Soft knee, quiet landing, hips level.",
    equipment: [],
  },
];

/* ---------------- Position-specific skill pools (Football) ---------------- */

const QUARTERBACK_DRILLS: Drill[] = [
  {
    name: "3-Step Drop",
    volume: "6 reps",
    instructions: "Take three quick drop steps from center, hitch, and simulate a throw on rhythm.",
    cue: "Eyes downfield the whole drop — don't look at your feet.",
    equipment: [],
  },
  {
    name: "5-Step Drop",
    volume: "6 reps",
    instructions: "Five-step drop with a clean hitch step before the throwing motion.",
    cue: "Stay on rhythm — the hitch is one beat, not a pause.",
    equipment: [],
  },
  {
    name: "7-Step Drop",
    volume: "5 reps",
    instructions: "Deeper drop for a longer-developing route, controlled tempo throughout.",
    cue: "Push off the back foot on every step — don't drift backward passively.",
    equipment: [],
  },
  {
    name: "Climb the Pocket",
    volume: "6 reps",
    instructions: "From the drop, take two short shuffle steps forward as if a pocket is collapsing around you.",
    cue: "Small, balanced steps — stay square to the line as you climb.",
    equipment: ["Cones"],
  },
  {
    name: "Rollout Footwork",
    volume: "6 reps/direction",
    instructions: "Roll out from center toward a sideline cone while staying square enough to throw.",
    cue: "Keep your shoulders turned toward the target, not just running sideways.",
    equipment: ["Cones"],
  },
  {
    name: "Sprint-Out Throw on the Move",
    volume: "6 reps/direction",
    instructions: "Full sprint-out followed by a simulated throw without decelerating fully first.",
    cue: "Plant the front foot toward the target the instant before you throw.",
    equipment: [],
  },
  {
    name: "Play-Action Footwork",
    volume: "6 reps",
    instructions: "Fake a handoff with proper mesh-point footwork, then reset into your drop.",
    cue: "Sell the fake with your eyes and shoulders, not just your hands.",
    equipment: [],
  },
  {
    name: "Reset Step Drill",
    volume: "5 reps",
    instructions: "From a drop, simulate a covered first read and reset your base before the next progression.",
    cue: "Feet reset under your hips before your eyes move to the next read.",
    equipment: [],
  },
  {
    name: "Progression Read Movement",
    volume: "5 reps",
    instructions: "Move through a simulated 3-read progression, adjusting your base with each eye shift.",
    cue: "Feet match your eyes — every read gets its own small step adjustment.",
    equipment: [],
  },
];

const RECEIVER_DRILLS: Drill[] = [
  {
    name: "Release vs. Jam",
    volume: "6 reps each side",
    instructions: "Explode off the line and work a release move past a simulated jam at the line.",
    cue: "Win with your hands and first two steps, not your whole body.",
    equipment: [],
  },
  {
    name: "Stem & Break Footwork",
    volume: "6 reps",
    instructions: "Run a route stem at full speed, then plant and break sharply at the top.",
    cue: "Lower your hips into the break — don't round the corner.",
    equipment: ["Cones"],
  },
  {
    name: "Sharp Cut Series (Out / In / Comeback)",
    volume: "3 reps each cut",
    instructions: "Run each cut at a marked cone, breaking on a clean plant step.",
    cue: "Plant on the outside foot for an in-cut, inside foot for an out-cut.",
    equipment: ["Cones"],
  },
  {
    name: "Acceleration Out of the Break",
    volume: "6 reps",
    instructions: "Immediately accelerate to full speed for 10 yd right after the cut.",
    cue: "First two steps after the break should be your quickest of the route.",
    equipment: [],
  },
  {
    name: "Deceleration Into the Catch Point",
    volume: "6 reps",
    instructions: "Run a comeback or curl route, decelerating under control to be balanced at the catch.",
    cue: "Chop your steps down before the ball arrives — don't drift through it.",
    equipment: [],
  },
  {
    name: "Concentration Catch Drill",
    volume: "3 x 10 reps",
    instructions: "Catch tennis balls or thrown balls from varying angles, tracking the ball fully into the hands.",
    cue: "Eyes track the ball all the way in — hands finish the catch, not the body.",
    equipment: [],
  },
];

const RUNNING_BACK_DRILLS: Drill[] = [
  {
    name: "Cutback Drill",
    volume: "6 reps/direction",
    instructions: "Run downhill, then plant and cut back against the grain on a cone signal.",
    cue: "Plant the outside foot hard and get your shoulders turned before your hips.",
    equipment: ["Cones"],
  },
  {
    name: "Lateral Cut Series",
    volume: "6 reps",
    instructions: "Run through a series of cones making sharp lateral cuts without losing speed.",
    cue: "Stay low through every cut — a tall cut is a slow cut.",
    equipment: ["Cones"],
  },
  {
    name: "Vision & Read Mirror Drill",
    volume: "5 reps",
    instructions: "A partner or coach points a direction as you approach the line; react and cut that way.",
    cue: "Keep your eyes up on the defender/hole, not down at the ball.",
    equipment: [],
  },
  {
    name: "Acceleration Through the Hole",
    volume: "6 x 15 yd",
    instructions: "Explode through a marked gap and accelerate to full speed for 15 yd.",
    cue: "First step is forward and down, not sideways.",
    equipment: ["Cones"],
  },
  {
    name: "Ball Security Gauntlet",
    volume: "4 reps",
    instructions: "Run through a line of players/pads attempting to punch the ball out while carrying it correctly.",
    cue: "High and tight — five points of pressure on the ball.",
    equipment: [],
  },
  {
    name: "Change-of-Direction Cone Series",
    volume: "5 reps",
    instructions: "Navigate a zig-zag cone pattern at game speed simulating open-field running.",
    cue: "Small choppy steps right before every cut, then explode out of it.",
    equipment: ["Cones"],
  },
];

const DEFENSIVE_DRILLS: Drill[] = [
  {
    name: "Backpedal Technique",
    volume: "4 x 10 yd",
    instructions: "Backpedal with a low, athletic base, staying balanced without crossing your feet.",
    cue: "Push the ground away behind you — don't just sit and reach with your feet.",
    equipment: [],
  },
  {
    name: "Backpedal-to-Break Transition",
    volume: "6 reps",
    instructions: "Backpedal, then plant and drive forward or laterally on a cone or coach signal.",
    cue: "Snap the hips open toward the new direction on the plant step.",
    equipment: ["Cones"],
  },
  {
    name: "Hip Turn & Run",
    volume: "6 reps each side",
    instructions: "From a backpedal, open the hips and transition into a sprint downfield.",
    cue: "Turn the hip, not just the head — the feet follow the hips.",
    equipment: [],
  },
  {
    name: "Read-and-React Drill",
    volume: "6 reps",
    instructions: "React to a coach's hand signal or ball movement with the correct pursuit angle or drop.",
    cue: "Eyes on the trigger, feet stay light and ready until you read it.",
    equipment: [],
  },
  {
    name: "Pursuit Angle Sprints",
    volume: "5 reps",
    instructions: "Sprint on an angle to intercept a moving target rather than chasing it straight on.",
    cue: "Take the angle that beats the ball carrier to the spot, not to where they are now.",
    equipment: ["Cones"],
  },
  {
    name: "Lateral Shuffle Mirror Drill",
    volume: "4 x 20 sec",
    instructions: "Mirror a partner's lateral movement while staying square in an athletic stance.",
    cue: "Stay low and don't cross your feet — slide, don't step over.",
    equipment: [],
  },
  {
    name: "Close-and-Tackle (Form Only)",
    volume: "4 reps",
    instructions: "Close space under control and break down into proper tackling form without contact.",
    cue: "Chop your feet and sink your hips as you close the last few yards.",
    equipment: [],
  },
];

const GENERAL_ATHLETIC_DRILLS: Drill[] = [
  {
    name: "Multi-Directional Coordination Ladder",
    volume: "4 x through",
    instructions: "Run a mixed forward/lateral ladder pattern to build general foot coordination.",
    cue: "Quality over speed at first — smooth footwork, then add speed.",
    equipment: ["Agility Ladder"],
  },
  {
    name: "Balance & Stability Circuit",
    volume: "3 rounds",
    instructions: "Single-leg holds, tandem stance, and eyes-closed balance work, 30 sec each.",
    cue: "Find a fixed point to focus on to help hold your balance.",
    equipment: [],
  },
  {
    name: "Reaction Sprint",
    volume: "6 reps",
    instructions: "Sprint 10 yd on a visual or audio cue rather than a set count, to train reaction speed.",
    cue: "Stay relaxed at the start — tension slows your first-step reaction.",
    equipment: [],
  },
  {
    name: "Acceleration Build-Ups",
    volume: "4 x 30 yd",
    instructions: "Gradually build from a jog to full sprint over 30 yd.",
    cue: "Smooth acceleration — don't rush to top speed too early.",
    equipment: [],
  },
  {
    name: "Aerobic Base Conditioning",
    volume: "15–20 min",
    instructions: "Continuous easy-pace running, biking, or rowing to build an aerobic foundation.",
    cue: "You should be able to hold a conversation at this pace.",
    equipment: [],
  },
  {
    name: "Active Recovery Flow",
    volume: "10 min",
    instructions: "Light mobility movement — walking, gentle dynamic stretches, breathing work.",
    cue: "This should feel easy the entire time — it's recovery, not training.",
    equipment: [],
  },
];

/* ---------------- Generic non-SKILL category pools (all sports) ---------------- */

const STRENGTH_DRILLS: Drill[] = [
  { name: "Back Squat", volume: "4 x 5", instructions: "Squat to at least parallel with a controlled tempo.", cue: "Chest up, knees track over your toes.", equipment: ["Barbell"] },
  { name: "Romanian Deadlift", volume: "3 x 8", instructions: "Hinge at the hips with a slight knee bend, bar close to the legs.", cue: "Push your hips back first — this is a hinge, not a squat.", equipment: ["Barbell"] },
  { name: "Goblet Squat", volume: "3 x 10", instructions: "Hold a dumbbell at chest height, squat with an upright torso.", cue: "Elbows brush the inside of your knees at the bottom.", equipment: ["Dumbbells"] },
  { name: "Dumbbell Bench Press", volume: "3 x 8", instructions: "Press dumbbells from chest level to full extension, controlled descent.", cue: "Keep your shoulder blades pinched together throughout.", equipment: ["Dumbbells"] },
  { name: "Push-Ups", volume: "3 x max", instructions: "Full range of motion, chest to just above the ground.", cue: "Keep a straight line from shoulders to ankles.", equipment: [] },
  { name: "Core Circuit (Plank / Side Plank / Dead Bug)", volume: "3 x 30 sec ea.", instructions: "Cycle through the three positions with good bracing.", cue: "Breathe — don't hold your breath through the brace.", equipment: [] },
];

const SPEED_DRILLS: Drill[] = [
  { name: "Sprint Starts", volume: "6 x 20 yd", instructions: "Explosive starts from a two-point stance, full recovery between reps.", cue: "First three steps stay low and drive forward, don't pop up early.", equipment: [] },
  { name: "Flying 20s", volume: "4 x 20 yd", instructions: "Build up speed over 15 yd, then sprint all-out through a 20 yd zone.", cue: "Relax your face and hands — tension slows top speed.", equipment: [] },
  { name: "A-Skips", volume: "3 x 20 yd", instructions: "Skip with high knee drive and active foot strike, drilling sprint mechanics.", cue: "Punch the ground down and back with each step.", equipment: [] },
  { name: "Resisted Sprints", volume: "5 x 15 yd", instructions: "Sprint against light resistance (band or sled) to build drive phase power.", cue: "Stay low and drive — don't let the resistance pull your hips up early.", equipment: ["Resistance Band", "Sled"] },
];

const CONDITIONING_DRILLS: Drill[] = [
  { name: "Interval Runs", volume: "6 x 400m", instructions: "Run each interval hard with equal rest between, matched to your sport's work-to-rest ratio.", cue: "Even pacing — don't blow up on the first rep.", equipment: [] },
  { name: "Shuttle Conditioning", volume: "8 x 40 yd shuttle", instructions: "Sprint down and back with a brief rest, mimicking repeated-sprint sport demands.", cue: "Sprint through the line every time, not just to it.", equipment: ["Cones"] },
  { name: "Tempo Run", volume: "20 min continuous", instructions: "Sustained moderate-pace run to build aerobic capacity.", cue: "Comfortably hard — you can speak in short sentences.", equipment: [] },
  { name: "Bike Intervals", volume: "8 x 1min on/off", instructions: "Alternate hard and easy effort on a stationary bike or outdoors.", cue: "Push the hard minutes — the easy minute is real recovery.", equipment: [] },
];

const MOBILITY_DRILLS: Drill[] = [
  { name: "Hip Mobility Flow", volume: "10 min", instructions: "Move through 90/90 switches, hip circles, and world's greatest stretch.", cue: "Move slow and controlled — mobility isn't a race.", equipment: [] },
  { name: "Shoulder Mobility Circuit", volume: "8 min", instructions: "Band pull-aparts, wall slides, and shoulder CARs (controlled articular rotations).", cue: "Full range, no shrugging — keep the shoulder blades down.", equipment: ["Resistance Band"] },
  { name: "Foam Rolling", volume: "10 min", instructions: "Roll major muscle groups — quads, hamstrings, calves, upper back.", cue: "Slow rolls, pause on tender spots for a few breaths.", equipment: [] },
  { name: "Ankle & Thoracic Spine Mobility", volume: "8 min", instructions: "Ankle rocks against a wall and open-book thoracic rotations.", cue: "Keep your heel down through the ankle rocks.", equipment: [] },
];

const RECOVERY_DRILLS: Drill[] = [
  { name: "Active Recovery Walk", volume: "20 min", instructions: "Easy-pace walk to promote blood flow without adding fatigue.", cue: "Nose-breathing pace — this should feel effortless.", equipment: [] },
  { name: "Full-Body Stretching Routine", volume: "15 min", instructions: "Static stretches for all major muscle groups, held without bouncing.", cue: "Stretch to mild tension and hold — don't force it.", equipment: [] },
  { name: "Foam Rolling", volume: "15 min", instructions: "Slow, thorough rolling of the muscles worked hardest this week.", cue: "Breathe through tender spots instead of tensing against them.", equipment: [] },
];

const GENERIC_SKILL_POOL: Drill[] = [
  { name: "Sport-Specific Technique Repetition", volume: "10 min", instructions: "Repeat your sport's core technical movement at moderate speed, focusing on form.", cue: "Quality reps — stop before technique breaks down from fatigue.", equipment: [] },
  { name: "Film Study Session", volume: "15 min", instructions: "Watch recent film of your own play or a model athlete at your position.", cue: "Watch with a specific question in mind, not passively.", equipment: [] },
  { name: "Small-Sided Skill Game", volume: "15 min", instructions: "Play a small-sided, game-like version of your sport emphasizing the skill you're working on.", cue: "Let the constraint (space, numbers) force the skill you're training.", equipment: [] },
];

function skillPoolFor(sport: string, position?: string | null): Drill[] {
  if (sport === "Football") {
    if (position === "Quarterback") return QUARTERBACK_DRILLS;
    if (position === "Wide Receiver" || position === "Tight End") return RECEIVER_DRILLS;
    if (position === "Running Back") return RUNNING_BACK_DRILLS;
    if (["Defensive Line", "Linebacker", "Cornerback", "Safety"].includes(position ?? "")) return DEFENSIVE_DRILLS;
    // Offensive line, specialists, or no position selected — footwork + general athletic base.
    return [...FOOTWORK_DRILLS.slice(0, 3), ...GENERAL_ATHLETIC_DRILLS.slice(0, 3)];
  }
  return GENERIC_SKILL_POOL;
}

const NON_SKILL_POOLS: Record<Exclude<WorkoutCategory, "SKILL">, Drill[]> = {
  STRENGTH: STRENGTH_DRILLS,
  SPEED: SPEED_DRILLS,
  AGILITY: FOOTWORK_DRILLS,
  CONDITIONING: CONDITIONING_DRILLS,
  MOBILITY: MOBILITY_DRILLS,
  RECOVERY: RECOVERY_DRILLS,
};

function poolFor(goal: Goal, sport: string, position?: string | null): Drill[] {
  if (goal === "SKILL") return skillPoolFor(sport, position);
  return NON_SKILL_POOLS[goal];
}

/** How many main drills to include, by session length. */
function drillCountFor(durationMinutes: number): number {
  if (durationMinutes <= 20) return 3;
  if (durationMinutes <= 30) return 4;
  if (durationMinutes <= 45) return 5;
  return 6;
}

function filterByEquipment(pool: Drill[], selected: Equipment[]): Drill[] {
  if (selected.length === 0) return pool.filter((d) => d.equipment.length === 0);
  const withEquipment = pool.filter((d) => d.equipment.every((e) => selected.includes(e)));
  return withEquipment.length > 0 ? withEquipment : pool.filter((d) => d.equipment.length === 0);
}

function scaleVolume(volume: string, experience: Experience): string {
  const match = volume.match(/^(\d+)( x .+)$/);
  if (!match) return volume;
  const base = Number(match[1]);
  if (experience === "Beginner") return `${Math.max(2, base - 1)}${match[2]}`;
  if (experience === "Advanced") return `${base + 1}${match[2]}`;
  return volume;
}

const OBJECTIVES: Record<Goal, string> = {
  STRENGTH: "Build a strength base to support power and durability for your sport.",
  SPEED: "Develop straight-line speed and acceleration mechanics.",
  AGILITY: "Sharpen change-of-direction speed and footwork under control.",
  CONDITIONING: "Build the aerobic/anaerobic base your sport's demands require.",
  MOBILITY: "Improve range of motion in the joints your sport stresses most.",
  SKILL: "Sharpen the technical skills specific to your sport and position.",
  RECOVERY: "Aid recovery and help the body absorb recent training load.",
};

export function generateWorkout(input: GeneratorInput): GeneratedWorkout {
  const { sport, position, goal, experience, equipment, durationMinutes, intensity } = input;

  const pool = filterByEquipment(poolFor(goal, sport, position), equipment);
  const count = Math.min(drillCountFor(durationMinutes), pool.length);
  const drills = pool.slice(0, count).map((d) => ({ ...d, volume: scaleVolume(d.volume, experience) }));

  const warmup = WARM_UP_POOL.slice(0, durationMinutes >= 45 ? 4 : durationMinutes >= 30 ? 3 : 2);
  const cooldown = COOLDOWN_POOL.slice(0, durationMinutes >= 45 ? 2 : 1);

  const usedEquipment = Array.from(new Set(drills.flatMap((d) => d.equipment)));
  const positionSuffix = goal === "SKILL" && position ? ` — ${position}` : "";

  return {
    name: `${goalLabel(goal)}${positionSuffix} (${sport})`,
    objective: OBJECTIVES[goal],
    warmup,
    drills,
    cooldown,
    estimatedDurationMinutes: durationMinutes,
    intensity,
    equipment: usedEquipment,
    category: goal,
  };
}
