import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { MindCheckIn } from "@/components/MindCheckIn";
import { MindTrends } from "@/components/MindTrends";
import { MindGuidance } from "@/components/MindGuidance";
import { competitionLabel } from "@/lib/sports";
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

export default async function MindPage() {
  const user = await requireUser();
  const now = new Date();

  const [profile, checkIns] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    // HIGH-SENSITIVITY DATA — the only place MindCheckIn is read for UI
    // purposes, always scoped to the signed-in user only. See the model's
    // doc comment in schema.prisma for the full security writeup.
    prisma.mindCheckIn.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const sport = profile?.sport ?? null;
  const comp = competitionLabel(sport);

  const todayCheckIn =
    checkIns.find((c) => c.date >= startOfDay(now) && c.date <= endOfDay(now)) ?? null;

  const checkInsForClient = checkIns.map((c) => ({
    id: c.id,
    date: c.date.toISOString(),
    pressure: c.pressure,
    confidence: c.confidence,
    focus: c.focus,
    readiness: c.readiness,
    todayGoal: c.todayGoal,
    notes: c.notes,
  }));

  const todayForClient = todayCheckIn
    ? checkInsForClient.find((c) => c.id === todayCheckIn.id) ?? null
    : null;

  return (
    <div className="max-w-4xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Mindset</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">Mental performance</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-1 max-w-2xl">
        What you need to handle today, not a history report. Pressure, confidence, and focus — logged in the
        moment, not scored into a single number.
      </p>
      <p className="text-text-3 text-xs mb-8 max-w-2xl">
        Your mental-performance information is private by default and is not displayed on your public
        recruiting profile.
      </p>

      {checkIns.length === 0 && (
        <div className="card p-6 mb-8 text-center">
          <p className="text-text-2 text-sm">
            Complete your first check-in to start tracking your mental performance{sport ? ` before your next ${comp.toLowerCase()}` : ""}.
          </p>
        </div>
      )}

      {/* TODAY */}
      <section className="card p-5 sm:p-6 mb-8">
        <MindCheckIn todayCheckIn={todayForClient} sport={sport} />
      </section>

      {/* TRENDS */}
      <section className="mb-8">
        <div className="mono text-text-3 mb-4">Trends</div>
        <MindTrends checkIns={checkInsForClient} />
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
                    c.confidence != null ? `Confidence ${c.confidence}/5` : null,
                    c.focus != null ? `Focus ${c.focus}/5` : null,
                    c.pressure != null ? `Pressure ${c.pressure}/5` : null,
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
        <div className="mono text-text-3 mb-4">General mental-performance guidance</div>
        <MindGuidance checkIns={checkInsForClient} sport={sport} />
      </section>

      {/* AI Mental Performance Assistant — deliberately disabled */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-text-3">AI mental-performance insights</div>
          <span className="badge badge-demo">Not connected</span>
        </div>
        <p className="text-text-2 text-sm">
          AI mental-performance insights aren&rsquo;t connected yet, for the same reason recovery insights
          aren&rsquo;t: this data is health-adjacent and sensitive, and this app needs documented data-sharing
          controls and explicit consent settings before sending it to an AI provider. That doesn&rsquo;t exist
          yet, so this stays off rather than sending your check-in data anywhere without that in place. When
          it does connect, it will supplement a mental-performance coach&rsquo;s work, not replace it.
        </p>
      </section>
    </div>
  );
}
