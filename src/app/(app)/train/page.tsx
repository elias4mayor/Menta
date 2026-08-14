import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function TrainPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Training"
      phase="2"
      description="Workout library, tracking, today's workout, and a training plan tied to your goals."
      requires={[
        "Workout/Drill/TrainingSession data models",
        "A drill content library (either authored or licensed)",
        "Logging UI for completed sets/reps and perceived effort",
      ]}
    />
  );
}
