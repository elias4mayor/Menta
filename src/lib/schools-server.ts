import "server-only";
import US_HIGH_SCHOOLS from "@/lib/data/us-high-schools.json";
import US_COLLEGES from "@/lib/data/us-colleges.json";

type DatasetEntry = { name: string; state: string };
export type SchoolResult = { name: string; state: string; country: string; type: "High School" | "College" };

const HIGH_SCHOOLS: SchoolResult[] = (US_HIGH_SCHOOLS as DatasetEntry[]).map((s) => ({
  ...s,
  country: "United States",
  type: "High School",
}));
const COLLEGES: SchoolResult[] = (US_COLLEGES as DatasetEntry[]).map((s) => ({
  ...s,
  country: "United States",
  type: "College",
}));
const ALL_SCHOOLS: SchoolResult[] = [...HIGH_SCHOOLS, ...COLLEGES];

const MAX_RESULTS = 8;

/**
 * Which real dataset a School Type search should draw from. The two
 * committed datasets (2,181 named U.S. high schools, 1,389 named U.S.
 * colleges/universities) only distinguish that one binary — they can't
 * reliably separate a community college from a JUCO from a 4-year
 * university, so every non-"High School" School Type searches the same
 * college/university dataset. School Type itself is never guessed from
 * this: it's always the separate, explicit dropdown in SCHOOL_TYPES
 * (src/lib/schools.ts).
 */
function datasetFor(schoolType?: string): SchoolResult[] {
  if (schoolType === "High School") return HIGH_SCHOOLS;
  if (schoolType) return COLLEGES;
  return ALL_SCHOOLS;
}

/**
 * Server-side school search — mirrors the city search architecture from
 * Phase 3 (src/app/api/geo/cities/route.ts): the client only ever sees
 * this function's capped results, never the full dataset. Both source
 * JSON files stay committed (small — 106KB + 71KB) but are now imported
 * only here, not by any client bundle.
 */
export function searchSchools({
  stateCode,
  schoolType,
  q,
}: {
  stateCode?: string;
  schoolType?: string;
  q: string;
}): SchoolResult[] {
  const pool = datasetFor(schoolType).filter((s) => !stateCode || s.state === stateCode);
  const query = q.trim().toLowerCase();
  if (!query) return pool.slice(0, MAX_RESULTS);

  const starts: SchoolResult[] = [];
  const contains: SchoolResult[] = [];
  for (const school of pool) {
    const name = school.name.toLowerCase();
    if (name.startsWith(query)) {
      starts.push(school);
      if (starts.length >= MAX_RESULTS) break;
    } else if (name.includes(query) && contains.length < MAX_RESULTS) {
      contains.push(school);
    }
  }
  return [...starts, ...contains].slice(0, MAX_RESULTS);
}

/**
 * Anti-fraud check, same shape and same reasoning as isCityCountryMismatch
 * in src/lib/geo-server.ts: reject only a *positive* mismatch — the
 * submitted name matches a real dataset entry, but only under a different
 * state than the one submitted (e.g. a real "Lincoln High School" that
 * exists in the dataset, just never in the submitted state). A name with
 * no dataset match at all is honestly treated as unverifiable, not
 * invalid — neither dataset claims to be exhaustive, and rejecting a real,
 * uncatalogued school would be a false positive that blocks real users.
 */
export function isSchoolStateMismatch(stateCode: string | undefined, schoolName: string): boolean {
  if (!stateCode) return false;
  const matches = ALL_SCHOOLS.filter((s) => s.name === schoolName);
  if (matches.length === 0) return false;
  return !matches.some((m) => m.state === stateCode);
}
