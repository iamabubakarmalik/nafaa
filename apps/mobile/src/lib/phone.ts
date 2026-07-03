/**
 * Pakistan phone number validation & normalization
 */

export function isValidPakistanPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-()]/g, '');
  // +923XXXXXXXXX or 03XXXXXXXXX (10 digits after leading 3)
  const patterns = [
    /^\+923\d{9}$/,
    /^923\d{9}$/,
    /^03\d{9}$/,
    /^3\d{9}$/,
  ];
  return patterns.some((p) => p.test(clean));
}

export function normalizePakistanPhone(phone: string): string {
  const clean = phone.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+92')) return clean;
  if (clean.startsWith('92')) return `+${clean}`;
  if (clean.startsWith('03')) return `+92${clean.slice(1)}`;
  if (clean.startsWith('3') && clean.length === 10) return `+92${clean}`;
  return clean;
}
