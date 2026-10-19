/**
 * Order statuses and their next step, delivery kinds, time-left wording,
 * WhatsApp links and small helpers shared by the bakery pages.
 */

import { Bike, Building2, Package, Store, Truck, type LucideIcon } from 'lucide-react';
import type { BakeryOrderStatus, CakeOrder, DeliveryType, OrderPayMethod } from '../api/cake-orders.api';
import { FLAVORS, OCCASIONS, SIZES, SHAPES, CREAMS } from '../api/constants';

/** Query roots; every bakery order screen invalidates these after a change. */
export const CAKE_KEY = 'cake-orders';
export const BULK_KEY = 'bulk-orders';
export const PRODUCTION_KEY = 'bakery-production';
export const FRESH_KEY = 'freshness-logs';
export const RAW_KEY = 'bakery-ingredients';

interface StatusMeta { label: string; tone: string; color: string }

const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-success-50 text-success-700 ring-success-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const ORDER_STATUS: Record<BakeryOrderStatus, StatusMeta> = {
  DRAFT: { label: 'Poocha hai', tone: tone.slate, color: '#94a3b8' },
  QUOTED: { label: 'Rate bataya', tone: tone.sky, color: '#0ea5e9' },
  CONFIRMED: { label: 'Pakka hua', tone: tone.blue, color: '#3b82f6' },
  DEPOSIT_PAID: { label: 'Advance mila', tone: tone.cyan, color: '#06b6d4' },
  IN_PRODUCTION: { label: 'Ban raha hai', tone: tone.orange, color: '#f97316' },
  BAKING: { label: 'Oven me', tone: tone.orange, color: '#fb923c' },
  DECORATING: { label: 'Sajawat', tone: tone.fuchsia, color: '#d946ef' },
  QUALITY_CHECK: { label: 'Check ho raha', tone: tone.violet, color: '#8b5cf6' },
  READY: { label: 'Tayyar hai', tone: tone.green, color: '#10b981' },
  OUT_FOR_DELIVERY: { label: 'Raaste me', tone: tone.amber, color: '#f59e0b' },
  DELIVERED: { label: 'De diya', tone: tone.green, color: '#059669' },
  CANCELLED: { label: 'Cancel', tone: tone.rose, color: '#f43f5e' },
  REFUNDED: { label: 'Paisa wapas', tone: tone.slate, color: '#64748b' },
};

export const statusOf = (s?: string | null): StatusMeta => ORDER_STATUS[(s ?? 'DRAFT') as BakeryOrderStatus] ?? { label: String(s ?? '—'), tone: tone.slate, color: '#94a3b8' };

export const CLOSED: BakeryOrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
export const isClosed = (s?: string | null) => CLOSED.includes(s as BakeryOrderStatus);

/** 'DELIVER' means: open the bill window. */
interface NextStep { to: BakeryOrderStatus | 'DELIVER'; label: string }

export function cakeNext(o: Pick<CakeOrder, 'status' | 'deliveryType'>): NextStep | null {
  switch (o.status) {
    case 'DRAFT':
    case 'QUOTED': return { to: 'CONFIRMED', label: 'Pakka karein' };
    case 'CONFIRMED':
    case 'DEPOSIT_PAID': return { to: 'IN_PRODUCTION', label: 'Banana shuru' };
    case 'IN_PRODUCTION':
    case 'BAKING': return { to: 'DECORATING', label: 'Sajawat shuru' };
    case 'DECORATING':
    case 'QUALITY_CHECK': return { to: 'READY', label: 'Tayyar hai' };
    case 'READY': return isDelivery(o.deliveryType) ? { to: 'OUT_FOR_DELIVERY', label: 'Bhej diya' } : { to: 'DELIVER', label: 'De diya — bill' };
    case 'OUT_FOR_DELIVERY': return { to: 'DELIVER', label: 'Pahunch gaya — bill' };
    default: return null;
  }
}

/** One step back when the wrong button was pressed. */
export const CAKE_PREV: Partial<Record<BakeryOrderStatus, BakeryOrderStatus>> = {
  CONFIRMED: 'DRAFT', DEPOSIT_PAID: 'CONFIRMED', IN_PRODUCTION: 'CONFIRMED', BAKING: 'IN_PRODUCTION',
  DECORATING: 'IN_PRODUCTION', QUALITY_CHECK: 'DECORATING', READY: 'DECORATING', OUT_FOR_DELIVERY: 'READY',
};

/** The visible steps of a cake order, for the progress strip. */
export const CAKE_FLOW: BakeryOrderStatus[] = ['CONFIRMED', 'IN_PRODUCTION', 'DECORATING', 'READY', 'DELIVERED'];
export function flowIndex(s: BakeryOrderStatus): number {
  const map: Partial<Record<BakeryOrderStatus, number>> = {
    DRAFT: -1, QUOTED: -1, CONFIRMED: 0, DEPOSIT_PAID: 0, IN_PRODUCTION: 1, BAKING: 1, DECORATING: 2, QUALITY_CHECK: 2,
    READY: 3, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
  };
  return map[s] ?? -1;
}

export function bulkNext(status: string): NextStep | null {
  switch (status) {
    case 'DRAFT': return { to: 'QUOTED', label: 'Rate bata diya' };
    case 'QUOTED': return { to: 'CONFIRMED', label: 'Pakka karein' };
    case 'CONFIRMED':
    case 'DEPOSIT_PAID': return { to: 'IN_PRODUCTION', label: 'Banana shuru' };
    case 'IN_PRODUCTION':
    case 'BAKING':
    case 'DECORATING':
    case 'QUALITY_CHECK': return { to: 'READY', label: 'Tayyar hai' };
    case 'READY':
    case 'OUT_FOR_DELIVERY': return { to: 'DELIVER', label: 'De diya — bill' };
    default: return null;
  }
}

export const BULK_PREV: Partial<Record<BakeryOrderStatus, BakeryOrderStatus>> = {
  QUOTED: 'DRAFT', CONFIRMED: 'QUOTED', DEPOSIT_PAID: 'CONFIRMED', IN_PRODUCTION: 'CONFIRMED', READY: 'IN_PRODUCTION', OUT_FOR_DELIVERY: 'READY',
};

/** Booked bulk orders: an advance is expected and the kitchen counts them. */
export const BULK_COMMITTED = ['CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING', 'DECORATING', 'QUALITY_CHECK', 'READY', 'OUT_FOR_DELIVERY'];

export const DELIVERY: Array<{ id: DeliveryType; label: string; hint: string; icon: LucideIcon }> = [
  { id: 'SELF_PICKUP', label: 'Dukaan se lenge', hint: 'Customer khud aayega', icon: Store },
  { id: 'HOME_DELIVERY', label: 'Ghar pahunchana', hint: 'Hamara rider le jayega', icon: Bike },
  { id: 'VENUE_DELIVERY', label: 'Hall / venue', hint: 'Shadi hall ya daftar', icon: Building2 },
  { id: 'COURIER', label: 'Courier', hint: 'Doosre shehar', icon: Package },
];

/** Ways an order advance can be paid (same names as the sale's payment methods). */
export const PAY_METHODS: Array<{ id: OrderPayMethod; label: string }> = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
  { id: 'JAZZCASH', label: 'JazzCash' },
  { id: 'EASYPAISA', label: 'EasyPaisa' },
  { id: 'BANK_TRANSFER', label: 'Bank' },
];

export const isDelivery = (t?: string | null) => !!t && !['SELF_PICKUP', 'PICKUP', 'DINE_IN'].includes(t);
export const deliveryOf = (t?: string | null) => DELIVERY.find((d) => d.id === t) ?? (isDelivery(t) ? { id: t as DeliveryType, label: 'Pahunchana', hint: '', icon: Truck } : DELIVERY[0]);

export const BULK_TYPES = [
  { value: 'WEDDING', label: 'Shadi', emoji: '💍' },
  { value: 'BIRTHDAY', label: 'Birthday', emoji: '🎂' },
  { value: 'CORPORATE', label: 'Daftar', emoji: '🏢' },
  { value: 'SCHOOL', label: 'School', emoji: '🎓' },
  { value: 'RELIGIOUS', label: 'Mazhabi', emoji: '🕌' },
  { value: 'PARTY', label: 'Party', emoji: '🎉' },
  { value: 'CATERING', label: 'Catering', emoji: '🍽️' },
  { value: 'OTHER', label: 'Aur koi', emoji: '📦' },
];
export const bulkTypeOf = (v?: string | null) => BULK_TYPES.find((t) => t.value === v) ?? { value: v ?? 'OTHER', label: v ? nice(v) : 'Aur koi', emoji: '📦' };

/** "CHOCOLATE_FUDGE" → "chocolate fudge" for values without a label. */
const nice = (s?: string | null) => String(s ?? '').replace(/_/g, ' ').toLowerCase();
export const labelOf = (list: Array<{ value: string; label: string }>, v?: string | null) => list.find((x) => x.value === v)?.label ?? nice(v);
export const sizeLabel = (v?: string | null) => labelOf(SIZES, v);
export const flavorLabel = (v?: string | null) => labelOf(FLAVORS, v);
export const shapeLabel = (v?: string | null) => labelOf(SHAPES, v);
export const creamLabel = (v?: string | null) => labelOf(CREAMS, v);
export const occasionOf = (v?: string | null) => OCCASIONS.find((o) => o.value === v) ?? { value: v ?? 'OTHER', label: v ? nice(v) : 'Aur koi', emoji: '⭐' };

/** One-line cake description: "Birthday · 2 Pound · Chocolate". */
export function cakeLine(o: Pick<CakeOrder, 'occasion' | 'size' | 'flavor' | 'customWeightKg' | 'customFlavorDesc' | 'productName'>) {
  return [
    o.productName,
    occasionOf(o.occasion).label,
    o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size),
    o.flavor === 'CUSTOM_FLAVOR' && o.customFlavorDesc ? o.customFlavorDesc : flavorLabel(o.flavor),
  ].filter(Boolean).join(' · ');
}

/* ───────────────────────── money and time ───────────────────────── */

export const dueOf = (o: { total: number; paidAmount: number }) => Math.max(Math.round((Number(o.total || 0) - Number(o.paidAmount || 0)) * 100) / 100, 0);
export const bulkPrice = (o: { finalPrice?: number | null; quotedPrice: number }) => Number(o.finalPrice ?? o.quotedPrice ?? 0);

export const hoursTo = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
};

/** "3 ghante me", "2 din late". */
export function leftText(h: number | null): string {
  if (h === null) return 'Date nahi';
  if (h < 0) {
    const p = Math.abs(h);
    return p < 1 ? `${Math.round(p * 60)} minute late` : p < 24 ? `${Math.round(p)} ghante late` : `${Math.round(p / 24)} din late`;
  }
  if (h < 1) return `${Math.max(Math.round(h * 60), 1)} minute me`;
  if (h < 24) return `${Math.round(h)} ghante me`;
  return `${Math.round(h / 24)} din baad`;
}

export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const timeOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : '');
export const keyLabel = (k: string) => new Date(`${k.length === 7 ? `${k}-15` : k}T12:00:00`).toLocaleDateString('en-PK', k.length === 7 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO → value for <input type="datetime-local"> in this device's time. */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** <input type="datetime-local"> value → ISO, read as this device's time (not the server's). */
export function fromLocalInput(v: string): string {
  const [date, time = '00:00'] = v.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).toISOString();
}

/* ───────────────────────── contact ───────────────────────── */

/** wa.me link with a Pakistani 03… number turned into 923…. */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  const intl = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Units sold by weight; their baking and batch quantities take decimals (12.5 kg). Same list as the API. */
const MEASURED_UNITS = new Set(['kg', 'kilogram', 'g', 'gm', 'gram', 'pound', 'lb', 'l', 'liter', 'litre', 'ml']);
export const byWeight = (unit?: string | null) => MEASURED_UNITS.has((unit ?? '').trim().toLowerCase());

/** Cleans a typed quantity: up to three decimals for goods sold by weight, digits only for pieces. */
export const qtyInput = (v: string, weight: boolean) =>
  weight ? (v.replace(/[^\d.]/g, '').match(/^\d*(\.\d{0,3})?/)?.[0] ?? '') : v.replace(/\D/g, '');

/** A typed quantity as a number, rounded the way the API stores it. */
export const qtyValue = (v: string, weight: boolean) => {
  const n = Number(v) || 0;
  return weight ? Math.round(n * 1000) / 1000 : Math.round(n);
};

export const fmtQty = (q: number | null | undefined) => {
  const n = Number(q || 0);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
};

/** Saves rows as a CSV file Excel opens with Urdu and commas intact. */
export function downloadCsv(name: string, head: string[], rows: Array<Array<string | number | null | undefined>>) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
