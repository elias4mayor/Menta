import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isAiConfigured } from "@/lib/ai";
import { AcademicGoals } from "@/components/AcademicGoals";
import { AssignmentTracker } from "@/components/AssignmentTracker";
import { AcademicTerms } from "@/components/AcademicTerms";
import { EligibilityChecklist } from "@/components/EligibilityChecklist";
import { StudyHelpChat } from "@/components/StudyHelpChat";

const STUDY_HELP_TOPIC = "ACADEMICS";

export default async function SchoolPage() {
  const user = await requireUser();

  const [profile, assignments, academicGoals, academicTerms, eligibilityItems, studyHelpConversation] =
    await Promise.all([
      prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
      prisma.assignment.findMany({ where: { userId: user.id }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] }),
      prisma.academicGoal.findMany({ where: { userId: user.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
      prisma.academicTerm.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.eligibilityChecklistItem.findMany({ where: { userId: user.id }, orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
      prisma.aIConversation.findFirst({
        where: { userId: user.id, topic: STUDY_HELP_TOPIC },
        orderBy: { createdAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
    ]);

  const now = new Date();
  const upcomingCount = assignments.filter((a) => a.status !== "COMPLETED").length;
  const overdueCount = assignments.filter(
    (a) => a.status !== "COMPLETED" && a.dueDate && a.dueDate.getTime() < now.getTime()
  ).length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div className="max-w-5xl">
      <div className="mono text-text-3 mb-2">Academics</div>
      <h1 className="text-3xl font-semibold mb-2">Academics</h1>
      <p className="text-text-2 text-sm mb-8 max-w-2xl">
        Academic information is currently entered manually. This is your own tracking, not an official
        school record — see the Eligibility section for how that distinction matters for eligibility
        decisions.
      </p>

      {/* ACADEMIC OVERVIEW */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Academic overview</div>
          <Link href="/profile" className="text-xs text-text-2 hover:text-text-1">Edit profile →</Link>
        </div>
        {!profile ? (
          <p className="text-text-2 text-sm">
            You haven&rsquo;t finished your athlete profile yet. <Link href="/profile" className="underline">Set it up</Link> to add your school and graduation year.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="mono text-text-3 text-xs mb-1">GPA</div>
              <div className="text-2xl font-semibold font-heading">{profile.gpa ?? "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">School</div>
              <div className="font-medium">{profile.schoolName || "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">Graduation year</div>
              <div className="font-medium">{profile.graduationYear ?? "—"}</div>
            </div>
          </div>
        )}
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <AcademicTerms initial={academicTerms.map((t) => ({ ...t }))} />
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{upcomingCount}</div>
          <div className="text-text-2 text-xs">Open assignments</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading" style={{ color: overdueCount > 0 ? "var(--danger)" : undefined }}>{overdueCount}</div>
          <div className="text-text-2 text-xs">Overdue</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{completedCount}</div>
          <div className="text-text-2 text-xs">Completed</div>
        </div>
      </div>

      {/* ASSIGNMENTS */}
      <section className="card p-5 sm:p-6 mb-8">
        <AssignmentTracker
          initial={assignments.map((a) => ({
            ...a,
            dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          }))}
        />
      </section>

      {/* GOALS */}
      <section className="card p-5 sm:p-6 mb-8">
        <AcademicGoals
          initial={academicGoals.map((g) => ({
            ...g,
            targetDate: g.targetDate ? g.targetDate.toISOString() : null,
          }))}
        />
      </section>

      {/* ELIGIBILITY */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="mono text-text-3 mb-4">Eligibility checklist</div>
        <EligibilityChecklist initial={eligibilityItems} />
      </section>

      {/* MENTA STUDY HELP */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="mono text-text-3">MENTA Study Help</div>
          {isAiConfigured() ? (
            <span className="badge badge-live">Connected</span>
          ) : (
            <span className="badge badge-demo">Not connected</span>
          )}
        </div>
        <StudyHelpChat
          configured={isAiConfigured()}
          initialConversationId={studyHelpConversation?.id ?? null}
          initialMessages={(studyHelpConversation?.messages ?? []).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))}
        />
      </section>
    </div>
  );
}
