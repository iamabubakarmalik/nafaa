/**
 * Normalize a Pakistani mobile number to canonical +923XXXXXXXXX form.
 * Accepts: 03XXXXXXXXX, 3XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX
 */
export function normalizePkPhone(input: string): string {
  if (!input) return input;
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('03') && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) return `+92${digits}`;
  if (digits.startsWith('923') && digits.length === 12) return `+${digits}`;
  return input.startsWith('+') ? input : `+${digits}`;
}

/**
 * Mask phone for display: +923001234567 -> +9230012***67
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, phone.length - 5) + '***' + phone.slice(-2);
}
