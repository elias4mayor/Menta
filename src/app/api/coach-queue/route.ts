import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCoachQueue, dismissNextMove } from "@/lib/next-move";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const result = await getCoachQueue(user.id);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const action = body?.action === "dismiss" ? "dismiss" : null;
  if (!id || !action) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const ok = await dismissNextMove(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
