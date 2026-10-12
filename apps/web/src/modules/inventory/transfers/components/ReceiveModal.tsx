/**
 * Receive a transfer at the destination branch. Every line starts as fully
 * arrived; a short line is corrected by count, and a device, roll or used
 * phone is ticked as arrived or not. The value of what is missing shows live.
 */

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, PackageCheck } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { transfersApi, type StockTransfer } from '../api/transfers.api';
import { isUnitLine, lineName, lineRef, lineUnit, qty } from './transferMeta';

export function ReceiveModal({ t, money, onClose, onDone }: { t: StockTransfer; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const [got, setGot] = useState<Record<string, number>>(() => Object.fromEntries(t.items.map((i) => [i.id, i.quantity])));
  const [note, setNote] = useState('');

  const short = useMemo(() => t.items.reduce((s, i) => s + Math.max(0, i.quantity - (got[i.id] ?? i.quantity)) * i.unitCost, 0), [t, got]);
  const shortLines = t.items.filter((i) => (got[i.id] ?? i.quantity) < i.quantity).length;

  const mut = useMutation({
    mutationFn: () => transfersApi.receive(t.id, {
      notes: note.trim() || undefined,
      items: t.items.filter((i) => got[i.id] !== i.quantity).map((i) => ({ itemId: i.id, receivedQty: got[i.id] ?? 0 })),
    }),
    onSuccess: () => {
      toast.success(short > 0 ? `Wusool ho gaya — ${money(short)} ka maal kam aaya, darj kar liya` : `Wusool ho gaya — maal ${t.toShop.name} ke stock me`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Wusool nahi hua'),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={`Maal wusool karein · ${t.transferNumber}`}
      description={`${t.fromShop.name} se aaya. Gin kar dekhein — kam aaya ho to wohi likhein, baqi poora maana jayega.`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={mut.isPending} onClick={() => mut.mutate()} leftIcon={<PackageCheck className="h-4 w-4" />}>
          {shortLines ? 'Jitna aaya, wusool karein' : 'Sab aa gaya — wusool karein'}
        </Button>
      </>}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-slate-600">{t.items.length} cheezein</p>
        <button type="button" onClick={() => setGot(Object.fromEntries(t.items.map((i) => [i.id, i.quantity])))} className="text-[0.8125rem] font-medium text-brand-700 hover:underline">Sab poora aaya</button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {t.items.map((i) => {
          const v = got[i.id] ?? i.quantity;
          const less = v < i.quantity;
          return (
            <li key={i.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5', less && 'bg-amber-50/60')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{lineName(i)}</p>
                <p className="text-[0.75rem] text-slate-500">
                  {[lineRef(i), i.notes, `Bheje ${qty(i.quantity)} ${lineUnit(i)}`].filter(Boolean).join(' · ')}
                </p>
                {less && <p className="text-[0.75rem] font-medium text-amber-800">Kam: {qty(i.quantity - v)} {lineUnit(i)} · {money((i.quantity - v) * i.unitCost)}</p>}
              </div>
              {isUnitLine(i) ? (
                <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-200">
                  <button type="button" onClick={() => setGot({ ...got, [i.id]: i.quantity })} aria-pressed={!less}
                    className={cn('px-3 py-1.5 text-[0.8125rem] font-medium', !less ? 'bg-emerald-600 text-white' : 'text-slate-600')}>Aaya</button>
                  <button type="button" onClick={() => setGot({ ...got, [i.id]: 0 })} aria-pressed={less}
                    className={cn('px-3 py-1.5 text-[0.8125rem] font-medium', less ? 'bg-rose-600 text-white' : 'text-slate-600')}>Nahi aaya</button>
                </div>
              ) : (
                <label className="flex items-center gap-1.5">
                  <input type="number" min={0} max={i.quantity} step="any" inputMode="decimal" value={v} aria-label={`${lineName(i)} kitna aaya`}
                    onChange={(e) => setGot({ ...got, [i.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), i.quantity) })}
                    className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-brand-500" />
                  <span className="w-10 text-[0.75rem] text-slate-500">{lineUnit(i)}</span>
                </label>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[0.6875rem] text-slate-400">Miqdar base unit me hai (pcs / kg / sqft). Device aur roll poora aata hai ya bilkul nahi.</p>

      {short > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>{money(short)}</b> ka maal kam aaya ({shortLines} line). Kam maal kisi branch ke stock me nahi jayega — raste ka nuqsan darj hoga aur owner ko notification jayegi.</span>
        </div>
      )}

      <label className="mt-3 block text-[0.75rem] text-slate-500">Note (ikhtiyari)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Misaal: 2 dabbe toote hue aaye"
          className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500" />
        <span className="mt-1 block text-[0.6875rem] text-slate-400">Transfer ke note me "Wusooli:" ke saath jud jayega</span>
      </label>
    </Modal>
  );
}
