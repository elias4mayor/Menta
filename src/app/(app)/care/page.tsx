import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
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
      <div className="max-w-2xl mx-auto dash-in dash-in-1">
        <div className="mono text-text-3 mb-2">Care</div>
        <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Care status</GlowWaveText></h1>
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
    <div className="max-w-2xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Care</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">MENTA Care</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-8">
        Connect with an authorized athletic trainer, doctor, or physical therapist on your team. Only your provider sees the details of your request — never your coach.
      </p>
      <CareRequestFlow teams={memberships.map((m) => ({ id: m.team.id, name: m.team.name }))} />
    </div>
  );
}
