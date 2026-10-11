/**
 * Prints or saves a PrintDoc.
 *   A4            → browser print
 *   PDF           → file download
 *   Thermal 80/58 → straight to the paired printer when Settings → Hardware
 *                   is on "Direct", otherwise a narrow browser print
 * Browser printing uses a hidden iframe, so the page itself is untouched and
 * popup blockers do not get in the way.
 */

import { toast } from 'sonner';
import { printerReady, sendToPrinter } from '@core/hardware/devices';
import { useHardwareSettings } from '@core/hardware/settings';
import { pdfFileName, renderPdf } from './pdf';
import { renderEscPos, renderHtml } from './render';
import { usePrintSettings } from './settings';
import type { BusinessHeader, PrintDoc, PrintFormat, RenderContext } from './types';

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

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function renderContext(biz: BusinessHeader, accent: string, printedBy?: string): RenderContext {
  const s = usePrintSettings.getState();
  const when = new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  return {
    biz, accent,
    color: s.colorMode === 'color',
    showLogo: s.showLogo, showAddress: s.showAddress, showPhone: s.showPhone,
    footerNote: s.footerNote.trim(),
    thermalText: s.thermalText,
    stamp: s.showStamp ? `Printed ${when}${printedBy ? ` by ${printedBy}` : ''} · Nafaa` : undefined,
  };
}

export async function printDoc(doc: PrintDoc, format: PrintFormat, ctx: RenderContext) {
  if (format === 'pdf') {
    const id = toast.loading('PDF ban rahi hai…');
    try {
      download(await renderPdf(doc, ctx), pdfFileName(doc));
      toast.success('PDF download ho gayi', { id });
    } catch (e) {
      toast.error(`PDF nahi bani: ${(e as Error).message}`, { id });
    }
    return;
  }
  if (format !== 'a4' && useHardwareSettings.getState().printMode === 'direct' && printerReady()) {
    try {
      await sendToPrinter(renderEscPos(doc, format, ctx));
      toast.success('Printer par bhej diya');
      return;
    } catch (e) {
      toast.error(`Direct print nahi hua (${(e as Error).message}) — browser se print kar rahe hain`);
    }
  }
  printHtml(renderHtml(doc, format, ctx));
}
