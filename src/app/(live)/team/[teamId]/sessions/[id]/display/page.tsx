import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getTeamRole } from "@/lib/permissions";
import { getSessionRoomView } from "@/lib/live-sessions";
import { LiveRoomDisplay } from "@/components/LiveRoomDisplay";

export default async function LiveSessionDisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; id: string }>;
  searchParams: Promise<{ rack?: string | string[]; perf?: string | string[] }>;
}) {
  const user = await requireUser();
  const [{ teamId, id }, { rack, perf }] = await Promise.all([params, searchParams]);

  if (!(await getTeamRole(user.id, teamId)) && user.role !== "SUPER_ADMIN") notFound();

  const room = await getSessionRoomView(teamId, id);
  if (!room || (rack !== undefined && !room.groups.some((group) => group.id === rack))) notFound();

  return (
    <LiveRoomDisplay
      teamId={teamId}
      sessionId={id}
      initialRoom={JSON.parse(JSON.stringify(room))}
      rackId={typeof rack === "string" ? rack : undefined}
      measurePerformance={process.env.FORGE_PERF_ENABLED === "1" && perf === "1" && rack === undefined}
    />
  );
}
