import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { academicSupportCandidates } from "@/lib/academic-support";
const schema = z.object({ enabled: z.boolean(), threshold: z.number().min(0).max(100), supporterIds: z.array(z.string()).max(20) }).strict();
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [settings, grants, candidates] = await Promise.all([
    prisma.academicSupportSettings.findUnique({ where: { userId: user.id } }),
    prisma.academicSupportGrant.findMany({ where: { ownerId: user.id }, select: { supporterId: true } }), academicSupportCandidates(user.id),
  ]);
  return NextResponse.json({ enabled: settings?.enabled ?? false, threshold: settings?.threshold ?? 70, supporterIds: grants.map((g) => g.supporterId), candidates }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the alert settings." }, { status: 400 });
  const candidates = await academicSupportCandidates(user.id);
  if (parsed.data.supporterIds.some((id) => !candidates.some((c) => c.id === id))) return NextResponse.json({ error: "Choose an approved guardian or a current team coach, administrator, or teacher." }, { status: 403 });
  await prisma.$transaction(async (tx) => {
    await tx.academicSupportSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, enabled: parsed.data.enabled, threshold: parsed.data.threshold }, update: { enabled: parsed.data.enabled, threshold: parsed.data.threshold } });
    await tx.academicSupportGrant.deleteMany({ where: { ownerId: user.id } });
    await tx.academicSupportGrant.createMany({ data: [...new Set(parsed.data.supporterIds)].map((supporterId) => ({ ownerId: user.id, supporterId })) });
  });
  return NextResponse.json({ ok: true });
}
