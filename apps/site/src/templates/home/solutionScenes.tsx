/**
 * Animated mini-scenes for the solutions selector, one per business type,
 * picked by the item's icon. Decorative (aria-hidden): product, table and
 * city names are generic, bars stand in for values, and no price, number or
 * customer is stated. Loops (scenes.module.css) run only while the scene is
 * on screen (data-inview on the panel) and never with reduced motion; the
 * resting frame is a complete picture.
 */
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import s from './scenes.module.css';

const card = 'rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none';
const bar = 'rounded-full bg-fg/10';

function Chip({ icon, children, className, i = 0 }: { icon: string; children: ReactNode; className?: string; i?: number }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg-strong shadow-e2', className)} style={{ '--i': i }}>
      <CmsIcon name={icon} size={12} className="text-accent" />
      {children}
    </span>
  );
}

/** Retail: a scan adds lines to the bill, the receipt prints and goes out on WhatsApp. */
function Retail() {
  const lines = ['Basmati Rice 5kg', 'Black Tea 950g', 'Cooking Oil 5L', 'Bath Soap 120g'];
  return (
    <div className="relative grid h-full grid-cols-[0.9fr_1.2fr_0.9fr] items-center gap-4 px-6 py-6">
      <div className={cx('relative flex aspect-[4/5] flex-col items-center justify-center gap-3 p-4', card)}>
        <div className="relative flex h-20 w-full items-end justify-center gap-[2px] overflow-hidden rounded-lg bg-surface-2 px-3 pb-2">
          {[3, 1, 2, 1, 3, 2, 1, 1, 3, 2, 1, 2, 1, 3].map((w, i) => (
            <span key={i} className="h-14 w-[var(--w)] bg-fg-strong/80" style={{ '--w': `${w}px` }} />
          ))}
          <span className={s.laser} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Scan</span>
      </div>
      <div className={cx('relative p-4', card, 'shadow-e2')}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-fg-strong">Naya bill</span>
          <span className="rounded-full bg-accent/10 px-2 text-[9px] font-bold uppercase leading-4 text-accent">Counter 1</span>
        </div>
        <ul className="mt-3 space-y-2">
          {lines.map((l, i) => (
            <li key={l} className={cx(s.billLine, 'flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5')} style={{ '--i': i }}>
              <span className="truncate text-[10.5px] font-medium text-fg">{l}</span>
              <span className={cx(bar, 'h-1.5 w-8')} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-white">
          <span className="text-[10px] font-bold uppercase tracking-wide">Cash · print</span>
          <span className="h-1.5 w-12 rounded-full bg-white/90" />
        </div>
      </div>
      <div className="relative flex h-full flex-col items-center justify-center">
        <div className={cx(s.receipt, 'w-full max-w-[8.5rem] rounded-t-md border border-b-0 border-line bg-surface px-3 pb-6 pt-3 shadow-e2')}>
          <span className={cx(bar, 'mx-auto block h-1.5 w-12')} />
          {[70, 55, 62, 48].map((w, i) => (
            <span key={i} className={cx(bar, 'mt-2 block h-1 w-[var(--w)]')} style={{ '--w': `${w}%` }} />
          ))}
          <span className="mt-3 block h-1.5 w-full rounded-full bg-fg-strong/60" />
        </div>
        <Chip icon="message-circle" className={cx(s.pop, 'mt-3')}>
          Receipt on WhatsApp
        </Chip>
      </div>
    </div>
  );
}

/** Retail chains: branches on a map joined to head office, with today's bars. */
function Chains() {
  const pins = [
    { x: 30, y: 26, name: 'Islamabad' },
    { x: 46, y: 46, name: 'Lahore' },
    { x: 22, y: 64, name: 'Multan' },
    { x: 14, y: 84, name: 'Karachi' },
  ];
  return (
    <div className="relative grid h-full grid-cols-[1.25fr_0.75fr] gap-4 px-6 py-6">
      <div className={cx('relative overflow-hidden', card)}>
        <div className={s.mapGrid} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {pins.map((p, i) =>
            i === 1 ? null : <line key={p.name} x1={pins[1]!.x} y1={pins[1]!.y} x2={p.x} y2={p.y} className={s.route} vectorEffect="non-scaling-stroke" style={{ '--i': i }} />,
          )}
        </svg>
        {pins.map((p, i) => (
          <span key={p.name} className="absolute left-[var(--x)] top-[var(--y)] -translate-x-1/2 -translate-y-1/2" style={{ '--x': `${p.x}%`, '--y': `${p.y}%` }}>
            <span className={cx(s.pin, i === 1 && s.pinHq)} style={{ '--i': i }} />
            <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] font-semibold text-fg-strong shadow-e1">
              {i === 1 ? 'Head office' : p.name}
            </span>
          </span>
        ))}
        <Chip icon="arrow-left-right" className={cx(s.pop, 'absolute bottom-3 right-3')}>
          Stock transfer
        </Chip>
      </div>
      <div className={cx('flex flex-col p-4', card)}>
        <span className="text-[11px] font-bold text-fg-strong">Today by branch</span>
        <div className="mt-3 flex flex-1 flex-col justify-around gap-2">
          {pins.map((p, i) => (
            <div key={p.name}>
              <span className="text-[10px] font-medium text-fg-muted">{p.name}</span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-fg/[0.07]">
                <span className={cx(s.grow, 'block h-full w-[var(--w)] rounded-full', i === 1 ? 'bg-accent' : 'bg-accent/45')} style={{ '--w': `${[64, 92, 48, 76][i]}%`, '--i': i }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** E-commerce: an order leaves the store, is packed and rides off with the courier. */
function Ecommerce() {
  const steps = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];
  return (
    <div className="relative flex h-full flex-col justify-center gap-5 px-6 py-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className={cx('overflow-hidden', card)}>
          <div className="flex items-center gap-1 border-b border-line px-2.5 py-1.5">
            <span className="size-1.5 rounded-full bg-rose-400" />
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="ml-1.5 text-[9.5px] font-semibold text-fg-subtle">yourstore.pk</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {['bg-sky-400/30', 'bg-amber-400/30', 'bg-violet-400/30'].map((c, i) => (
              <span key={i} className={cx('aspect-square rounded-md', c)} />
            ))}
          </div>
        </div>
        <div className="relative h-10 w-24 overflow-hidden">
          <span className={s.orderTravel}>
            <CmsIcon name="shopping-bag" size={14} />
          </span>
          <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-accent/30" />
        </div>
        <div className={cx('flex flex-col items-center gap-2 p-3', card)}>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
            <CmsIcon name="package" size={20} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-fg-subtle">Packing</span>
        </div>
      </div>
      <div className={cx('relative [container-type:inline-size] h-16 overflow-hidden px-4', card)}>
        <span className={s.road} />
        <span className={s.truck}>
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-e2">
            <CmsIcon name="truck" size={18} />
          </span>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[9.5px] font-bold text-fg-strong shadow-e1">COD</span>
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((st, i) => (
          <span key={st} className={cx(s.step, 'relative overflow-hidden rounded-full border border-line bg-surface px-2 py-1 text-center text-[10px] font-semibold text-fg-muted')} style={{ '--i': i }}>
            <span className={s.stepFill} />
            <span className="relative">{st}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Restaurant: tables change state on the floor while a kitchen ticket prints. */
function Restaurant() {
  const tables = ['T1', 'T2', 'T3', 'F1', 'F2', 'F3', 'R1', 'R2', 'R3'];
  return (
    <div className="relative grid h-full grid-cols-[1.3fr_0.7fr] items-center gap-5 px-6 py-6">
      <div className={cx('p-4', card)}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-fg-strong">Floor</span>
          <span className="flex gap-2 text-[9px] font-semibold text-fg-subtle">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-accent" />
              Busy
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Bill
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {tables.map((tb, i) => (
            <span key={tb} className={cx(s.table, 'relative flex aspect-[5/4] flex-col items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-2 text-[11px] font-bold text-fg-strong')} style={{ '--i': i }}>
              <span className={s.tableBusy} />
              <span className={s.tableBill} />
              <span className="relative">{tb}</span>
              <span className="relative mt-1 flex gap-0.5">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="size-1 rounded-full bg-current opacity-40" />
                ))}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="relative flex h-full flex-col items-center justify-start overflow-hidden pt-2">
        <span className="z-10 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <CmsIcon name="chef-hat" size={12} />
          Kitchen
        </span>
        <div className={cx(s.kot, 'w-[88%] rounded-b-md border border-t-0 border-line bg-surface px-3 pb-3 pt-2 shadow-e2')}>
          <span className="block text-[10px] font-bold text-fg-strong">KOT · T4</span>
          {['2 × Chicken karahi', '4 × Naan', '1 × Raita'].map((it) => (
            <span key={it} className="mt-1.5 flex items-center gap-1.5 text-[9.5px] text-fg-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {it}
            </span>
          ))}
          <span className="mt-2 block rounded bg-accent/10 py-0.5 text-center text-[8.5px] font-bold uppercase tracking-wide text-accent">Tandoor station</span>
        </div>
        <Chip icon="split" className={cx(s.pop, 'mt-3')}>
          Split bill
        </Chip>
      </div>
    </div>
  );
}

/** Wholesale: a delivery truck runs the route while recovery comes in. */
function Wholesale() {
  const shops = ['City Store', 'Model Mart', 'Al-Noor Traders'];
  return (
    <div className="relative flex h-full flex-col justify-center gap-4 px-6 py-6">
      <div className={cx('relative [container-type:inline-size] h-24 overflow-hidden px-4', card)}>
        <span className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CmsIcon name="warehouse" size={18} />
          </span>
          <span className="text-[9px] font-bold text-fg-subtle">Godown</span>
        </span>
        <span className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CmsIcon name="store" size={18} />
          </span>
          <span className="text-[9px] font-bold text-fg-subtle">Shops</span>
        </span>
        <span className={s.routeLine} />
        <span className={s.deliveryTruck}>
          <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-2 text-white shadow-e2">
            <CmsIcon name="truck" size={16} />
            <span className="text-[9px] font-bold">Cartons</span>
          </span>
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-3">
        <div className={cx('p-3.5', card)}>
          <span className="text-[11px] font-bold text-fg-strong">Recovery today</span>
          <ul className="mt-2 space-y-1.5">
            {shops.map((sh, i) => (
              <li key={sh} className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-fg-muted">{sh}</span>
                <span className={cx(s.collect, 'inline-flex size-4 items-center justify-center rounded-full bg-accent text-white')} style={{ '--i': i }}>
                  <CmsIcon name="check" size={10} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={cx('flex flex-col justify-center gap-2 p-3.5', card)}>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-fg-muted">
            <CmsIcon name="gauge" size={13} className="text-accent" />
            Credit limit
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-fg/[0.07]">
            <span className={cx(s.grow, 'block h-full w-[68%] rounded-full bg-gradient-to-r from-accent to-amber-500')} />
          </span>
          <span className="text-[9.5px] text-fg-subtle">Carton and piece prices</span>
        </div>
      </div>
    </div>
  );
}

/** Manufacturing: raw stock rides the line through your process into finished goods. */
function Manufacturing() {
  const stations = [
    { icon: 'boxes', label: 'Raw stock' },
    { icon: 'settings', label: 'Your process' },
    { icon: 'package-check', label: 'Finished goods' },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-5 px-6 py-6">
      <div className="grid grid-cols-3 gap-3">
        {stations.map((st, i) => (
          <div key={st.label} className={cx('flex flex-col items-center gap-2 p-3 text-center', card, i === 1 && 'border-dashed border-accent/50')}>
            <span className={cx('inline-flex size-10 items-center justify-center rounded-xl', i === 1 ? 'bg-accent text-white' : 'bg-accent/10 text-accent', i === 1 && s.spin)}>
              <CmsIcon name={st.icon} size={19} />
            </span>
            <span className="text-[10.5px] font-semibold text-fg-strong">{st.label}</span>
          </div>
        ))}
      </div>
      <div className={cx('relative [container-type:inline-size] h-14 overflow-hidden', card)}>
        <span className={s.belt} />
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className={s.item} style={{ '--i': k }}>
            <span className="block size-6 rounded-md bg-amber-400/80 shadow-e1" />
          </span>
        ))}
      </div>
      <div className={cx('flex items-center gap-3 p-3', card)}>
        <span className="text-[10.5px] font-semibold text-fg-muted">Output this week</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
          <span className={cx(s.grow, 'block h-full w-[78%] rounded-full bg-accent')} />
        </span>
        <Chip icon="code-xml">Built for your process</Chip>
      </div>
    </div>
  );
}

/** Services: bookings fill the week and confirmations go out. */
function Services() {
  const staff = ['bg-sky-500', 'bg-violet-500', 'bg-rose-500'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const slots: [number, number, number][] = [
    [0, 0, 0], [1, 2, 1], [2, 1, 2], [3, 3, 0], [4, 0, 1], [5, 2, 2], [0, 3, 2], [2, 0, 1], [4, 2, 0], [5, 0, 1], [1, 0, 2], [3, 1, 1],
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-4 px-6 py-6">
      <div className={cx('p-4', card)}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-fg-strong">Bookings this week</span>
          <span className="flex -space-x-1.5">
            {staff.map((c) => (
              <span key={c} className={cx('size-5 rounded-full ring-2 ring-surface', c)} />
            ))}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1.5">
          {days.map((d) => (
            <span key={d} className="text-center text-[9px] font-bold text-fg-subtle">
              {d}
            </span>
          ))}
          {Array.from({ length: 24 }, (_, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const hitSlot = slots.find(([c, r]) => c === col && r === row);
            return (
              <span key={i} className="relative h-6 rounded-md bg-fg/[0.05]">
                {hitSlot ? <span className={cx(s.booking, staff[hitSlot[2]], 'absolute inset-0 rounded-md opacity-80')} style={{ '--i': slots.indexOf(hitSlot) }} /> : null}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip icon="calendar-check" className={s.pop}>
          Booking confirmed
        </Chip>
        <Chip icon="badge-percent" className={s.pop} i={1}>
          Staff commission
        </Chip>
        <Chip icon="id-card" className={s.pop} i={2}>
          Membership
        </Chip>
      </div>
    </div>
  );
}

/** Enterprise: a live dashboard, roles and an API call. */
function Enterprise() {
  const line = 'M0 46 L16 40 L32 42 L48 30 L64 33 L80 20 L100 12';
  return (
    <div className="relative grid h-full grid-cols-[1.25fr_0.75fr] gap-3 px-6 py-6">
      <div className={cx('flex flex-col p-4', card)}>
        <div className="grid grid-cols-3 gap-2">
          {['Sale', 'Profit', 'Branches'].map((k, i) => (
            <div key={k} className="rounded-lg bg-surface-2 p-2">
              <span className="text-[9px] font-bold uppercase tracking-wide text-fg-subtle">{k}</span>
              <span className={cx(bar, 'mt-1.5 block h-2', i === 1 ? 'w-3/4 bg-accent/60' : 'w-2/3')} />
            </div>
          ))}
        </div>
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="mt-3 h-full min-h-[6rem] w-full flex-1 overflow-visible">
          <path d={`${line} L100 50 L0 50 Z`} className={s.area} />
          <path d={line} pathLength={1} className={s.chartLine} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex flex-col gap-3">
        <div className={cx('p-3', card)}>
          {['Owner', 'Manager', 'Cashier'].map((r, i) => (
            <div key={r} className={cx('flex items-center justify-between', i > 0 && 'mt-2')}>
              <span className="text-[10px] font-semibold text-fg-muted">{r}</span>
              <span className={cx('relative h-3.5 w-6 rounded-full', i < 2 ? 'bg-accent' : 'bg-fg/15')}>
                <span className={cx('absolute top-0.5 size-2.5 rounded-full bg-white shadow', i < 2 ? 'right-0.5' : 'left-0.5')} />
              </span>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-xl bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-300 shadow-e2">
          <span className={cx(s.typeLine, 'block')} style={{ '--i': 0 }}>
            <span className="text-emerald-400">GET</span> /v1/sales
          </span>
          <span className={cx(s.typeLine, 'block text-slate-400')} style={{ '--i': 1 }}>
            200 OK
          </span>
          <span className={cx(s.typeLine, 'block')} style={{ '--i': 2 }}>
            <span className="text-sky-400">POST</span> webhook
          </span>
        </div>
      </div>
    </div>
  );
}

const SCENES: Record<string, () => React.JSX.Element> = {
  store: Retail,
  'building-2': Chains,
  'shopping-bag': Ecommerce,
  'utensils-crossed': Restaurant,
  truck: Wholesale,
  factory: Manufacturing,
  briefcase: Services,
  landmark: Enterprise,
};

export function SolutionScene({ icon }: { icon: string }) {
  const Scene = SCENES[icon] ?? Retail;
  return <Scene />;
}
