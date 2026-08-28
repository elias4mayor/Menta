import { z } from "zod";
import { countryCodeForName, statesForCountry } from "@/lib/geo";
import { SCHOOL_TYPES } from "@/lib/schools";
import { CARE_REASONS, PROVIDER_TITLES } from "@/lib/care";

/**
 * Cross-field check reused by every onboarding schema that collects
 * country + state: if a state/province was submitted, it must actually
 * belong to that country in the real dataset (src/lib/data/states.json).
 * Client-side StateSelect already only offers valid options — this is the
 * server independently enforcing the same rule rather than trusting the
 * client did.
 */
function refineStateMatchesCountry<T extends { country?: string; state?: string }>(
  data: T,
  ctx: z.RefinementCtx
) {
  if (!data.state) return;
  const countryCode = data.country ? countryCodeForName(data.country) : undefined;
  const valid = countryCode ? statesForCountry(countryCode).some((s) => s.name === data.state) : false;
  if (!valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["state"],
      message: "That state/province isn't valid for the selected country.",
    });
  }
}

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(10, "Use at least 10 characters"),
  role: z.enum(["ATHLETE", "COACH", "PARENT", "TRAINER", "DOCTOR"]).default("ATHLETE"),
  dateOfBirth: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10, "Use at least 10 characters"),
});

export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Use at least 10 characters"),
});

export const onboardingSchema = z
  .object({
    sport: z.string().trim().min(1).max(60),
    position: z.string().trim().max(60).optional().or(z.literal("")),
    /// The athlete's primary sport is always `sport`/`position` above
    /// (preserves every existing call site's contract). Anything beyond
    /// that first sport — added via onboarding's "+ Add another sport" —
    /// lands here and becomes a non-primary, active AthleteSportContext.
    additionalSports: z
      .array(
        z.object({
          sport: z.string().trim().min(1).max(60),
          position: z.string().trim().max(60).optional().or(z.literal("")),
        })
      )
      .max(9)
      .optional(),
    graduationYear: z.coerce.number().int().min(2024).max(2040).optional(),
    schoolName: z.string().trim().min(1, "School name is required").max(160),
    schoolType: z.enum(SCHOOL_TYPES, { message: "Select a school type" }),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    trainingDaysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
    goals: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  })
  .superRefine(refineStateMatchesCountry);

export const coachOnboardingSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    sport: z.string().trim().max(60).optional().or(z.literal("")),
    coachingRole: z.string().trim().max(60).optional().or(z.literal("")),
    yearsCoaching: z.coerce.number().int().min(0).max(70).optional(),
    organizationName: z.string().trim().max(160).optional().or(z.literal("")),
    schoolName: z.string().trim().min(1, "School name is required").max(160),
    schoolType: z.enum(SCHOOL_TYPES, { message: "Select a school type" }),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    focusAreas: z.array(z.string().trim().min(1).max(200)).max(15).optional(),
  })
  .superRefine(refineStateMatchesCountry);

export const trainerOnboardingSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    businessName: z.string().trim().max(160).optional().or(z.literal("")),
    sport: z.string().trim().max(60).optional().or(z.literal("")),
    specialties: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
    trainingLocation: z.string().trim().max(160).optional().or(z.literal("")),
    yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
    certifications: z.string().trim().max(300).optional().or(z.literal("")),
    trainingPhilosophy: z.string().trim().max(500).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    goals: z.array(z.string().trim().min(1).max(200)).max(15).optional(),
  })
  .superRefine(refineStateMatchesCountry);

export const parentOnboardingSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    relationship: z.string().trim().max(60).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    goals: z.array(z.string().trim().min(1).max(200)).max(15).optional(),
  })
  .superRefine(refineStateMatchesCountry);

export const doctorOnboardingSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    title: z.enum(PROVIDER_TITLES, { message: "Select a title" }),
    specialties: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
    credentials: z.string().trim().max(300).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine(refineStateMatchesCountry);

export const careRequestCreateSchema = z.object({
  providerId: z.string().trim().min(1),
  teamId: z.string().trim().min(1),
  reason: z.enum(CARE_REASONS),
  reasonNote: z.string().trim().max(1000).optional().or(z.literal("")),
  requestedStart: z.string().datetime().or(z.string().min(1)),
});

export const careRequestUpdateSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE", "RESCHEDULE", "SEEN", "FOLLOW_UP", "CLOSE", "CANCEL"]),
  scheduledStart: z.string().min(1).optional(),
  scheduledEnd: z.string().min(1).optional(),
  providerNote: z.string().trim().max(2000).optional().or(z.literal("")),
  followUpStart: z.string().min(1).optional(),
});

export const providerAvailabilitySchema = z.object({
  teamId: z.string().trim().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(1).max(1440),
  slotMinutes: z.coerce.number().int().min(10).max(240).default(30),
});

export const sportContextCreateSchema = z.object({
  sport: z.string().trim().min(1).max(60),
  position: z.string().trim().max(60).optional().or(z.literal("")),
  teamId: z.string().trim().min(1).optional().or(z.literal("")),
  makePrimary: z.boolean().optional(),
});

/// Either flips this context to primary (isPrimary:true, alone) or edits
/// position/teamId — a single request does one or the other, never both,
/// so a client can't smuggle a detail edit onto a primary-switch mid-flight.
export const sportContextUpdateSchema = z
  .object({
    isPrimary: z.literal(true).optional(),
    position: z.string().trim().max(60).nullable().optional(),
    teamId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (data) => data.isPrimary !== undefined || data.position !== undefined || data.teamId !== undefined,
    { message: "No changes provided." }
  )
  .refine(
    (data) => !(data.isPrimary !== undefined && (data.position !== undefined || data.teamId !== undefined)),
    { message: "Send isPrimary alone, or position/teamId alone — not both." }
  );

export const profileUpdateSchema = z.object({
  sport: z.string().trim().max(60).optional(),
  position: z.string().trim().max(60).optional(),
  graduationYear: z.coerce.number().int().min(2024).max(2040).optional(),
  heightCm: z.coerce.number().int().min(0).max(280).optional(),
  weightKg: z.coerce.number().int().min(0).max(300).optional(),
  schoolName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(1000).optional(),
  gpa: z.coerce.number().min(0).max(5).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "ORGANIZATION", "RECRUITING", "PUBLIC"]).optional(),
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().max(60).optional(),
  actionPlan: z.string().trim().max(1000).optional(),
  targetDate: z.string().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().max(60).optional(),
  actionPlan: z.string().trim().max(1000).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "ACHIEVED", "ABANDONED"]).optional(),
  targetDate: z.string().optional().nullable(),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.string().trim().max(20).optional(),
  reps: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(200).optional(),
});

const workoutCategoryEnum = z.enum([
  "STRENGTH",
  "SPEED",
  "AGILITY",
  "CONDITIONING",
  "MOBILITY",
  "SKILL",
  "RECOVERY",
]);

export const createWorkoutSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: workoutCategoryEnum,
  description: z.string().trim().max(1000).optional(),
  exercises: z.array(exerciseSchema).max(30).optional(),
  teamId: z.string().optional(),
  assignedToId: z.string().optional(),
  isTemplate: z.boolean().optional(),
});

export const updateWorkoutSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  category: workoutCategoryEnum.optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  exercises: z.array(exerciseSchema).max(30).optional(),
  teamId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  isTemplate: z.boolean().optional(),
});

export const logWorkoutCompletionSchema = z.object({
  effort: z.coerce.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createPerformanceEntrySchema = z.object({
  statName: z.string().trim().min(1).max(80),
  value: z.coerce.number(),
  unit: z.string().trim().max(20).optional(),
  recordedAt: z.string().optional(),
  note: z.string().trim().max(300).optional(),
});

export const FILM_VISIBILITY_VALUES = [
  "PRIVATE",
  "COACH_STAFF",
  "POSITION_GROUP",
  "TEAM",
  "SELECTED_ATHLETES",
  "RECRUITING",
  "PUBLIC",
] as const;

export const filmMetadataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(["GAME", "PRACTICE", "TRAINING", "HIGHLIGHT"]).default("GAME"),
  opponent: z.string().trim().max(120).optional(),
  opponentId: z.string().optional(),
  season: z.string().trim().max(40).optional(),
  visibility: z.enum(FILM_VISIBILITY_VALUES).default("PRIVATE"),
  teamId: z.string().optional(),
  positionGroupId: z.string().optional(),
  durationSec: z.coerce.number().min(0).optional(),
});

export const DOCUMENT_CATEGORIES = [
  "PHYSICAL",
  "MEDICAL_CLEARANCE",
  "INJURY",
  "INSURANCE",
  "EMERGENCY_INFO",
  "ACADEMIC",
  "RECRUITING",
  "CAMP",
  "CERTIFICATION",
  "CREDENTIALS",
  "BACKGROUND_CHECK",
  "TEAM_PHYSICALS",
  "ROSTER",
  "SAFETY_PROTOCOL",
  "EMERGENCY_PLAN",
  "WAIVER",
  "OTHER",
] as const;

export const documentMetadataSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
  expiresAt: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
  ownerId: z.string().optional(),
  teamId: z.string().optional(),
});

export const documentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  expiresAt: z.string().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const documentRequestSchema = z.object({
  athleteEmail: z.string().trim().toLowerCase().email(),
  title: z.string().trim().min(1).max(160),
  category: z.enum(DOCUMENT_CATEGORIES).default("OTHER"),
  notes: z.string().trim().max(500).optional(),
});

export const createClipSchema = z.object({
  startSec: z.coerce.number().min(0),
  endSec: z.coerce.number().min(0).optional(),
  label: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional(),
});

export const createHighlightSchema = z.object({
  title: z.string().trim().min(1).max(160),
  clipIds: z.array(z.string().min(1)).min(1).max(50),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sport: z.string().trim().max(60).optional(),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string().trim().min(1).max(40),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  location: z.string().trim().max(200).optional(),
  teamId: z.string().optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).default("PRIVATE"),
});

export const aiChatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(4000),
});

export const requestGuardianLinkSchema = z.object({
  athleteEmail: z.string().trim().toLowerCase().email(),
});

export const updateGuardianLinkSchema = z.object({
  status: z.enum(["APPROVED", "REVOKED"]),
});

const RECRUITING_SCHOOL_STATUSES = [
  "TARGET",
  "INTERESTED",
  "CONTACTED",
  "RESPONDED",
  "VISIT",
  "OFFER",
  "COMMITTED",
  "NOT_PURSUING",
] as const;

export const createRecruitingSchoolSchema = z.object({
  name: z.string().trim().min(1).max(160),
  division: z.string().trim().max(60).optional(),
  location: z.string().trim().max(160).optional(),
  status: z.enum(RECRUITING_SCHOOL_STATUSES).optional(),
  priority: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateRecruitingSchoolSchema = createRecruitingSchoolSchema.partial();

const RECRUITING_CONTACT_STATUSES = ["NOT_CONTACTED", "CONTACTED", "RESPONDED"] as const;

export const createRecruitingContactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  title: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(RECRUITING_CONTACT_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
  lastContactedAt: z.string().optional(),
});

export const updateRecruitingContactSchema = createRecruitingContactSchema.partial();

const RECRUITING_ACTIVITY_TYPES = ["NOTE", "EMAIL_DRAFT", "CALL", "VISIT", "OTHER"] as const;

export const createRecruitingActivitySchema = z.object({
  schoolId: z.string().optional(),
  contactId: z.string().optional(),
  type: z.enum(RECRUITING_ACTIVITY_TYPES).optional(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().max(4000).optional(),
});

export const recruitingOutreachSchema = z.object({
  schoolId: z.string().min(1),
  contactId: z.string().optional(),
  purpose: z.string().trim().min(1).max(500),
});

const wellnessCheckInFields = {
  sleepHours: z.coerce.number().min(0).max(24).optional(),
  sleepQuality: z.coerce.number().int().min(1).max(5).optional(),
  energy: z.coerce.number().int().min(1).max(5).optional(),
  soreness: z.coerce.number().int().min(1).max(5).optional(),
  stress: z.coerce.number().int().min(1).max(5).optional(),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  readiness: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(1000).optional(),
};

export const createWellnessCheckInSchema = z
  .object(wellnessCheckInFields)
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined && v !== ""),
    { message: "Add at least one value before saving a check-in." }
  );

export const updateWellnessCheckInSchema = z.object(wellnessCheckInFields).partial();

const mindCheckInFields = {
  pressure: z.coerce.number().int().min(1).max(5).optional(),
  confidence: z.coerce.number().int().min(1).max(5).optional(),
  focus: z.coerce.number().int().min(1).max(5).optional(),
  readiness: z.coerce.number().int().min(1).max(5).optional(),
  todayGoal: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
};

export const createMindCheckInSchema = z
  .object(mindCheckInFields)
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined && v !== ""),
    { message: "Add at least one value before saving a check-in." }
  );

export const updateMindCheckInSchema = z.object(mindCheckInFields).partial();

export const reportSchema = z.object({
  targetUserId: z.string().optional(),
  targetMessageId: z.string().optional(),
  category: z.enum(["SPAM", "HARASSMENT", "SAFETY_CONCERN", "IMPERSONATION", "OTHER"]),
  details: z.string().trim().max(2000).optional(),
});

const ACADEMIC_TERMS = ["FALL", "SPRING", "SUMMER", "OTHER"] as const;

export const createAcademicTermSchema = z.object({
  term: z.enum(ACADEMIC_TERMS),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  gpa: z.coerce.number().min(0).max(10).optional(),
  gpaScale: z.coerce.number().min(1).max(10).optional(),
  classInfo: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateAcademicTermSchema = createAcademicTermSchema.partial();

const ASSIGNMENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const ASSIGNMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(ASSIGNMENT_PRIORITIES).optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  grade: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  dueDate: z.string().optional().nullable(),
});

const ACADEMIC_GOAL_STATUSES = ["ACTIVE", "COMPLETED", "PAUSED"] as const;

export const createAcademicGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  targetDate: z.string().optional(),
  status: z.enum(ACADEMIC_GOAL_STATUSES).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateAcademicGoalSchema = createAcademicGoalSchema.partial().extend({
  targetDate: z.string().optional().nullable(),
});

const ELIGIBILITY_CATEGORIES = [
  "ACADEMIC",
  "GRADUATION",
  "COURSEWORK",
  "ELIGIBILITY_REVIEW",
  "RECRUITING_PAPERWORK",
  "DOCUMENTATION",
] as const;
const ELIGIBILITY_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "NEEDS_VERIFICATION"] as const;

export const createEligibilityItemSchema = z.object({
  category: z.enum(ELIGIBILITY_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  status: z.enum(ELIGIBILITY_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateEligibilityItemSchema = z.object({
  category: z.enum(ELIGIBILITY_CATEGORIES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(ELIGIBILITY_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const studyHelpSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(4000),
});

export const createEmergencyContactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  relationship: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateEmergencyContactSchema = createEmergencyContactSchema.partial();

export const updatePersonalSafetyProfileSchema = z.object({
  allergies: z.string().trim().max(1000).optional(),
  medicalNotes: z.string().trim().max(2000).optional(),
  medicationNotes: z.string().trim().max(1000).optional(),
  emergencyPlanNotes: z.string().trim().max(2000).optional(),
});

const SAFETY_CHECKLIST_CATEGORIES = [
  "MEDICAL_INFO",
  "EMERGENCY_CONTACTS",
  "VENUE_AWARENESS",
  "COMMUNICATION_PLAN",
  "DOCUMENTATION",
  "OTHER",
] as const;
const SAFETY_CHECKLIST_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;

export const createSafetyChecklistItemSchema = z.object({
  category: z.enum(SAFETY_CHECKLIST_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  status: z.enum(SAFETY_CHECKLIST_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateSafetyChecklistItemSchema = z.object({
  category: z.enum(SAFETY_CHECKLIST_CATEGORIES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(SAFETY_CHECKLIST_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const createTeamSafetyProtocolSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  venue: z.string().trim().max(160).optional(),
  content: z.string().trim().min(1).max(5000),
});

export const updateTeamSafetyProtocolSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  venue: z.string().trim().max(160).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
});

export const createTeamSafetyChecklistItemSchema = z.object({
  teamId: z.string().min(1),
  category: z.enum(SAFETY_CHECKLIST_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  status: z.enum(SAFETY_CHECKLIST_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateTeamSafetyChecklistItemSchema = z.object({
  category: z.enum(SAFETY_CHECKLIST_CATEGORIES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(SAFETY_CHECKLIST_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/// MENTA TRAIN Program Builder (Phase 4). exerciseId/positionGroupId are
/// validated for real (visibility + team ownership), not just shape, by
/// the route handler — this schema only checks the request is
/// well-formed. A whole-document save (program + all its blocks/
/// exercises in one request) rather than granular per-block/per-exercise
/// endpoints, matching how the builder UI edits one in-memory document
/// and saves it as a unit; see the Phase 4 spec for why.
export const programExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  order: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(50).optional(),
  targetReps: z.string().trim().max(40).optional(),
  targetLoad: z.number().min(0).optional(),
  targetLoadPercent: z.number().min(0).max(100).optional(),
  targetLoadUnit: z.enum(["LB", "KG"]).optional(),
  tempo: z.string().trim().max(20).optional(),
  restSec: z.number().int().min(0).max(3600).optional(),
  durationSec: z.number().min(0).optional(),
  distanceMeters: z.number().min(0).optional(),
  rpeTarget: z.number().min(0).max(10).optional(),
  supersetGroup: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const trainingBlockInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  blockType: z.string().trim().max(40).optional(),
  order: z.number().int().min(0),
  exercises: z.array(programExerciseInputSchema).max(50),
});

export const trainingProgramInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  sport: z.string().trim().max(60).optional(),
  positionGroupId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  blocks: z.array(trainingBlockInputSchema).max(20),
});

/// MENTA TRAIN Athlete Prescriptions (Phase 5). programExerciseId/
/// athleteId are validated for real (program/team ownership) by the
/// route handler, not just shape here. calculationBasis mirrors
/// AthletePrescription's own doc comment in schema.prisma — MANUAL is
/// the default for a coach directly typing or copying a number; there is
/// no AI-computed basis yet.
export const athletePrescriptionEntrySchema = z.object({
  athleteId: z.string().min(1),
  prescribedLoad: z.number().min(0).optional(),
  prescribedLoadUnit: z.enum(["LB", "KG"]).optional(),
  prescribedReps: z.string().trim().max(40).optional(),
  prescribedSets: z.number().int().min(1).max(50).optional(),
  calculationBasis: z.enum(["MANUAL", "PERCENT_1RM", "PREVIOUS_PERFORMANCE", "COACH_OVERRIDE"]).optional(),
});

export const athletePrescriptionInputSchema = z.object({
  programExerciseId: z.string().min(1),
  prescriptions: z.array(athletePrescriptionEntrySchema).min(1).max(200),
});

export const clearAthletePrescriptionsSchema = z.object({
  programExerciseId: z.string().min(1),
  athleteIds: z.array(z.string().min(1)).min(1).max(200),
});

/// MENTA LIVE (Phase 6). liveGroupInputSchema/createLiveSessionInputSchema
/// describe the request shape only — every id inside is re-validated
/// against real team/program/session relationships by src/lib/live-sessions.ts,
/// never trusted just because it parses.
export const liveGroupInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  stationLabel: z.string().trim().max(80).optional(),
  athleteIds: z.array(z.string().min(1)).min(1).max(200),
});

export const createLiveSessionInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    scheduledAt: z.string().datetime().optional(),
    groups: z.array(liveGroupInputSchema).min(1).max(20).optional(),
    athleteIds: z.array(z.string().min(1)).min(1).max(200).optional(),
  })
  .refine((data) => data.groups || data.athleteIds, { message: "Provide groups or athleteIds." });

export const sessionStatusInputSchema = z.object({
  status: z.enum(["LIVE", "PAUSED", "COMPLETE", "CANCELED"]),
});

export const createSessionGroupInputSchema = liveGroupInputSchema;

export const updateSessionGroupInputSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  stationLabel: z.string().trim().max(80).optional(),
  athleteIds: z.array(z.string().min(1)).min(1).max(200).optional(),
});

export const advanceInputSchema = z.object({
  programExerciseId: z.string().min(1),
});

export const logSetInputSchema = z.object({
  athleteId: z.string().min(1),
  programExerciseId: z.string().min(1),
  groupId: z.string().optional(),
  setNumber: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(200).optional(),
  weight: z.number().min(0).optional(),
  weightUnit: z.enum(["LB", "KG"]).optional(),
  rpe: z.number().min(0).max(10).optional(),
  durationSec: z.number().min(0).optional(),
  distanceMeters: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});
