/** Pakistani mobile number helpers. */

/** "+92 300-1234567", "923001234567", "3001234567" → "03001234567". */
export function normalizePhone(raw: string) {
  const d = (raw ?? '').replace(/\D/g, '');
  if (/^923\d{9}$/.test(d)) return `0${d.slice(2)}`;
  if (/^3\d{9}$/.test(d)) return `0${d}`;
  return d;
}

export const isMobile = (raw: string) => /^03\d{9}$/.test(normalizePhone(raw));

/** "03001234567" → "0300 1234567". */
export const prettyPhone = (raw?: string | null) => {
  const p = normalizePhone(raw ?? '');
  return /^03\d{9}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4)}` : raw ?? '';
};

export const telLink = (raw: string) => `tel:${normalizePhone(raw)}`;
export const waLink = (raw: string, text?: string) => {
  const p = normalizePhone(raw);
  const intl = /^03\d{9}$/.test(p) ? `92${p.slice(1)}` : p;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const mapLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;
