import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole } from "@/lib/permissions";
import { sportContextCreateSchema } from "@/lib/validation";
import { listSportContexts, createOrReactivateSportContext, SportContextError } from "@/lib/sport-context";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "ATHLETE") {
    return NextResponse.json({ error: "Only athletes have sport contexts." }, { status: 403 });
  }

  const sportContexts = await listSportContexts(user.id);
  return NextResponse.json({ sportContexts });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "ATHLETE") {
    return NextResponse.json({ error: "Only athletes have sport contexts." }, { status: 403 });
  }

  const parsed = sportContextCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const teamId = parsed.data.teamId || null;
  if (teamId && !(await getTeamRole(user.id, teamId))) {
    return NextResponse.json({ error: "You're not a member of that team." }, { status: 403 });
  }

  try {
    const sportContext = await createOrReactivateSportContext(user.id, {
      sport: parsed.data.sport,
      position: parsed.data.position || null,
      teamId,
      makePrimary: parsed.data.makePrimary,
    });
    await logAudit({
      actorId: user.id,
      action: "sportContext.created",
      targetType: "AthleteSportContext",
      targetId: sportContext.id,
    });
    return NextResponse.json({ sportContext });
  } catch (err) {
    if (err instanceof SportContextError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
