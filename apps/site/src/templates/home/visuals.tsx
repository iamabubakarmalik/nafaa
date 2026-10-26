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

/** Inventory: products with stock bars, units and a low-stock flag. */
function Inventory() {
  const rows = [
    { icon: 'wheat', name: 'Chakki Atta 10kg', w: 78, unit: 'bori' },
    { icon: 'milk', name: 'Banaspati Ghee 1kg', w: 56, unit: 'ctn' },
    { icon: 'coffee', name: 'Black Tea 950g', w: 14, unit: 'pcs', low: true },
    { icon: 'soup', name: 'Basmati Rice 5kg', w: 64, unit: 'bag' },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-5">
      {rows.map((r, i) => (
        <div key={r.name} className={cx('flex items-center gap-2.5 rounded-lg border bg-surface px-2.5 py-1 shadow-e1 ink:shadow-none', r.low ? 'border-amber-500/40' : 'border-line')}>
          <span className={cx('inline-flex size-5 shrink-0 items-center justify-center rounded-md', r.low ? 'bg-amber-500/15 text-amber-600 ink:text-amber-300' : 'bg-brand-500/10 text-brand-700 ink:text-brand-300')}>
            <CmsIcon name={r.icon} size={12} />
          </span>
          <span className="w-[6.5rem] shrink-0 truncate text-[10.5px] font-semibold text-fg-strong">{r.name}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
            <span className={cx(fx.grow, 'block h-full w-[var(--w)] rounded-full', r.low ? 'bg-amber-500' : 'bg-brand-500')} style={{ '--w': `${r.w}%`, '--delay': `${i * 120}ms` }} />
          </span>
          {r.low ? (
            <span className={cx(fx.blink, 'rounded-full bg-amber-500/15 px-1.5 text-[9px] font-bold uppercase leading-4 text-amber-700 ink:text-amber-300')}>Low</span>
          ) : (
            <span className="rounded-full bg-fg/[0.06] px-1.5 text-[9px] font-semibold leading-4 text-fg-subtle">{r.unit}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Khata: balances by age, and a WhatsApp reminder going out. */
function Khata() {
  const rows = [
    { i: 'A', tone: 'bg-sky-500', age: '7 din', w: 70 },
    { i: 'B', tone: 'bg-violet-500', age: '30+ din', w: 46, late: true },
    { i: 'C', tone: 'bg-amber-500', age: '2 din', w: 28 },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-2 px-5">
      {rows.map((r) => (
        <div key={r.i} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-e1 ink:shadow-none">
          <span className={cx('inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', r.tone)}>{r.i}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
            <span className={cx('block h-full w-[var(--w)] rounded-full', r.late ? 'bg-rose-500/70' : 'bg-brand-500/60')} style={{ '--w': `${r.w}%` }} />
          </span>
          <span className={cx('rounded-full px-1.5 text-[9px] font-semibold leading-4', r.late ? 'bg-rose-500/12 text-rose-600 ink:text-rose-300' : 'bg-fg/[0.06] text-fg-subtle')}>{r.age}</span>
          <span className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-500/12 text-emerald-600 ink:text-emerald-300">
            <CmsIcon name="message-circle" size={11} />
          </span>
        </div>
      ))}
      <span className={cx(fx.bubble, 'absolute bottom-2.5 right-5 inline-flex items-center gap-1.5 rounded-xl rounded-br-sm bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-e2')}>
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

/** Tax invoice: a printed receipt with a fiscal number and its QR, stamped once issued. */
function TaxInvoice() {
  return (
    <div className="relative flex h-full items-end justify-center gap-6 px-6 pt-4">
      <div className="relative w-[13.5rem] max-w-[62%] self-stretch rounded-t-xl border border-b-0 border-line bg-surface px-3.5 pt-3 shadow-e2 ink:shadow-none">
        <div className="flex items-center justify-between">
          <span className="rounded bg-fg-strong px-1.5 text-[8.5px] font-bold uppercase leading-4 tracking-wider text-canvas">Tax invoice</span>
          <span className={cx(bar, 'h-1.5 w-10')} />
        </div>
        {[64, 52].map((w, i) => (
          <div key={i} className="mt-2 flex items-center justify-between gap-2">
            <span className={cx(bar, 'h-1.5 w-[var(--w)]')} style={{ '--w': `${w}%` }} />
            <span className={cx(bar, 'h-1.5 w-6')} />
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-line-strong pt-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-fg-muted">Total</span>
          <span className="h-2 w-12 rounded-full bg-fg-strong/70" />
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="min-w-0 pb-0.5">
            <span className="block text-[8px] font-semibold uppercase tracking-wider text-fg-subtle">Fiscal no.</span>
            <span className="mt-0.5 block whitespace-nowrap font-mono text-[10px] font-semibold tracking-tight text-fg-strong">4021-8837-5520</span>
          </span>
          <svg viewBox="0 0 21 21" className="size-11 shrink-0 text-fg-strong" shapeRendering="crispEdges">
            <QrFinder x={0} y={0} />
            <QrFinder x={14} y={0} />
            <QrFinder x={0} y={14} />
            {QR_CELLS.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
            ))}
          </svg>
        </div>
        <span className={cx(fx.stamp, 'absolute -right-5 top-7 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-e2')}>
          <CmsIcon name="check" size={11} /> Issued
        </span>
      </div>
      <div className="hidden flex-col gap-2 self-center sm:flex">
        {[
          ['shield-check', 'Fiscal number'],
          ['qr-code', 'QR on the bill'],
          ['printer', '80 mm or A4'],
        ].map(([icon, label], i) => (
          <span key={label} className={cx(fx.lineIn, 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-[10.5px] font-semibold text-fg-muted shadow-e1 ink:shadow-none')} style={{ '--delay': `${i * 0.4}s` }}>
            <CmsIcon name={icon} size={12} className="text-brand-600 ink:text-brand-300" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Online store: a storefront whose order lands on the counter, stock in sync. */
function Store() {
  return (
    <div className="relative flex h-full items-center justify-center gap-3 px-5">
      <div className="w-[64%] max-w-[15rem] overflow-hidden rounded-lg border border-line bg-surface shadow-e2 ink:shadow-none">
        <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-rose-400" />
          <span className="size-1.5 rounded-full bg-amber-400" />
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[9px] font-semibold text-fg-subtle">yourstore.pk</span>
          <span className="ml-auto inline-flex items-center gap-0.5 rounded bg-brand-500/12 px-1 text-[9px] font-bold text-brand-700 ink:text-brand-300">
            <CmsIcon name="shopping-cart" size={9} />1
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-2">
          {['bg-sky-400/30', 'bg-amber-400/30', 'bg-violet-400/30'].map((c, i) => (
            <div key={i}>
              <div className={cx('aspect-square rounded', c)} />
              <span className={cx(bar, 'mt-1 block h-1 w-3/4')} />
              <span className="mt-0.5 block h-1 w-1/2 rounded-full bg-brand-500/50" />
            </div>
          ))}
        </div>
      </div>
      <span className="flex flex-col items-center gap-1">
        {[0, 1, 2].map((k) => (
          <span key={k} className={cx(fx.queue, 'size-1.5 rounded-full bg-brand-500')} style={{ '--delay': `${k * 0.25}s` }} />
        ))}
      </span>
      <span className="relative inline-flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-line bg-surface text-brand-700 shadow-e2 ink:text-brand-300 ink:shadow-none">
        <CmsIcon name="scan-barcode" size={20} />
        <span className="text-[8px] font-bold uppercase tracking-wide text-fg-subtle">Counter</span>
      </span>
      <span className={cx(fx.toast, 'absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-fg-strong shadow-e2')}>
        <span className="size-1.5 rounded-full bg-brand-500" /> New order
      </span>
    </div>
  );
}

/** Nafaa Bazaar: your products listed among other shops, one picked by a buyer. */
function Bazaar() {
  return (
    <div className="relative flex h-full items-center justify-center px-5">
      <div className="w-full max-w-[16rem] rounded-xl border border-line bg-surface p-2 shadow-e2 ink:shadow-none">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="inline-flex size-5 items-center justify-center rounded-md bg-brand-600 text-white">
            <CmsIcon name="store" size={11} />
          </span>
          <span className="text-[10px] font-bold text-fg-strong">Nafaa Bazaar</span>
          <span className="ml-auto flex h-4 flex-1 max-w-[5rem] items-center rounded-full bg-fg/[0.06] px-1.5">
            <CmsIcon name="search" size={9} className="text-fg-subtle" />
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={cx('relative overflow-hidden rounded-md border bg-surface', i === 5 ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-line')}>
              <div className={cx('aspect-[4/3]', ['bg-sky-400/25', 'bg-amber-400/25', 'bg-rose-400/25', 'bg-emerald-400/25'][i % 4])} />
              <span className={cx(bar, 'mx-1 my-1 block h-1')} />
              {i === 5 ? <span className={cx(fx.shine, 'absolute inset-0')} /> : null}
              {i === 5 ? <span className="absolute left-1 top-1 rounded bg-brand-600 px-1 text-[7px] font-bold uppercase text-white">You</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Staff: who is in today, the week's attendance and payroll ready. */
function Staff() {
  const people = [
    { c: 'bg-sky-500', r: 'Cashier' },
    { c: 'bg-violet-500', r: 'Manager' },
    { c: 'bg-amber-500', r: 'Rider' },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-2 px-5">
      {people.map((p, r) => (
        <div key={p.r} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-e1 ink:shadow-none">
          <span className={cx('relative size-6 shrink-0 rounded-full', p.c)}>
            <span className={cx('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface', r === 2 ? 'bg-fg/30' : 'bg-emerald-500')} />
          </span>
          <span className="w-14 text-[10px] font-semibold text-fg-muted">{p.r}</span>
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
      <span className={cx(fx.toast, 'absolute right-5 top-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-strong shadow-e2')} style={{ '--delay': '0.6s' }}>
        <CmsIcon name="wallet" size={11} className="text-brand-600" /> Payroll ready
      </span>
    </div>
  );
}

/** Reports: monthly profit bars with a trend line and a P&L tag. */
function Reports() {
  const heights = [35, 52, 44, 68, 58, 80, 92];
  const pts = heights.map((h, i) => `${(i + 0.5) * (100 / heights.length)},${100 - h + 6}`).join(' ');
  return (
    <div className="relative h-full px-8 pb-5 pt-6">
      <div className="relative flex h-full items-end justify-center gap-2">
        {heights.map((h, i) => (
          <span key={i} className="flex h-full w-full max-w-[1.6rem] items-end">
            <span className={cx(fx.rise, 'block h-[var(--h)] w-full rounded-t-md', i === heights.length - 1 ? 'bg-brand-600' : 'bg-brand-500/30')} style={{ '--h': `${h}%`, '--delay': `${i * 70}ms` }} />
          </span>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <polyline points={pts} fill="none" stroke="rgb(13 148 136)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <span className="absolute left-5 top-3 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-fg-muted shadow-e1">
        <CmsIcon name="trending-up" size={11} className="text-brand-600" /> Profit &amp; loss
      </span>
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

/** Payments: one bill split across cash, a wallet and a card. */
function Payments() {
  const split = [
    { label: 'Cash', w: 45, c: 'bg-brand-600' },
    { label: 'JazzCash', w: 30, c: 'bg-rose-500' },
    { label: 'Card', w: 25, c: 'bg-sky-500' },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <div className="w-full max-w-[18rem] rounded-xl border border-line bg-surface p-3 shadow-e2 ink:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">Split payment</span>
          <span className="h-2 w-12 rounded-full bg-fg-strong/70" />
        </div>
        <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full">
          {split.map((p, i) => (
            <span key={p.label} className={cx(fx.grow, 'w-[var(--w)]', p.c)} style={{ '--w': `${p.w}%`, '--delay': `${i * 200}ms` }} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {split.map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1 text-[10px] font-semibold text-fg-muted">
              <span className={cx('size-2 rounded-full', p.c)} />
              {p.label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid w-full max-w-[18rem] grid-cols-3 gap-2">
        {['Easypaisa', 'QR', 'Udhaar'].map((m, i) => (
          <span key={m} className={cx(fx.cycle, 'rounded-lg border border-line bg-surface px-2 py-1 text-center text-[10.5px] font-semibold text-fg-muted shadow-e1 ink:shadow-none')} style={{ '--delay': `${i}s` }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/** AI assistant: a question in Roman Urdu and a short answer with ranked bars. */
function Ai() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      <span className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-brand-700 px-3 py-1.5 text-[11px] font-medium text-white shadow-e1">Is hafte profit kis cheez par hua?</span>
      <div className="flex items-end gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-e1">
          <CmsIcon name="sparkles" size={13} />
        </span>
        <span className={cx(fx.bubble, 'w-[68%] max-w-[15rem] rounded-xl rounded-bl-sm border border-line bg-surface px-3 py-2.5 shadow-e1 ink:shadow-none')} style={{ '--delay': '0.4s' }}>
          {[88, 66, 48].map((w, i) => (
            <span key={i} className={cx('flex items-center gap-2', i > 0 && 'mt-1.5')}>
              <span className="w-3 text-[9px] font-bold text-brand-700 ink:text-brand-300">{i + 1}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
                <span className={cx(fx.grow, 'block h-full w-[var(--w)] rounded-full', i === 0 ? 'bg-brand-600' : 'bg-brand-500/45')} style={{ '--w': `${w}%`, '--delay': `${i * 120}ms` }} />
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

const VISUALS: Record<string, () => React.JSX.Element> = {
  'scan-barcode': Pos,
  receipt: TaxInvoice,
  'receipt-text': TaxInvoice,
  boxes: Inventory,
  package: Inventory,
  'notebook-pen': Khata,
  'shield-check': TaxInvoice,
  landmark: TaxInvoice,
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
