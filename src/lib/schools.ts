/**
 * The six School Type options onboarding asks for directly. Neither real
 * dataset behind school search (src/lib/data/us-high-schools.json,
 * us-colleges.json) can reliably tell a community college from a JUCO from
 * a 4-year university, so this is never inferred from a dataset match —
 * it's always the user's own explicit choice, shared here so the client
 * field and the server-side required-field check use the exact same list.
 */
export const SCHOOL_TYPES = [
  "High School",
  "Community College",
  "Junior College (JUCO)",
  "4-Year University",
  "Trade/Vocational School",
  "Other",
] as const;

export type SchoolType = (typeof SCHOOL_TYPES)[number];

export function isSchoolType(value: string): value is SchoolType {
  return (SCHOOL_TYPES as readonly string[]).includes(value);
}
