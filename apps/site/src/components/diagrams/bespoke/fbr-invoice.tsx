/**
 * fbr-invoice: a POS sale goes through Nafaa to FBR / PRA, the fiscal
 * number comes back, and the receipt prints with a QR code.
 */
import styles from '../diagrams.module.css';
import { anchor, elbow, line } from '../lib/geometry';
import { sequence, wrapText } from '../lib/text';
import { FONT_H, FONT_V, type Scene } from '../lib/types';
import { cx } from '../parts/classes';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

/**
 * Decorative QR-style pattern (21 x 21 modules with three finder squares).
 * It encodes nothing; it only shows where the fiscal QR sits on the receipt.
 */
function qrPath(x: number, y: number, size: number): string {
  const n = 21;
  const m = size / n;
  const inFinder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  const finder = (r: number, c: number, r0: number, c0: number) => {
    const dr = r - r0;
    const dc = c - c0;
    if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return false;
    return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
  };
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const on = inFinder(r, c) ? finder(r, c, 0, 0) || finder(r, c, 0, n - 7) || finder(r, c, n - 7, 0) : rand() < 0.48;
      if (on) d += `M${(x + c * m).toFixed(1)} ${(y + r * m).toFixed(1)}h${m.toFixed(2)}v${m.toFixed(2)}h-${m.toFixed(2)}z`;
    }
  }
  return d;
}

/** Thermal receipt with a torn bottom edge, text lines and the QR. */
function Receipt({ x, y, w, h, caption, captionSize, reveal }: { x: number; y: number; w: number; h: number; caption: string; captionSize: number; reveal: string | undefined }) {
  const teeth = 9;
  const tooth = w / teeth;
  let edge = '';
  for (let i = 0; i < teeth; i++) edge += `L${x + w - (i + 0.5) * tooth} ${y + h + 6}L${x + w - (i + 1) * tooth} ${y + h}`;
  const paper = `M${x} ${y}H${x + w}V${y + h}${edge}Z`;
  const pad = 14;
  const rows = [0.62, 0.48, 0.7, 0.4];
  const qrSize = Math.min(w - pad * 4, 76);
  const qrY = y + h - qrSize - 14;
  const captionLines = wrapText(caption, w + 40, captionSize, 2);
  return (
    <g className={cx(styles.rise, reveal)}>
      <path d={paper} className={styles.nodeShadow} transform="translate(0 2)" />
      <path d={paper} className={styles.paper} />
      <rect x={x + w / 2 - 26} y={y + 14} width={52} height={7} rx={3.5} className={styles.inkLineStrong} />
      <rect x={x + w / 2 - 36} y={y + 27} width={72} height={4} rx={2} className={styles.inkLine} />
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={x + pad} y={y + 44 + i * 12} width={(w - pad * 2) * r * 0.7} height={4} rx={2} className={styles.inkLine} />
          <rect x={x + w - pad - 18} y={y + 44 + i * 12} width={18} height={4} rx={2} className={styles.inkLine} />
        </g>
      ))}
      <rect x={x + pad} y={y + 44 + rows.length * 12 + 4} width={w - pad * 2} height={1} className={styles.inkLine} />
      <rect x={x + pad} y={y + 44 + rows.length * 12 + 12} width={34} height={6} rx={3} className={styles.inkLineStrong} />
      <rect x={x + w - pad - 26} y={y + 44 + rows.length * 12 + 12} width={26} height={6} rx={3} className={styles.inkLineStrong} />
      <path d={qrPath(x + (w - qrSize) / 2, qrY, qrSize)} className={styles.qr} />
      <text x={x + w / 2} y={y + h + 28} textAnchor="middle" fontSize={captionSize} className={styles.label}>
        {captionLines.map((lineText, i) => (
          <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : captionSize * 1.25}>
            {lineText}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function horizontal(l: Labels): Scene {
  const nodes = [
    node('sale', 40, 150, 180, 68, L(l, 'sale'), { icon: 'scan-barcode', reveal: 0 }),
    node('nafaa', 272, 150, 180, 68, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 1 }),
    node('authority', 512, 40, 196, 68, L(l, 'authority'), { icon: 'landmark', reveal: 2 }),
    node('fiscal', 512, 232, 196, 60, L(l, 'fiscal'), { icon: 'shield-check', tone: 'brand', reveal: 3 }),
  ];
  const sale = byId(nodes, 'sale');
  const nafaa = byId(nodes, 'nafaa');
  const authority = byId(nodes, 'authority');
  const fiscal = byId(nodes, 'fiscal');
  const receipt = { x: 776, y: 34, w: 144, h: 240 };
  return {
    w: 960,
    h: 340,
    font: FONT_H,
    nodes,
    edges: [
      { id: 'send', d: line(anchor(sale, 'r'), anchor(nafaa, 'l')), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'report', d: elbow(anchor(nafaa, 't', 0.5), anchor(authority, 'l'), 'v', 18), reveal: 2, packets: [{ delay: 3 }] },
      { id: 'fiscal', d: line(anchor(authority, 'b'), anchor(fiscal, 't')), tone: 'brand', reveal: 3, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'print', d: line(anchor(fiscal, 'r'), { x: receipt.x - 8, y: fiscal.y + fiscal.h / 2 }), tone: 'brand', reveal: 4, packets: [{ delay: 9, tone: 'brand' }] },
    ],
    pings: [
      { node: 'nafaa', delay: 3 },
      { node: 'authority', delay: 6 },
      { node: 'fiscal', delay: 9 },
    ],
    over: <Receipt {...receipt} caption={L(l, 'receipt')} captionSize={FONT_H.pill + 1} reveal={styles.r4} />,
  };
}

function vertical(l: Labels): Scene {
  const nodes = [
    node('sale', 40, 24, 280, 58, L(l, 'sale'), { icon: 'scan-barcode', reveal: 0 }),
    node('nafaa', 40, 122, 280, 58, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 1 }),
    node('authority', 40, 220, 280, 58, L(l, 'authority'), { icon: 'landmark', reveal: 2 }),
    node('fiscal', 40, 318, 280, 58, L(l, 'fiscal'), { icon: 'shield-check', tone: 'brand', reveal: 3 }),
  ];
  const sale = byId(nodes, 'sale');
  const nafaa = byId(nodes, 'nafaa');
  const authority = byId(nodes, 'authority');
  const fiscal = byId(nodes, 'fiscal');
  const receipt = { x: 118, y: 420, w: 124, h: 196 };
  return {
    w: 360,
    h: 680,
    font: FONT_V,
    nodes,
    edges: [
      { id: 'send', d: line(anchor(sale, 'b'), anchor(nafaa, 't')), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'report', d: line(anchor(nafaa, 'b'), anchor(authority, 't')), reveal: 2, packets: [{ delay: 3 }] },
      { id: 'fiscal', d: line(anchor(authority, 'b'), anchor(fiscal, 't')), tone: 'brand', reveal: 3, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'print', d: line(anchor(fiscal, 'b'), { x: 180, y: receipt.y - 8 }), tone: 'brand', reveal: 4, packets: [{ delay: 9, tone: 'brand' }] },
    ],
    pings: [
      { node: 'nafaa', delay: 3 },
      { node: 'authority', delay: 6 },
      { node: 'fiscal', delay: 9 },
    ],
    over: <Receipt {...receipt} caption={L(l, 'receipt')} captionSize={FONT_V.pill + 1} reveal={styles.r5} />,
  };
}

export const fbrInvoice: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) => `${sequence([L(l, 'sale'), L(l, 'nafaa'), L(l, 'authority'), L(l, 'fiscal'), L(l, 'receipt')])}.`,
};
