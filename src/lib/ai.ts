import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { askGemini, isGeminiConfigured } from "@/lib/ai/gemini";
import type { SessionUser } from "@/lib/session";

export function isAiConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") {
    return isGeminiConfigured();
  }

  if (provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  return false;
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
    "Mental performance and safety modules are not yet built — do not claim to have that data. Recovery/wellness check-ins exist but are deliberately never included in this context (health-adjacent data with its own privacy rules — don't claim to have it here). Academic data (assignments, goals, GPA history) exists but is only sent to MENTA AI in the dedicated Study Help tool, not here — don't claim to have it in this conversation."
  );

  return lines.join("\n");
}

const RECRUITING_OUTREACH_RULES = `You are drafting a recruiting outreach message on behalf of the athlete described below.

Additional non-negotiable rules for this task, on top of your ground rules above:
- Use ONLY the athlete data and school/contact data given to you in this context. Never invent statistics, awards, achievements, coach names, email addresses, or any fact not explicitly provided.
- If a fact you'd want isn't in the context (e.g. no performance stats on file, no coach name given), don't invent one — write around the gap rather than fabricating it.
- Never claim the athlete has already been contacted, has visited, or has any prior relationship with the school or coach unless that is explicitly stated in the context below.
- Never guarantee, imply, or suggest a scholarship, offer, admission, or roster spot — those are entirely up to the school and coach, not something MENTA or this message can promise.
- Never pretend to be the coach, the school, or write as if you are the recipient replying.
- This is a DRAFT ONLY, for the athlete to review and edit before they decide whether to send it themselves. MENTA does not send messages on the athlete's behalf. Do not write anything implying it has already been sent.
- Be direct, professional, and specific to the athlete's real data — no generic filler that could apply to any athlete.
- Output only the message body (a greeting, a few short paragraphs, and a sign-off with the athlete's own name). No subject line, no commentary about the draft itself.`;

export async function draftRecruitingOutreach(
  user: SessionUser,
  params: {
    purpose: string;
    school: { name: string; division: string | null; location: string | null };
    contact?: { name: string; title: string | null } | null;
  }
): Promise<string> {
  const athleteContext = await buildAthleteContext(user);

  const recipientLine = params.contact
    ? `Recipient: ${params.contact.name}${params.contact.title ? ` (${params.contact.title})` : ""} at ${params.school.name}`
    : `Recipient: the coaching staff at ${params.school.name} (no specific contact name on file — address generally, e.g. "Dear Coach" or "Dear ${params.school.name} Coaching Staff")`;

  const schoolLine = [
    `School: ${params.school.name}`,
    params.school.division ? `Division/level: ${params.school.division}` : null,
    params.school.location ? `Location: ${params.school.location}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const context = `${RECRUITING_OUTREACH_RULES}\n\nAthlete context:\n${athleteContext}\n\n${schoolLine}\n${recipientLine}\n\nPurpose of this message (as stated by the athlete): ${params.purpose}`;

  return askMentaAi({
    system: context,
    history: [
      {
        role: "user",
        content: `Draft the recruiting outreach message described above.`,
      },
    ],
  });
}

const STUDY_HELP_RULES = `You are MENTA AI acting as a study tutor and academic assistant for the athlete described below.

Additional non-negotiable rules for this task, on top of your ground rules above:
- Prioritize teaching over answering: explain concepts, walk through examples, ask guiding questions, and help the athlete build their own understanding rather than just handing over a finished answer.
- If the request is clearly asking you to complete graded work on the athlete's behalf — write an essay to submit, complete a quiz/test/exam, do homework problems intended for direct submission — do not do it. Say something like: "I can help you understand the concept, walk through a similar example, or check your reasoning, but I can't complete the graded assignment for you." Then actually offer that help — don't just refuse and stop.
- Never help bypass plagiarism detection or AI-detection tools, and never produce text intended to be submitted as the athlete's own original work when the request makes clear it's for grading.
- Never complete quizzes, tests, or exams on the athlete's behalf.
- Never pretend to be the athlete.
- Never fabricate citations, sources, quotes, or facts — if you're not sure of something specific, say so rather than inventing it.
- Use only the academic context given below (assignments, academic goals, GPA/term history, school) — never invent grades, assignments, courses, or teachers the athlete didn't tell you about.
- This is study help, not an official school record — don't imply anything here is verified or official.`;

/**
 * Deliberately separate from buildAthleteContext() — only academic-relevant
 * data (assignments, academic goals, GPA/term history, school/grad year).
 * Never includes wellness/recovery, recruiting, guardian, team, or message
 * data, per the explicit "only send what's necessary for study assistance"
 * requirement this feature was built under.
 */
export async function buildAcademicContext(user: SessionUser): Promise<string> {
  const [profile, upcomingAssignments, activeGoals, recentTerms] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    prisma.assignment.findMany({
      where: { userId: user.id, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.academicGoal.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      take: 5,
    }),
    prisma.academicTerm.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const lines: string[] = [`Athlete: ${user.name}`];

  if (profile?.schoolName) lines.push(`School: ${profile.schoolName}`);
  if (profile?.graduationYear) lines.push(`Graduation year: ${profile.graduationYear}`);
  if (profile?.gpa) lines.push(`Current GPA on profile: ${profile.gpa}`);

  lines.push(
    upcomingAssignments.length
      ? `Open assignments: ${upcomingAssignments
          .map(
            (a) =>
              `${a.title}${a.subject ? ` (${a.subject})` : ""}${a.dueDate ? `, due ${a.dueDate.toDateString()}` : ""}, status ${a.status}`
          )
          .join("; ")}`
      : "No open assignments logged."
  );

  lines.push(
    activeGoals.length
      ? `Active academic goals: ${activeGoals.map((g) => `${g.title} (${g.progress}% complete)`).join("; ")}`
      : "No active academic goals logged."
  );

  lines.push(
    recentTerms.length
      ? `Recent GPA/term history (athlete-entered): ${recentTerms
          .map((t) => `${t.term}${t.year ? ` ${t.year}` : ""}: GPA ${t.gpa ?? "not set"}${t.classInfo ? `, classes: ${t.classInfo}` : ""}`)
          .join("; ")}`
      : "No GPA/term history logged yet."
  );

  lines.push(
    "All of the above is entered by the athlete themselves, not an official school record — treat it as self-reported."
  );

  return lines.join("\n");
}

export async function buildStudyHelpSystem(user: SessionUser): Promise<string> {
  const academicContext = await buildAcademicContext(user);
  return `${STUDY_HELP_RULES}\n\nAcademic context:\n${academicContext}`;
}

export async function askMentaAi(params: {
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  const systemPrompt = `${SYSTEM_PROMPT}\n\nContext:\n${params.system}`;

  if (provider === "gemini") {
    return askGemini({
      systemPrompt,
      conversation: params.history,
    });
  }

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }

    const client = new Anthropic({ apiKey });

    const model =
      process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: params.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find(
      (block) => block.type === "text"
    );

    const text =
      textBlock && "text" in textBlock
        ? textBlock.text.trim()
        : "";

    if (!text) {
      throw new Error("Anthropic returned an empty response.");
    }

    return text;
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}
