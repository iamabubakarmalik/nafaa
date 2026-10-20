/** Cart notice for a saved bill whose animals were not marked sold, with a retry. */

import { useState } from 'react';
import { RotateCw, X } from 'lucide-react';
import { failedStore, markAnimalsSold, useFailedAnimalBill } from './animalBill';

export function AnimalBillRetry() {
  const failed = useFailedAnimalBill();
  const [busy, setBusy] = useState(false);
  if (!failed) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
      <span className="min-w-0 flex-1">Bill {failed.saleNumber}: janwar "bik gaya" nahi likha</span>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); void markAnimalsSold(failed.saleId, failed.saleNumber).finally(() => setBusy(false)); }}
        className="inline-flex items-center gap-1 font-semibold hover:underline disabled:opacity-50"><RotateCw className="h-3.5 w-3.5" />Dobara</button>
      <button type="button" onClick={() => failedStore.set(null)} aria-label="Chhor dein"><X className="h-4 w-4" /></button>
    </div>
  );
}
