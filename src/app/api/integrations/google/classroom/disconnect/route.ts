import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { revokeGoogleToken } from "@/lib/integrations/google-classroom";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const integration = await prisma.googleClassroomIntegration.findUnique({ where: { userId: user.id } });
  if (!integration) {
    return NextResponse.json({ error: "Google Classroom isn't connected." }, { status: 404 });
  }

  if (integration.refreshTokenEnc) {
    await revokeGoogleToken(decryptSecret(integration.refreshTokenEnc));
  } else if (integration.accessTokenEnc) {
    await revokeGoogleToken(decryptSecret(integration.accessTokenEnc));
  }

  // Soft-disconnect: clear credentials, keep already-synced courses/
  // assignments/calendar events as history — matches how every other
  // "remove" flow in MENTA works (sport contexts, Care requests). A
  // reconnect updates this same row rather than creating a duplicate.
  await prisma.googleClassroomIntegration.update({
    where: { id: integration.id },
    data: {
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      status: "DISCONNECTED",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "integration.google_classroom.disconnected",
    targetType: "GoogleClassroomIntegration",
    targetId: integration.id,
  });

  return NextResponse.json({ success: true });
}
