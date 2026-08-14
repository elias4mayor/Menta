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

export const reportSchema = z.object({
  targetUserId: z.string().optional(),
  targetMessageId: z.string().optional(),
  category: z.enum(["SPAM", "HARASSMENT", "SAFETY_CONCERN", "IMPERSONATION", "OTHER"]),
  details: z.string().trim().max(2000).optional(),
});
