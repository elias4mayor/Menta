import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getTeamRole } from "@/lib/permissions";
import { sportContextUpdateSchema } from "@/lib/validation";
import {
  getOwnedSportContext,
  setPrimarySportContext,
  updateSportContextDetails,
  deactivateSportContext,
  SportContextError,
} from "@/lib/sport-context";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "ATHLETE") {
    return NextResponse.json({ error: "Only athletes have sport contexts." }, { status: 403 });
  }

  const { id } = await context.params;
  const parsed = sportContextUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    // getOwnedSportContext verifies `id` actually belongs to `user` before
    // anything else runs — a client can never act on another athlete's row
    // just by passing its id.
    await getOwnedSportContext(user.id, id);

    if (parsed.data.teamId) {
      if (!(await getTeamRole(user.id, parsed.data.teamId))) {
        return NextResponse.json({ error: "You're not a member of that team." }, { status: 403 });
      }
    }

    const sportContext = parsed.data.isPrimary
      ? await setPrimarySportContext(user.id, id)
      : await updateSportContextDetails(user.id, id, {
          position: parsed.data.position,
          teamId: parsed.data.teamId,
        });

    await logAudit({
      actorId: user.id,
      action: parsed.data.isPrimary ? "sportContext.primaryChanged" : "sportContext.updated",
      targetType: "AthleteSportContext",
      targetId: id,
    });

    return NextResponse.json({ sportContext });
  } catch (err) {
    if (err instanceof SportContextError) {
      const status = err.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "ATHLETE") {
    return NextResponse.json({ error: "Only athletes have sport contexts." }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    await getOwnedSportContext(user.id, id);
    const { deactivated, newPrimary } = await deactivateSportContext(user.id, id);

    await logAudit({
      actorId: user.id,
      action: "sportContext.deactivated",
      targetType: "AthleteSportContext",
      targetId: id,
    });

    return NextResponse.json({ deactivated, newPrimary });
  } catch (err) {
    if (err instanceof SportContextError) {
      const status = err.code === "NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
