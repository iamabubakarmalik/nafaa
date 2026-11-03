/** Pakistan phone and CNIC helpers for customer forms. */

export const digitsOf = (v: string) => v.replace(/\D/g, '');

/** Mobile numbers: 03xx-xxxxxxx with or without 92 / 0; empty is fine. */
export const validPhone = (v: string) => !v || /^(92|0)?3\d{9}$/.test(digitsOf(v));

/** Local 11-digit form (03001234567) from any typed form. */
export const normalizePhone = (v: string) => {
  const d = digitsOf(v);
  if (d.startsWith('92') && d.length === 12) return `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith('3')) return `0${d}`;
  return d;
};

/** Types as 0300-1234567. */
export const formatPhone = (v: string) => {
  const d = digitsOf(v).slice(0, 11);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
};

export const formatCnic = (v: string) => {
  const d = digitsOf(v).slice(0, 13);
  if (d.length > 12) return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
};
