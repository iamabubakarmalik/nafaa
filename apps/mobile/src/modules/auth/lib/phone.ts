/** Pakistani mobile numbers: 03xxxxxxxxx, +923xxxxxxxxx or 923xxxxxxxxx. */

export function cleanPakistanPhone(value: string): string {
  const cleaned = value.replace(/[\s\-()]/g, '');
  if (/^(\+?92)3\d{9}$/.test(cleaned)) return `0${cleaned.slice(-10)}`;
  return cleaned;
}

export const isValidPakistanPhone = (value: string) => /^03\d{9}$/.test(value) || /^\+?[0-9]{10,15}$/.test(value);
