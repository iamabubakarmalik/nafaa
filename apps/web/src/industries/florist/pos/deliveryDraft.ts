/**
 * Delivery details for the bill on the counter (recipient, address, card,
 * slot). The cart card fills it, `beforeCheckout` checks it, and after the
 * bill is saved `onSale` turns it into a delivery order.
 */

import { useSyncExternalStore } from 'react';
import type { FloristDeliveryTimeSlot, FloristOrderType, OrderFromSale } from '../api/orders.api';
import { dayKey, phoneOk, shiftDay } from '../lib/meta';

export interface DeliveryDraft {
  orderType: FloristOrderType;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  area: string;
  landmark: string;
  messageCard: string;
  senderName: string;
  isAnonymous: boolean;
  deliveryTimeSlot: FloristDeliveryTimeSlot;
  scheduledDeliveryDate: string;
  scheduledDeliveryTime: string;
  eventName: string;
  eventVenue: string;
  specialInstructions: string;
}

export const blankDraft = (): DeliveryDraft => ({
  orderType: 'DELIVERY', recipientName: '', recipientPhone: '', deliveryAddress: '', area: '', landmark: '', messageCard: '',
  senderName: '', isAnonymous: false, deliveryTimeSlot: 'EVENING_3_6', scheduledDeliveryDate: shiftDay(dayKey(), 0),
  scheduledDeliveryTime: '', eventName: '', eventVenue: '', specialInstructions: '',
});

interface State {
  draft: DeliveryDraft | null;
  /** Bill saved but its order failed to save; retried from the cart card. */
  failed: { saleId: string; saleNumber: string; draft: DeliveryDraft } | null;
}

let state: State = { draft: null, failed: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const deliveryStore = {
  get: () => state,
  set: (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); },
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
};

export const useDeliveryState = () => useSyncExternalStore(deliveryStore.subscribe, deliveryStore.get);

/** What is missing before this delivery can be saved; empty when ready. */
export function draftProblems(d: DeliveryDraft): string[] {
  const out: string[] = [];
  if (d.orderType === 'WALK_IN') return out;
  if (!d.scheduledDeliveryDate) out.push('Delivery ki date chunein');
  else if (d.scheduledDeliveryDate < dayKey()) out.push('Delivery ki date guzar chuki hai');
  if (d.orderType === 'DELIVERY' || d.orderType === 'CORPORATE') {
    if (!d.recipientName.trim()) out.push('Lene wale ka naam likhein');
    if (!phoneOk(d.recipientPhone)) out.push('Lene wale ka phone 10 se 15 hindse');
    if (!d.deliveryAddress.trim()) out.push('Delivery ka pata likhein');
  }
  if (d.orderType === 'EVENT' && !d.eventVenue.trim()) out.push('Event ki jagah likhein');
  if (d.messageCard.length > 500) out.push('Card ka message 500 harf tak');
  return out;
}

export function toOrder(saleId: string, d: DeliveryDraft): OrderFromSale {
  const t = (v: string) => v.trim() || undefined;
  return {
    saleId, orderType: d.orderType, recipientName: t(d.recipientName), recipientPhone: t(d.recipientPhone),
    deliveryAddress: t(d.deliveryAddress), area: t(d.area), landmark: t(d.landmark), messageCard: t(d.messageCard),
    senderName: d.isAnonymous ? undefined : t(d.senderName), isAnonymous: d.isAnonymous, deliveryTimeSlot: d.deliveryTimeSlot,
    scheduledDeliveryDate: d.scheduledDeliveryDate || undefined, scheduledDeliveryTime: t(d.scheduledDeliveryTime),
    eventName: t(d.eventName), eventVenue: t(d.eventVenue), specialInstructions: t(d.specialInstructions),
  };
}
