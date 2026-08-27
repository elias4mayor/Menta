import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hasTeamPermission } from "@/lib/permissions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const template = await prisma.filmAnalysisTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!(await hasTeamPermission(user.id, template.teamId, "MANAGE_ANALYSIS_TEMPLATES"))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.filmAnalysisTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
