/**
 * Code-drawn mini visuals for the platform bento, picked by the item's icon.
 * Decorative (aria-hidden) and data-free: bars and shapes stand in for
 * values, so they never state a number, price or customer. Each one is a
 * complete picture at rest; loops (fx.module.css) run only while the bento
 * is in view and never with reduced motion.
 */
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import fx from './fx.module.css';

const bar = 'rounded-full bg-fg/10';

/** Counter: product tiles on the left (one being tapped), the bill filling on the right, a scanner in front. */
const POS_TILES: { icon: string; tone: string }[] = [
  { icon: 'milk', tone: 'bg-sky-500/15 text-sky-600 ink:text-sky-300' },
  { icon: 'wheat', tone: 'bg-amber-500/15 text-amber-600 ink:text-amber-300' },
  { icon: 'coffee', tone: 'bg-rose-500/15 text-rose-600 ink:text-rose-300' },
  { icon: 'egg', tone: 'bg-orange-500/15 text-orange-600 ink:text-orange-300' },
  { icon: 'apple', tone: 'bg-brand-500/15 text-brand-600 ink:text-brand-300' },
  { icon: 'candy', tone: 'bg-violet-500/15 text-violet-600 ink:text-violet-300' },
];

function Pos() {
  return (
    <div className="relative flex h-full items-end justify-center gap-3 px-5 pt-5 sm:gap-4">
      <div className="grid w-[46%] max-w-[13rem] grid-cols-3 gap-1.5 self-center">
        {POS_TILES.map((t, i) => (
          <span key={t.icon} className={cx('relative flex flex-col items-center gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-e1 ink:shadow-none', i === 4 && fx.tap)}>
            <span className={cx('inline-flex size-7 items-center justify-center rounded-md', t.tone)}>
              <CmsIcon name={t.icon} size={15} />
            </span>
            <span className={cx(bar, 'h-1 w-8')} />
          </span>
        ))}
      </div>
      <div className="relative w-[42%] max-w-[11.5rem] self-stretch rounded-t-xl border border-b-0 border-line bg-surface p-3 shadow-e2 ink:shadow-none">
        <div className="flex items-center justify-between">
          <span className={cx(bar, 'h-2 w-12')} />
          <span className="rounded-full bg-brand-500/15 px-1.5 text-[9px] font-semibold uppercase leading-4 text-brand-700 ink:text-brand-300">Bill</span>
        </div>
        {[72, 58, 80].map((w, i) => (
          <div key={i} className={cx('mt-2.5 flex items-center justify-between gap-2', i === 2 && fx.lineIn)}>
            <span className={cx(bar, 'h-1.5 w-[var(--w)]')} style={{ '--w': `${w}%` }} />
            <span className={cx(bar, 'h-1.5 w-5')} />
          </div>
        ))}
        <div className="mt-3 flex h-7 items-center justify-between rounded-md bg-brand-700 px-2.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/70">Cash</span>
          <span className="h-1.5 w-10 rounded-full bg-white/90" />
        </div>
      </div>
      <div className="absolute bottom-3 left-[8%] hidden h-14 w-20 items-end justify-center gap-[2px] overflow-hidden rounded-lg border border-line bg-surface px-2 pb-1.5 shadow-e2 sm:flex ink:shadow-none">
        {[3, 1, 2, 1, 3, 2, 1, 1, 3, 2, 1, 2].map((w, i) => (
          <span key={i} className="h-9 w-[var(--w)] bg-fg-strong/80" style={{ '--w': `${w}px` }} />
        ))}
        <span className={cx(fx.laser, 'absolute inset-x-1 h-0.5 rounded bg-rose-500 shadow-[0_0_10px_2px_rgb(244_63_94/0.6)]')} />
      </div>
    </div>
  );
}

function Inventory() {
  const rows = [
    { w: 82, tone: 'bg-brand-500' },
    { w: 64, tone: 'bg-brand-500' },
    { w: 18, tone: 'bg-amber-500', low: true },
    { w: 46, tone: 'bg-brand-500' },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-6">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-fg-subtle">
            <CmsIcon name={['package', 'milk', 'coffee', 'wheat'][i]} size={14} />
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
            <span className={cx(fx.grow, 'block h-full w-[var(--w)] rounded-full', r.tone)} style={{ '--w': `${r.w}%`, '--delay': `${i * 120}ms` }} />
          </span>
          {r.low ? <span className={cx(fx.blink, 'rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold uppercase leading-4 text-amber-700 ink:text-amber-300')}>Low</span> : <span className="w-[30px]" />}
        </div>
      ))}
    </div>
  );
}

function Khata() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-2.5 px-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 shadow-e1 ink:shadow-none">
          <span className={cx('size-6 shrink-0 rounded-full', ['bg-sky-400/70', 'bg-violet-400/70', 'bg-amber-400/70'][i])} />
          <span className={cx(bar, 'h-1.5 flex-1')} />
          <span className={cx('h-1.5 w-10 rounded-full', i === 1 ? 'bg-rose-500/70' : 'bg-brand-500/70')} />
        </div>
      ))}
      <span className={cx(fx.bubble, 'absolute bottom-3 right-5 inline-flex items-center gap-1.5 rounded-xl rounded-br-sm bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-e2')}>
        <CmsIcon name="message-circle" size={12} /> Reminder sent ✓✓
      </span>
    </div>
  );
}

/** A 21-module QR-like glyph: three finder squares and a fixed pseudo-random fill (decorative). */
const QR_SIZE = 21;
function qrCells(): [number, number][] {
  const cells: [number, number][] = [];
  const finder = (x: number, y: number) => x < 8 && y < 8;
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      if (finder(x, y) || finder(QR_SIZE - 1 - x, y) || finder(x, QR_SIZE - 1 - y)) continue;
      if ((x * 7 + y * 13 + ((x * y) % 5)) % 3 === 0) cells.push([x, y]);
    }
  }
  return cells;
}
const QR_CELLS = qrCells();

function QrFinder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 0.5} y={y + 0.5} width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );
}

function Fbr() {
  return (
    <div className="flex h-full items-center justify-center gap-5 px-6">
      <div className="relative w-28 rounded-lg border border-line bg-surface p-3 shadow-e2 ink:shadow-none">
        <span className={cx(bar, 'block h-1.5 w-12')} />
        <span className={cx(bar, 'mt-2 block h-1.5 w-16')} />
        <svg viewBox="0 0 21 21" className="mt-3 size-16 text-fg-strong" shapeRendering="crispEdges">
          <QrFinder x={0} y={0} />
          <QrFinder x={14} y={0} />
          <QrFinder x={0} y={14} />
          {QR_CELLS.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ))}
        </svg>
        <span className={cx(fx.stamp, 'absolute -right-4 -top-3 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-e2')}>
          <CmsIcon name="check" size={11} /> FBR
        </span>
      </div>
      <div className="hidden flex-col gap-2 sm:flex">
        {['PRA', 'SRB', 'KPRA'].map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
            <span className="size-1.5 rounded-full bg-brand-500" /> {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function Store() {
  return (
    <div className="relative flex h-full items-center justify-center px-6">
      <div className="w-full max-w-[15rem] overflow-hidden rounded-lg border border-line bg-surface shadow-e2 ink:shadow-none">
        <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-rose-400" />
          <span className="size-1.5 rounded-full bg-amber-400" />
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="ml-2 h-1.5 w-20 rounded-full bg-fg/10" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2">
          {['bg-sky-400/30', 'bg-amber-400/30', 'bg-violet-400/30'].map((c, i) => (
            <div key={i}>
              <div className={cx('aspect-square rounded', c)} />
              <span className={cx(bar, 'mt-1 block h-1 w-3/4')} />
            </div>
          ))}
        </div>
      </div>
      <span className={cx(fx.toast, 'absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-fg-strong shadow-e2')}>
        <span className="size-1.5 rounded-full bg-brand-500" /> New order
      </span>
    </div>
  );
}

function Bazaar() {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="grid w-full max-w-[15rem] grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={cx('relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-surface', i === 5 && 'ring-2 ring-brand-500')}>
            <div className={cx('h-3/5', ['bg-sky-400/25', 'bg-amber-400/25', 'bg-rose-400/25', 'bg-emerald-400/25'][i % 4])} />
            <span className={cx(bar, 'mx-1 mt-1 block h-1')} />
            {i === 5 ? <span className={cx(fx.shine, 'absolute inset-0')} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Staff() {
  const people = ['bg-sky-400', 'bg-violet-400', 'bg-amber-400'];
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      {people.map((c, r) => (
        <div key={c} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-1.5 shadow-e1 ink:shadow-none">
          <span className={cx('size-6 shrink-0 rounded-full', c)} />
          <span className={cx(bar, 'h-1.5 w-12')} />
          <span className="ml-auto grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => {
              const off = (i + r * 2) % 7 === 6;
              return (
                <span key={i} className={cx('inline-flex size-3.5 items-center justify-center rounded-[3px]', off ? 'bg-fg/10' : 'bg-brand-500/85 text-white')}>
                  {off ? null : <CmsIcon name="check" size={9} />}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const heights = [35, 52, 44, 68, 58, 80, 92];
  return (
    <div className="flex h-full items-end justify-center gap-2 px-8 pb-6">
      {heights.map((h, i) => (
        <span key={i} className="flex h-full w-full max-w-[1.5rem] items-end">
          <span className={cx(fx.rise, 'block h-[var(--h)] w-full rounded-t-md', i === heights.length - 1 ? 'bg-brand-600' : 'bg-brand-500/35')} style={{ '--h': `${h}%`, '--delay': `${i * 70}ms` }} />
        </span>
      ))}
    </div>
  );
}

/** Offline: bills queue on the device while the link is down, then flow to the cloud. */
function Offline() {
  return (
    <div className="relative flex h-full items-center justify-center gap-3 px-6">
      <span className="relative flex w-24 flex-col gap-1.5 rounded-xl border border-line bg-surface p-2.5 shadow-e2 ink:shadow-none">
        <span className="absolute -top-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-e1">
          <CmsIcon name="wifi-off" size={10} />
          Offline
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx('flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-1.5 py-1', fx.lineIn)} style={{ '--delay': `${i * 0.5}s` }}>
            <CmsIcon name="receipt" size={11} className="shrink-0 text-fg-subtle" />
            <span className={cx(bar, 'h-1 flex-1')} />
          </span>
        ))}
      </span>
      <span className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx(fx.queue, 'size-2 rounded-full bg-amber-500')} style={{ '--delay': `${i * 0.25}s` }} />
        ))}
      </span>
      <span className="relative inline-flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-brand-600 shadow-e2 ink:text-brand-300 ink:shadow-none">
        <CmsIcon name="cloud" size={26} />
        <span className={cx(fx.blink, 'absolute -bottom-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-surface')}>
          <CmsIcon name="refresh-cw" size={11} />
        </span>
      </span>
    </div>
  );
}

function Branches() {
  return (
    <svg viewBox="0 0 240 120" className="h-full w-full px-4" fill="none">
      {(
        [
          [40, 30],
          [40, 90],
          [200, 30],
          [200, 90],
        ] as const
      ).map(([x, y], i) => (
        <g key={i}>
          <path id={`br-${i}`} d={`M${x} ${y} L120 60`} className="stroke-fg/20" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle r="3" className={cx(fx.packet, 'fill-brand-500')} style={{ '--path': `path("M${x} ${y} L120 60")`, '--delay': `${i * 0.6}s` }} />
          <rect x={x - 16} y={y - 12} width="32" height="24" rx="6" className="fill-surface stroke-line-strong" />
          <path d={`M${x - 7} ${y + 4}h14M${x - 7} ${y}h14M${x - 4} ${y - 5}h8`} className="stroke-fg/40" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
      <rect x="100" y="42" width="40" height="36" rx="10" className="fill-brand-700" />
      <path d="M112 66c0 4 4 7 8 7s8-3 8-7" stroke="#bbf7d0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="53" r="3" fill="#fbbf24" />
    </svg>
  );
}

function Payments() {
  const methods = ['Cash', 'Card', 'JazzCash', 'Easypaisa', 'QR', 'Udhaar'];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <div className="flex w-full max-w-[18rem] items-center justify-between rounded-lg bg-brand-700 px-3 py-2 shadow-e2">
        <span className="h-1.5 w-10 rounded-full bg-white/60" />
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-white/50" />
          <span className="h-2 w-12 rounded-full bg-white" />
        </span>
      </div>
      <div className="grid w-full max-w-[18rem] grid-cols-3 gap-2">
        {methods.map((m, i) => (
          <span key={m} className={cx(fx.cycle, 'rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-[11px] font-semibold text-fg-muted shadow-e1 ink:shadow-none')} style={{ '--delay': `${i}s` }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function Ai() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      <span className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-brand-700 px-3 py-1.5 text-[11px] font-medium text-white">Is hafte profit kis cheez par hua?</span>
      <span className="inline-flex w-14 items-center gap-1 rounded-xl rounded-bl-sm border border-line bg-surface px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx(fx.typing, 'size-1.5 rounded-full bg-fg-subtle')} style={{ '--delay': `${i * 0.18}s` }} />
        ))}
      </span>
    </div>
  );
}

const VISUALS: Record<string, () => React.JSX.Element> = {
  'scan-barcode': Pos,
  receipt: Pos,
  boxes: Inventory,
  package: Inventory,
  'notebook-pen': Khata,
  'shield-check': Fbr,
  landmark: Fbr,
  'shopping-bag': Store,
  store: Bazaar,
  users: Staff,
  'chart-column': Reports,
  'chart-line': Reports,
  'wifi-off': Offline,
  'building-2': Branches,
  wallet: Payments,
  sparkles: Ai,
};

export function hasPlatformVisual(icon: string): boolean {
  return icon in VISUALS;
}

export function PlatformVisual({ icon }: { icon: string }) {
  const Visual = VISUALS[icon];
  return Visual ? <Visual /> : null;
}
