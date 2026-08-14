import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function MindPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Mindset"
      phase="2"
      description="Check-ins, journaling, and breathing exercises, framed as athletic mental performance — not therapy or clinical mental-health treatment."
      requires={[
        "A journaling/check-in data model, treated as high-sensitivity data",
        "Clear escalation copy for entries that suggest a safety concern",
        "Review by someone with mental-performance/psychology expertise before launch",
      ]}
    />
  );
}
