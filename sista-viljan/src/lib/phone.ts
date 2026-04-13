/** Digits only, Swedish mobile: 07XXXXXXXX or 467XXXXXXXXX */
export function cleanPhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Lokalt: 07XXXXXXXX (10 siffror). E.164 utan +: 46 + 9 siffror (t.ex. 46701234567) — inte 12 tecken.
 */
export function isValidSwedishMobile(digits: string): boolean {
  return /^(07[0-9]{8}|467[0-9]{8})$/.test(digits);
}

/** Returns E.164 digits without +, e.g. 46701234567 */
export function toE164Digits(digits: string): string | null {
  const cleaned = cleanPhoneDigits(digits);
  if (!isValidSwedishMobile(cleaned)) return null;
  return cleaned.startsWith("46") ? cleaned : `46${cleaned.slice(1)}`;
}

/** Display like 070-123 45 67 */
export function formatPhoneDisplayFromE164(e164: string): string {
  const d = cleanPhoneDigits(e164);
  const local = d.startsWith("46") && d.length === 11 ? `0${d.slice(2)}` : d;
  if (local.length !== 10) return e164;
  return `${local.slice(0, 3)}-${local.slice(3, 6)} ${local.slice(6, 10)}`;
}
