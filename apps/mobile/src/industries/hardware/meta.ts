/** Labels, tones and small helpers shared by the hardware screens (mirror of the web hardware lib/meta.ts). Labels are source keys marked with msg(). */

import { SLIP_SHORT, slipUnit } from '@nafaa/core/industries/hardware';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';

export { slipUnit };

/** Query roots; every hardware screen refreshes these after a change. */
export const KEYS = {
  quotations: 'hardware-quotations', quotation: 'hardware-quotation', quoteSummary: 'hardware-quotations-summary', deliveries: 'hardware-deliveries', delivery: 'hardware-delivery',
  deliverySummary: 'hardware-deliveries-summary', billLines: 'hardware-bill-lines', projects: 'hardware-projects', project: 'hardware-project', contractors: 'hardware-contractors', reorder: 'hardware-reorder',
  dashboard: 'hardware-dashboard', facts: 'hardware-facts', tiers: 'hardware-tiers', detail: 'hardware-product-detail',
} as const;

const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshHardware(keys: string[], money = false) {
  [...keys, KEYS.dashboard, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone }
const pick = (map: Record<string, StatusMeta>, k?: string | null): StatusMeta => {
  const m = map[k ?? ''];
  return m ? { label: t(m.label), tone: m.tone } : { label: k ?? '—', tone: 'neutral' };
};

const CHALLAN_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: msg('Bhejna baqi'), tone: 'warning' }, SCHEDULED: { label: msg('Gaari tay'), tone: 'info' }, LOADED: { label: msg('Load ho gaya'), tone: 'info' },
  DISPATCHED: { label: msg('Nikal gaya'), tone: 'accent' }, IN_TRANSIT: { label: msg('Raste me'), tone: 'accent' }, DELIVERED: { label: msg('Pohanch gaya'), tone: 'success' },
  PARTIALLY_DELIVERED: { label: msg('Kuch pohancha'), tone: 'warning' }, FAILED: { label: msg('Nahi pohancha'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' }, RETURNED: { label: msg('Wapas aaya'), tone: 'danger' },
};
export const challanStatus = (s?: string | null) => pick(CHALLAN_STATUS, s);
export const NEXT_LABEL: Record<string, string> = { LOADED: msg('Load ho gaya'), DISPATCHED: msg('Gaari nikal gayi') };

export const VEHICLES: Array<{ value: string; label: string }> = [
  { value: 'PICKUP', label: msg('Pickup / Shehzore') }, { value: 'MINI_TRUCK', label: msg('Mazda') }, { value: 'TRUCK', label: msg('Truck') }, { value: 'TRAILER', label: msg('Trailer') },
  { value: 'DUMPER', label: msg('Dumper') }, { value: 'CRANE', label: msg('Crane') }, { value: 'RICKSHAW', label: msg('Loader rickshaw') }, { value: 'MOTORCYCLE', label: msg('Motorcycle') },
  { value: 'CUSTOMER_PICKUP', label: msg('Customer khud le gaya') }, { value: 'OTHER', label: msg('Koi aur') },
];
export const vehicleLabel = (v?: string | null) => { const x = VEHICLES.find((o) => o.value === v); return x ? t(x.label) : '—'; };

const QUOTE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: msg('Draft'), tone: 'neutral' }, SENT: { label: msg('Bhej di'), tone: 'info' }, VIEWED: { label: msg('Customer ne dekhi'), tone: 'info' }, REVISED: { label: msg('Nayi revision'), tone: 'accent' },
  ACCEPTED: { label: msg('Customer ne maan li'), tone: 'success' }, CONVERTED: { label: msg('Bill ban gaya'), tone: 'success' }, EXPIRED: { label: msg('Waqt guzar gaya'), tone: 'warning' }, REJECTED: { label: msg('Band / na mani'), tone: 'danger' },
};
export const quoteStatus = (s?: string | null) => pick(QUOTE_STATUS, s);
export const OPEN_QUOTE = ['DRAFT', 'SENT', 'VIEWED', 'REVISED'];

const PROJECT_STATUS: Record<string, StatusMeta> = {
  PLANNING: { label: msg('Shuru hone wali'), tone: 'neutral' }, QUOTED: { label: msg('Quotation de di'), tone: 'info' }, APPROVED: { label: msg('Pakki ho gayi'), tone: 'info' },
  IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'warning' }, ON_HOLD: { label: msg('Ruki hui'), tone: 'warning' }, COMPLETED: { label: msg('Mukammal'), tone: 'success' }, CANCELLED: { label: msg('Band'), tone: 'danger' },
};
export const projectStatus = (s?: string | null) => pick(PROJECT_STATUS, s);
export const PROJECT_TYPES = [msg('Ghar'), msg('Plaza / dukanein'), msg('Flat'), msg('Factory / godown'), msg('Masjid / madrasa'), msg('Renovation'), msg('Sarkari kaam')];

const SEVERITY: Record<string, StatusMeta> = {
  OUT_OF_STOCK: { label: msg('Khatam'), tone: 'danger' }, CRITICAL: { label: msg('Bohat kam'), tone: 'danger' }, LOW: { label: msg('Mangwana hai'), tone: 'warning' }, OK: { label: msg('Theek'), tone: 'success' },
};
export const severityMeta = (s?: string | null) => pick(SEVERITY, s ?? 'OK');

export const UNIT_LABEL = (unit?: string | null) => { const k = SLIP_SHORT[unit ?? ''] ?? unit ?? ''; return k === 'sq ft' ? t('sq ft') : k === 'sq m' ? t('sq m') : k; };
export const SLIP_OPTIONS = Object.keys(SLIP_SHORT).map((v) => ({ value: v, label: UNIT_LABEL(v) }));

export const CATEGORY: Array<{ value: string; label: string; group: string }> = [
  { value: 'CEMENT', label: msg('Cement'), group: 'Construction' }, { value: 'STEEL_REBAR', label: msg('Sarya'), group: 'Construction' }, { value: 'BRICKS', label: msg('Eent / block'), group: 'Construction' },
  { value: 'SAND', label: msg('Ret / bajri'), group: 'Construction' }, { value: 'PLUMBING_PIPE', label: msg('Pipe'), group: 'Sanitary' }, { value: 'PLUMBING_FITTING', label: msg('Fitting'), group: 'Sanitary' },
  { value: 'SANITARY_WARE', label: msg('Sanitary saman'), group: 'Sanitary' }, { value: 'TILES_FLOOR', label: msg('Tiles'), group: 'Finishing' }, { value: 'MARBLE', label: msg('Marble / granite'), group: 'Finishing' },
  { value: 'PAINT', label: msg('Paint'), group: 'Paint' }, { value: 'PRIMER', label: msg('Primer / putty'), group: 'Paint' }, { value: 'THINNER', label: msg('Thinner'), group: 'Paint' },
  { value: 'ELECTRIC_WIRE', label: msg('Taar'), group: 'Electric' }, { value: 'ELECTRIC_SWITCH', label: msg('Switch / socket'), group: 'Electric' }, { value: 'HAND_TOOL', label: msg('Auzar'), group: 'Tools' },
  { value: 'POWER_TOOL', label: msg('Machine'), group: 'Tools' }, { value: 'FASTENER', label: msg('Kil / pech / bolt'), group: 'Tools' }, { value: 'ADHESIVE', label: msg('Gond / sealant'), group: 'Tools' },
  { value: 'WATERPROOFING', label: msg('Waterproofing'), group: 'Finishing' }, { value: 'WOOD_LUMBER', label: msg('Lakri / ply'), group: 'Finishing' }, { value: 'GLASS', label: msg('Sheesha / aluminium'), group: 'Finishing' },
  { value: 'OTHER', label: msg('Koi aur'), group: 'Other' },
];
export const categoryLabel = (c?: string | null) => { const x = CATEGORY.find((o) => o.value === c); return x ? t(x.label) : c ? c.replace(/_/g, ' ').toLowerCase() : ''; };
/** Paint, primer and thinner lines can carry a shade. */
export const isPaint = (c?: string | null) => c === 'PAINT' || c === 'PRIMER';

export const shortDate = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
