import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function SafetyPage() {
  await requireUser();
  return (
    <ComingSoon
      title="MENTA Safety"
      phase="3"
      description="Emergency action plans, contacts, checklists, and weather awareness. Preparedness, not prediction — this will never claim to predict cardiac events, heat stroke, or concussions."
      requires={[
        "EmergencyContact/SafetyProtocol data models",
        "A legitimate weather/environment API (shows source, timestamp, and location — never invented readings)",
        "Review by a qualified safety professional before this is presented as usable in a real emergency",
      ]}
    />
  );
}
