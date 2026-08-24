import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canRequestCareFrom } from "@/lib/permissions";
import { computeAvailableSlots } from "@/lib/care-server";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 14;

/** Real bookable slots for one provider on one team, computed from their ProviderAvailability minus already-booked CareRequests. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const providerId = params.get("providerId");
  const teamId = params.get("teamId");
  const days = Math.min(MAX_DAYS, Number(params.get("days")) || DEFAULT_DAYS);

  if (!providerId || !teamId) {
    return NextResponse.json({ error: "providerId and teamId are required." }, { status: 400 });
  }

  if (!(await canRequestCareFrom(user.id, providerId, teamId))) {
    return NextResponse.json({ error: "That provider isn't available to you." }, { status: 403 });
  }

  const slots = await computeAvailableSlots(providerId, teamId, days);
  return NextResponse.json({ slots });
}
