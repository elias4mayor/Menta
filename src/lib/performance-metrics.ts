export const PERFORMANCE_METRIC_IDS = ["forty", "ten", "shuttle", "vertical", "broad", "bench", "squat", "deadlift", "pullups", "mile"] as const;
export type PerformanceMetricID = (typeof PERFORMANCE_METRIC_IDS)[number];
export const PERFORMANCE_METRICS: { id: PerformanceMetricID; name: string; unit: string; direction: "LOWER" | "HIGHER"; min: number; max: number }[] = [
  { id: "forty", name: "40-yard dash", unit: "sec", direction: "LOWER", min: 2, max: 60 },
  { id: "ten", name: "10-yard split", unit: "sec", direction: "LOWER", min: 0.5, max: 30 },
  { id: "shuttle", name: "5-10-5 shuttle", unit: "sec", direction: "LOWER", min: 2, max: 60 },
  { id: "vertical", name: "Vertical jump", unit: "in", direction: "HIGHER", min: 0.1, max: 80 },
  { id: "broad", name: "Broad jump", unit: "in", direction: "HIGHER", min: 0.1, max: 200 },
  { id: "bench", name: "Bench press", unit: "lb", direction: "HIGHER", min: 1, max: 1500 },
  { id: "squat", name: "Back squat", unit: "lb", direction: "HIGHER", min: 1, max: 2000 },
  { id: "deadlift", name: "Deadlift", unit: "lb", direction: "HIGHER", min: 1, max: 2000 },
  { id: "pullups", name: "Pull-ups", unit: "reps", direction: "HIGHER", min: 0, max: 500 },
  { id: "mile", name: "Mile run", unit: "sec", direction: "LOWER", min: 120, max: 7200 },
];
export function performanceMetric(id: string) { return PERFORMANCE_METRICS.find((metric) => metric.id === id); }
