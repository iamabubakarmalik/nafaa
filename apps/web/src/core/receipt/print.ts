/**
 * Prints a bill. Thermal bills go straight to a connected printer when the
 * counter has one (Settings → Hardware); otherwise, and for A4, the bill is
 * printed from a hidden frame, so no popup window is needed or blocked.
 */

import { tryDirectPrint } from '@core/hardware/print';
import { renderReceipt } from './html';
import { getReceiptSetup } from './setup';
import type { ReceiptDoc, ReceiptPaper, ReceiptSetup } from './types';

/** Prints any finished HTML document from a hidden frame. */
export function printHtml(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) { frame.remove(); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  const go = () => {
    // Images (logo, QR) must load before the print dialog takes its snapshot.
    const imgs = Array.from(win.document.images);
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))))
      .then(() => {
        win.focus();
        win.print();
        window.setTimeout(() => frame.remove(), 60_000);
      });
  };
  if (win.document.readyState === 'complete') window.setTimeout(go, 50);
  else win.addEventListener('load', go, { once: true });
}

export interface PrintOptions {
  paper?: ReceiptPaper;
  copies?: number;
  setup?: ReceiptSetup;
}

/** Prints one bill in the shop's design. Always returns true (kept for old callers). */
export function printReceipt(doc: ReceiptDoc, o: PrintOptions = {}): boolean {
  const setup = o.setup ?? getReceiptSetup();
  const paper = o.paper ?? setup.design.paper;
  const copies = o.copies ?? setup.design.copies;
  const browser = () => { printHtml(renderReceipt(doc, setup, { paper, copies })); return true; };
  const payload = {
    ...doc,
    shopName: setup.shop.name,
    shopAddress: (setup.design.showAddress ? doc.branchAddress || setup.shop.address : '') || undefined,
    shopPhone: (setup.design.showPhone ? doc.branchPhone || setup.shop.phone : '') || undefined,
  };
  if (paper !== 'A4' && tryDirectPrint(payload, paper, browser)) return true;
  return browser();
}
