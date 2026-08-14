import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function SchoolPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Academics"
      phase="2"
      description="GPA tracker, assignments, eligibility checklist, and AI study help that explains concepts rather than doing the work."
      requires={[
        "AcademicGoal/Assignment data models",
        "A clear policy line between MENTA-entered data and any future school/FERPA-covered data feed",
        "Guardrails on the AI study-help prompts to avoid facilitating cheating",
      ]}
    />
  );
}
