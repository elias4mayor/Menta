import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function PerformancePage() {
  await requireUser();
  return (
    <ComingSoon
      title="Performance"
      phase="2"
      description="Stats, personal records, and trends over time, filterable by season."
      requires={[
        "A PerformanceMetric data model tied to sport/position",
        "Manual entry UI at minimum; wearable/stat-provider integrations later",
        "Chart components for trend visualization",
      ]}
    />
  );
}
