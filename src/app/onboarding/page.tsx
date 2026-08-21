import { requireUser } from "@/lib/auth-guards";
import { OnboardingExperience } from "@/components/OnboardingExperience";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  return <OnboardingExperience name={user.name} />;
}
