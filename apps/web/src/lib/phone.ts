/**
 * Pakistan phone number validation and formatting
 *
 * Valid Pakistan numbers:
 * - Mobile: 03XX XXXXXXX (11 digits)
 * - With country code: +92 3XX XXXXXXX
 * - International: 92 3XX XXXXXXX
 */

const PK_MOBILE_REGEX = /^(?:\+?92|0)?3\d{9}$/;

export function isValidPakistanPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PK_MOBILE_REGEX.test(cleaned);
}

/**
 * Normalize Pakistan phone to international format: +923XXXXXXXXX
 */
export function normalizePakistanPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Already in +92 format
  if (cleaned.startsWith('+92')) return cleaned;
  // Starts with 92 (no plus)
  if (cleaned.startsWith('92') && cleaned.length === 12) return `+${cleaned}`;
  // Starts with 0 (local format)
  if (cleaned.startsWith('0') && cleaned.length === 11) return `+92${cleaned.slice(1)}`;
  // Just 10 digits starting with 3
  if (cleaned.startsWith('3') && cleaned.length === 10) return `+92${cleaned}`;

  return cleaned;
}

/**
 * Format for display: +92 300 1234567
 */
export function formatPakistanPhone(phone: string): string {
  const normalized = normalizePakistanPhone(phone);
  if (!normalized.startsWith('+92') || normalized.length !== 13) return phone;

  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}

/**
 * Get human-readable error message
 */
export function pakistanPhoneError(phone: string): string | null {
  if (!phone) return null;
  if (!isValidPakistanPhone(phone)) {
    return 'Pakistan ka sahi mobile number likhein (e.g. 03001234567)';
  }
  return null;
}
