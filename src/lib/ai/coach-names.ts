export const DEFAULT_AI_COACH_NAME = "MENTA AI";

export const AI_COACH_NAMES = [
  "Ace", "Atlas", "Blaze", "Bolt", "Captain", "Clutch", "Dash", "Echo",
  "Everest", "Falcon", "Glide", "Harbor", "Hawk", "Jett", "Kai", "Koa",
  "Maverick", "Nova", "Onyx", "Orbit", "Pace", "Phoenix", "Reign",
  "Ridge", "River", "Scout", "Summit", "Tempo", "Titan", "Vector",
] as const;

// Keep the same catalog on the client and server so clients cannot submit
// unrestricted names or use a lookalike spelling to bypass moderation.
export function isAiCoachName(value: unknown): value is (typeof AI_COACH_NAMES)[number] {
  return typeof value === "string" && AI_COACH_NAMES.some((name) => name === value);
}
