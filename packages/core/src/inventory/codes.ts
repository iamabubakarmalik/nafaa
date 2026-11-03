/**
 * Product codes: in-store EAN-13 barcodes (the "20" range GS1 keeps for
 * in-store use, same as the API's barcode helper) and the automatic SKU the
 * editor offers.
 */

export function ean13CheckDigit(first12: string): string {
  const sum = first12.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

/** True for a 13-digit code with a correct check digit. */
export const isEan13 = (code: string) => /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === code[12];

/** True for an 8-digit EAN-8 with a correct check digit. */
export function isEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  const sum = code.slice(0, 7).split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10) === code[7];
}

/**
 * A new in-store EAN-13: "20", six digits of the clock, four random digits
 * and the check digit. `taken` codes are skipped. The server still checks
 * that no other product uses it.
 */
export function inStoreEan13(opts: { now?: number; random?: () => number; taken?: ReadonlySet<string> } = {}): string {
  const now = opts.now ?? Date.now();
  const random = opts.random ?? Math.random;
  for (let i = 0; i < 50; i++) {
    const body = `20${String(now + i).slice(-6)}${Math.floor(random() * 10_000).toString().padStart(4, '0')}`;
    const code = body + ean13CheckDigit(body);
    if (!opts.taken?.has(code)) return code;
  }
  throw new Error('no free code');
}

/** "Atta Fine 1kg" + "RTL" → "ATTA-FINE-4821" (first two words, four letters each, four random digits). */
export function autoSku(name: string, prefix: string, random: () => number = Math.random): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.slice(0, 4));
  return `${words.length ? words.join('-') : prefix}-${Math.floor(1000 + random() * 9000)}`;
}

/** Scanned or typed code, trimmed; scanners sometimes add spaces or a trailing newline. */
export const cleanCode = (raw: string | null | undefined) => String(raw ?? '').replace(/[\r\n\t]/g, '').trim();
