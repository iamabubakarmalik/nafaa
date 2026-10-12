/**
 * Counter printing entry point kept for the POS screens and order slips.
 * The bill itself is drawn by the shared receipt engine (core/receipt), in
 * the design chosen in Settings → Raseed; this file only adapts the POS
 * payload and tells the customer display the sale is done.
 */

import { postToDisplay } from '@core/hardware/customerDisplay';
import { renderReceipt } from '@core/receipt/html';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptLineDoc, ReceiptRowDoc } from '@core/receipt/types';

export type PrinterWidth = '80' | '58';
export type ReceiptLine = ReceiptLineDoc;
export type ReceiptRow = ReceiptRowDoc;

/** A POS bill; `shopName` is the fallback when settings have no name. */
export interface ReceiptPayload extends ReceiptDoc {
  shopName: string;
  /** Branch phone / address when known; settings fill in otherwise. */
  shopPhone?: string;
  shopAddress?: string;
}

export function toReceiptDoc(p: ReceiptPayload): ReceiptDoc {
  const { shopName: _n, shopPhone, shopAddress, ...doc } = p;
  return { ...doc, branchPhone: doc.branchPhone ?? shopPhone ?? null, branchAddress: doc.branchAddress ?? shopAddress ?? null };
}

/** The bill as a document, e.g. for a preview. */
export function buildReceiptHtml(p: ReceiptPayload, widthMm: PrinterWidth): string {
  return renderReceipt(toReceiptDoc(p), getReceiptSetup(p.shopName), { paper: widthMm });
}

/**
 * Prints the bill on this counter's paper width. Returns true when printing
 * started; kept boolean for the callers that warned about blocked popups.
 */
export function printReceiptDirect(p: ReceiptPayload, widthMm: PrinterWidth): boolean {
  postToDisplay({ kind: 'thanks', shopName: p.shopName, total: p.total, paid: p.paid, change: Math.max(p.paid - p.total, 0) });
  return printReceipt(toReceiptDoc(p), { paper: widthMm, setup: getReceiptSetup(p.shopName) });
}
