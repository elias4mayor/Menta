import { requireUser } from "@/lib/auth-guards";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  return <OnboardingWizard name={user.name} />;
}
