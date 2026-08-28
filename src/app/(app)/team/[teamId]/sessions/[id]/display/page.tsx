import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getTeamRole } from "@/lib/permissions";
import { getSessionRoomView } from "@/lib/live-sessions";
import { LiveRoomDisplay } from "@/components/LiveRoomDisplay";

export default async function LiveSessionDisplayPage({ params }: { params: Promise<{ teamId: string; id: string }> }) {
  const user = await requireUser();
  const { teamId, id } = await params;

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const room = await getSessionRoomView(teamId, id);
  if (!room) notFound();

  return <LiveRoomDisplay teamId={teamId} sessionId={id} initialRoom={JSON.parse(JSON.stringify(room))} />;
}
