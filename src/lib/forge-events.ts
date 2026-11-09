import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

export const FORGE_CHANNEL = "menta_forge_session";

export type ForgeMutation = {
  correlationId: string;
  recordedAtMs: number;
};

export async function notifyForgeSession(tx: Prisma.TransactionClient, sessionId: string): Promise<ForgeMutation> {
  const correlationId = randomUUID();
  // This database-clock sample precedes COMMIT. PostgreSQL delivers the
  // notification only on commit, so the sample includes commit overhead.
  const [event] = await tx.$queryRaw<Array<{ recordedAtMs: number }>>`
    WITH event AS MATERIALIZED (
      SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "recordedAtMs"
    )
    SELECT "recordedAtMs",
      pg_notify(${FORGE_CHANNEL}, json_build_object(
        'sessionId', ${sessionId}::text,
        'correlationId', ${correlationId}::text,
        'recordedAtMs', "recordedAtMs"
      )::text)::text
    FROM event
  `;
  return { correlationId, recordedAtMs: event.recordedAtMs };
}
