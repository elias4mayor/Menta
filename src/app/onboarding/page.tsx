import { requireUser } from "@/lib/auth-guards";
import { OnboardingExperience } from "@/components/OnboardingExperience";
import { CoachOnboarding } from "@/components/CoachOnboarding";
import { TrainerOnboarding } from "@/components/TrainerOnboarding";
import { ParentOnboarding } from "@/components/ParentOnboarding";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  if (user.role === "COACH") return <CoachOnboarding name={user.name} />;
  if (user.role === "TRAINER") return <TrainerOnboarding name={user.name} />;
  if (user.role === "PARENT") return <ParentOnboarding name={user.name} />;

  return <OnboardingExperience name={user.name} />;
}
