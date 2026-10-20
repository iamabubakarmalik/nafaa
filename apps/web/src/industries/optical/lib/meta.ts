/** Optical labels, statuses, lens choices, eye power formatting and small helpers. */

export const OPTICAL_KEYS = {
  orders: 'optical-lens-orders',
  tests: 'optical-eye-tests',
  rx: 'optical-prescriptions',
  doctors: 'optical-optometrists',
  facts: 'optical-facts',
} as const;

/** Keys other screens read (dashboard, sales, khata, cash) that move with order or fee money. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata-summary', 'customer', 'customer-ledger', 'customers', 'cash-register', 'money', 'bookings'];

export interface Meta { label: string; tone: string; color: string }

export const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = (map: Record<string, Meta>, k?: string | null): Meta => map[k ?? ''] ?? { label: nice(k), tone: tone.slate, color: '#94a3b8' };

/* ── Glasses / repair orders ── */
export const REPAIR = 'REPAIR';

const ORDER_STATUS: Record<string, Meta> = {
  ORDERED: { label: 'Order liya', tone: tone.slate, color: '#64748b' },
  SENT_TO_LAB: { label: 'Lab gaya', tone: tone.blue, color: '#2563eb' },
  AT_LAB: { label: 'Lab me', tone: tone.blue, color: '#2563eb' },
  RECEIVED: { label: 'Lab se aaya', tone: tone.violet, color: '#7c3aed' },
  QC_PASSED: { label: 'Check ho gaya', tone: tone.violet, color: '#7c3aed' },
  FITTED: { label: 'Fit ho gaya', tone: tone.teal, color: '#0d9488' },
  READY: { label: 'Tayyar', tone: tone.green, color: '#16a34a' },
  DELIVERED: { label: 'De diya', tone: tone.slate, color: '#475569' },
  CANCELLED: { label: 'Cancel', tone: tone.rose, color: '#e11d48' },
};
export const orderStatusOf = (s?: string | null) => pick(ORDER_STATUS, s);
export const isOrderClosed = (s?: string | null) => s === 'DELIVERED' || s === 'CANCELLED';
export const isOrderReady = (s?: string | null) => s === 'FITTED' || s === 'READY';

/** Next step of an order on the desk: [status, button text]. */
export function nextOrderStep(status: string, repair: boolean): [string, string] | null {
  switch (status) {
    case 'ORDERED': return repair ? ['READY', 'Repair ho gayi'] : ['SENT_TO_LAB', 'Lab bhejein'];
    case 'SENT_TO_LAB': case 'AT_LAB': return ['RECEIVED', 'Lab se aa gaya'];
    case 'RECEIVED': case 'QC_PASSED': return ['READY', 'Fit karke tayyar'];
    default: return null;
  }
}

export const LENS_TYPES = ['Single vision', 'KT bifocal', 'Progressive', 'Reading', 'Photochromic', 'Blue cut', 'Sunglass (number wala)', 'Contact lens'];
export const LENS_INDEX = ['1.50', '1.56', '1.59 Poly', '1.61', '1.67', '1.74'];
export const LENS_MATERIAL = ['Plastic (CR-39)', 'Polycarbonate', 'Glass', 'Hi-index'];
export const COATINGS = ['ARC (anti-glare)', 'Blue cut', 'UV 400', 'Hard coat', 'Photo-grey', 'Tint', 'Polarized'];
export const REPAIR_KINDS = ['Pech / screw', 'Nose pad', 'Dandi (temple)', 'Welding / joint', 'Frame seedha', 'Lens fitting'];

/* ── Eye tests ── */
const TEST_STATUS: Record<string, Meta> = {
  SCHEDULED: { label: 'Booked', tone: tone.slate, color: '#64748b' },
  CONFIRMED: { label: 'Confirm', tone: tone.sky, color: '#0284c7' },
  IN_PROGRESS: { label: 'Test jaari', tone: tone.amber, color: '#d97706' },
  COMPLETED: { label: 'Ho gaya', tone: tone.green, color: '#16a34a' },
  CANCELLED: { label: 'Cancel', tone: tone.rose, color: '#e11d48' },
  NO_SHOW: { label: 'Nahi aaya', tone: tone.rose, color: '#e11d48' },
  RESCHEDULED: { label: 'Waqt badla', tone: tone.violet, color: '#7c3aed' },
};
export const testStatusOf = (s?: string | null) => pick(TEST_STATUS, s);
export const TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
export const COMPLAINTS = ['Door ka nazar nahi aata', 'Parhne me mushkil', 'Sar dard', 'Aankh me pani / jalan', 'Purana number check', 'Contact lens'];

/* ── Prescriptions ── */
export const RX_TYPES: Array<{ value: string; label: string }> = [
  { value: 'DISTANCE', label: 'Door ka' },
  { value: 'READING', label: 'Parhne ka' },
  { value: 'BIFOCAL', label: 'Bifocal' },
  { value: 'PROGRESSIVE', label: 'Progressive' },
  { value: 'COMPUTER', label: 'Computer' },
  { value: 'MYOPIA', label: 'Myopia (-)' },
  { value: 'HYPEROPIA', label: 'Hyperopia (+)' },
  { value: 'ASTIGMATISM', label: 'Cylinder' },
  { value: 'PRESBYOPIA', label: 'Umar wala (ADD)' },
  { value: 'DRIVING', label: 'Driving' },
  { value: 'OTHER', label: 'Doosra' },
];
export const rxTypeLabel = (v?: string | null) => RX_TYPES.find((t) => t.value === v)?.label ?? (v ? nice(v) : '—');

/* ── Eye power ── */
export interface Power {
  rightSph?: number | null; rightCyl?: number | null; rightAxis?: number | null; rightAdd?: number | null;
  leftSph?: number | null; leftCyl?: number | null; leftAxis?: number | null; leftAdd?: number | null;
  pupilDistance?: number | null;
}

export const fmtPower = (v?: number | null) => (v == null ? '—' : v === 0 ? 'Plano' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`);

/** "-1.25 / -0.50 × 180 · ADD +2.00" */
export function eyeLine(p: Power, side: 'right' | 'left') {
  const sph = p[`${side}Sph`];
  const cyl = p[`${side}Cyl`];
  const axis = p[`${side}Axis`];
  const add = p[`${side}Add`];
  if (sph == null && cyl == null && add == null) return '';
  let s = fmtPower(sph ?? 0);
  if (cyl) s += ` / ${fmtPower(cyl)}${axis != null ? ` × ${axis}` : ''}`;
  if (add) s += ` · ADD ${fmtPower(add)}`;
  return s;
}

export function powerSummary(p: Power) {
  const r = eyeLine(p, 'right');
  const l = eyeLine(p, 'left');
  return [r && `R ${r}`, l && `L ${l}`].filter(Boolean).join('  ·  ');
}

/** Same checks as the server: SPH ±30 and CYL ±10 in 0.25 steps, AXIS 0-180 with CYL, ADD 0.50-4.00, PD 40-80. */
export function powerErrors(p: Power): Record<string, string> {
  const e: Record<string, string> = {};
  const quarter = (v: number) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-6;
  for (const side of ['right', 'left'] as const) {
    const sph = p[`${side}Sph`];
    const cyl = p[`${side}Cyl`];
    const axis = p[`${side}Axis`];
    const add = p[`${side}Add`];
    if (sph != null && (sph < -30 || sph > 30 || !quarter(sph))) e[`${side}Sph`] = '-30 se +30, 0.25 ke qadam';
    if (cyl != null && (cyl < -10 || cyl > 10 || !quarter(cyl))) e[`${side}Cyl`] = '-10 se +10, 0.25 ke qadam';
    if (axis != null && (!Number.isInteger(axis) || axis < 0 || axis > 180)) e[`${side}Axis`] = '0 se 180';
    if (cyl && axis == null) e[`${side}Axis`] = 'CYL ke saath AXIS likhein';
    if (add && (add < 0.5 || add > 4 || !quarter(add))) e[`${side}Add`] = '+0.50 se +4.00';
  }
  if (p.pupilDistance != null && (p.pupilDistance < 40 || p.pupilDistance > 80)) e.pupilDistance = '40 se 80 mm';
  return e;
}

/* ── Small helpers ── */
export const digits = (v: string) => v.replace(/\D/g, '');
export const phoneOk = (v: string) => digits(v).length >= 10 && digits(v).length <= 13;
/** Keeps a typed amount to digits and one dot. */
export const moneyInput = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
export const dayOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const toDateInput = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-CA') : '');
export const todayInput = () => new Date().toLocaleDateString('en-CA');

export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digits(phone ?? '');
  if (d.length < 10) return undefined;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || (e instanceof Error && e.message && !e.message.startsWith('Request failed') ? e.message : fallback);
}

/** Period filter → ISO bounds for the server (shop's local days). */
export function rangeParams(r: { from: string; to: string } | null): { from?: string; to?: string } {
  if (!r) return {};
  return { from: new Date(`${r.from}T00:00:00`).toISOString(), to: new Date(`${r.to}T23:59:59.999`).toISOString() };
}

export const dateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—');

/** Whole days from today to `d` (negative when past), in the shop's local days. */
export function daysFrom(d?: string | null): number | null {
  if (!d) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
