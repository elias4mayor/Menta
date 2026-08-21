/**
 * Sport configuration registry — the single place sport-specific vocabulary
 * AND athletic-demands data lives, so both the UI and the workout-plan
 * generator read from data instead of hardcoding a sport's terminology or
 * training priorities. Adding a new sport (or refining an existing one)
 * means editing this file, not touching the onboarding flow, the dashboard,
 * or the plan generator.
 *
 * Real content, not filler: every `demands`/`developmentAreas`/
 * `trainingNote` string here is genuine, generic sports-training knowledge
 * (the kind found in any real strength-and-conditioning reference), not
 * something invented about a specific athlete. `priorityCategories` maps
 * directly onto the seven real workout categories already validated by
 * createWorkoutSchema (src/lib/validation.ts) — this file doesn't invent a
 * second category system.
 */

export type WorkoutCategory =
  | "STRENGTH"
  | "SPEED"
  | "AGILITY"
  | "CONDITIONING"
  | "MOBILITY"
  | "SKILL"
  | "RECOVERY";

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  "STRENGTH",
  "SPEED",
  "AGILITY",
  "CONDITIONING",
  "MOBILITY",
  "SKILL",
  "RECOVERY",
];

export type AthleticDemands = {
  /** What the sport/position actually asks of the body — shown as-is, never embellished. */
  demands: string[];
  /** Broad training priorities, in priority order. */
  developmentAreas: string[];
  /** Which of the seven real workout categories the plan generator should build from, in priority order. */
  priorityCategories: WorkoutCategory[];
  /** One short, generic, genuinely useful line of training guidance. */
  trainingNote: string;
};

export type SportConfig = {
  id: string;
  name: string;
  /** What the second identity field is called for this sport. */
  roleLabel: "Position" | "Event" | "Weight class" | "Role";
  /** Options for that field. Empty means free text (e.g. "Other"). */
  roles: string[];
  /** What a head-to-head/competitive outing is called. */
  competitionLabel: "Game" | "Match" | "Meet" | "Round" | "Race" | "Competition";
  /** Sport-level athletic demands — the fallback for any role without its own entry below. */
  demands: AthleticDemands;
  /** Optional per-role override, for sports/positions with meaningfully different demands. */
  roleDemands?: Record<string, AthleticDemands>;
  /** Real, standard metrics athletes in this sport commonly track — suggestions for the Performance page, informational only. */
  metrics: string[];
};

const FOOTBALL_ROLE_DEMANDS: Record<string, AthleticDemands> = {
  Quarterback: {
    demands: ["Pocket mobility", "Arm strength & accuracy", "Quick decision-making"],
    developmentAreas: ["Footwork & mechanics", "Core & rotational strength", "Reaction speed"],
    priorityCategories: ["SKILL", "AGILITY", "STRENGTH"],
    trainingNote: "Most throwing power comes from the hips, not the arm — footwork and rotational strength matter more than raw arm work.",
  },
  "Running Back": {
    demands: ["Explosive acceleration", "Contact balance", "Change of direction"],
    developmentAreas: ["Lower-body power", "Ball security", "Short-area quickness"],
    priorityCategories: ["STRENGTH", "SPEED", "AGILITY"],
    trainingNote: "Build strength through the hips and core so you can absorb contact without losing speed.",
  },
  "Wide Receiver": {
    demands: ["Top-end speed", "Route precision", "Hands"],
    developmentAreas: ["Acceleration & speed", "Change of direction", "Route conditioning"],
    priorityCategories: ["SPEED", "AGILITY", "SKILL"],
    trainingNote: "Speed work and route-specific agility drills matter more here than raw strength.",
  },
  "Tight End": {
    demands: ["Blocking strength", "Route versatility", "Contact balance"],
    developmentAreas: ["Upper & lower body strength", "Agility in tight spaces", "Conditioning"],
    priorityCategories: ["STRENGTH", "AGILITY", "CONDITIONING"],
    trainingNote: "A hybrid position — split training time between blocking strength and receiver-style agility.",
  },
  "Offensive Line": {
    demands: ["Base strength", "Leverage & technique", "Short-area power"],
    developmentAreas: ["Total-body strength", "Technique", "Anaerobic conditioning"],
    priorityCategories: ["STRENGTH", "SKILL", "CONDITIONING"],
    trainingNote: "Strength and technique work matter more than long-distance conditioning for this position.",
  },
  "Defensive Line": {
    demands: ["Explosive first step", "Hand technique", "Power"],
    developmentAreas: ["Explosive strength", "Hand/technique work", "Conditioning"],
    priorityCategories: ["STRENGTH", "SPEED", "CONDITIONING"],
    trainingNote: "First-step explosiveness separates good defensive linemen — prioritize short sprints and power work.",
  },
  Linebacker: {
    demands: ["Instinct & read speed", "Tackling technique", "Range"],
    developmentAreas: ["Change of direction", "Tackling technique", "Conditioning"],
    priorityCategories: ["AGILITY", "SKILL", "CONDITIONING"],
    trainingNote: "Train change of direction in multiple planes — linebackers rarely move in a straight line.",
  },
  Cornerback: {
    demands: ["Backpedal speed", "Hip fluidity", "Recovery speed"],
    developmentAreas: ["Change of direction", "Top-end speed", "Ball skills"],
    priorityCategories: ["AGILITY", "SPEED", "SKILL"],
    trainingNote: "Hip mobility and backpedal mechanics are often the difference-maker at this position.",
  },
  Safety: {
    demands: ["Range & closing speed", "Tackling in space", "Coverage awareness"],
    developmentAreas: ["Speed", "Tackling technique", "Conditioning"],
    priorityCategories: ["SPEED", "AGILITY", "CONDITIONING"],
    trainingNote: "Balance deep-speed development with tackling technique in open space.",
  },
  Kicker: {
    demands: ["Leg strength & technique", "Consistency under pressure", "Core stability"],
    developmentAreas: ["Technique repetition", "Hip & core mobility", "Mental routine"],
    priorityCategories: ["SKILL", "MOBILITY", "STRENGTH"],
    trainingNote: "Technique repetition matters more than volume — quality reps with a consistent pre-kick routine.",
  },
  Punter: {
    demands: ["Leg strength & technique", "Hang-time consistency", "Directional accuracy"],
    developmentAreas: ["Technique repetition", "Hip mobility", "Core stability"],
    priorityCategories: ["SKILL", "MOBILITY", "STRENGTH"],
    trainingNote: "Same demands as kicking — repetition and mobility matter more than max strength.",
  },
  "Long Snapper": {
    demands: ["Snap accuracy & speed", "Consistency under pressure", "Core & shoulder strength"],
    developmentAreas: ["Technique repetition", "Core stability", "Mental routine"],
    priorityCategories: ["SKILL", "STRENGTH", "MOBILITY"],
    trainingNote: "A precision position — repetition-based technique work matters more than general conditioning.",
  },
};

export const SPORTS: SportConfig[] = [
  {
    id: "Football",
    name: "Football",
    roleLabel: "Position",
    roles: [
      "Quarterback", "Running Back", "Wide Receiver", "Tight End", "Offensive Line",
      "Defensive Line", "Linebacker", "Cornerback", "Safety", "Kicker", "Punter", "Long Snapper",
    ],
    competitionLabel: "Game",
    demands: {
      demands: ["Explosive power", "Contact tolerance", "Short-burst speed"],
      developmentAreas: ["Strength", "Speed", "Conditioning"],
      priorityCategories: ["STRENGTH", "SPEED", "CONDITIONING"],
      trainingNote: "Every position benefits from a strength and short-speed base — position-specific work builds on top of it.",
    },
    roleDemands: FOOTBALL_ROLE_DEMANDS,
    metrics: ["40-yard dash", "Vertical jump", "Bench press (225 lb reps)"],
  },
  {
    id: "Basketball",
    name: "Basketball",
    roleLabel: "Position",
    roles: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    competitionLabel: "Game",
    demands: {
      demands: ["Vertical explosiveness", "Lateral quickness", "Repeated-sprint conditioning"],
      developmentAreas: ["Explosive power", "Lateral agility", "Anaerobic conditioning"],
      priorityCategories: ["STRENGTH", "AGILITY", "CONDITIONING"],
      trainingNote: "Basketball demands repeated bursts of speed and jumping — train explosive power alongside conditioning.",
    },
    metrics: ["Vertical jump", "Lane agility time", "Free throw %"],
  },
  {
    id: "Baseball",
    name: "Baseball",
    roleLabel: "Position",
    roles: [
      "Pitcher", "Catcher", "First Base", "Second Base", "Shortstop",
      "Third Base", "Outfield", "Designated Hitter",
    ],
    competitionLabel: "Game",
    demands: {
      demands: ["Rotational power", "Arm/throwing mechanics", "Short-burst speed"],
      developmentAreas: ["Rotational strength", "Throwing mechanics", "Speed & agility"],
      priorityCategories: ["STRENGTH", "SKILL", "AGILITY"],
      trainingNote: "Rotational power training (hips and core) transfers directly into hitting and throwing velocity.",
    },
    metrics: ["60-yard dash", "Exit velocity", "Throwing velocity"],
  },
  {
    id: "Soccer",
    name: "Soccer",
    roleLabel: "Position",
    roles: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
    competitionLabel: "Match",
    demands: {
      demands: ["Aerobic endurance", "Change of direction", "Repeated sprinting"],
      developmentAreas: ["Aerobic base", "Speed & agility", "Technical touch"],
      priorityCategories: ["CONDITIONING", "SPEED", "AGILITY"],
      trainingNote: "Soccer is built on a large aerobic base with repeated high-intensity sprints layered on top of it.",
    },
    metrics: ["Yo-Yo test level", "30m sprint", "Repeated sprint ability"],
  },
  {
    id: "Track & Field",
    name: "Track & Field",
    roleLabel: "Event",
    roles: [
      "100m", "200m", "400m", "800m", "1500m", "5000m", "Hurdles",
      "Long Jump", "Triple Jump", "High Jump", "Pole Vault", "Shot Put", "Discus", "Javelin", "Relay",
    ],
    competitionLabel: "Meet",
    demands: {
      demands: ["Event-specific power or endurance", "Technique", "Recovery management"],
      developmentAreas: ["Event-specific conditioning", "Technique", "Recovery"],
      priorityCategories: ["SPEED", "CONDITIONING", "RECOVERY"],
      trainingNote: "Training should match your specific event — sprints, distance, jumps, and throws have very different demands.",
    },
    metrics: ["Personal best", "Split times", "Weekly mileage"],
  },
  {
    id: "Volleyball",
    name: "Volleyball",
    roleLabel: "Position",
    roles: ["Setter", "Outside Hitter", "Opposite", "Middle Blocker", "Libero", "Defensive Specialist"],
    competitionLabel: "Match",
    demands: {
      demands: ["Vertical jump", "Shoulder strength", "Lateral quickness"],
      developmentAreas: ["Explosive power", "Shoulder health", "Lateral agility"],
      priorityCategories: ["STRENGTH", "AGILITY", "MOBILITY"],
      trainingNote: "Balance jump training with shoulder mobility and strength work to stay durable through a long season.",
    },
    metrics: ["Vertical jump", "Approach touch height", "Block touch"],
  },
  {
    id: "Swimming",
    name: "Swimming",
    roleLabel: "Event",
    roles: [
      "50 Freestyle", "100 Freestyle", "200 Freestyle", "500/1650 Freestyle",
      "100 Backstroke", "100 Breaststroke", "100 Butterfly", "200 IM", "Relay",
    ],
    competitionLabel: "Meet",
    demands: {
      demands: ["Aerobic & anaerobic capacity", "Shoulder mobility", "Stroke technique"],
      developmentAreas: ["Aerobic conditioning", "Shoulder & hip mobility", "Core strength"],
      priorityCategories: ["CONDITIONING", "MOBILITY", "STRENGTH"],
      trainingNote: "Dryland strength and mobility work directly supports stroke power and injury prevention.",
    },
    metrics: ["Event best time", "100m split", "Stroke count per length"],
  },
  {
    id: "Wrestling",
    name: "Wrestling",
    roleLabel: "Weight class",
    roles: [],
    competitionLabel: "Match",
    demands: {
      demands: ["Full-body strength", "Anaerobic capacity", "Grip strength"],
      developmentAreas: ["Strength", "Anaerobic conditioning", "Flexibility"],
      priorityCategories: ["STRENGTH", "CONDITIONING", "MOBILITY"],
      trainingNote: "Wrestling demands strength and conditioning in equal measure — neither can be neglected.",
    },
    metrics: ["Bodyweight", "Takedown %", "Conditioning test time"],
  },
  {
    id: "Tennis",
    name: "Tennis",
    roleLabel: "Role",
    roles: ["Singles", "Doubles"],
    competitionLabel: "Match",
    demands: {
      demands: ["Lateral movement", "Rotational power", "Match-length endurance"],
      developmentAreas: ["Lateral agility", "Rotational strength", "Conditioning"],
      priorityCategories: ["AGILITY", "STRENGTH", "CONDITIONING"],
      trainingNote: "Train rotational power for your serve and groundstrokes alongside court-coverage agility.",
    },
    metrics: ["First serve %", "Serve speed", "Match win %"],
  },
  {
    id: "Golf",
    name: "Golf",
    roleLabel: "Role",
    roles: [],
    competitionLabel: "Round",
    demands: {
      demands: ["Rotational power", "Core stability", "Consistency"],
      developmentAreas: ["Rotational strength", "Core & hip mobility", "Balance"],
      priorityCategories: ["STRENGTH", "MOBILITY", "SKILL"],
      trainingNote: "Rotational strength and hip mobility are the biggest physical drivers of swing power.",
    },
    metrics: ["Driving distance", "Greens in regulation", "Handicap"],
  },
  {
    id: "Lacrosse",
    name: "Lacrosse",
    roleLabel: "Position",
    roles: ["Attack", "Midfield", "Defense", "Goalie", "Faceoff"],
    competitionLabel: "Game",
    demands: {
      demands: ["Sprint speed", "Stick skills under fatigue", "Physicality"],
      developmentAreas: ["Speed", "Conditioning", "Strength"],
      priorityCategories: ["SPEED", "CONDITIONING", "STRENGTH"],
      trainingNote: "A running sport with physical contact — build conditioning and strength together.",
    },
    metrics: ["40-yard dash", "Shot speed", "Ground balls per game"],
  },
  {
    id: "Hockey",
    name: "Hockey",
    roleLabel: "Position",
    roles: ["Forward", "Defense", "Goalie"],
    competitionLabel: "Game",
    demands: {
      demands: ["Skating power", "Anaerobic capacity", "Core stability"],
      developmentAreas: ["Lower-body power", "Anaerobic conditioning", "Core strength"],
      priorityCategories: ["STRENGTH", "CONDITIONING", "MOBILITY"],
      trainingNote: "Off-ice strength and conditioning translate directly into skating power and stride efficiency.",
    },
    metrics: ["Off-ice sprint time", "Shot speed", "Plus/minus"],
  },
  {
    id: "Softball",
    name: "Softball",
    roleLabel: "Position",
    roles: [
      "Pitcher", "Catcher", "First Base", "Second Base", "Shortstop",
      "Third Base", "Outfield", "Designated Player",
    ],
    competitionLabel: "Game",
    demands: {
      demands: ["Rotational power", "Arm mechanics", "Short-burst speed"],
      developmentAreas: ["Rotational strength", "Throwing mechanics", "Speed & agility"],
      priorityCategories: ["STRENGTH", "SKILL", "AGILITY"],
      trainingNote: "Same rotational-power demands as baseball — hips and core drive both hitting and throwing.",
    },
    metrics: ["60-yard dash", "Exit velocity", "Throwing velocity"],
  },
  {
    id: "Gymnastics",
    name: "Gymnastics",
    roleLabel: "Event",
    roles: ["Vault", "Uneven Bars", "Balance Beam", "Floor", "All-Around", "Rings", "Pommel Horse", "Parallel Bars", "High Bar"],
    competitionLabel: "Meet",
    demands: {
      demands: ["Relative body strength", "Flexibility", "Technical precision"],
      developmentAreas: ["Strength-to-bodyweight ratio", "Flexibility", "Technique"],
      priorityCategories: ["STRENGTH", "MOBILITY", "SKILL"],
      trainingNote: "Strength-to-bodyweight ratio and flexibility matter more here than absolute strength.",
    },
    metrics: ["Routine difficulty score", "Strength benchmark (e.g. pull-ups)", "Flexibility benchmark"],
  },
  {
    id: "Other",
    name: "Other",
    roleLabel: "Role",
    roles: [],
    competitionLabel: "Competition",
    demands: {
      demands: ["General athleticism", "Sport-specific technique", "Conditioning"],
      developmentAreas: ["General strength", "Conditioning", "Mobility"],
      priorityCategories: ["STRENGTH", "CONDITIONING", "MOBILITY"],
      trainingNote: "A general athletic foundation to start from — training gets more specific once your sport is set.",
    },
    metrics: ["Custom metric"],
  },
];

const BY_ID = new Map(SPORTS.map((s) => [s.id, s]));

/** Falls back to "Other" for a sport not in the registry (custom/free-text sport names). */
export function getSportConfig(sport: string | null | undefined): SportConfig {
  return (sport && BY_ID.get(sport)) || BY_ID.get("Other")!;
}

export function rolesForSport(sport: string): string[] {
  return getSportConfig(sport).roles;
}

export function competitionLabel(sport: string | null | undefined): string {
  return getSportConfig(sport).competitionLabel;
}

export function roleLabel(sport: string | null | undefined): string {
  return getSportConfig(sport).roleLabel;
}

/** Position-level demands where defined, falling back to the sport-level default. */
export function demandsFor(sport: string | null | undefined, position?: string | null): AthleticDemands {
  const config = getSportConfig(sport);
  if (position && config.roleDemands?.[position]) return config.roleDemands[position];
  return config.demands;
}

export function metricsFor(sport: string | null | undefined): string[] {
  return getSportConfig(sport).metrics;
}
