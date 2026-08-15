import type { WellnessCheckInItem } from "@/components/RecoveryCheckIn";

type Tip = { title: string; body: string };

const BASE_TIPS: Tip[] = [
  { title: "Sleep consistently", body: "Aim for a regular sleep and wake time, even on rest days — consistency matters as much as total hours." },
  { title: "Take soreness seriously", body: "Elevated soreness or fatigue is a signal to scale back intensity, not push through it." },
  { title: "Stay hydrated", body: "Hydration affects energy, recovery, and how sore you feel the next day." },
  { title: "Rest is training too", body: "Planned rest and lighter days are part of getting better, not time off from getting better." },
  { title: "Talk to a professional about real concerns", body: "For pain, injury, or anything that feels wrong, talk to a coach, athletic trainer, or doctor — not an app." },
];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function RecoveryGuidance({ checkIns }: { checkIns: WellnessCheckInItem[] }) {
  const recent = checkIns.slice(0, 7);
  const avgSleep = average(recent.map((c) => c.sleepHours).filter((v): v is number => v != null));
  const avgSoreness = average(recent.map((c) => c.soreness).filter((v): v is number => v != null));
  const avgStress = average(recent.map((c) => c.stress).filter((v): v is number => v != null));

  // Reorder tips so the most relevant one (based on the athlete's own recent
  // data) leads — this is deterministic threshold logic, not AI, and never
  // diagnoses anything.
  const tips = [...BASE_TIPS];
  const priorityIndex: number[] = [];
  if (avgSleep !== null && avgSleep < 7) priorityIndex.push(0);
  if (avgSoreness !== null && avgSoreness >= 3.5) priorityIndex.push(1);
  if (avgStress !== null && avgStress >= 3.5) priorityIndex.push(2);
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
        General guidance based on widely accepted training principles and, where relevant, your own recent
        check-ins. This is not medical advice, not an injury diagnosis, and never a claim that you are
        medically cleared to play — for real health or injury concerns, talk to a qualified professional.
      </p>
    </div>
  );
}
