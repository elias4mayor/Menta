import { z } from "zod";
import { countryCodeForName, statesForCountry } from "@/lib/geo";

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
  role: z.enum(["ATHLETE", "COACH", "PARENT", "TRAINER"]).default("ATHLETE"),
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
    graduationYear: z.coerce.number().int().min(2024).max(2040).optional(),
    schoolName: z.string().trim().max(160).optional().or(z.literal("")),
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
    schoolName: z.string().trim().max(160).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
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
    goals: z.array(z.string().trim().min(1).max(200)).max(15).optional(),
  })
  .superRefine(refineStateMatchesCountry);

export const parentOnboardingSchema = z
  .object({
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    relationship: z.string().trim().max(60).optional().or(z.literal("")),
    country: z.string().trim().max(60).optional().or(z.literal("")),
    state: z.string().trim().max(60).optional().or(z.literal("")),
    goals: z.array(z.string().trim().min(1).max(200)).max(15).optional(),
  })
  .superRefine(refineStateMatchesCountry);

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

export const filmMetadataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(["GAME", "PRACTICE", "TRAINING", "HIGHLIGHT"]).default("GAME"),
  opponent: z.string().trim().max(120).optional(),
  season: z.string().trim().max(40).optional(),
  visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).default("PRIVATE"),
  teamId: z.string().optional(),
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
