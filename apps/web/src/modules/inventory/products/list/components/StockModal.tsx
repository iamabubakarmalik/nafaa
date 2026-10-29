/**
 * Add, remove or set stock for one product. Saved as a stock adjustment, so
 * it lands on the active branch and appears in the stock history with a reason.
 * First stock and goods made in the shop are saved as opening stock, which is
 * not counted as Profit. Every other choice is a fixed reason with its profit
 * effect: Stock faida (audit found extra, free goods), Stock nuksan (damage,
 * expiry, chori, used in the shop), or a data correction with no effect.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Equal } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { stockAdjustmentsApi, type ProfitEffect, type ReasonCode } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { CORRECTION_WARNING, EFFECTS, REASONS as REASON_META } from '@modules/inventory/stock-adjustments/components/meta';
import type { CatalogItem } from '../api';

/** What the dialog needs to know about a product. */
export type StockTarget = Pick<CatalogItem, 'id' | 'name' | 'unit' | 'stock' | 'price'>;

type Mode = 'add' | 'remove' | 'set';
const WEIGHED = /^(kg|g|gram|lb|litre|liter|l|ml|meter|m|ft|sqft|yard)$/i;
/** A choice in the dialog: opening stock (no reason code), a fixed reason, or the count's own up/down reason. */
interface Choice { label: string; code: ReasonCode | null }
const COUNT = 'COUNT';
const REASONS: Record<Mode, Choice[]> = {
  add: [
    { label: 'Pehla stock', code: null }, { label: 'Dukaan me banaya', code: null },
    { label: REASON_META.AUDIT_FOUND.label, code: 'AUDIT_FOUND' }, { label: REASON_META.FREE_BONUS.label, code: 'FREE_BONUS' },
  ],
  remove: (['DAMAGE', 'EXPIRY', 'THEFT', 'SHOP_USE'] as const).map((c) => ({ label: REASON_META[c].label, code: c })),
  // A count: extra is found in an audit, short is a shortage.
  set: [{ label: 'Ginti ki — asal stock', code: COUNT as ReasonCode }],
};
const CORRECTION: Choice = { label: REASON_META.CORRECTION.label, code: 'CORRECTION' };

export function StockModal({ item, chips, onClose, onSaved, money }: {
  item: StockTarget;
  chips?: number[];
  onClose: () => void;
  onSaved: () => void;
  money: (n: number) => string;
}) {
  const [mode, setMode] = useState<Mode>('add');
  const [qty, setQty] = useState('');
  const [choice, setChoice] = useState<Choice>(REASONS.add[0]);
  const canCorrect = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_CORRECT);
  const choices = [...REASONS[mode], ...(canCorrect ? [CORRECTION] : [])];
  const weighed = WEIGHED.test(item.unit);
  const quick = chips ?? (weighed ? [0.25, 0.5, 1, 2, 5, 10] : [1, 5, 10, 25, 50, 100]);
  const n = Number(qty) || 0;
  const next = mode === 'add' ? item.stock + n : mode === 'remove' ? item.stock - n : n;
  const delta = next - item.stock;
  const code: ReasonCode | null = choice.code === (COUNT as ReasonCode) ? (delta > 0 ? 'AUDIT_FOUND' : 'THEFT') : choice.code;
  const effect: ProfitEffect = code ? REASON_META[code].effect : 'NONE';

  const save = useMutation({
    mutationFn: () => stockAdjustmentsApi.create({
      productId: item.id,
      // The reason fixes the type on the server; a correction keeps this direction.
      type: code ? REASON_META[code].type ?? (delta < 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN') : 'OPENING_BALANCE',
      quantity: Math.abs(delta), reason: code ? REASON_META[code].label : choice.label, ...(code && { reasonCode: code }),
    }),
    onSuccess: () => { toast.success(`${item.name}: stock ab ${fmt(next)} ${item.unit}`); onSaved(); onClose(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Stock save nahi hua'),
  });
  // Opening stock only adds; a count may go either way.
  const can = (n > 0 || (mode === 'set' && qty !== '' && delta !== 0)) && !(code === null && delta < 0);
  const submit = () => { if (can && delta !== 0 && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} title={item.name} description={`Abhi stock: ${fmt(item.stock)} ${item.unit}`} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!can || delta === 0} loading={save.isPending}>Save karein</Button>
      </>}>
      <div className="space-y-4" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}>
        <Segmented<Mode> label="Kya karna hai" value={mode} onChange={(m) => { setMode(m); setChoice(REASONS[m][0]); }} className="w-full [&>button]:flex-1"
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
        <div>
          <div className="flex flex-wrap gap-1.5">
            {choices.map((r) => (
              <button key={r.label} type="button" onClick={() => setChoice(r)}
                className={cn('h-8 rounded-full px-3 text-[0.75rem] font-medium transition', choice.label === r.label ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{r.label}</button>
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', EFFECTS[effect].tone)}>{EFFECTS[effect].label}</span>
            {effect === 'NONE' ? 'Sirf stock badlega' : `${EFFECTS[effect].note} (cost par)`}
          </p>
          {code === 'CORRECTION' && <p className="mt-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">{CORRECTION_WARNING}</p>}
          {code === null && delta < 0 && <p className="mt-1.5 text-[0.75rem] font-medium text-rose-700">Opening stock sirf barhata hai — kam karne ke liye reason chunein.</p>}
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
        {mode === 'add' && <p className="text-[0.75rem] text-slate-500">Supplier se khareeda maal? Purchase me darj karein, taake Cost aur supplier ka hisaab bane.</p>}
        {next < 0 && <p className="text-[0.75rem] font-medium text-rose-700">Stock zero se neeche ja raha hai — ginti dobara dekh lein.</p>}
      </div>
    </Modal>
  );
}

const fmt = (v: number) => String(Number(v.toFixed(3)));
