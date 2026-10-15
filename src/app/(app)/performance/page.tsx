import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { PerformanceView } from "@/components/PerformanceView";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";

export default async function PerformancePage() {
  const user = await requireUser();

  const entries = await prisma.performanceEntry.findMany({
    where: { userId: user.id },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

  return (
    <div className="workspace-page dash-in dash-in-1">
      <WorkspaceHeader section="Development" title="Stats & trends" description="Your work, measured. Track the numbers that matter to your development." icon="performance" />
      <PerformanceView
        initialEntries={entries.map((e) => ({
          id: e.id,
          statName: e.statName,
          value: e.value,
          unit: e.unit,
          recordedAt: e.recordedAt.toISOString(),
          note: e.note,
        }))}
      />
    </div>
  );
}
