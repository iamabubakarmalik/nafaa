/** Labels, tones and small helpers shared by the hardware pages. */

import type { DeliveryStatus, VehicleType } from '../api/deliveries.api';
import type { QuotationStatus } from '../api/quotations.api';
import type { CategoryType, Unit } from '../api/products.api';
import { t } from '@core/i18n';

export const CHALLAN_STATUS: Record<DeliveryStatus, { label: string; tone: string }> = {
  PENDING: { label: t('Bhejna baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SCHEDULED: { label: t('Gaari tay'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  LOADED: { label: t('Load ho gaya'), tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  DISPATCHED: { label: t('Nikal gaya'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  IN_TRANSIT: { label: t('Raste me'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  DELIVERED: { label: t('Pohanch gaya'), tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  PARTIALLY_DELIVERED: { label: t('Kuch pohancha'), tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  FAILED: { label: t('Nahi pohancha'), tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  CANCELLED: { label: t('Cancel'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  RETURNED: { label: t('Wapas aaya'), tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

export const OPEN_CHALLAN: DeliveryStatus[] = ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'];

export const VEHICLES: Array<{ value: VehicleType; label: string }> = [
  { value: 'PICKUP', label: t('Pickup / Shehzore') },
  { value: 'MINI_TRUCK', label: t('Mazda') },
  { value: 'TRUCK', label: t('Truck') },
  { value: 'TRAILER', label: t('Trailer') },
  { value: 'DUMPER', label: t('Dumper') },
  { value: 'CRANE', label: t('Crane') },
  { value: 'RICKSHAW', label: t('Loader rickshaw') },
  { value: 'MOTORCYCLE', label: t('Motorcycle') },
  { value: 'CUSTOMER_PICKUP', label: t('Customer khud le gaya') },
  { value: 'OTHER', label: t('Koi aur') },
];
export const vehicleLabel = (v?: VehicleType | null) => VEHICLES.find((x) => x.value === v)?.label ?? '—';

export const QUOTE_STATUS: Record<QuotationStatus, { label: string; tone: string }> = {
  DRAFT: { label: t('Draft'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  SENT: { label: t('Bhej di'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  VIEWED: { label: t('Customer ne dekhi'), tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  REVISED: { label: t('Nayi revision'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  ACCEPTED: { label: t('Customer ne maan li'), tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  CONVERTED: { label: t('Bill ban gaya'), tone: 'bg-emerald-600 text-white ring-emerald-600' },
  EXPIRED: { label: t('Waqt guzar gaya'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  REJECTED: { label: t('Band / na mani'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Hardware slip unit to a short label. */
export const UNIT_LABEL: Record<Unit, string> = {
  BAG: 'bag', KG: 'kg', TON: 'ton', PIECE: 'pcs', DOZEN: 'dozen', CARTON: 'carton', METER: 'meter', FEET: 'feet', INCH: 'inch',
  SQFT: t('sq ft'), SQMETER: t('sq m'), CUBIC_FEET: 'cft', CUBIC_METER: t('cu m'), LITER: 'liter', GALLON: 'gallon', BUNDLE: 'bundle',
  ROLL: 'roll', SHEET: 'sheet', BOX: 'box', SET: 'set', TRIP: 'trip',
};

/** Product unit (lowercase) to the slip unit the quotation and challan store. */
const SLIP: Record<string, Unit> = {
  bag: 'BAG', kg: 'KG', ton: 'TON', pcs: 'PIECE', piece: 'PIECE', dozen: 'DOZEN', carton: 'CARTON', meter: 'METER', feet: 'FEET',
  inch: 'INCH', sqft: 'SQFT', sqm: 'SQMETER', cft: 'CUBIC_FEET', liter: 'LITER', gallon: 'GALLON', bundle: 'BUNDLE', roll: 'ROLL',
  sheet: 'SHEET', box: 'BOX', set: 'SET', trip: 'TRIP',
};
export const slipUnit = (unit?: string | null): Unit => SLIP[(unit ?? '').toLowerCase()] ?? 'PIECE';

export const CATEGORY: Array<{ value: CategoryType; label: string; group: string }> = [
  { value: 'CEMENT', label: t('Cement'), group: t('Construction') },
  { value: 'STEEL_REBAR', label: t('Sarya'), group: t('Construction') },
  { value: 'BRICKS', label: t('Eent / block'), group: t('Construction') },
  { value: 'SAND', label: t('Ret / bajri'), group: t('Construction') },
  { value: 'PLUMBING_PIPE', label: t('Pipe'), group: t('Sanitary') },
  { value: 'PLUMBING_FITTING', label: t('Fitting'), group: t('Sanitary') },
  { value: 'SANITARY_WARE', label: t('Sanitary saman'), group: t('Sanitary') },
  { value: 'TILES_FLOOR', label: t('Tiles'), group: t('Finishing') },
  { value: 'MARBLE', label: t('Marble / granite'), group: t('Finishing') },
  { value: 'PAINT', label: t('Paint'), group: t('Paint') },
  { value: 'PRIMER', label: t('Primer / putty'), group: t('Paint') },
  { value: 'THINNER', label: t('Thinner'), group: t('Paint') },
  { value: 'ELECTRIC_WIRE', label: t('Taar'), group: t('Electric') },
  { value: 'ELECTRIC_SWITCH', label: t('Switch / socket'), group: t('Electric') },
  { value: 'HAND_TOOL', label: t('Auzar'), group: t('Tools') },
  { value: 'POWER_TOOL', label: t('Machine'), group: t('Tools') },
  { value: 'FASTENER', label: t('Kil / pech / bolt'), group: t('Tools') },
  { value: 'ADHESIVE', label: t('Gond / sealant'), group: t('Tools') },
  { value: 'WATERPROOFING', label: t('Waterproofing'), group: t('Finishing') },
  { value: 'WOOD_LUMBER', label: t('Lakri / ply'), group: t('Finishing') },
  { value: 'GLASS', label: t('Sheesha / aluminium'), group: t('Finishing') },
  { value: 'OTHER', label: t('Koi aur'), group: t('Other') },
];
export const categoryLabel = (c?: CategoryType | null) => CATEGORY.find((x) => x.value === c)?.label ?? (c ? c.replace(/_/g, ' ').toLowerCase() : '');

/** Paint, primer and thinner lines can carry a shade. */
export const isPaint = (c?: CategoryType | null) => c === 'PAINT' || c === 'PRIMER';

export const qty = (n: number) => String(Number((Number(n) || 0).toFixed(3)));

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
