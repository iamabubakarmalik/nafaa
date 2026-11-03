/**
 * What the counter reads from typed or scanned text: a quantity in front
 * ("3*maggi"), a phone number, and labels printed by a weighing scale.
 */

/**
 * "3*" / "3x" / "*3" / "x3" set a quantity; "3*maggi" or "3*<barcode>" add
 * that item three times. `rest` is what is left to search for.
 */
export function parseQtyPrefix(raw: string): { qty: number | null; rest: string } {
  const s = raw.trim();
  let m = s.match(/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(.*)$/);
  if (m) return { qty: Number(m[1]), rest: m[2].trim() };
  m = s.match(/^[*xX×]\s*(\d+(?:\.\d+)?)$/);
  if (m) return { qty: Number(m[1]), rest: '' };
  return { qty: null, rest: s };
}

/** Pakistani mobile number as typed at the counter: 03001234567, +923001234567, 923001234567. */
export function looksLikePhone(s: string): boolean {
  const d = s.replace(/[\s-]/g, '');
  return /^(?:\+?92|0)3\d{9}$/.test(d);
}

export const phoneDigits = (s: string) => s.replace(/\D/g, '').replace(/^92/, '0');

/** Looks like a barcode rather than a name: six or more digits. */
export const looksLikeBarcode = (s: string) => /^\d{6,}$/.test(s.trim());

/**
 * A label printed by a weighing scale (EAN-13 starting with 2):
 * "2" + one flag digit + 5-digit item code + 5-digit weight in grams + check digit.
 * `codes` are the item codes to look up, in order (with and without leading
 * zeros, and the first seven digits some scales use).
 */
export interface ScaleLabel {
  codes: string[];
  grams: number;
}

const SCALE_LABEL = /^2\d{12}$/;

export function parseScaleLabel(code: string): ScaleLabel | null {
  const c = code.trim();
  if (!SCALE_LABEL.test(c)) return null;
  const plu = c.slice(2, 7);
  const codes = [...new Set([plu, String(Number(plu)), c.slice(0, 7)])];
  return { codes, grams: Number(c.slice(7, 12)) };
}

/** Grams per unit for units a scale label can weigh. */
const GRAMS_PER_UNIT: Record<string, number> = { kg: 1000, kilogram: 1000, gram: 1, g: 1, gm: 1 };

/** Quantity of an item in its own unit for a weighed label; null when the item is not sold by weight. */
export function scaleQuantity(unit: string, grams: number): number | null {
  const per = GRAMS_PER_UNIT[(unit || '').toLowerCase()];
  if (!per) return null;
  return Number((grams / per).toFixed(3));
}
