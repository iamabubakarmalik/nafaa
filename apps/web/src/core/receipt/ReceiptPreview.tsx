/**
 * Shows a receipt exactly as it prints. The bill lives in its own frame, so
 * the app's theme and dark mode can never change its colours.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@core/lib/cn';
import { renderReceipt } from './html';
import type { ReceiptDoc, ReceiptPaper, ReceiptSetup } from './types';

export function ReceiptPreview({ doc, setup, paper, className, zoom = 1 }: {
  doc: ReceiptDoc;
  setup: ReceiptSetup;
  paper?: ReceiptPaper;
  className?: string;
  /** Shrinks the paper, e.g. 0.8 in a side panel. */
  zoom?: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const p = paper ?? setup.design.paper;
  const html = useMemo(() => renderReceipt(doc, setup, { paper: p }), [doc, setup, p]);
  const width = p === 'A4' ? 794 : p === '58' ? 236 : 316;

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const fit = () => {
      const body = frame.contentDocument?.body;
      if (body) setHeight(Math.ceil(body.scrollHeight) + 8);
    };
    frame.addEventListener('load', fit);
    const t = window.setTimeout(fit, 300);
    return () => { frame.removeEventListener('load', fit); window.clearTimeout(t); };
  }, [html]);

  return (
    <div className={cn('mx-auto overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5', className)}
      style={{ width: width * zoom, height: height * zoom }}>
      <iframe ref={ref} title={`Bill ${doc.saleNumber}`} srcDoc={html} sandbox="allow-same-origin"
        style={{ width, height, border: 0, transform: `scale(${zoom})`, transformOrigin: '0 0', background: '#fff' }} />
    </div>
  );
}
