import { NextResponse } from "next/server";
import { countryCodeForName, stateCodeForName } from "@/lib/geo";
import { searchSchools } from "@/lib/schools-server";
import { isSchoolType } from "@/lib/schools";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Server-side school search — the client only ever sees this endpoint's
 * capped results, never the underlying datasets (src/lib/schools-server.ts).
 * GET /api/schools/search?country=<name optional>&state=<name optional>&type=<SchoolType optional>&q=<search>
 *
 * `country`/`state` are optional so this stays backward-compatible with
 * ProfileForm's unscoped use of SchoolCombobox (no location awareness).
 * When onboarding passes a country that isn't "United States", this
 * honestly returns no results with `covered: false` rather than
 * fabricating coverage the real datasets don't have — onboarding still
 * accepts whatever the user types.
 */
export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "school-search"), {
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(request.url);
  const countryName = url.searchParams.get("country")?.trim() || undefined;
  const stateName = url.searchParams.get("state")?.trim() || undefined;
  const schoolType = url.searchParams.get("type")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (schoolType && !isSchoolType(schoolType)) {
    return NextResponse.json({ error: "Unknown school type." }, { status: 400 });
  }

  let countryCode: string | undefined;
  if (countryName) {
    countryCode = countryCodeForName(countryName);
    if (!countryCode) {
      return NextResponse.json({ error: "Unknown country." }, { status: 400 });
    }
    if (countryCode !== "US") {
      // Honest: the committed datasets are U.S.-only. Free-typed entry is
      // still accepted by the onboarding form — this just doesn't offer
      // fabricated suggestions for a country it has no real data for.
      return NextResponse.json({ schools: [], covered: false });
    }
  }

  let stateCode: string | undefined;
  if (stateName) {
    stateCode = countryCode ? stateCodeForName(countryCode, stateName) : stateCodeForName("US", stateName);
    if (!stateCode) {
      return NextResponse.json({ error: "That state isn't valid for the selected country." }, { status: 400 });
    }
  }

  const schools = searchSchools({ stateCode, schoolType, q });
  return NextResponse.json({ schools, covered: true });
}
