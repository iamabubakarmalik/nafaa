/**
 * EAN-13 and Code 128 encoders for the barcode generator island.
 *
 * Both return the symbol as a module string ("1" = bar, "0" = space) plus
 * guard positions for EAN-13, so the island can draw an SVG at any size.
 * No dependencies: the tables below are the published symbology tables
 * (ISO/IEC 15420 for EAN-13, ISO/IEC 15417 for Code 128).
 */

// ─── EAN-13 ───

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_R = EAN_L.map((code) => [...code].map((bit) => (bit === '1' ? '0' : '1')).join(''));
const EAN_G = EAN_R.map((code) => [...code].reverse().join(''));
/** Left-half parity per first digit (L or G for digits 2-7). */
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Check digit for the first 12 digits: weights 1 and 3 from the left. */
export function eanCheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export type EanResult =
  | { ok: true; digits: string; modules: string; addedCheckDigit: boolean }
  | { ok: false; error: string };

/** Accepts 12 digits (check digit added) or 13 digits (check digit verified). */
export function encodeEan13(raw: string): EanResult {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return { ok: false, error: 'EAN-13 takes digits only.' };
  if (digits.length !== 12 && digits.length !== 13) return { ok: false, error: `EAN-13 needs 12 or 13 digits; this has ${digits.length}.` };
  const check = eanCheckDigit(digits.slice(0, 12));
  if (digits.length === 13 && Number(digits[12]) !== check) {
    return { ok: false, error: `Wrong check digit: the last digit should be ${check}.` };
  }
  const full = digits.slice(0, 12) + String(check);
  const parity = EAN_PARITY[Number(full[0])]!;
  let modules = '101';
  for (let i = 1; i <= 6; i++) modules += (parity[i - 1] === 'L' ? EAN_L : EAN_G)[Number(full[i])];
  modules += '01010';
  for (let i = 7; i <= 12; i++) modules += EAN_R[Number(full[i])];
  modules += '101';
  return { ok: true, digits: full, modules, addedCheckDigit: digits.length === 12 };
}

/** Module indexes of the EAN-13 guard bars (drawn longer). */
export function isEanGuard(index: number): boolean {
  return index < 3 || (index >= 45 && index < 50) || index >= 92;
}

// ─── Code 128 ───

/** Bar/space widths for values 0-105, then the stop pattern (106). */
const C128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const STOP = 106;

function widthsToModules(widths: string): string {
  let out = '';
  for (let i = 0; i < widths.length; i++) out += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]));
  return out;
}

export type Code128Result = { ok: true; text: string; modules: string } | { ok: false; error: string };

/**
 * Code set C for all-digit text (two digits per symbol, shorter bars), with a
 * switch to set B for an odd last digit; code set B for anything else.
 */
export function encodeCode128(text: string): Code128Result {
  if (!text) return { ok: false, error: 'Type something to encode.' };
  if (text.length > 48) return { ok: false, error: 'Keep Code 128 labels under 48 characters so they scan from a label.' };
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) return { ok: false, error: `"${ch}" cannot be encoded. Use English letters, digits and common symbols.` };
  }
  const values: number[] = [];
  if (/^\d{2,}$/.test(text)) {
    values.push(START_C);
    const even = text.length - (text.length % 2);
    for (let i = 0; i < even; i += 2) values.push(Number(text.slice(i, i + 2)));
    if (even < text.length) values.push(CODE_B, text.charCodeAt(even) - 32);
  } else {
    values.push(START_B);
    for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  }
  let sum = values[0]!;
  for (let i = 1; i < values.length; i++) sum += values[i]! * i;
  values.push(sum % 103, STOP);
  return { ok: true, text, modules: values.map((v) => widthsToModules(C128[v]!)).join('') };
}
