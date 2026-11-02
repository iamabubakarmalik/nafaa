/** Animals on the counter's bill: which lines are animals, and marking them sold after the save. */

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { queryClient } from '@core/lib/queryClient';
import { liveAnimalsApi } from '../api/live-animals.api';
import { PET_KEYS, errorText } from '../lib/meta';
import { t } from '@core/i18n';

export const ANIMALS_KEY = 'petshop-pos-animals';

/** Catalogue lines of animals put on this bill; marked sold after the save. */
export const animalLines = new Set<string>();

/** A saved bill whose animals could not be marked sold; retried from the cart. */
let failed: { saleId: string; saleNumber: string } | null = null;
const listeners = new Set<() => void>();
export const failedStore = {
  get: () => failed,
  set: (v: typeof failed) => { failed = v; listeners.forEach((l) => l()); },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
};
export const useFailedAnimalBill = () => useSyncExternalStore(failedStore.subscribe, failedStore.get);

/** Marks the animals on a saved bill sold and refreshes the lists. */
export function markAnimalsSold(saleId: string, saleNumber: string) {
  return liveAnimalsApi.fromSale(saleId)
    .then((r) => {
      failedStore.set(null);
      [ANIMALS_KEY, PET_KEYS.animals, 'petshop-dashboard-overview'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (r.marked.length) toast.success(t('{{count}} janwar bik gaye — record me likh diya', { count: r.marked.length }));
    })
    .catch((e) => {
      failedStore.set({ saleId, saleNumber });
      toast.error(errorText(e, t('Bill {{saleNumber}} ban gaya magar janwar "bik gaya" nahi likha — cart me "Dobara" dabayein', { saleNumber })));
    });
}

