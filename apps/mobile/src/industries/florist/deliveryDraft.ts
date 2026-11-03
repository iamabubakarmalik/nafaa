/**
 * Delivery details for the bill on the counter (recipient, address, card,
 * slot). The cart card fills it, `beforeCheckout` checks it, and after the
 * bill is saved `afterSale` turns it into a delivery order.
 */

import { useSyncExternalStore } from 'react';
import { draftProblems as coreProblems, type DeliveryDraft, type DraftProblem } from '@nafaa/core/industries/florist';
import { t } from '@/core/i18n';
import { todayKey } from '../_shared/deskKit';

export type { DeliveryDraft };

interface State {
  draft: DeliveryDraft | null;
  /** Bill saved but its order failed to save; retried from the cart card. */
  failed: { saleId: string; saleNumber: string; draft: DeliveryDraft } | null;
}

let state: State = { draft: null, failed: null };
const listeners = new Set<() => void>();

export const deliveryStore = {
  get: () => state,
  set: (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
};

export const useDeliveryState = () => useSyncExternalStore(deliveryStore.subscribe, deliveryStore.get);

const TEXT: Record<DraftProblem, () => string> = {
  date: () => t('Delivery ki date chunein'), past: () => t('Delivery ki date guzar chuki hai'), recipient: () => t('Lene wale ka naam likhein'),
  phone: () => t('Lene wale ka phone 10 se 15 hindse'), address: () => t('Delivery ka pata likhein'), venue: () => t('Event ki jagah likhein'), card: () => t('Card ka message 500 harf tak'),
};

/** What is missing before this delivery can be saved, in words; empty when ready. */
export const draftProblemTexts = (d: DeliveryDraft) => coreProblems(d, todayKey()).map((p) => TEXT[p]());
