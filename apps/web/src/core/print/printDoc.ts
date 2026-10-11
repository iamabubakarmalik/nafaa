/**
 * Prints a PrintDoc in the chosen format.
 *   A4            → browser print (also "Save as PDF")
 *   Thermal 80/58 → straight to the paired printer when Settings → Hardware
 *                   is on "Direct", otherwise a narrow browser print
 * Browser printing uses a hidden iframe, so the page itself is untouched and
 * popup blockers do not get in the way.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { printerReady, sendToPrinter } from '@core/hardware/devices';
import { useHardwareSettings } from '@core/hardware/settings';
import { renderEscPos, renderHtml } from './render';
import type { BusinessHeader, PrintDoc, PrintFormat } from './types';

/** Last format used on this computer; the next print starts there. */
export const usePrintPrefs = create<{ format: PrintFormat; setFormat: (f: PrintFormat) => void }>()(
  persist((set) => ({ format: 'a4', setFormat: (format) => set({ format }) }), { name: 'nafaa-print' }),
);

function printHtml(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) { frame.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  // Wait for images (logo) so they are on the page.
  const imgs = Array.from(doc.images).filter((i) => !i.complete);
  if (imgs.length === 0) setTimeout(go, 50);
  else Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(go);
}

export async function printDoc(doc: PrintDoc, format: PrintFormat, biz: BusinessHeader) {
  usePrintPrefs.getState().setFormat(format);
  if (format !== 'a4' && useHardwareSettings.getState().printMode === 'direct' && printerReady()) {
    try {
      await sendToPrinter(renderEscPos(doc, format, biz));
      toast.success('Printer par bhej diya');
      return;
    } catch (e) {
      toast.error(`Direct print nahi hua (${(e as Error).message}) — browser se print kar rahe hain`);
    }
  }
  printHtml(renderHtml(doc, format, biz));
}
