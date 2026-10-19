/** Labels, tones and small helpers shared by the hardware pages. */

import type { DeliveryStatus, VehicleType } from '../api/deliveries.api';
import type { QuotationStatus } from '../api/quotations.api';
import type { CategoryType, Unit } from '../api/products.api';

export const CHALLAN_STATUS: Record<DeliveryStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Bhejna baqi', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SCHEDULED: { label: 'Gaari tay', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  LOADED: { label: 'Load ho gaya', tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  DISPATCHED: { label: 'Nikal gaya', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  IN_TRANSIT: { label: 'Raste me', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  DELIVERED: { label: 'Pohanch gaya', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  PARTIALLY_DELIVERED: { label: 'Kuch pohancha', tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  FAILED: { label: 'Nahi pohancha', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  RETURNED: { label: 'Wapas aaya', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

export const OPEN_CHALLAN: DeliveryStatus[] = ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'];

export const VEHICLES: Array<{ value: VehicleType; label: string }> = [
  { value: 'PICKUP', label: 'Pickup / Shehzore' },
  { value: 'MINI_TRUCK', label: 'Mazda' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'DUMPER', label: 'Dumper' },
  { value: 'CRANE', label: 'Crane' },
  { value: 'RICKSHAW', label: 'Loader rickshaw' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'CUSTOMER_PICKUP', label: 'Customer khud le gaya' },
  { value: 'OTHER', label: 'Koi aur' },
];
export const vehicleLabel = (v?: VehicleType | null) => VEHICLES.find((x) => x.value === v)?.label ?? '—';

export const QUOTE_STATUS: Record<QuotationStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Draft', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  SENT: { label: 'Bhej di', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  VIEWED: { label: 'Customer ne dekhi', tone: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  REVISED: { label: 'Nayi revision', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  ACCEPTED: { label: 'Customer ne maan li', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  CONVERTED: { label: 'Bill ban gaya', tone: 'bg-emerald-600 text-white ring-emerald-600' },
  EXPIRED: { label: 'Waqt guzar gaya', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  REJECTED: { label: 'Band / na mani', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Hardware slip unit to a short label. */
export const UNIT_LABEL: Record<Unit, string> = {
  BAG: 'bag', KG: 'kg', TON: 'ton', PIECE: 'pcs', DOZEN: 'dozen', CARTON: 'carton', METER: 'meter', FEET: 'feet', INCH: 'inch',
  SQFT: 'sq ft', SQMETER: 'sq m', CUBIC_FEET: 'cft', CUBIC_METER: 'cu m', LITER: 'liter', GALLON: 'gallon', BUNDLE: 'bundle',
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
  { value: 'CEMENT', label: 'Cement', group: 'Construction' },
  { value: 'STEEL_REBAR', label: 'Sarya', group: 'Construction' },
  { value: 'BRICKS', label: 'Eent / block', group: 'Construction' },
  { value: 'SAND', label: 'Ret / bajri', group: 'Construction' },
  { value: 'PLUMBING_PIPE', label: 'Pipe', group: 'Sanitary' },
  { value: 'PLUMBING_FITTING', label: 'Fitting', group: 'Sanitary' },
  { value: 'SANITARY_WARE', label: 'Sanitary saman', group: 'Sanitary' },
  { value: 'TILES_FLOOR', label: 'Tiles', group: 'Finishing' },
  { value: 'MARBLE', label: 'Marble / granite', group: 'Finishing' },
  { value: 'PAINT', label: 'Paint', group: 'Paint' },
  { value: 'PRIMER', label: 'Primer / putty', group: 'Paint' },
  { value: 'THINNER', label: 'Thinner', group: 'Paint' },
  { value: 'ELECTRIC_WIRE', label: 'Taar', group: 'Electric' },
  { value: 'ELECTRIC_SWITCH', label: 'Switch / socket', group: 'Electric' },
  { value: 'HAND_TOOL', label: 'Auzar', group: 'Tools' },
  { value: 'POWER_TOOL', label: 'Machine', group: 'Tools' },
  { value: 'FASTENER', label: 'Kil / pech / bolt', group: 'Tools' },
  { value: 'ADHESIVE', label: 'Gond / sealant', group: 'Tools' },
  { value: 'WATERPROOFING', label: 'Waterproofing', group: 'Finishing' },
  { value: 'WOOD_LUMBER', label: 'Lakri / ply', group: 'Finishing' },
  { value: 'GLASS', label: 'Sheesha / aluminium', group: 'Finishing' },
  { value: 'OTHER', label: 'Koi aur', group: 'Other' },
];
export const categoryLabel = (c?: CategoryType | null) => CATEGORY.find((x) => x.value === c)?.label ?? (c ? c.replace(/_/g, ' ').toLowerCase() : '');

/** Paint, primer and thinner lines can carry a shade. */
export const isPaint = (c?: CategoryType | null) => c === 'PAINT' || c === 'PRIMER';

export const qty = (n: number) => String(Number((Number(n) || 0).toFixed(3)));

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
