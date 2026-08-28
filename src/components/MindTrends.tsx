import type { MindCheckInItem } from "@/components/MindCheckIn";

type MetricConfig = {
  key: keyof Pick<MindCheckInItem, "pressure" | "confidence" | "focus" | "readiness">;
  label: string;
};

const METRICS: MetricConfig[] = [
  { key: "pressure", label: "Pressure" },
  { key: "confidence", label: "Confidence" },
  { key: "focus", label: "Focus" },
  { key: "readiness", label: "Readiness" },
];

export function MindTrends({ checkIns }: { checkIns: MindCheckInItem[] }) {
  // oldest -> newest for left-to-right bar reading
  const chronological = [...checkIns].reverse();
  const withAnyMetric = METRICS.filter(
    (m) => chronological.filter((c) => c[m.key] != null).length >= 2
  );

  if (withAnyMetric.length === 0) {
    return (
      <p className="text-text-2 text-sm">
        Trends show up once you have a couple of check-ins logged for the same metric.
      </p>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {withAnyMetric.map((m) => {
        const points = chronological.filter((c) => c[m.key] != null).slice(-14);
        const values = points.map((p) => p[m.key] as number);
        const latest = values[values.length - 1];
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        return (
          <div key={m.key} className="card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-medium">{m.label}</div>
              <div className="text-xl font-semibold font-heading">
                {latest}
                <span className="text-sm text-text-2 ml-1">/5</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-10 mb-2">
              {values.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${Math.max(8, (v / 5) * 100)}%`, background: "var(--grad-signal)" }}
                  title={`${v}/5 — ${new Date(points[i].date).toLocaleDateString()}`}
                />
              ))}
            </div>
            <div className="mono text-text-3 text-xs">
              Avg (last {values.length}): {avg.toFixed(1)}/5
            </div>
          </div>
        );
      })}
    </div>
  );
}
