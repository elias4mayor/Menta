/**
 * Sport configuration registry — the single place sport-specific vocabulary
 * lives, so components read from data instead of hardcoding a sport's
 * terminology. Adding a new sport means adding an entry here, not touching
 * every component that mentions "position" or "game."
 *
 * Deliberately does NOT include a per-sport stat/metrics catalog: Training
 * and Performance already store category/statName as free text the athlete
 * or coach defines, which already works for every sport without a rigid
 * schema — adding a fixed metrics list per sport here would just be a second,
 * disconnected system nothing reads from.
 */

export type SportConfig = {
  id: string;
  name: string;
  /** What the second identity field is called for this sport. */
  roleLabel: "Position" | "Event" | "Weight class" | "Role";
  /** Options for that field. Empty means free text (e.g. "Other"). */
  roles: string[];
  /** What a head-to-head/competitive outing is called. */
  competitionLabel: "Game" | "Match" | "Meet" | "Round" | "Race" | "Competition";
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
  },
  {
    id: "Basketball",
    name: "Basketball",
    roleLabel: "Position",
    roles: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    competitionLabel: "Game",
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
  },
  {
    id: "Soccer",
    name: "Soccer",
    roleLabel: "Position",
    roles: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
    competitionLabel: "Match",
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
  },
  {
    id: "Volleyball",
    name: "Volleyball",
    roleLabel: "Position",
    roles: ["Setter", "Outside Hitter", "Opposite", "Middle Blocker", "Libero", "Defensive Specialist"],
    competitionLabel: "Match",
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
  },
  {
    id: "Wrestling",
    name: "Wrestling",
    roleLabel: "Weight class",
    roles: [],
    competitionLabel: "Match",
  },
  {
    id: "Tennis",
    name: "Tennis",
    roleLabel: "Role",
    roles: ["Singles", "Doubles"],
    competitionLabel: "Match",
  },
  {
    id: "Golf",
    name: "Golf",
    roleLabel: "Role",
    roles: [],
    competitionLabel: "Round",
  },
  {
    id: "Lacrosse",
    name: "Lacrosse",
    roleLabel: "Position",
    roles: ["Attack", "Midfield", "Defense", "Goalie", "Faceoff"],
    competitionLabel: "Game",
  },
  {
    id: "Hockey",
    name: "Hockey",
    roleLabel: "Position",
    roles: ["Forward", "Defense", "Goalie"],
    competitionLabel: "Game",
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
  },
  {
    id: "Gymnastics",
    name: "Gymnastics",
    roleLabel: "Event",
    roles: ["Vault", "Uneven Bars", "Balance Beam", "Floor", "All-Around", "Rings", "Pommel Horse", "Parallel Bars", "High Bar"],
    competitionLabel: "Meet",
  },
  {
    id: "Other",
    name: "Other",
    roleLabel: "Role",
    roles: [],
    competitionLabel: "Competition",
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
