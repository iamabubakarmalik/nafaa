/**
 * Labels, colours and small helpers shared by the restaurant floor, order,
 * kitchen and delivery screens, so a status reads the same everywhere.
 */

import { Bike, Car, Home, Package, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react';
import type { OrderMode, OrderStatus, RestaurantOrder } from '../api/orders.api';
import type { TableStatus } from '../api/tables.api';
import { t } from '@core/i18n';

export const MODE_META: Record<OrderMode, { label: string; short: string; icon: LucideIcon; color: string }> = {
  DINE_IN: { label: t('Dine-in'), short: t('Table'), icon: Utensils, color: '#16a34a' },
  TAKEAWAY: { label: t('Takeaway'), short: t('Takeaway'), icon: ShoppingBag, color: '#2563eb' },
  DELIVERY: { label: t('Delivery'), short: t('Delivery'), icon: Bike, color: '#7c3aed' },
  PICKUP: { label: t('Counter'), short: t('Counter'), icon: Package, color: '#0891b2' },
  DRIVE_THRU: { label: t('Drive-thru'), short: t('Drive-thru'), icon: Car, color: '#d97706' },
  ROOM_SERVICE: { label: t('Room service'), short: t('Room'), icon: Home, color: '#db2777' },
};

/** Order types offered when taking an order. */
export const ORDER_MODES: OrderMode[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP'];

export const STATUS_META: Record<OrderStatus, { label: string; color: string; tone: string }> = {
  DRAFT: { label: t('Draft'), color: '#64748b', tone: 'bg-slate-100 text-slate-700' },
  PLACED: { label: t('Naya'), color: '#2563eb', tone: 'bg-blue-50 text-blue-700' },
  CONFIRMED: { label: t('Pakka'), color: '#2563eb', tone: 'bg-blue-50 text-blue-700' },
  COOKING: { label: t('Ban raha hai'), color: '#ea580c', tone: 'bg-orange-50 text-orange-700' },
  READY: { label: t('Tayyar'), color: '#16a34a', tone: 'bg-emerald-50 text-emerald-700' },
  SERVED: { label: t('Serve ho gaya'), color: '#0d9488', tone: 'bg-teal-50 text-teal-700' },
  ON_HOLD: { label: t('Bill print ho gaya'), color: '#9333ea', tone: 'bg-purple-50 text-purple-700' },
  OUT_FOR_DELIVERY: { label: t('Raste me'), color: '#7c3aed', tone: 'bg-violet-50 text-violet-700' },
  DELIVERED: { label: t('Deliver — cash baqi'), color: '#d97706', tone: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: t('Paid'), color: '#15803d', tone: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: t('Cancel'), color: '#e11d48', tone: 'bg-rose-50 text-rose-700' },
};

/** Orders still on the floor, in the kitchen or with a rider (same list as the API). */
export const OPEN_STATUSES: OrderStatus[] = ['DRAFT', 'PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD'];

export const isOpenOrder = (o: Pick<RestaurantOrder, 'status' | 'saleId'>) => OPEN_STATUSES.includes(o.status) && !o.saleId;

/** Dish name with its size ("Biryani · Half") when the order detail carries the dish's sizes. */
export function itemName(it: { variantId?: string | null; product?: { name?: string; variants?: Array<{ id: string; name: string }> } | null }) {
  const name = it.product?.name ?? t('Item');
  const size = it.variantId ? it.product?.variants?.find((v) => v.id === it.variantId)?.name : undefined;
  return size ? `${name} · ${size}` : name;
}

export const TABLE_META: Record<TableStatus, { label: string; color: string; ring: string; bg: string }> = {
  AVAILABLE: { label: t('Khaali'), color: '#16a34a', ring: 'ring-emerald-300', bg: 'bg-emerald-50' },
  OCCUPIED: { label: t('Bhari'), color: '#e11d48', ring: 'ring-rose-300', bg: 'bg-rose-50' },
  RESERVED: { label: t('Reserved'), color: '#d97706', ring: 'ring-amber-300', bg: 'bg-amber-50' },
  CLEANING: { label: t('Safai'), color: '#2563eb', ring: 'ring-sky-300', bg: 'bg-sky-50' },
  OUT_OF_SERVICE: { label: t('Band'), color: '#64748b', ring: 'ring-slate-300', bg: 'bg-slate-100' },
};

export const minutesSince = (iso?: string | Date | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)) : 0);

/** "45m" or "1g 20m" for a running timer. */
export function duration(min: number) {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}g ${min % 60}m`;
}

/** Server message of a failed request, in the words the API sent. */
export function apiError(e: unknown, fallback = t('Kaam nahi hua')) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Table, token or customer: how the order is called out on the floor. */
export function orderTitle(o: Pick<RestaurantOrder, 'mode' | 'table' | 'token' | 'customerName' | 'orderNumber'>) {
  if (o.mode === 'DINE_IN' && o.table) return t('Table {{tableNumber}}', { tableNumber: o.table.tableNumber });
  if (o.token) return t('Token {{token}}', { token: o.token });
  return o.customerName || o.orderNumber;
}

/** Modifier names of a line, e.g. "Large, Extra cheese". */
export function lineExtras(it: { modifiers?: Array<{ quantity?: number; modifierOption?: { name: string } }> }) {
  return (it.modifiers ?? []).map((m) => `${(m.quantity ?? 1) > 1 ? `${m.quantity}× ` : ''}${m.modifierOption?.name ?? ''}`).filter(Boolean).join(', ');
}

/** Query keys every restaurant screen refreshes after an order changes. */
export const ORDER_KEYS = ['restaurant-order', 'restaurant-orders-page', 'restaurant-floor', 'restaurant-kot', 'restaurant-delivery-board', 'restaurant-rider-cash', 'restaurant-riders', 'restaurant-day-close', 'restaurant-orders-active', 'restaurant-dashboard-overview'];
