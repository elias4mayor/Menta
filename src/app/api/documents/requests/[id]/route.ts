import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({ status: z.enum(["FULFILLED", "DISMISSED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await context.params;
  const docRequest = await prisma.documentRequest.findUnique({ where: { id } });
  if (!docRequest) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (docRequest.athleteId !== user.id) {
    return NextResponse.json({ error: "Only the requested athlete can update this." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.documentRequest.update({
    where: { id },
    data: { status: parsed.data.status, resolvedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: parsed.data.status === "FULFILLED" ? "document_request.fulfilled" : "document_request.dismissed",
    targetType: "DocumentRequest",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
