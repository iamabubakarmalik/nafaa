/**
 * Home hero illustration: a code-drawn, data-free sketch of the Nafaa
 * counter (catalogue, cart, pay buttons) with three floating cards for the
 * things the counter does around a sale: offline billing, the FBR/PRA
 * invoice and the khata reminder. No numbers, prices or customer names are
 * drawn, so it never states a fact the CMS does not hold.
 *
 * Decorative (aria-hidden): the hero text carries the meaning. Shown only
 * when the hero block has no screenshot; a real screenshot always wins.
 * Loops run only while in view (MotionObserver) and never with reduced motion.
 */
import { CmsIcon } from '@/lib/icons';
import { cx } from '@/components/ui/cx';
import styles from './home.module.css';

const TILES = ['milk', 'egg', 'apple', 'coffee', 'candy', 'wheat'] as const;
const RAIL = ['layout-dashboard', 'receipt', 'boxes', 'notebook-pen'] as const;

/** A QR-like glyph (decorative): three finder squares and a fixed module pattern on a 21-cell grid. */
const QR_MODULES = [
  '00000000110100000000', '00000000011000000000', '00000000101100000000', '00000000010000000000', '00000000111000000000',
  '00000000001000000000', '00000000101000000000', '00000000010100000000', '10110101101011010110', '01101010011101100101',
  '11010011010110011010', '00101101101001110101', '10011010110110100110', '00000000101101011001', '00000000010110110100',
  '00000000110011010011', '00000000011101101010', '00000000101010110101', '00000000010101011010', '00000000111010100101',
  '00000000100101011011',
];

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );
}

/** Horizontal runs of "1" cells, so the glyph is a handful of rects, not hundreds. */
function runs(row: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of row.matchAll(/1+/g)) out.push([m.index ?? 0, m[0].length]);
  return out;
}

function QrGlyph() {
  return (
    <svg viewBox="0 0 21 21" className={styles.qr} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d={QR_MODULES.flatMap((row, y) => runs(row).map(([x, w]) => `M${x} ${y}h${w}v1h-${w}z`)).join('')}
      />
      <Finder x={0} y={0} />
      <Finder x={14} y={0} />
      <Finder x={0} y={14} />
    </svg>
  );
}

export function HeroVisual({ appUrl }: { appUrl: string }) {
  const host = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <div className={styles.stage} data-animate="" aria-hidden="true">
      <div className={styles.window}>
        <div className={styles.chrome}>
          <span className={styles.lights}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.url}>{host}/pos</span>
        </div>
        <div className={styles.app}>
          <div className={styles.rail}>
            {RAIL.map((name, i) => (
              <span key={name} className={cx(styles.railItem, i === 1 && styles.railActive)}>
                <CmsIcon name={name} size={16} />
              </span>
            ))}
          </div>
          <div className={styles.catalog}>
            <div className={styles.search}>
              <CmsIcon name="scan-barcode" size={14} />
              <span className={cx(styles.bar, styles.w55)} />
            </div>
            <div className={styles.chips}>
              <span className={cx(styles.chip, styles.chipOn)}>All</span>
              <span className={styles.chip}>Dairy</span>
              <span className={styles.chip}>Snacks</span>
            </div>
            <div className={styles.tiles}>
              {TILES.map((name, i) => (
                <span key={name} className={cx(styles.tile, i === 4 && styles.tileHot)}>
                  <span className={styles.tileIcon}>
                    <CmsIcon name={name} size={15} />
                  </span>
                  <span className={cx(styles.bar, styles.barStrong, i % 2 ? styles.w70 : styles.w85)} />
                </span>
              ))}
            </div>
          </div>
          <div className={styles.cart}>
            <div className={styles.cartHead}>
              <span>Bill</span>
              <CmsIcon name="printer" size={14} className="text-fg-subtle" />
            </div>
            {[styles.w85, styles.w70].map((w, i) => (
              <div key={i} className={styles.line}>
                <span className={styles.dot} />
                <span className={cx(styles.bar, styles.barStrong, w)} />
                <span className={styles.bar} />
              </div>
            ))}
            <div className={cx(styles.line, styles.lineNew)}>
              <span className={styles.dot} />
              <span className={cx(styles.bar, styles.barStrong, styles.w70)} />
              <span className={styles.bar} />
            </div>
            <div className={styles.pay}>
              <span className={styles.chip}>Cash</span>
              <span className={styles.chip}>Card</span>
              <span className={styles.chip}>Khata</span>
            </div>
            <span className={styles.payBtn}>
              <CmsIcon name="receipt" size={14} />
              Bill
            </span>
          </div>
        </div>
      </div>

      <div className={cx(styles.float, styles.status, styles.bobA)}>
        <span className={cx(styles.floatIcon, styles.statusIcon)}>
          <CmsIcon name="wifi-off" size={16} />
        </span>
        <span className={styles.swap}>
          <span className={styles.swapA}>
            <span className={cx(styles.title, 'block')}>Offline</span>
            <span className={cx(styles.muted, 'block')}>Sales saved on this device</span>
          </span>
          <span className={styles.swapB}>
            <span className={cx(styles.title, 'block')}>Back online</span>
            <span className={cx(styles.muted, 'block')}>Sales synced to your account</span>
          </span>
        </span>
      </div>

      <div className={cx(styles.float, styles.receipt, styles.bobB)}>
        <span className={cx(styles.bar, styles.barStrong, styles.w70, 'self-center')} />
        <span className={cx(styles.bar, styles.w85)} />
        <span className={cx(styles.bar, styles.w55)} />
        <QrGlyph />
        <span className={styles.tag}>FBR / PRA invoice</span>
      </div>

      <div className={cx(styles.float, styles.toast)}>
        <span className={cx(styles.floatIcon, styles.toastIcon)}>
          <CmsIcon name="message-circle" size={16} />
        </span>
        <span>
          <span className={cx(styles.title, 'block')}>Khata reminder sent</span>
          <span className={cx(styles.muted, 'block')}>On WhatsApp, with the balance</span>
        </span>
      </div>
    </div>
  );
}
