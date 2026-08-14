import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    await logAudit({ actorId: user.id, action: "auth.logout" });
  }
  return NextResponse.json({ ok: true });
}
