/**
 * What the gaming counter keeps beside the cart: running sessions put on the
 * bill (closed after the bill is saved), the card products on the shelf, and the
 * card codes handed out by the last bill.
 */

import { useSyncExternalStore } from 'react';
import type { GivenCard } from './api';

export interface PickedSession { id: string; sessionNumber: string; amount: number; minutes: number }

interface State {
  sessions: PickedSession[];
  /** Station time product of the shop and the ids of card products, learned from the counter queries. */
  timeProductId: string;
  cardProductIds: string[];
  /** Codes from the last saved bill, until the cashier closes them. */
  given: { saleNumber: string; cards: GivenCard[]; missing: number } | null;
  /** A saved bill whose cards could not be handed out yet. */
  pendingSale: { id: string; saleNumber: string } | null;
}

let state: State = { sessions: [], timeProductId: '', cardProductIds: [], given: null, pendingSale: null };
const listeners = new Set<() => void>();

export const counterStore = {
  get: () => state,
  set: (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
};

export const useCounterState = () => useSyncExternalStore(counterStore.subscribe, counterStore.get);
