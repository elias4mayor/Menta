import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You are MENTA AI, the assistant inside the MENTA Athlete Operating System.

Ground rules, non-negotiable:
- You only know what is given to you in this conversation's context below. Never invent stats, recruiting information, coach contacts, medical facts, or anything about the athlete you weren't told.
- If information you'd need isn't in the context, say plainly that it isn't available yet, and suggest where to add it in MENTA (profile, goals, calendar) rather than guessing.
- You are not a doctor. Never diagnose, never say someone is "cleared to play" or "doesn't need medical attention." For medical or injury questions, give general educational information and direct the person to a qualified professional.
- MENTA Safety is preparedness, not prediction — never claim to predict cardiac events, heat stroke, concussions, or other medical emergencies.
- Never guarantee a recruiting outcome, scholarship, offer, or roster spot.
- Never claim legal compliance (HIPAA, FERPA, COPPA, NCAA) — say it requires legal review if asked.
- Be direct and concise. This is an athlete-facing coaching tool, not a generic chatbot.`;

export async function buildAthleteContext(user: SessionUser): Promise<string> {
  const [profile, goals, upcomingEvents, recentWorkouts, recentPerformance, highlights] =
    await Promise.all([
      prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
      prisma.goal.findMany({ where: { userId: user.id, status: "ACTIVE" }, take: 5 }),
      prisma.calendarEvent.findMany({
        where: {
          startsAt: { gte: new Date() },
          OR: [{ createdById: user.id }, { team: { memberships: { some: { userId: user.id } } } }],
        },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      prisma.workoutCompletion.findMany({
        where: { userId: user.id },
        include: { workout: true },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
      prisma.performanceEntry.findMany({
        where: { userId: user.id },
        orderBy: { recordedAt: "desc" },
        take: 5,
      }),
      prisma.highlight.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const lines: string[] = [`Athlete: ${user.name} (role: ${user.role})`];

  if (profile) {
    lines.push(
      `Sport: ${profile.sport ?? "not set"}${profile.position ? `, position: ${profile.position}` : ""}`
    );
    if (profile.schoolName) lines.push(`School: ${profile.schoolName}`);
    if (profile.graduationYear) lines.push(`Graduation year: ${profile.graduationYear}`);
    if (profile.gpa) lines.push(`GPA: ${profile.gpa}`);
  } else {
    lines.push("No athlete profile on file yet.");
  }

  lines.push(
    goals.length
      ? `Active goals: ${goals.map((g) => g.title).join("; ")}`
      : "No active goals on file."
  );

  lines.push(
    upcomingEvents.length
      ? `Upcoming calendar: ${upcomingEvents
          .map((e) => `${e.title} (${e.startsAt.toDateString()})`)
          .join("; ")}`
      : "Nothing upcoming on the calendar."
  );

  lines.push(
    recentWorkouts.length
      ? `Recent training: ${recentWorkouts
          .map((w) => `${w.workout.title}${w.effort ? ` (effort ${w.effort}/10)` : ""}`)
          .join("; ")}`
      : "No training logged yet."
  );

  lines.push(
    recentPerformance.length
      ? `Recent performance entries: ${recentPerformance
          .map((p) => `${p.statName}: ${p.value}${p.unit ?? ""}`)
          .join("; ")}`
      : "No performance entries logged yet."
  );

  lines.push(
    highlights.length
      ? `Highlight reels: ${highlights.map((h) => h.title).join("; ")}`
      : "No highlight reels created yet."
  );

  lines.push(
    "Recovery, mental performance, recruiting, academics, and safety modules are not yet built — do not claim to have that data."
  );

  return lines.join("\n");
}

export async function askMentaAi(params: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\nContext:\n${params.system}`,
    messages: params.history.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
