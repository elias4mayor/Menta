import COUNTRIES from "@/lib/data/countries.json";

export type Country = { name: string; code: string };

/** Real ISO-3166-1 country list (196 entries). */
export const ALL_COUNTRIES: Country[] = COUNTRIES;

/**
 * A flag emoji from a 2-letter country code — computed, not an image
 * asset. Each letter maps to a Unicode "Regional Indicator Symbol"
 * (U+1F1E6 for A ... U+1F1FF for Z); two of them next to each other
 * render as that country's flag in any font/OS that supports the
 * standard. This is the same mechanism iOS/macOS/most browsers use.
 */
export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** Real USPS state/territory names + 2-letter abbreviations. */
export const US_STATES: { name: string; code: string }[] = [
  { name: "Alabama", code: "AL" }, { name: "Alaska", code: "AK" }, { name: "Arizona", code: "AZ" },
  { name: "Arkansas", code: "AR" }, { name: "California", code: "CA" }, { name: "Colorado", code: "CO" },
  { name: "Connecticut", code: "CT" }, { name: "Delaware", code: "DE" }, { name: "District of Columbia", code: "DC" },
  { name: "Florida", code: "FL" }, { name: "Georgia", code: "GA" }, { name: "Hawaii", code: "HI" },
  { name: "Idaho", code: "ID" }, { name: "Illinois", code: "IL" }, { name: "Indiana", code: "IN" },
  { name: "Iowa", code: "IA" }, { name: "Kansas", code: "KS" }, { name: "Kentucky", code: "KY" },
  { name: "Louisiana", code: "LA" }, { name: "Maine", code: "ME" }, { name: "Maryland", code: "MD" },
  { name: "Massachusetts", code: "MA" }, { name: "Michigan", code: "MI" }, { name: "Minnesota", code: "MN" },
  { name: "Mississippi", code: "MS" }, { name: "Missouri", code: "MO" }, { name: "Montana", code: "MT" },
  { name: "Nebraska", code: "NE" }, { name: "Nevada", code: "NV" }, { name: "New Hampshire", code: "NH" },
  { name: "New Jersey", code: "NJ" }, { name: "New Mexico", code: "NM" }, { name: "New York", code: "NY" },
  { name: "North Carolina", code: "NC" }, { name: "North Dakota", code: "ND" }, { name: "Ohio", code: "OH" },
  { name: "Oklahoma", code: "OK" }, { name: "Oregon", code: "OR" }, { name: "Pennsylvania", code: "PA" },
  { name: "Puerto Rico", code: "PR" }, { name: "Rhode Island", code: "RI" }, { name: "South Carolina", code: "SC" },
  { name: "South Dakota", code: "SD" }, { name: "Tennessee", code: "TN" }, { name: "Texas", code: "TX" },
  { name: "Utah", code: "UT" }, { name: "Vermont", code: "VT" }, { name: "Virginia", code: "VA" },
  { name: "Washington", code: "WA" }, { name: "West Virginia", code: "WV" }, { name: "Wisconsin", code: "WI" },
  { name: "Wyoming", code: "WY" },
];
