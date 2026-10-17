import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({ schoolName: z.string().trim().min(1).max(160), focus: z.string().trim().max(160).optional() }).strict();
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!["TEACHER", "STUDENT", "STAFF"].includes(user.role)) return NextResponse.json({ error: "Use your role's setup flow." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose your school and check the details." }, { status: 400 });
  await prisma.schoolProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...parsed.data, onboardingCompletedAt: new Date() }, update: { ...parsed.data, onboardingCompletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
