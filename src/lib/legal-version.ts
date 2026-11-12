export const LEGAL_VERSION = "2026-11-12-draft";

export function isEligibleBirthDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== value) return false;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() ||
      (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 14 && age <= 120;
}
