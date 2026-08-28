export type DocumentStatus = "CURRENT" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRATION";

const EXPIRING_SOON_WINDOW_DAYS = 30;

/** Pure function of an expiration date — no side effects, same input always gives the same status. */
export function documentStatus(expiresAt: Date | null, now: Date = new Date()): DocumentStatus {
  if (!expiresAt) return "NO_EXPIRATION";
  const daysUntil = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return "EXPIRED";
  if (daysUntil <= EXPIRING_SOON_WINDOW_DAYS) return "EXPIRING_SOON";
  return "CURRENT";
}

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  PHYSICAL: "Physical",
  MEDICAL_CLEARANCE: "Medical Clearance",
  INJURY: "Injury Documentation",
  INSURANCE: "Insurance",
  EMERGENCY_INFO: "Emergency Information",
  ACADEMIC: "Academic",
  RECRUITING: "Recruiting",
  CAMP: "Camp",
  CERTIFICATION: "Certification",
  CREDENTIALS: "Credentials",
  BACKGROUND_CHECK: "Background Check",
  TEAM_PHYSICALS: "Team Physicals",
  ROSTER: "Roster",
  SAFETY_PROTOCOL: "Safety Protocol",
  EMERGENCY_PLAN: "Emergency Plan",
  WAIVER: "Waiver",
  OTHER: "Other",
};
