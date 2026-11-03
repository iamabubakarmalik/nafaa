/**
 * CODE128 barcode of the bill number as an SVG string for printed bills.
 * JsBarcode fills an object with the bar pattern (no DOM needed); the SVG is
 * drawn here.
 */

import JsBarcode from 'jsbarcode';

export function barcodeSvg(value: string, wide: boolean): string {
  if (!value) return '';
  try {
    const target: { encodings?: Array<{ data: string }> } = {};
    JsBarcode(target as never, value, { format: 'CODE128', displayValue: false, margin: 0 });
    const bits = (target.encodings ?? []).map((e) => e.data).join('');
    if (!bits) return '';
    const bar = wide ? 1.6 : 1.3;
    const height = 42;
    let x = 0;
    let rects = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        let run = 1;
        while (bits[i + run] === '1') run++;
        rects += `<rect x="${(x * bar).toFixed(2)}" y="0" width="${(run * bar).toFixed(2)}" height="${height}"/>`;
        x += run;
        i += run - 1;
      } else x += 1;
    }
    const width = (bits.length * bar).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  } catch {
    return '';
  }
}
