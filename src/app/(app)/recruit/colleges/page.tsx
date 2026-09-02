import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GlowWaveText } from "@/components/GlowWaveText";
import { isRecruitingIntelligenceConnected } from "@/lib/recruiting/provider-status";

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default async function CollegeFinderPage() {
  const user = await requireUser();
  const connected = isRecruitingIntelligenceConnected();

  const schools = await prisma.recruitingSchool.findMany({
    where: { userId: user.id },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Recruiting</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">Find where you fit.</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-8 max-w-xl">
        Explore programs based on your profile and preferences — not promises.
      </p>

      <section className="mb-8">
        <div className="mono text-text-3 mb-3">Your saved schools ({schools.length})</div>
        {schools.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-text-2 text-sm mb-3">You haven&rsquo;t added any target schools yet.</p>
            <Link href="/recruit#schools" className="btn-secondary">Add a school</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => (
              <li key={s.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <p className="text-text-2 text-xs mt-1">
                    {[s.division, s.location].filter(Boolean).join(" · ") || "No division/location set"}
                  </p>
                </div>
                <span className="badge">{statusLabel(s.status)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link href="/recruit#schools" className="text-xs text-text-2 hover:text-text-1">
            Manage schools →
          </Link>
        </div>
      </section>

      <section>
        <div className="mono text-text-3 mb-3">External recruiting intelligence</div>
        {connected ? null : (
          <div className="card p-6">
            <p className="text-text-2 text-sm mb-1">Recruiting intelligence is being connected.</p>
            <p className="text-text-3 text-xs">
              MENTA can already analyze your profile and the programs you&rsquo;re tracking above. College
              search, rosters, and coaching-staff intelligence from outside MENTA will appear here once a
              licensed recruiting data source is connected — nothing here is invented in the meantime.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
