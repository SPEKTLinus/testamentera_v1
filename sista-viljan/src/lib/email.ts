/** Trim, lowercase local part handling: normalize for storage and comparison. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Practical validation for transactional mail (not full RFC).
 * Max length 254 per SMTP practice.
 */
export function isValidEmail(input: string): boolean {
  const s = normalizeEmail(input);
  if (s.length < 5 || s.length > 254) return false;
  const at = s.indexOf("@");
  if (at < 1 || at !== s.lastIndexOf("@")) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain || domain.length > 253) return false;
  if (!domain.includes(".")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return false;
  return /^[a-z0-9._%+-]+$/.test(local) && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}
