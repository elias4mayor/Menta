import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { countryCodeForName, stateCodeForName, statesForCountry } from "@/lib/geo";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const MAX_RESULTS = 8;

/**
 * Server-side city search — the client only ever sees this endpoint's
 * capped results, never the underlying City table (152,307 real rows,
 * seeded from src/lib/data/cities-seed.json via prisma/seed-cities.mjs).
 * GET /api/geo/cities?country=<name>&state=<name optional>&q=<search>
 */
export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "geo-cities"), {
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(request.url);
  const countryName = url.searchParams.get("country")?.trim() ?? "";
  const stateName = url.searchParams.get("state")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const countryCode = countryCodeForName(countryName);
  if (!countryCode) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }

  let stateCode: string | undefined;
  if (stateName) {
    stateCode = stateCodeForName(countryCode, stateName);
    if (!stateCode) {
      return NextResponse.json({ error: "That state/province isn't valid for the selected country." }, { status: 400 });
    }
  } else if (statesForCountry(countryCode).length > 0) {
    // This country does have real state data, so cities must be scoped to
    // one — an empty/unscoped country-wide search here would be far too
    // broad (e.g. thousands of US cities) and isn't what the UI offers.
    return NextResponse.json({ error: "Select a state/province first." }, { status: 400 });
  }

  const where = { countryCode, ...(stateCode ? { stateCode } : {}) };

  let cities: { name: string }[];
  if (!q) {
    cities = await prisma.city.findMany({
      where,
      select: { name: true },
      orderBy: { name: "asc" },
      take: MAX_RESULTS,
    });
  } else {
    const starts = await prisma.city.findMany({
      // mode: "insensitive" is a Postgres-only Prisma feature — required
      // here to match SQLite's default case-insensitive `LIKE`/`contains`
      // behavior for ASCII, which this search relied on implicitly.
      where: { ...where, name: { startsWith: q, mode: "insensitive" } },
      select: { name: true },
      orderBy: { name: "asc" },
      take: MAX_RESULTS,
    });
    if (starts.length < MAX_RESULTS) {
      const startNames = new Set(starts.map((c) => c.name));
      const contains = await prisma.city.findMany({
        where: { ...where, name: { contains: q, mode: "insensitive" } },
        select: { name: true },
        orderBy: { name: "asc" },
        take: MAX_RESULTS,
      });
      const extra = contains.filter((c) => !startNames.has(c.name)).slice(0, MAX_RESULTS - starts.length);
      cities = [...starts, ...extra];
    } else {
      cities = starts;
    }
  }

  return NextResponse.json({ cities: cities.map((c) => c.name) });
}
