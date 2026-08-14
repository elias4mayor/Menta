import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimum bar for account creation — real strength scoring is a later hardening pass. */
export function isPasswordStrongEnough(plain: string): boolean {
  return plain.length >= 10;
}
