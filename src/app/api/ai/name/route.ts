import { NextResponse } from "next/server";
import { isAiCoachName } from "@/lib/ai/coach-names";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name: unknown = body?.name;
  if (name !== null && !isAiCoachName(name)) {
    return NextResponse.json({ error: "Choose a name from the list." }, { status: 400 });
  }

  const preference = await prisma.user.update({
    where: { id: user.id },
    data: { aiCoachName: name },
    select: { aiCoachName: true },
  });

  return NextResponse.json(preference);
}
