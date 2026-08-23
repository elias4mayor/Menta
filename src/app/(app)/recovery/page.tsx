import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { RecoveryCheckIn } from "@/components/RecoveryCheckIn";
import { RecoveryTrends } from "@/components/RecoveryTrends";
import { RecoveryGuidance } from "@/components/RecoveryGuidance";
import { WellnessIntegrations } from "@/components/WellnessIntegrations";
import { GlowWaveText } from "@/components/GlowWaveText";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export default async function RecoveryPage() {
  const user = await requireUser();
  const now = new Date();

  // HIGH-SENSITIVITY DATA — this query is the only place WellnessCheckIn is
  // read for UI purposes, always scoped to the signed-in user only. See the
  // model's doc comment in schema.prisma for the full security writeup.
  const checkIns = await prisma.wellnessCheckIn.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  const todayCheckIn =
    checkIns.find((c) => c.date >= startOfDay(now) && c.date <= endOfDay(now)) ?? null;

  const checkInsForClient = checkIns.map((c) => ({
    id: c.id,
    date: c.date.toISOString(),
    sleepHours: c.sleepHours,
    sleepQuality: c.sleepQuality,
    energy: c.energy,
    soreness: c.soreness,
    stress: c.stress,
    mood: c.mood,
    readiness: c.readiness,
    notes: c.notes,
  }));

  const todayForClient = todayCheckIn
    ? checkInsForClient.find((c) => c.id === todayCheckIn.id) ?? null
    : null;

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Recovery</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">Recovery &amp; wellness</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-1 max-w-2xl">
        A wellness tracker for sleep, energy, soreness, stress, and readiness — general guidance based on
        your own data, never a medical evaluation or a diagnosis.
      </p>
      <p className="text-text-3 text-xs mb-8 max-w-2xl">
        Your recovery and wellness information is private by default and is not displayed on your public
        recruiting profile.
      </p>

      {checkIns.length === 0 && (
        <div className="card p-6 mb-8 text-center">
          <p className="text-text-2 text-sm">
            Complete your first wellness check-in to start tracking your recovery.
          </p>
        </div>
      )}

      {/* TODAY */}
      <section className="card p-5 sm:p-6 mb-8">
        <RecoveryCheckIn todayCheckIn={todayForClient} />
      </section>

      {/* TRENDS */}
      <section className="mb-8">
        <div className="mono text-text-3 mb-4">Trends</div>
        <RecoveryTrends checkIns={checkInsForClient} />
      </section>

      {/* Recent check-ins */}
      {checkInsForClient.length > 0 && (
        <section className="card p-5 sm:p-6 mb-8">
          <div className="mono text-text-3 mb-4">Recent check-ins</div>
          <ul className="space-y-2 text-sm">
            {checkInsForClient.slice(0, 7).map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span className="text-text-2">{new Date(c.date).toLocaleDateString()}</span>
                <span className="text-text-3">
                  {[
                    c.sleepHours != null ? `Sleep ${c.sleepHours}h` : null,
                    c.readiness != null ? `Readiness ${c.readiness}/5` : null,
                    c.soreness != null ? `Soreness ${c.soreness}/5` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Logged"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* GUIDANCE */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="mono text-text-3 mb-4">General recovery guidance</div>
        <RecoveryGuidance checkIns={checkInsForClient} />
      </section>

      {/* AI Recovery Assistant — deliberately disabled */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">AI recovery insights</div>
          <span className="badge badge-demo">Not connected</span>
        </div>
        <p className="text-text-2 text-sm">
          AI recovery insights aren&rsquo;t connected yet. Wellness data is health-adjacent and sensitive —
          before MENTA AI can use it, this app needs documented data-sharing controls and explicit consent
          settings for sending it to an AI provider. That doesn&rsquo;t exist yet, so this stays off rather
          than sending your check-in data anywhere without that in place.
        </p>
      </section>

      {/* INTEGRATIONS */}
      <section className="card p-5 sm:p-6">
        <div className="mono text-text-3 mb-4">Wearable integrations</div>
        <WellnessIntegrations />
      </section>
    </div>
  );
}
