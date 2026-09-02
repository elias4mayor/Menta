import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { RecruitingSchools } from "@/components/RecruitingSchools";
import { RecruitingOutreachPanel } from "@/components/RecruitingOutreachPanel";
import { GlowWaveText } from "@/components/GlowWaveText";
import { isAiConfigured } from "@/lib/ai";
import { isRecruitingIntelligenceConnected } from "@/lib/recruiting/provider-status";
import { computeOpportunities, type OpportunityRosterChangeInput, type OpportunitySignalInput } from "@/lib/recruiting/opportunities";

const SCHOOL_STATUSES = [
  "TARGET",
  "INTERESTED",
  "CONTACTED",
  "RESPONDED",
  "VISIT",
  "OFFER",
  "COMMITTED",
  "NOT_PURSUING",
];

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default async function RecruitPage() {
  const user = await requireUser();
  const recruitingIntelligenceConnected = isRecruitingIntelligenceConnected();

  // AthleteProfile.sport/.position are the deprecated compatibility mirror
  // (see the model's own doc comment) — fit-scoring and opportunity
  // ranking both read the real source of truth instead, per the
  // multi-sport rule against new reads of AthleteProfile.sport directly.
  // Fetched ahead of the Promise.all below since the opportunity queries
  // need its `.sport` value to scope what they fetch.
  const sportContext = await prisma.athleteSportContext.findFirst({
    where: { userId: user.id, isPrimary: true, isActive: true },
  });

  const [profile, recentStats, highlights, schools, activities, rosterChanges, signals] = await Promise.all([
    prisma.athleteProfile.findUnique({ where: { userId: user.id } }),
    prisma.performanceEntry.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
      take: 5,
    }),
    prisma.highlight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.recruitingSchool.findMany({
      where: { userId: user.id },
      include: { contacts: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.recruitingActivity.findMany({
      where: { userId: user.id },
      include: { school: true, contact: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    // Both gated on recruitingIntelligenceConnected (always false today —
    // see provider-status.ts) so these never fire pointless queries
    // against tables no ingestion job has ever written to.
    recruitingIntelligenceConnected && sportContext?.sport
      ? prisma.rosterChange.findMany({
          where: { program: { sport: sportContext.sport } },
          include: { program: { select: { sport: true, schoolName: true, division: true, collegeId: true } } },
          orderBy: { observedAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    recruitingIntelligenceConnected && sportContext?.sport
      ? prisma.recruitingSignal.findMany({
          where: { signalType: "coach_added", program: { sport: sportContext.sport } },
          include: { program: { select: { sport: true, schoolName: true, division: true, collegeId: true } } },
          orderBy: { observedAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),
  ]);

  const aiConfigured = isAiConfigured();
  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const aiEnvVar = aiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";

  const statusCounts = SCHOOL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = schools.filter((school) => school.status === s).length;
    return acc;
  }, {});
  const totalContacts = schools.reduce((sum, s) => sum + s.contacts.length, 0);
  const draftCount = activities.filter((a) => a.isDraft).length;

  const athleteFitContext = {
    sport: sportContext?.sport ?? null,
    position: sportContext?.position ?? null,
    graduationYear: profile?.graduationYear ?? null,
    heightCm: profile?.heightCm ?? null,
    weightKg: profile?.weightKg ?? null,
    gpa: profile?.gpa ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    hasRecentPerformanceData: recentStats.length > 0,
    hasFilm: highlights.length > 0,
  };

  const trackedCollegeIds = schools.map((s) => s.collegeId).filter((id): id is string => Boolean(id));
  const opportunities = computeOpportunities({
    // The where-clause above already restricts these to rows with a
    // matching, resolved program — Prisma's own type just can't express
    // that narrowing, since the relation is nullable in the schema.
    rosterChanges: rosterChanges.filter((rc) => rc.program !== null) as unknown as OpportunityRosterChangeInput[],
    signals: signals.filter((s) => s.program !== null) as unknown as OpportunitySignalInput[],
    athlete: {
      sport: sportContext?.sport ?? null,
      position: sportContext?.position ?? null,
      trackedCollegeIds,
    },
  });

  const schoolsForClient = schools.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    contacts: s.contacts.map((c) => ({
      ...c,
      lastContactedAt: c.lastContactedAt ? c.lastContactedAt.toISOString() : null,
    })),
  }));

  const activitiesForClient = activities.map((a) => ({
    id: a.id,
    type: a.type,
    subject: a.subject,
    body: a.body,
    isDraft: a.isDraft,
    createdAt: a.createdAt.toISOString(),
    school: a.school ? { id: a.school.id, name: a.school.name } : null,
    contact: a.contact ? { id: a.contact.id, name: a.contact.name } : null,
  }));

  return (
    <div className="max-w-5xl mx-auto dash-in dash-in-1">
      <div className="mono text-text-3 mb-2">Recruiting</div>
      <h1 className="text-3xl font-semibold mb-2"><GlowWaveText intensity="strong">Your recruiting dashboard</GlowWaveText></h1>
      <p className="text-text-2 text-sm mb-8 max-w-2xl">
        These are organizational and drafting tools — MENTA never guarantees a scholarship, offer,
        admission, or roster spot, and doesn&rsquo;t contact schools on your behalf. Everything here is
        either your own data or something you entered yourself.
      </p>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <a href="#schools" className="btn-secondary">+ Add school</a>
        <a href="#schools" className="btn-secondary">+ Add coach</a>
        <a href="#outreach" className="btn-secondary">Draft outreach</a>
        <a href="#profile" className="btn-secondary">View recruiting profile</a>
        <Link href="/recruit/colleges" className="btn-secondary">Find colleges</Link>
        <Link href="/recruit/coaches" className="btn-secondary">Find coaches</Link>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{schools.length}</div>
          <div className="text-text-2 text-xs">Target schools</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{totalContacts}</div>
          <div className="text-text-2 text-xs">Contacts</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{statusCounts.OFFER + statusCounts.COMMITTED}</div>
          <div className="text-text-2 text-xs">Offers / committed</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold font-heading">{draftCount}</div>
          <div className="text-text-2 text-xs">Drafts written</div>
        </div>
      </div>

      {/* Recruiting profile */}
      <section id="profile" className="card p-5 sm:p-6 mb-8 scroll-mt-20">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Recruiting profile</div>
          <Link href="/profile" className="text-xs text-text-2 hover:text-text-1">
            Edit profile →
          </Link>
        </div>
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 mono text-lg"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {initials(user.name) || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-text-2 text-sm">
              {[profile?.sport, profile?.position].filter(Boolean).join(" · ") || "Sport/position not set"}
            </p>
            <p className="text-text-3 text-xs mt-1">
              Visibility: {profile ? statusLabel(profile.visibility) : "Private"} — visible to coaches only when
              set to Recruiting or Public
            </p>
          </div>
        </div>

        {!profile ? (
          <p className="text-text-2 text-sm mt-5">
            You haven&rsquo;t finished your athlete profile yet.{" "}
            <Link href="/profile" className="underline">Set it up</Link> to fill this out.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
            <div>
              <div className="mono text-text-3 text-xs mb-1">Height</div>
              <div>{profile.heightCm ? `${profile.heightCm} cm` : "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">Weight</div>
              <div>{profile.weightKg ? `${profile.weightKg} kg` : "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">Grad year</div>
              <div>{profile.graduationYear ?? "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">GPA</div>
              <div>{profile.gpa ?? "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">School</div>
              <div>{profile.schoolName || "—"}</div>
            </div>
            <div>
              <div className="mono text-text-3 text-xs mb-1">Location</div>
              <div>{[profile.city, profile.state].filter(Boolean).join(", ") || "—"}</div>
            </div>
          </div>
        )}

        {profile?.bio && (
          <div className="mt-5">
            <div className="mono text-text-3 text-xs mb-1">Bio</div>
            <p className="text-text-2 text-sm">{profile.bio}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <div>
            <div className="mono text-text-3 text-xs mb-2">Athletic statistics</div>
            {recentStats.length === 0 ? (
              <p className="text-text-3 text-xs">
                None logged yet. <Link href="/performance" className="underline">Add stats</Link>
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {recentStats.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span className="text-text-2">{s.statName}</span>
                    <span>{s.value}{s.unit ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mono text-text-3 text-xs mb-2">Film & highlights</div>
            {highlights.length === 0 ? (
              <p className="text-text-3 text-xs">
                None yet. <Link href="/film" className="underline">Upload film</Link>
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {highlights.map((h) => (
                  <li key={h.id}>
                    <Link href="/highlights" className="text-text-2 hover:text-text-1">{h.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Target schools + contacts */}
      <section id="schools" className="mb-8 scroll-mt-20">
        <RecruitingSchools initial={schoolsForClient} athlete={athleteFitContext} />
      </section>

      {/* Opportunities — ranked roster/coaching signals from a licensed
          recruiting data provider, scoped to the athlete's own sport and
          position. Always an honest empty/not-connected state today; see
          src/lib/recruiting/opportunities.ts. */}
      <section id="opportunities" className="mb-8 scroll-mt-20">
        <div className="mono text-text-3 mb-3">Opportunities</div>
        {!recruitingIntelligenceConnected ? (
          <div className="card p-6">
            <p className="text-text-2 text-sm mb-1">Recruiting intelligence is being connected.</p>
            <p className="text-text-3 text-xs">
              Once a licensed recruiting data source is connected, MENTA will surface real roster and
              coaching changes relevant to your sport and position here — nothing here is invented in the
              meantime.
            </p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-text-2 text-sm">
              No relevant roster or coaching changes yet{sportContext?.sport ? ` for ${sportContext.sport}` : ""}.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {opportunities.slice(0, 10).map((o) => (
              <li key={o.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {o.schoolName}
                    {o.division ? <span className="text-text-3 text-xs font-normal"> · {o.division}</span> : null}
                  </div>
                  {o.isTrackedSchool && <span className="badge">Tracking</span>}
                </div>
                <p className="text-text-2 text-sm mt-1">{o.headline}</p>
                <p className="text-text-3 text-xs mt-1">{o.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AI outreach + activity */}
      <section id="outreach" className="scroll-mt-20">
        <RecruitingOutreachPanel
          schools={schoolsForClient}
          initialActivities={activitiesForClient}
          aiConfigured={aiConfigured}
          aiEnvVar={aiEnvVar}
        />
      </section>
    </div>
  );
}
