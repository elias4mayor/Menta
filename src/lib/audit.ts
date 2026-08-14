import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sensitive-action logging (build plan §5). Call this for role changes,
 * data exports, deletions, admin actions, and auth events. Never blocks the
 * calling request on failure — a broken audit write must not break the app.
 */
export async function logAudit(params: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? undefined,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", params.action, err);
  }
}
