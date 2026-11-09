import "server-only";
import type { Prisma } from "@prisma/client";

export const FORGE_CHANNEL = "menta_forge_session";

export async function notifyForgeSession(tx: Prisma.TransactionClient, sessionId: string) {
  // PostgreSQL delivers this invalidation only after the transaction commits.
  await tx.$queryRaw`SELECT pg_notify(${FORGE_CHANNEL}, ${sessionId})::text`;
}
