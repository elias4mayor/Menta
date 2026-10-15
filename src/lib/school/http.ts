import "server-only";
/** Pagination must stay at the configured school origin and within its API. */
export function schoolApiUrl(base: string, path: string, prefix: string) {
  const u = new URL(path, base);
  if (u.origin !== new URL(base).origin || !u.pathname.startsWith(prefix) || u.username || u.password) throw new Error("unsafe_school_url");
  return u;
}
export class SchoolHttpError extends Error {
  constructor(public status: number) { super("school_request_failed"); }
}
export async function schoolFetch(url: URL, init: RequestInit) {
  const r = await fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new SchoolHttpError(r.status);
  const text = await r.text();
  if (text.length > 4_000_000) throw new Error("school_response_too_large");
  return { data: JSON.parse(text), headers: r.headers };
}
