import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { hasGuardianScope } from "@/lib/permissions";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

/**
 * Read-only. A parent never edits their athlete's academic records — that
 * stays exclusively on the athlete's own /school page. Each section here
 * is independently gated by its own GuardianScope: an APPROVED GuardianLink
 * alone shows nothing — the athlete has to have explicitly shared each
 * piece. Never shows WellnessCheckIn/MindCheckIn or anything outside the
 * two academic scopes this page exists for.
 */
export default async function ParentAthleteAcademicsPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const user = await requireUser();
  const { athleteId } = await params;

  const link = await prisma.guardianLink.findFirst({
    where: { guardianId: user.id, athleteId, status: "APPROVED" },
    include: { athlete: { select: { id: true, name: true } } },
  });
  if (!link) notFound();

  const [canViewStatus, canViewAssignments] = await Promise.all([
    hasGuardianScope(user.id, athleteId, "VIEW_ACADEMIC_STATUS"),
    hasGuardianScope(user.id, athleteId, "VIEW_ACADEMIC_ASSIGNMENTS"),
  ]);

  const [eligibilityItems, assignments] = await Promise.all([
    canViewStatus
      ? prisma.eligibilityChecklistItem.findMany({
          where: { userId: athleteId },
          orderBy: [{ status: "asc" }, { category: "asc" }],
        })
      : Promise.resolve(null),
    canViewAssignments
      ? prisma.assignment.findMany({
          where: { userId: athleteId },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 20,
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader
        section="You"
        title={`${link.athlete.name}'s academics`}
        description="Shared with you by your athlete — read-only."
        icon="school"
      />

      <div className="card p-5 mb-5">
        <div className="mono text-text-3 mb-3">Eligibility status</div>
        {!canViewStatus ? (
          <p className="text-text-2 text-sm">{link.athlete.name} hasn&rsquo;t shared eligibility status with you.</p>
        ) : eligibilityItems!.length === 0 ? (
          <p className="text-text-2 text-sm">No eligibility items on file.</p>
        ) : (
          <ul className="space-y-2">
            {eligibilityItems!.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="text-text-3">{item.category}</span> — {item.title}
                </span>
                <span className="badge">{item.status.replace(/_/g, " ").toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <div className="mono text-text-3 mb-3">Assignments</div>
        {!canViewAssignments ? (
          <p className="text-text-2 text-sm">{link.athlete.name} hasn&rsquo;t shared assignment details with you.</p>
        ) : assignments!.length === 0 ? (
          <p className="text-text-2 text-sm">No assignments on file.</p>
        ) : (
          <ul className="space-y-2">
            {assignments!.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {a.title}
                  {a.subject ? <span className="text-text-3"> — {a.subject}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {a.dueDate ? <span className="text-text-3">{a.dueDate.toLocaleDateString()}</span> : null}
                  <span className="badge">{a.status.replace(/_/g, " ").toLowerCase()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
