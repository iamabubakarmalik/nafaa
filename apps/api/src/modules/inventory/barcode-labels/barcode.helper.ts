/**
 * In-store barcodes: EAN-13 numbers in the "2xx" range that GS1 keeps for
 * in-store use, with a correct check digit so every scanner accepts them.
 */

import { Prisma } from '@prisma/client';

export function ean13CheckDigit(first12: string) {
  const sum = first12.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

export const isEan13 = (code: string) => /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === code[12];

/** A fresh in-store EAN-13 not yet used by any product or variant of the tenant. */
export async function freshInStoreEan(tx: Prisma.TransactionClient, tenantId: string, taken = new Set<string>()) {
  for (let i = 0; i < 20; i++) {
    const body = `20${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10_000).toString().padStart(4, '0')}`;
    const code = body + ean13CheckDigit(body);
    if (taken.has(code)) continue;
    const [p, v] = await Promise.all([
      tx.product.count({ where: { tenantId, barcode: code } }),
      tx.productVariant.count({ where: { barcode: code, product: { tenantId } } }),
    ]);
    if (!p && !v) { taken.add(code); return code; }
  }
  throw new Error('Barcode banane me masla — dobara koshish karein');
}
