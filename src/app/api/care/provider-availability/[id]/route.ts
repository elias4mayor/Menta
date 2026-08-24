import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const window = await prisma.providerAvailability.findUnique({ where: { id } });
  if (!window) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (window.providerId !== user.id) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.providerAvailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
