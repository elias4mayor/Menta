export const CARE_REASONS = [
  "INJURY",
  "PAIN",
  "RECOVERY",
  "RETURN_TO_PLAY",
  "TREATMENT",
  "GENERAL",
  "OTHER",
] as const;
export type CareReason = (typeof CARE_REASONS)[number];

export const CARE_REASON_LABELS: Record<CareReason, string> = {
  INJURY: "Injury",
  PAIN: "Pain / discomfort",
  RECOVERY: "Recovery",
  RETURN_TO_PLAY: "Return to play",
  TREATMENT: "Treatment",
  GENERAL: "General concern",
  OTHER: "Other",
};

export const CARE_STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "DECLINED",
  "SEEN",
  "FOLLOW_UP",
  "CANCELLED",
  "CLOSED",
] as const;
export type CareStatus = (typeof CARE_STATUSES)[number];

export const CARE_STATUS_LABELS: Record<CareStatus, string> = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  DECLINED: "Declined",
  SEEN: "Seen",
  FOLLOW_UP: "Follow-up scheduled",
  CANCELLED: "Cancelled",
  CLOSED: "Closed",
};

/** What a coach or parent may see about a teammate's/athlete's care activity — never the reason, note, or provider note. */
export const CARE_OPERATIONAL_STATUS_LABELS: Record<CareStatus, string> = {
  REQUESTED: "Care requested",
  SCHEDULED: "Care appointment scheduled",
  DECLINED: "Care request not scheduled",
  SEEN: "Care appointment completed",
  FOLLOW_UP: "Care follow-up scheduled",
  CANCELLED: "Care request cancelled",
  CLOSED: "Care closed",
};

/** Provider titles selectable for role=DOCTOR. Athletic Trainer isn't listed here — that's role=TRAINER's own provider type. */
export const PROVIDER_TITLES = [
  "Team Doctor",
  "Physical Therapist",
  "Sports Medicine Provider",
  "Other",
] as const;
export type ProviderTitle = (typeof PROVIDER_TITLES)[number];

export const DOCTOR_SPECIALTIES = [
  "Orthopedics",
  "Concussion management",
  "Return-to-play",
  "Rehabilitation",
  "General sports medicine",
  "Nutrition",
  "Other",
];
