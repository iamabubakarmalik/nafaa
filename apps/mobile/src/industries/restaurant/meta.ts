/**
 * Labels, colours and small helpers shared by the restaurant floor, order,
 * kitchen and delivery screens (mirror of the web lib/orderMeta.ts), so a
 * status reads the same everywhere. Labels are source keys marked with msg()
 * and translated where shown.
 */

import { Bike, Car, Home, Package, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react-native';
import { extrasText, type OrderMode, type OrderStatus, type TableStatus } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { RestaurantOrder } from './api';

export const MODE_META: Record<OrderMode, { label: string; short: string; icon: LucideIcon; tone: StatusTone }> = {
  DINE_IN: { label: msg('Dine-in'), short: msg('Table'), icon: Utensils, tone: 'success' },
  TAKEAWAY: { label: msg('Takeaway'), short: msg('Takeaway'), icon: ShoppingBag, tone: 'info' },
  DELIVERY: { label: msg('Delivery'), short: msg('Delivery'), icon: Bike, tone: 'accent' },
  PICKUP: { label: msg('Counter'), short: msg('Counter'), icon: Package, tone: 'brand' },
  DRIVE_THRU: { label: msg('Drive-thru'), short: msg('Drive-thru'), icon: Car, tone: 'warning' },
  ROOM_SERVICE: { label: msg('Room service'), short: msg('Room'), icon: Home, tone: 'accent' },
};

export const STATUS_META: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Draft'), tone: 'neutral' },
  PLACED: { label: msg('Naya'), tone: 'info' },
  CONFIRMED: { label: msg('Pakka'), tone: 'info' },
  COOKING: { label: msg('Ban raha hai'), tone: 'warning' },
  READY: { label: msg('Tayyar'), tone: 'success' },
  SERVED: { label: msg('Serve ho gaya'), tone: 'success' },
  ON_HOLD: { label: msg('Bill print ho gaya'), tone: 'accent' },
  OUT_FOR_DELIVERY: { label: msg('Raste me'), tone: 'accent' },
  DELIVERED: { label: msg('Deliver — cash baqi'), tone: 'warning' },
  COMPLETED: { label: msg('Paid'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};

export const TABLE_META: Record<TableStatus, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: msg('Khaali'), tone: 'success' },
  OCCUPIED: { label: msg('Bhari'), tone: 'danger' },
  RESERVED: { label: msg('Reserved'), tone: 'warning' },
  CLEANING: { label: msg('Safai'), tone: 'info' },
  OUT_OF_SERVICE: { label: msg('Band'), tone: 'neutral' },
};

/** Kitchen state of one dish on an order. */
export const ITEM_STATE: Record<string, { label: string; tone: StatusTone }> = {
  UNSENT: { label: msg('Kitchen nahi gaya'), tone: 'neutral' },
  PLACED: { label: msg('Kitchen me'), tone: 'info' },
  CONFIRMED: { label: msg('Kitchen me'), tone: 'info' },
  COOKING: { label: msg('Ban raha hai'), tone: 'warning' },
  READY: { label: msg('Tayyar'), tone: 'success' },
  SERVED: { label: msg('Serve'), tone: 'success' },
};

/** "45m" or "1g 20m" for a running timer. */
export function duration(min: number) {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}g ${min % 60}m`;
}

/** Dish name with its size ("Biryani · Half") when the order carries the dish's sizes. */
export function itemName(it: { variantId?: string | null; product?: { name?: string; variants?: Array<{ id: string; name: string }> } | null }) {
  const name = it.product?.name ?? t('Item');
  const size = it.variantId ? it.product?.variants?.find((v) => v.id === it.variantId)?.name : undefined;
  return size ? `${name} · ${size}` : name;
}

export const lineExtras = (it: { modifiers?: Array<{ quantity?: number; modifierOption?: { name: string } }> }) => extrasText(it.modifiers ?? []);

/** Table, token or customer: how the order is called out on the floor. */
export function orderTitle(o: Pick<RestaurantOrder, 'mode' | 'table' | 'token' | 'customerName' | 'orderNumber'>) {
  if (o.mode === 'DINE_IN' && o.table) return t('Table {{tableNumber}}', { tableNumber: o.table.tableNumber });
  if (o.token) return t('Token {{token}}', { token: o.token });
  return o.customerName || o.orderNumber;
}

export const ORDER_KEY = 'restaurant-order';
export const FLOOR_KEY = 'restaurant-floor';
export const KOT_KEY = 'restaurant-kot';
export const ORDERS_KEY = 'restaurant-orders-page';
export const MENU_KEY = 'restaurant-menu-order';

/** Query keys every restaurant screen refreshes after an order changes (web ORDER_KEYS), plus sales/khata after a bill. */
export function refreshOrders(bill = false) {
  const keys = [ORDER_KEY, ORDERS_KEY, FLOOR_KEY, KOT_KEY, 'restaurant-delivery-board', 'restaurant-rider-cash', 'restaurant-riders', 'restaurant-day-close', 'restaurant-dashboard'];
  if (bill) keys.push('sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'offline');
  keys.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

/** Server message of a failed request, translated like everywhere else. */
export const apiError = (e: unknown, fallback = t('Kaam nahi hua')) => apiErrorMessage(e, fallback);
