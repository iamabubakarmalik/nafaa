/**
 * Add, remove or set stock for one product. Saved as a stock adjustment, so
 * it lands on the active branch and appears in the stock history with a reason.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Equal } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { stockAdjustmentsApi } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import type { CatalogItem } from '../api';

/** What the dialog needs to know about a product. */
export type StockTarget = Pick<CatalogItem, 'id' | 'name' | 'unit' | 'stock' | 'price'>;

type Mode = 'add' | 'remove' | 'set';
const WEIGHED = /^(kg|g|gram|lb|litre|liter|l|ml|meter|m|ft|sqft|yard)$/i;
const REASONS: Record<Mode, string[]> = {
  add: ['Naya maal aaya', 'Banaya gaya', 'Wapas aaya'],
  remove: ['Kharab / waste', 'Apne istemal mein', 'Ginti mein kam'],
  set: ['Ginti ki — asal stock'],
};

export function StockModal({ item, chips, onClose, onSaved, money }: {
  item: StockTarget;
  chips?: number[];
  onClose: () => void;
  onSaved: () => void;
  money: (n: number) => string;
}) {
  const [mode, setMode] = useState<Mode>('add');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState(REASONS.add[0]);
  const weighed = WEIGHED.test(item.unit);
  const quick = chips ?? (weighed ? [0.25, 0.5, 1, 2, 5, 10] : [1, 5, 10, 25, 50, 100]);
  const n = Number(qty) || 0;
  const next = mode === 'add' ? item.stock + n : mode === 'remove' ? item.stock - n : n;
  const delta = next - item.stock;

  const save = useMutation({
    mutationFn: () => stockAdjustmentsApi.create({
      productId: item.id, type: delta >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity: Math.abs(delta), reason,
    }),
    onSuccess: () => { toast.success(`${item.name}: stock ab ${fmt(next)} ${item.unit}`); onSaved(); onClose(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Stock save nahi hua'),
  });
  const can = n > 0 || (mode === 'set' && qty !== '' && delta !== 0);
  const submit = () => { if (can && delta !== 0 && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} title={item.name} description={`Abhi stock: ${fmt(item.stock)} ${item.unit}`} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!can || delta === 0} loading={save.isPending}>Save karein</Button>
      </>}>
      <div className="space-y-4" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}>
        <Segmented<Mode> label="Kya karna hai" value={mode} onChange={(m) => { setMode(m); setReason(REASONS[m][0]); }} className="w-full [&>button]:flex-1"
          items={[{ value: 'add', label: 'Daalein' }, { value: 'remove', label: 'Nikaalein' }, { value: 'set', label: 'Ginti' }]} />
        <label className="block">
          <span className="text-[0.75rem] font-medium text-slate-500">{mode === 'set' ? 'Shelf par asal ginti' : 'Kitna'} ({item.unit})</span>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', mode === 'add' ? 'bg-success-50 text-success-700' : mode === 'remove' ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700')}>
              {mode === 'add' ? <Plus className="h-5 w-5" /> : mode === 'remove' ? <Minus className="h-5 w-5" /> : <Equal className="h-5 w-5" />}
            </span>
            <input autoFocus inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[1.375rem] font-bold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </div>
        </label>
        {mode !== 'set' && (
          <div className="flex flex-wrap gap-1.5">
            {quick.map((c) => (
              <button key={c} type="button" onClick={() => setQty(String(Number(qty || 0) + c))}
                className="h-8 rounded-lg bg-slate-100 px-3 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">+{c}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {REASONS[mode].map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)}
              className={cn('h-8 rounded-full px-3 text-[0.75rem] font-medium transition', reason === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{r}</button>
          ))}
        </div>
        <div className={cn('flex items-center justify-between rounded-2xl p-3.5', next < 0 ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-slate-50')}>
          <div>
            <p className="text-[0.75rem] text-slate-500">Naya stock</p>
            <p className={cn('text-[1.25rem] font-bold tabular-nums', next < 0 ? 'text-rose-700' : 'text-slate-900')}>{fmt(next)} <span className="text-[0.8125rem] font-medium text-slate-500">{item.unit}</span></p>
          </div>
          <div className="text-right text-[0.75rem] text-slate-500">
            {delta !== 0 && <p className={cn('font-semibold', delta > 0 ? 'text-success-700' : 'text-rose-700')}>{delta > 0 ? '+' : ''}{fmt(delta)}</p>}
            <p>Bechne ki qeemat {money(Math.max(0, next) * item.price)}</p>
          </div>
        </div>
        {next < 0 && <p className="text-[0.75rem] font-medium text-rose-700">Stock zero se neeche ja raha hai — ginti dobara dekh lein.</p>}
      </div>
    </Modal>
  );
}

const fmt = (v: number) => String(Number(v.toFixed(3)));
