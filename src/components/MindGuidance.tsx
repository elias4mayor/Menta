import type { MindCheckInItem } from "@/components/MindCheckIn";
import { competitionLabel } from "@/lib/sports";

type Tip = { title: string; body: string };

function baseTips(comp: string): Tip[] {
  return [
    { title: "Name it before it runs the show", body: `A quick pressure or confidence check-in before a ${comp} does more than avoiding it does — naming a feeling is usually enough to loosen its grip.` },
    { title: "Focus on the process, not the outcome", body: "A goal like \"execute my routine\" holds up under pressure better than a goal like \"win\" — you control one of them." },
    { title: "Build a real reset routine", body: "Decide your after-a-mistake routine before you need it — one cue (a breath, a phrase, a physical reset) you go to every time, not something you invent mid-competition." },
    { title: "Confidence is trained, not found", body: "Confidence check-ins over time show you your own pattern — what actually raises it for you, not a generic tip." },
    { title: "Talk to a real person about real pressure", body: "For anything that feels like more than performance stress, talk to a coach, mental-performance professional, or counselor — not an app." },
  ];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function MindGuidance({ checkIns, sport }: { checkIns: MindCheckInItem[]; sport?: string | null }) {
  const comp = competitionLabel(sport).toLowerCase();
  const tips = baseTips(comp);
  const recent = checkIns.slice(0, 7);
  const avgPressure = average(recent.map((c) => c.pressure).filter((v): v is number => v != null));
  const avgConfidence = average(recent.map((c) => c.confidence).filter((v): v is number => v != null));
  const avgFocus = average(recent.map((c) => c.focus).filter((v): v is number => v != null));

  // Deterministic threshold reordering based on the athlete's own recent
  // data — not AI, never a diagnosis, same pattern as RecoveryGuidance.
  const priorityIndex: number[] = [];
  if (avgPressure !== null && avgPressure >= 3.5) priorityIndex.push(0);
  if (avgConfidence !== null && avgConfidence <= 2.5) priorityIndex.push(3);
  if (avgFocus !== null && avgFocus <= 2.5) priorityIndex.push(2);
  const ordered = [
    ...priorityIndex.map((i) => tips[i]),
    ...tips.filter((_, i) => !priorityIndex.includes(i)),
  ];

  return (
    <div>
      <ul className="space-y-3">
        {ordered.map((tip) => (
          <li key={tip.title} className="text-sm">
            <span className="font-medium">{tip.title}.</span>{" "}
            <span className="text-text-2">{tip.body}</span>
          </li>
        ))}
      </ul>
      <p className="text-text-3 text-xs mt-4">
        General mental-performance guidance and, where relevant, your own recent check-ins. Not mental-health
        treatment, not a diagnosis, and never a claim about your competitive readiness — for real concerns,
        talk to a qualified professional.
      </p>
    </div>
  );
}
