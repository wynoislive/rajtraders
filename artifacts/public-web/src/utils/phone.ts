/**
 * Indian Mobile Number Utilities & Formatters
 * Enforces clean 10-digit string value contract with +91 country representation.
 */

/**
 * Cleans user input or pasted string down to a maximum of 10 digits.
 * Automatically handles pasted prefixes like '+91', '91', '0', spaces, and hyphens.
 */
export function cleanMobileInput(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');

  // Strip international prefix if user pasted +91... or 91...
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }

  // Cap strictly at 10 digits
  return digits.slice(0, 10);
}

/**
 * Formats a clean 10-digit number for spaced input display (e.g. "98765 43210").
 */
export function formatMobileInputGroup(cleanDigits: string): string {
  if (!cleanDigits) return '';
  const digits = cleanDigits.slice(0, 10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Validates whether the digits represent a valid 10-digit Indian mobile number.
 * Valid Indian mobile numbers begin with 6, 7, 8, or 9 and are exactly 10 digits.
 */
export function isValidIndianMobile(raw: string): boolean {
  const digits = cleanMobileInput(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Formats any stored mobile string for polished UI presentation.
 * Returns "+91 98765 43210".
 */
export function formatMobileDisplay(raw?: string | null): string {
  if (!raw) return '';
  const clean = cleanMobileInput(raw);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  // Fallback to raw if not 10 digits
  return raw;
}
