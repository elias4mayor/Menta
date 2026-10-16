"use client";

import { Select } from "@/components/Select";
import { PERFORMANCE_METRICS, type PerformanceMetricID } from "@/lib/performance-metrics";

export type AthleteBaseline = { heightCm: string; weightKg: string; records: Partial<Record<PerformanceMetricID, string>> };

export function AthleteBaselineFields({ value, onChange }: { value: AthleteBaseline; onChange: (value: AthleteBaseline) => void }) {
  return <div className="onb-fields space-y-5">
    <p className="onb-micro">Optional. Record measurements you already know. You can skip these and update them later.</p>
    <div>
      <label className="field-label" htmlFor="onb-height">Height</label>
      <Select id="onb-height" value={value.heightCm} onChange={(heightCm) => onChange({ ...value, heightCm })} placeholder="Choose height" options={Array.from({ length: 151 }, (_, i) => {
        const cm = i + 100; const inches = Math.round(cm / 2.54);
        return { value: String(cm), label: `${Math.floor(inches / 12)}′ ${inches % 12}″ · ${cm} cm` };
      })} />
    </div>
    <div>
      <label className="field-label" htmlFor="onb-weight">Weight</label>
      <Select id="onb-weight" value={value.weightKg} onChange={(weightKg) => onChange({ ...value, weightKg })} placeholder="Choose weight" options={Array.from({ length: 281 }, (_, i) => ({ value: String(i + 20), label: `${Math.round((i + 20) * 2.20462)} lb · ${i + 20} kg` }))} />
    </div>
    <details className="space-y-3">
      <summary className="field-label cursor-pointer py-3">Add personal records (optional)</summary>
      <p className="text-sm text-text-2">Enter existing results only—no need to attempt a max lift or test to finish setup. Leave unfamiliar tests blank.</p>
      {PERFORMANCE_METRICS.map((metric) => <div key={metric.id} className="flex items-center gap-3">
        <label className="flex-1 text-sm" htmlFor={`baseline-${metric.id}`}>{metric.name} <span className="text-text-3">({metric.unit})</span></label>
        <input id={`baseline-${metric.id}`} type="number" inputMode="decimal" min={metric.min} max={metric.max} step={metric.unit === "reps" ? 1 : "any"} className="field-input w-28" placeholder="Skip" value={value.records[metric.id] ?? ""} onChange={(event) => onChange({ ...value, records: { ...value.records, [metric.id]: event.target.value } })} />
      </div>)}
    </details>
  </div>;
}
