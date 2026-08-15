import { z } from "zod";

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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Use at least 10 characters"),
});

export const onboardingSchema = z.object({
  sport: z.string().trim().min(1).max(60),
  position: z.string().trim().max(60).optional().or(z.literal("")),
  graduationYear: z.coerce.number().int().min(2024).max(2040).optional(),
  schoolName: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  goals: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
});

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

export const createWorkoutSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum([
    "STRENGTH",
    "SPEED",
    "AGILITY",
    "CONDITIONING",
    "MOBILITY",
    "SKILL",
    "RECOVERY",
  ]),
  description: z.string().trim().max(1000).optional(),
  exercises: z.array(exerciseSchema).max(30).optional(),
  teamId: z.string().optional(),
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

export const reportSchema = z.object({
  targetUserId: z.string().optional(),
  targetMessageId: z.string().optional(),
  category: z.enum(["SPAM", "HARASSMENT", "SAFETY_CONCERN", "IMPERSONATION", "OTHER"]),
  details: z.string().trim().max(2000).optional(),
});
