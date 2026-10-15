import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { CareRequestFlow } from "@/components/CareRequestFlow";
import { CareParentStatus } from "@/components/CareParentStatus";

export default async function CarePage() {
  const user = await requireUser("/care");

  if (user.role === "PARENT") {
    const links = await prisma.guardianLink.findMany({
      where: { guardianId: user.id, status: "APPROVED" },
      include: { athlete: { select: { id: true, name: true } } },
    });

    return (
      <div className="workspace-page dash-in dash-in-1">
        <WorkspaceHeader section="You" title="Care status" description="Stay informed through your approved care connections." icon="safety" />
        {links.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-text-2 text-sm">Once you&rsquo;re an approved guardian for an athlete, their care status appears here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((l) => (
              <CareParentStatus key={l.athleteId} athleteId={l.athlete.id} athleteName={l.athlete.name} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id },
    include: { team: { select: { id: true, name: true } } },
  });

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader section="You" title="MENTA Care" description="Get support from the people authorized to care for you." icon="safety" />
      <p className="text-text-2 text-sm mb-8">
        Connect with an authorized athletic trainer, doctor, or physical therapist on your team. Only your provider sees the details of your request — never your coach.
      </p>
      <CareRequestFlow teams={memberships.map((m) => ({ id: m.team.id, name: m.team.name }))} />
    </div>
  );
}
