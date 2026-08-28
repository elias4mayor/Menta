import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getVisibleExercise, toExerciseJson } from "@/lib/exercises";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const exercise = await getVisibleExercise(user.id, id);
  if (!exercise) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ exercise: toExerciseJson(exercise) });
}
