import { BarcodeFormat, EncodeHintType, QRCodeWriter } from '@zxing/library';

/** Text → QR ki SVG (naya package nahi — zxing pehle se hai) */
export function qrSvg(text: string, size = 240): string {
  const hints = new Map<EncodeHintType, unknown>([[EncodeHintType.MARGIN, 1], [EncodeHintType.ERROR_CORRECTION, 'M']]);
  const m = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, hints);
  const w = m.getWidth(), h = m.getHeight();
  let d = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
