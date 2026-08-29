import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getCoachAthleteProfile } from "@/lib/athlete-profile";
import { AthleteProfileView } from "@/components/AthleteProfileView";

/**
 * The coach-facing Unified Athlete Profile (Phase 8). All authorization —
 * coach must be COACH/ADMIN on this exact team, athlete must currently be
 * a member of it, Coach Notes gated separately by MANAGE_COACH_NOTES —
 * lives inside getCoachAthleteProfile itself, not here. A null return is
 * the only signal this page ever acts on: notFound(), never a partial
 * render. SUPER_ADMIN gets no special-case here — matching this route's
 * existing sibling (/notes) rather than inventing a new exception.
 */
export default async function CoachAthleteProfilePage({
  params,
}: {
  params: Promise<{ teamId: string; athleteId: string }>;
}) {
  const user = await requireUser();
  const { teamId, athleteId } = await params;

  const profile = await getCoachAthleteProfile(user.id, teamId, athleteId);
  if (!profile) notFound();

  return <AthleteProfileView profile={profile} mode="coach" teamId={teamId} />;
}
