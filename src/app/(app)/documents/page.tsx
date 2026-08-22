import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { DocumentsView } from "@/components/DocumentsView";
import { GlowWaveText } from "@/components/GlowWaveText";
import { documentStatus } from "@/lib/documents";

export default async function DocumentsPage() {
  const user = await requireUser();

  const [guardianLinks, memberships, docs, requests] = await Promise.all([
    prisma.guardianLink.findMany({ where: { guardianId: user.id, status: "APPROVED" }, select: { athleteId: true } }),
    prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } }),
    prisma.document.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { uploadedById: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.documentRequest.findMany({
      where: { athleteId: user.id },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Team docs + guardian-athlete docs, fetched separately since Prisma's
  // OR above only covers the always-true parts of canAccessDocument.
  const athleteIds = guardianLinks.map((l) => l.athleteId);
  const teamIds = memberships.map((m) => m.teamId);
  const extraDocs = await prisma.document.findMany({
    where: {
      OR: [
        ...(athleteIds.length > 0 ? [{ ownerId: { in: athleteIds } }] : []),
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
      NOT: { AND: [{ ownerId: user.id }] },
      uploadedById: { not: user.id },
    },
    orderBy: { createdAt: "desc" },
  });

  const allDocs = [...docs, ...extraDocs];
  const ownerIds = [...new Set(allDocs.map((d) => d.ownerId).filter((v): v is string => Boolean(v)))];
  const docTeamIds = [...new Set(allDocs.map((d) => d.teamId).filter((v): v is string => Boolean(v)))];
  const [owners, teams] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { id: { in: docTeamIds } }, select: { id: true, name: true } }),
  ]);
  const ownerNameById = new Map(owners.map((o) => [o.id, o.name]));
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const teamOptions = memberships.length > 0
    ? await prisma.team.findMany({
        where: { id: { in: teamIds }, memberships: { some: { userId: user.id, teamRole: { in: ["COACH", "ADMIN"] } } } },
        select: { id: true, name: true },
      })
    : [];
  const manageableTeamIds = new Set(teamOptions.map((t) => t.id));
  const guardianAthleteIds = new Set(athleteIds);

  function canManageDoc(d: { ownerId: string | null; teamId: string | null; uploadedById: string }): boolean {
    if (d.uploadedById === user.id) return true;
    if (d.ownerId === user.id) return true;
    if (d.ownerId && guardianAthleteIds.has(d.ownerId)) return true;
    if (d.teamId && manageableTeamIds.has(d.teamId)) return true;
    return false;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mono text-text-3 mb-2">Records</div>
      <h1 className="text-3xl font-semibold mb-8"><GlowWaveText intensity="strong">Documents</GlowWaveText></h1>

      <DocumentsView
        initialDocuments={allDocs.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          originalFilename: d.originalFilename,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
          status: documentStatus(d.expiresAt),
          notes: d.notes,
          ownerName: d.ownerId ? ownerNameById.get(d.ownerId) ?? null : null,
          teamName: d.teamId ? teamNameById.get(d.teamId) ?? null : null,
          isMine: d.ownerId === user.id || d.uploadedById === user.id,
          canManage: canManageDoc(d),
        }))}
        initialRequests={requests.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          notes: r.notes,
          status: r.status,
          requestedByName: r.requestedBy.name,
        }))}
        canRequestDocuments={["COACH", "TRAINER", "PARENT"].includes(user.role)}
        teamOptions={teamOptions}
      />
    </div>
  );
}
