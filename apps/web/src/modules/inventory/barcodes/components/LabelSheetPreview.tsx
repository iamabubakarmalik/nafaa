/**
 * Live preview of the print document in a frame, scaled to fit its column.
 * It shows the very HTML that is sent to the printer, so what is seen here
 * is what prints.
 */

import { useEffect, useRef, useState } from 'react';
import { MM_TO_PX } from './renderLabels';

export function LabelSheetPreview({ html, pageW, pageH, pages }: {
  html: string;
  /** Page size in mm. */
  pageW: number;
  pageH: number;
  pages: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const docW = pageW * MM_TO_PX;
  const docH = Math.max(1, pages) * (pageH + 4) * MM_TO_PX;
  // Small roll labels are shown larger than life so the text can be read.
  const scale = width ? Math.min(width / docW, pageW < 120 ? 3 : 1) : 0;

  return (
    <div ref={box} className="light w-full overflow-hidden">
      {scale > 0 && (
        <div style={{ height: docH * scale }}>
          <iframe
            title="Label preview"
            srcDoc={html}
            sandbox=""
            style={{ width: docW, height: docH, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, display: 'block', marginLeft: Math.max(0, (width - docW * scale) / 2) }}
          />
        </div>
      )}
    </div>
  );
}
