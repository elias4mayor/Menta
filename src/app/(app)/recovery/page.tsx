import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function RecoveryPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Recovery"
      phase="3"
      description="Sleep, training load, and wellness check-ins with general guidance — never a diagnosis."
      requires={[
        "WellnessCheckIn data model, treated as high-sensitivity health data",
        "Optional wearable integrations (each one is a separate vendor integration)",
        "Encryption-at-rest and access logging for this data before it goes live",
      ]}
    />
  );
}
