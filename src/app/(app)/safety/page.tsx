import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { canManageTeam } from "@/lib/permissions";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import { PersonalSafetyProfile } from "@/components/PersonalSafetyProfile";
import { SafetyChecklist } from "@/components/SafetyChecklist";
import { TeamSafety } from "@/components/TeamSafety";
import { HeatLightningEducation } from "@/components/HeatLightningEducation";

export default async function SafetyPage() {
  const user = await requireUser();

  const [contacts, safetyProfile, checklistItems, memberships, protocols, teamChecklistItems] =
    await Promise.all([
      prisma.emergencyContact.findMany({ where: { userId: user.id }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
      prisma.personalSafetyProfile.findUnique({ where: { userId: user.id } }),
      prisma.safetyChecklistItem.findMany({ where: { userId: user.id }, orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
      prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: true } }),
      prisma.teamSafetyProtocol.findMany({
        where: { team: { memberships: { some: { userId: user.id } } } },
        include: { team: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.teamSafetyChecklistItem.findMany({
        where: { team: { memberships: { some: { userId: user.id } } } },
        include: { team: true },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      }),
    ]);

  const teams = await Promise.all(
    memberships.map(async (m) => ({
      id: m.team.id,
      name: m.team.name,
      canManage: await canManageTeam(user, m.team.id),
    }))
  );

  return (
    <div className="max-w-5xl">
      <div className="mono text-text-3 mb-2">MENTA Safety</div>
      <h1 className="text-3xl font-semibold mb-4">Safety & preparedness</h1>

      <div className="card p-5 mb-8" style={{ borderColor: "var(--warning)" }}>
        <p className="text-sm mb-2">
          <strong>MENTA Safety is an organizational tool, not a medical or emergency-prediction system.</strong>{" "}
          It does not predict cardiac events, heat illness, or concussions, and nothing here means an
          athlete is medically cleared to play.
        </p>
        <p className="text-text-2 text-sm">
          This feature has not been reviewed by a qualified safety professional and is not a substitute
          for your team&rsquo;s official emergency procedures, an athletic trainer, or a doctor.{" "}
          <strong>In a real emergency, call 911 (or your local emergency number) immediately.</strong>
        </p>
      </div>

      {/* Individual: emergency contacts + personal safety profile */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="mono text-text-3 mb-4">Your emergency info</div>
        <EmergencyContacts initial={contacts} />
        <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <PersonalSafetyProfile
            initial={{
              allergies: safetyProfile?.allergies ?? "",
              medicalNotes: safetyProfile?.medicalNotes ?? "",
              medicationNotes: safetyProfile?.medicationNotes ?? "",
              emergencyPlanNotes: safetyProfile?.emergencyPlanNotes ?? "",
            }}
          />
        </div>
        <p className="text-text-3 text-xs mt-4">
          Your emergency contacts and medical information are private by default and are never shown on
          your public profile, recruiting profile, or team pages.
        </p>
      </section>

      {/* Individual checklist */}
      <section className="card p-5 sm:p-6 mb-8">
        <SafetyChecklist initial={checklistItems} />
      </section>

      {/* Team-level */}
      <section className="card p-5 sm:p-6 mb-8">
        <TeamSafety
          teams={teams}
          initialProtocols={protocols}
          initialChecklistItems={teamChecklistItems}
        />
      </section>

      {/* Static education */}
      <section className="card p-5 sm:p-6">
        <div className="mono text-text-3 mb-4">Heat & lightning safety education</div>
        <HeatLightningEducation />
      </section>
    </div>
  );
}
