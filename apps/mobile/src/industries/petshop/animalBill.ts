/** Animals on the counter's bill: which lines are animals, and marking them sold once the bill reaches the server. */

import { useSyncExternalStore } from 'react';
import { errorText, waitServerSaleId } from '../_shared/deskKit';
import { t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline, syncNow } from '@/core/offline';
import { useBill } from '@/modules/pos/engine/bill';
import type { PosApi } from '@/modules/pos/engine/usePos';
import { toast } from '@/design';
import { liveAnimalsApi, type LiveAnimal } from './api';
import { PET_KEYS, refreshPet } from './meta';

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
export async function markAnimalsSold(saleId: string, saleNumber: string) {
  try {
    const id = (await waitServerSaleId(saleId)) ?? saleId;
    const r = await liveAnimalsApi.fromSale(id);
    failedStore.set(null);
    refreshPet([PET_KEYS.animals, PET_KEYS.posAnimals]);
    if (r.marked.length) toast.success(t('{{count}} janwar bik gaye — record me likh diya', { count: r.marked.length }));
  } catch (e) {
    failedStore.set({ saleId, saleNumber });
    toast.error(errorText(e, t('Bill {{saleNumber}} ban gaya magar janwar "bik gaya" nahi likha — cart me "Dobara" dabayein', { saleNumber })));
  }
}

/** Puts an animal on the bill through its catalogue line. */
export async function addAnimalToBill(a: LiveAnimal, api: PosApi): Promise<boolean> {
  if (!isOnline()) { toast.error(t('Janwar bechne ke liye internet chahiye')); return false; }
  if (a.status === 'RESERVED') toast.warning(t('{{name}} kisi ke liye roka hua hai — check kar ke dein', { name: a.name || a.breed || a.animalNumber }));
  try {
    const r = await liveAnimalsApi.counterItem(a.id);
    if (useBill.getState().lines.some((l) => l.productId === r.productId)) { toast.error(t('Ye janwar bill me pehle se hai')); return false; }
    animalLines.add(r.productId);
    // The new catalogue line reaches this phone on the next download.
    await syncNow().catch(() => undefined);
    for (let i = 0; i < 20 && !(await offline.products.get(r.productId, api.shopId).catch(() => null)); i++) await new Promise((res) => setTimeout(res, 400));
    const ok = await api.addProduct(r.productId, { price: r.price, oversell: true });
    if (!ok) animalLines.delete(r.productId);
    return ok;
  } catch (e) {
    toast.error(errorText(e, t('Janwar counter par nahi aaya')));
    return false;
  }
}
