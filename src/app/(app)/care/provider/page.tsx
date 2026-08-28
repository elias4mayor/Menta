import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GlowWaveText } from "@/components/GlowWaveText";
import { ProviderCareQueue } from "@/components/ProviderCareQueue";
import { ProviderAvailabilityManager } from "@/components/ProviderAvailabilityManager";
import { PROVIDER_TEAM_ROLES } from "@/lib/permissions";

export default async function ProviderCarePage() {
  const user = await requireUser("/care/provider");
  if (!PROVIDER_TEAM_ROLES.includes(user.role as "TRAINER" | "DOCTOR")) {
    redirect("/care");
  }

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: user.id, teamRole: { in: PROVIDER_TEAM_ROLES } },
    include: { team: { select: { id: true, name: true } } },
  });
  const verifiedTeams = memberships.filter((m) => m.verifiedAt).map((m) => ({ id: m.team.id, name: m.team.name }));
  const pendingTeams = memberships.filter((m) => !m.verifiedAt).map((m) => m.team.name);

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Care</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Provider queue</GlowWaveText></h1>

      {pendingTeams.length > 0 && (
        <div className="card p-4 mb-6 text-sm">
          Waiting on a coach to verify you on: {pendingTeams.join(", ")}. Athletes can&rsquo;t book you until then.
        </div>
      )}

      <section className="mb-10">
        <ProviderCareQueue />
      </section>

      <section>
        <div className="mono text-text-3 mb-3">Your availability</div>
        <ProviderAvailabilityManager teams={verifiedTeams} />
      </section>
    </div>
  );
}
