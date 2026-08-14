import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { PerformanceView } from "@/components/PerformanceView";

export default async function PerformancePage() {
  const user = await requireUser();

  const entries = await prisma.performanceEntry.findMany({
    where: { userId: user.id },
    orderBy: { recordedAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-3xl">
      <div className="mono text-text-3 mb-2">Performance</div>
      <h1 className="text-3xl font-semibold mb-8">Stats & trends</h1>
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
