import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getVisibleExercise, toExerciseJson } from "@/lib/exercises";

const CATEGORY_LABELS: Record<string, string> = {
  WARMUP: "Warmup",
  STRENGTH: "Strength",
  SPEED: "Speed",
  AGILITY: "Agility",
  CONDITIONING: "Conditioning",
  MOBILITY: "Mobility",
  SKILL: "Skill",
  RECOVERY: "Recovery",
  COOLDOWN: "Cooldown",
};

/**
 * Deliberately not a "generic fitness blog" layout — name, what it's for,
 * the one cue that matters, then instructions and equipment. This is the
 * same information a live-session screen will eventually need front and
 * center for this exact exercise, so the shape stays close to that future
 * use rather than a long scrolling article.
 */
export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const record = await getVisibleExercise(user.id, id);
  if (!record) notFound();
  const exercise = toExerciseJson(record);

  return (
    <div className="max-w-2xl mx-auto dash-in dash-in-1">
      <Link href="/train/exercises" className="mono text-text-3 mb-2 inline-block">
        ← Exercise library
      </Link>
      <h1 className="text-3xl font-semibold mb-3">{exercise.name}</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="badge">{CATEGORY_LABELS[exercise.category] ?? exercise.category}</span>
        {exercise.sport && <span className="badge">{exercise.sport}</span>}
        {exercise.positions.map((p) => (
          <span key={p} className="badge">{p}</span>
        ))}
        <span className="mono text-text-3 text-xs self-center">
          {exercise.isGlobal ? "MENTA library" : `${exercise.teamName} — custom`}
        </span>
      </div>

      {exercise.coachingCues && (
        <div className="card p-4 mb-4" style={{ borderLeft: "3px solid var(--accent, currentColor)" }}>
          <div className="mono text-text-3 text-xs mb-1">Coaching cue</div>
          <p className="text-lg">{exercise.coachingCues}</p>
        </div>
      )}

      {exercise.instructions && (
        <div className="mb-6">
          <div className="mono text-text-3 text-xs mb-1">Instructions</div>
          <p className="text-text-2">{exercise.instructions}</p>
        </div>
      )}

      {exercise.equipment.length > 0 && (
        <div>
          <div className="mono text-text-3 text-xs mb-2">Equipment</div>
          <div className="flex flex-wrap gap-2">
            {exercise.equipment.map((eq) => (
              <span key={eq} className="badge">{eq}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
