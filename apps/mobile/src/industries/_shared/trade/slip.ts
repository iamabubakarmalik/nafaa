/** Printing and sharing a slip made by a trade pack through the shared receipt engine, in the shop's bill language. */

import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';

export type { ReceiptDoc, ReceiptLang, ReceiptRowDoc };

/** A row only when it has a value. */
export const slipRow = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] => (value || value === 0 ? [{ label, value: String(value), ...(bold && { bold }) }] : []);

/** Prints through the shop's printer, or shares a PDF when `share`. */
export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}
