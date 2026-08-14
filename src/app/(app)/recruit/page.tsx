import { requireUser } from "@/lib/auth-guards";
import { ComingSoon } from "@/components/ComingSoon";

export default async function RecruitPage() {
  await requireUser();
  return (
    <ComingSoon
      title="Recruiting"
      phase="2"
      description="A recruiting profile, target-school list, coach contacts, and an AI outreach assistant that drafts messages — never guarantees an offer, scholarship, or roster spot."
      requires={[
        "RecruitingSchool/Coach/RecruitingContact data models",
        "A legitimate, licensed source for college and coach data — never fabricated names or contact info",
        "Outreach drafting via MENTA AI, scoped to the athlete's own data only",
      ]}
    />
  );
}
