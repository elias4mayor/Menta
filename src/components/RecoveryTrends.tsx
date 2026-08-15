import type { WellnessCheckInItem } from "@/components/RecoveryCheckIn";

type MetricConfig = {
  key: keyof Pick<WellnessCheckInItem, "sleepHours" | "energy" | "soreness" | "stress" | "readiness">;
  label: string;
  unit: string;
  scaleMax: number;
};

const METRICS: MetricConfig[] = [
  { key: "sleepHours", label: "Sleep", unit: "h", scaleMax: 12 },
  { key: "energy", label: "Energy", unit: "/5", scaleMax: 5 },
  { key: "soreness", label: "Soreness", unit: "/5", scaleMax: 5 },
  { key: "stress", label: "Stress", unit: "/5", scaleMax: 5 },
  { key: "readiness", label: "Readiness", unit: "/5", scaleMax: 5 },
];

export function RecoveryTrends({ checkIns }: { checkIns: WellnessCheckInItem[] }) {
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
                <span className="text-sm text-text-2 ml-1">{m.unit}</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-10 mb-2">
              {values.map((v, i) => {
                const height = Math.min(100, (v / m.scaleMax) * 100);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${Math.max(8, height)}%`, background: "var(--grad-signal)" }}
                    title={`${v}${m.unit} — ${new Date(points[i].date).toLocaleDateString()}`}
                  />
                );
              })}
            </div>
            <div className="mono text-text-3 text-xs">
              Avg (last {values.length}): {avg.toFixed(1)}{m.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
