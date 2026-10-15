import "server-only";
import { z } from "zod";

const schema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: z.string().min(1).max(120),
  provider: z.enum(["canvas", "blackboard"]),
  baseUrl: z.url().refine((raw) => {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && u.port === "" && u.pathname === "/" && !u.search && !u.hash && !u.hostname.includes(":") && !/^[\d.]+$/.test(u.hostname) && u.hostname.includes(".") && !/\.(local|localhost|internal)$/.test(u.hostname);
  }, "Use a public HTTPS school origin without a path"),
  clientId: z.string().min(1), clientSecret: z.string().min(1),
}));
/** Operator-controlled instances only. Never accept a URL or API token from a student. */
export function schoolInstances() {
  const parsed = schema.parse(JSON.parse(process.env.SCHOOL_OAUTH_INSTANCES || "[]"));
  if (new Set(parsed.map((s) => s.id)).size !== parsed.length) throw new Error("Duplicate school IDs");
  return parsed;
}
export function schoolInstance(id: string) {
  const config = schoolInstances().find((s) => s.id === id);
  if (!config) throw new Error("school_not_configured");
  return config;
}
export type SchoolInstance = ReturnType<typeof schoolInstance>;
export function schoolCallback(id: string) { return new URL(`/api/integrations/school/${id}/callback`, process.env.APP_URL || "http://localhost:3000").href; }
