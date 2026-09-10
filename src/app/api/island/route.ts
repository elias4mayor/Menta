import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getIslandState } from "@/lib/island";

/**
 * Backs the MENTA Island's Next Move / Pulse panels. Fetched client-side
 * (see MENTAIsland.tsx) rather than threaded through AppShell's server
 * props, so adding the Island never adds a query to every authenticated
 * page's own render path — only pages that actually mount the Island do
 * the extra work, and it happens after first paint, not before it.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const state = await getIslandState(user.id);
  return NextResponse.json({ state });
}
