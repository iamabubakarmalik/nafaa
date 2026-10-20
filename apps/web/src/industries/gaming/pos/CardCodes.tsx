/**
 * Cart block for the gaming counter: after a bill with cards is saved it
 * shows each card's code and PIN to hand to the customer (copy, print), and
 * offers a retry when the codes could not be fetched.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, CreditCard, RefreshCw } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { gamingTopupsApi } from '../api/topups.api';
import { errorText, providerOf, shortDate } from '../lib/meta';
import { counterStore, useCounterState } from './counterStore';

const copy = (text: string) => {
  void navigator.clipboard?.writeText(text).then(() => toast.success('Copy ho gaya', { duration: 900 })).catch(() => toast.error('Copy nahi hua'));
};

export function CardCodes() {
  const { given, pendingSale } = useCounterState();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    if (!pendingSale || busy) return;
    setBusy(true);
    try {
      const r = await gamingTopupsApi.assignSale(pendingSale.id);
      counterStore.set({ given: r, pendingSale: null });
    } catch (e) {
      toast.error(errorText(e, 'Codes nahi mile — Top-ups page par bill number se dekhein'));
    } finally { setBusy(false); }
  };

  const doc = (): PrintDoc => ({
    title: 'Digital card',
    subtitle: given ? `Bill ${given.saleNumber}` : undefined,
    sections: (given?.cards ?? []).map((c) => ({
      kind: 'rows' as const,
      title: `${providerOf(c.provider)} ${c.topupType} ${c.denominationValue}`,
      rows: [
        { label: 'Code', value: c.cardCode ?? '—' },
        ...(c.cardPin ? [{ label: 'PIN', value: c.cardPin }] : []),
        ...(c.cardSerial ? [{ label: 'Serial', value: c.cardSerial }] : []),
        ...(c.expiryDate ? [{ label: 'Expiry', value: shortDate(c.expiryDate) }] : []),
      ],
    })),
  });

  return (
    <>
      {pendingSale && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <CreditCard className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Bill {pendingSale.saleNumber} ke card codes nahi mile</span>
          <Button size="sm" variant="secondary" loading={busy} onClick={retry}><RefreshCw className="h-3.5 w-3.5" />Dobara</Button>
        </div>
      )}
      {given && (
        <Modal open size="md" onClose={() => counterStore.set({ given: null })} title="Card codes customer ko dein" description={`Bill ${given.saleNumber}`}
          footer={<>
            <PrintButton doc={doc} label="Print" size="sm" />
            <span className="flex-1" />
            <Button onClick={() => counterStore.set({ given: null })}>Theek hai</Button>
          </>}>
          <div className="space-y-3">
            {given.missing > 0 && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
                {given.missing} card stock me nahi the — Top-ups page par card daalein ya bill par return karein.
              </p>
            )}
            {given.cards.map((c) => (
              <div key={c.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[0.8125rem] font-semibold text-slate-700">{providerOf(c.provider)} · {c.topupType} {c.denominationValue} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{c.topupNumber}</span></p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-[1rem] font-bold tracking-wider text-slate-900 ring-1 ring-slate-200">{c.cardCode ?? '—'}</code>
                  {c.cardCode && <Button size="sm" variant="secondary" onClick={() => copy(c.cardCode!)}><Copy className="h-3.5 w-3.5" />Copy</Button>}
                </div>
                {(c.cardPin || c.cardSerial) && <p className="mt-1.5 font-mono text-[0.8125rem] text-slate-600">{c.cardPin ? `PIN ${c.cardPin}` : ''}{c.cardPin && c.cardSerial ? ' · ' : ''}{c.cardSerial ? `S/N ${c.cardSerial}` : ''}</p>}
              </div>
            ))}
            <p className="text-[0.75rem] text-slate-500">Code dobara chahiye ho to Top-ups → Bike hue me card kholein.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
