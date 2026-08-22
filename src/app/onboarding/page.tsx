import { requireUser } from "@/lib/auth-guards";
import { OnboardingExperience } from "@/components/OnboardingExperience";
import { CoachOnboarding } from "@/components/CoachOnboarding";
import { TrainerOnboarding } from "@/components/TrainerOnboarding";
import { ParentOnboarding } from "@/components/ParentOnboarding";
import { OnboardingGate } from "@/components/OnboardingGate";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  let content;
  if (user.role === "COACH") content = <CoachOnboarding name={user.name} />;
  else if (user.role === "TRAINER") content = <TrainerOnboarding name={user.name} />;
  else if (user.role === "PARENT") content = <ParentOnboarding name={user.name} />;
  else content = <OnboardingExperience name={user.name} />;

  return (
    <OnboardingGate role={user.role} firstName={user.name.split(" ")[0]}>
      {content}
    </OnboardingGate>
  );
}
