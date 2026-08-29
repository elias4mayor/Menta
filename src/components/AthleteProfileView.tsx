import Link from "next/link";
import { GlowWaveText } from "@/components/GlowWaveText";
import { EmptyState } from "@/components/EmptyState";
import { TodaysSessionCard } from "@/components/TodaysSessionCard";
import { GoalsPanel } from "@/components/GoalsPanel";
import { CoachNotes } from "@/components/CoachNotes";
import type { AthleteProfileData } from "@/lib/athlete-profile";

/**
 * One presentational component for both the self-view (/profile) and the
 * coach-view (/team/[teamId]/athletes/[athleteId]) — the underlying data
 * shape is identical (AthleteProfileData); only `mode` changes what's
 * interactive (GoalsPanel's add-goal form, Coach Notes) versus read-only.
 * All authorization already happened before this component ever receives
 * data — it never fetches anything itself.
 */
export function AthleteProfileView({
  profile,
  mode,
  teamId,
}: {
  profile: AthleteProfileData;
  mode: "self" | "coach";
  teamId?: string;
}) {
  const { identity } = profile;
  const primaryLine = [identity.position, identity.sport].filter(Boolean).join(" · ");

  return (
    <div className="max-w-3xl mx-auto dash-in dash-in-1 space-y-8">
      {/* HEADER */}
      <div>
        {mode === "coach" && <div className="mono text-text-3 mb-2">Athlete profile</div>}
        <h1 className="text-3xl font-semibold mb-2">
          <GlowWaveText intensity="strong">{identity.name}</GlowWaveText>
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-2">
          {primaryLine && <span>{primaryLine}</span>}
          {identity.schoolName && <span>· {identity.schoolName}</span>}
          {identity.graduationYear && <span>· Class of {identity.graduationYear}</span>}
        </div>
        {identity.teams.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {identity.teams.map((t) => (
              <span key={t.id} className="badge">{t.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* TODAY */}
      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Today</div>
        {mode === "self" ? (
          <TodaysSessionCard session={profile.today.todaySession} />
        ) : profile.today.todaySession ? (
          <p className="text-sm text-text-2 mb-4">
            {profile.today.todaySession.status === "LIVE" ? "Live now: " : "Scheduled: "}
            {profile.today.todaySession.title}
          </p>
        ) : (
          <p className="text-text-3 text-sm mb-4">No training session today.</p>
        )}
        {profile.today.today.length === 0 ? (
          <p className="text-text-3 text-sm">Nothing else on the schedule today.</p>
        ) : (
          <ul className="text-sm space-y-1.5">
            {profile.today.today.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between">
                <span>{item.title}</span>
                <span className="text-text-3 text-xs">{item.kind}</span>
              </li>
            ))}
          </ul>
        )}
        {profile.signals.length > 0 && (
          <ul className="mt-4 pt-4 border-t border-[var(--border-soft)] space-y-1.5">
            {profile.signals.map((s, i) => (
              <li key={i} className="text-xs text-text-3">{s.message}</li>
            ))}
          </ul>
        )}
      </section>

      {/* PERFORMANCE */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Performance</div>
          {mode === "self" && <Link href="/performance" className="text-xs text-text-2 hover:text-text-1">All stats →</Link>}
        </div>
        {profile.performance.length === 0 ? (
          <EmptyState title="No performance entries yet" description="Logged stats will show up here." />
        ) : (
          <ul className="text-sm space-y-1.5">
            {profile.performance.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-text-2">{p.statName}</span>
                <span>{p.value}{p.unit ? ` ${p.unit}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* TRAINING */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Training</div>
          {mode === "self" && <Link href="/train" className="text-xs text-text-2 hover:text-text-1">Go to TRAIN →</Link>}
        </div>
        {profile.training.currentPrescriptions.length === 0 && profile.training.recentSets.length === 0 ? (
          <EmptyState title="No training activity yet" description="Assigned programs and logged sets will show up here." />
        ) : (
          <>
            {profile.training.currentPrescriptions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-text-3 mb-2">Current prescription</div>
                <ul className="text-sm space-y-1.5">
                  {profile.training.currentPrescriptions.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>{p.exerciseName} <span className="text-text-3 text-xs">({p.programTitle})</span></span>
                      <span className="text-text-2">
                        {p.prescribedSets ?? "—"}×{p.prescribedReps ?? "—"}
                        {p.prescribedLoad ? ` @ ${p.prescribedLoad}${p.prescribedLoadUnit ?? ""}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.training.recentSets.length > 0 && (
              <div>
                <div className="text-xs text-text-3 mb-2">Recent sets</div>
                <ul className="text-sm space-y-1.5">
                  {profile.training.recentSets.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>{s.exerciseName}</span>
                      <span className="text-text-2">
                        {s.reps ?? "—"} reps{s.weight ? ` @ ${s.weight}${s.weightUnit ?? ""}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* FILM */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Film</div>
          {mode === "self" && <Link href="/film" className="text-xs text-text-2 hover:text-text-1">Film library →</Link>}
        </div>
        {profile.film.length === 0 && profile.filmAssignments.length === 0 && profile.highlights.length === 0 ? (
          <EmptyState title="No film yet" description="Uploaded film, assignments, and highlights will show up here." />
        ) : (
          <div className="space-y-4">
            {profile.film.length > 0 && (
              <ul className="text-sm space-y-1.5">
                {profile.film.map((f) => (
                  <li key={f.id} className="flex items-center justify-between">
                    <span>{f.title}</span>
                    <span className="text-text-3 text-xs">{f.clipCount} clip{f.clipCount === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ul>
            )}
            {profile.filmAssignments.length > 0 && (
              <div className="pt-3 border-t border-[var(--border-soft)]">
                <div className="text-xs text-text-3 mb-2">Open assignments</div>
                <ul className="text-sm space-y-1.5">
                  {profile.filmAssignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{a.title}</span>
                      <span className="text-text-3 text-xs">{a.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.highlights.length > 0 && (
              <div className="pt-3 border-t border-[var(--border-soft)]">
                <div className="text-xs text-text-3 mb-2">Highlight reels</div>
                <ul className="text-sm space-y-1.5">
                  {profile.highlights.map((h) => (
                    <li key={h.id} className="flex items-center justify-between">
                      <span>{h.title}</span>
                      <span className="text-text-3 text-xs">{h.visibleClipCount} clip{h.visibleClipCount === 1 ? "" : "s"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ACADEMICS */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Academics</div>
          {mode === "self" && <Link href="/school" className="text-xs text-text-2 hover:text-text-1">Go to Academics →</Link>}
        </div>
        {profile.academics.gpa === null && profile.academics.openAssignmentCount === 0 ? (
          <EmptyState title="No academic activity yet" description="GPA and assignments will show up here." />
        ) : (
          <ul className="text-sm space-y-1.5">
            {profile.academics.gpa !== null && (
              <li className="flex items-center justify-between"><span className="text-text-2">GPA</span><span>{profile.academics.gpa}</span></li>
            )}
            <li className="flex items-center justify-between">
              <span className="text-text-2">Open assignments</span>
              <span>{profile.academics.openAssignmentCount}</span>
            </li>
            {profile.academics.nextDueTitle && (
              <li className="flex items-center justify-between">
                <span className="text-text-2">Next due</span>
                <span>{profile.academics.nextDueTitle}{profile.academics.nextDueDate ? ` · ${profile.academics.nextDueDate.toLocaleDateString()}` : ""}</span>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* RECRUITING */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-text-3">Recruiting</div>
          {mode === "self" && <Link href="/recruit" className="text-xs text-text-2 hover:text-text-1">Go to Recruiting →</Link>}
        </div>
        {profile.recruiting.schoolCount === 0 ? (
          <EmptyState title="No recruiting activity yet" description="Tracked schools and outreach will show up here." />
        ) : (
          <ul className="text-sm space-y-1.5">
            {profile.recruiting.topSchools.map((s) => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{s.name}</span>
                <span className="text-text-3 text-xs">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* GOALS */}
      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Goals</div>
        {mode === "self" ? (
          <GoalsPanel initial={profile.goals} />
        ) : profile.goals.length === 0 ? (
          <EmptyState title="No active goals" description="This athlete hasn't set any active goals." />
        ) : (
          <ul className="text-sm space-y-1.5">
            {profile.goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between">
                <span>{g.title}</span>
                <span className="text-text-3 text-xs">{g.progress}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COACH NOTES — coach-view only, and only when the caller was authorized to fetch them at all. */}
      {mode === "coach" && teamId && profile.coachNotes !== null && (
        <section className="card p-6 border-[var(--border-strong)]">
          <div className="mono text-text-3 mb-1">Coach notes</div>
          <p className="text-text-3 text-xs mb-4">Private to coaching staff. Never shown to the athlete.</p>
          <CoachNotes teamId={teamId} athleteId={identity.userId} initialNotes={profile.coachNotes} />
        </section>
      )}
    </div>
  );
}
