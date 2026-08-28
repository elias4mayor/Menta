import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Server-side anti-fraud check for a submitted (country, state, city)
 * triple — NOT a "does this city exist" check, since the 152,307-row City
 * table (src/lib/data/cities-seed.json) is real but not exhaustive, and
 * rejecting every uncatalogued-but-real city would be a false positive
 * that blocks real users (the same reasoning that makes SchoolCombobox
 * accept free text). Instead this only catches an actually inconsistent
 * submission: a city name that DOES exist in the dataset, but only under
 * a different country than the one submitted (e.g. "Paris" with
 * country=Japan — Paris is a real dataset entry, just never under Japan).
 *
 * A city name with no dataset match at all is honestly treated as
 * "unverifiable, not invalid" and passes. State-level agreement is
 * intentionally not enforced the same strict way: the same city name
 * legitimately recurs under different states within one country far too
 * often (many "Springfield"s in the US, for example) for a state-level
 * mismatch to reliably mean fraud rather than an incomplete dataset.
 */
export async function isCityCountryMismatch(countryCode: string, city: string): Promise<boolean> {
  const matches = await prisma.city.findMany({
    where: { name: city },
    select: { countryCode: true },
    take: 50,
  });
  if (matches.length === 0) return false;
  return !matches.some((m) => m.countryCode === countryCode);
}
