import { requireUser } from "@/lib/auth-guards";
import { getMySessionView } from "@/lib/live-sessions";
import { LiveAthleteView } from "@/components/LiveAthleteView";

export default async function MyLiveSessionPage({ params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await requireUser();
  const { teamId, id } = await params;

  const view = await getMySessionView(teamId, id, user.id);

  return (
    <LiveAthleteView
      teamId={teamId}
      sessionId={id}
      athleteId={user.id}
      initialView={view ? JSON.parse(JSON.stringify(view)) : null}
    />
  );
}
