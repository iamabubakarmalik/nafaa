/**
 * Labels, colours and text helpers shared by the low-stock list, the reorder
 * list, analytics, WhatsApp messages and the print-outs.
 */

import { AlertTriangle, CalendarClock, Clock, Leaf, PackageX, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { LowRow, LowSettings, LowStatus } from '../api';

export const STATUS: Record<LowStatus, { label: string; short: string; icon: LucideIcon; color: string; tone: string }> = {
  out: { label: 'Khatam', short: 'Khatam', icon: PackageX, color: '#e11d48', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  low: { label: 'Kam', short: 'Kam', icon: AlertTriangle, color: '#d97706', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  soon: { label: 'Jaldi khatam hoga', short: 'Jaldi khatam', icon: Clock, color: '#ea580c', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  expiry: { label: 'Expiry qareeb', short: 'Expiry', icon: CalendarClock, color: '#7c3aed', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  registration: { label: 'Registration', short: 'Registration', icon: ShieldAlert, color: '#be123c', tone: 'bg-rose-50 text-rose-800 ring-rose-200' },
  season: { label: 'Mausam ka maal', short: 'Mausam', icon: Leaf, color: '#16a34a', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

export const DEFAULT_SETTINGS: LowSettings = { days: 30, targetDays: 30, soonDays: 7, expiryDays: 30 };

/** Up to two decimals, grouped. */
export const qty = (v: number) => Number(v.toFixed(2)).toLocaleString('en-PK');

/** "3 din", "aaj", "—" for items that are not selling. */
export function daysText(d: number | null) {
  if (d === null) return '—';
  if (d < 1) return 'aaj';
  return `${Math.round(d)} din`;
}

export const dateText = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

/** Lines of one order: same supplier and same branch. */
export interface OrderGroup {
  key: string;
  shopId: string;
  shopName: string;
  supplier: LowRow['supplier'];
  rows: LowRow[];
}

export function groupBySupplier(rows: LowRow[]): OrderGroup[] {
  const m = new Map<string, OrderGroup>();
  for (const r of rows) {
    const key = `${r.shopId}:${r.supplier?.id ?? 'none'}`;
    const g = m.get(key) ?? { key, shopId: r.shopId, shopName: r.shopName, supplier: r.supplier, rows: [] };
    g.rows.push(r);
    m.set(key, g);
  }
  // Groups without a supplier go last: they need one chosen in the order.
  return [...m.values()].sort((a, b) => Number(!a.supplier) - Number(!b.supplier) || (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '') || a.shopName.localeCompare(b.shopName));
}

/** WhatsApp order for a supplier; `qtyOf` lets the reorder list pass edited quantities. */
export function orderMessage(g: OrderGroup, shop: string, qtyOf: (r: LowRow) => number = (r) => r.suggestQty) {
  const lines = g.rows.filter((r) => qtyOf(r) > 0).map((r, i) => `${i + 1}. ${r.name} — ${qty(qtyOf(r))} ${r.unit}`);
  return [
    `Assalam-o-Alaikum${g.supplier ? ` ${g.supplier.name}` : ''},`,
    '',
    `${shop} ke liye ye maal bhej dein:`,
    '',
    ...lines,
    '',
    'Rate aur pohanchne ka din bata dein. Shukriya',
  ].join('\n');
}

/** Short reminder for one item. */
export function itemMessage(r: LowRow, shop: string) {
  const need = r.suggestQty > 0 ? r.suggestQty : Math.max(r.alert - r.stock, 1);
  return [
    `Assalam-o-Alaikum${r.supplier ? ` ${r.supplier.name}` : ''},`,
    '',
    `${r.name} ${r.stock <= 0 ? 'khatam ho gaya hai' : `sirf ${qty(r.stock)} ${r.unit} bacha hai`}.`,
    `${qty(need)} ${r.unit} bhej dein.`,
    '',
    `Shukriya — ${shop}`,
  ].join('\n');
}

/** Opens WhatsApp: to the number when there is one, otherwise to pick a chat. */
export function openWhatsApp(link: string | null, text: string) {
  window.open(link ?? `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
