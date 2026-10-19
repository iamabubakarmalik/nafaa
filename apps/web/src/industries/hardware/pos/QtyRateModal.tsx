/**
 * Quantity first, for items with quantity rates or a paint shade: the rate
 * for the typed quantity shows live (50 bags and up at the bulk rate) and a
 * paint line can carry the shade code that was tinted.
 */

import { useState } from 'react';
import { Paintbrush, Tags } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PosItem } from '@modules/pos/engine';
import type { Tier } from '../api/bulk-pricing.api';
import { tierFor } from '../hooks/useHardwareFacts';
import { qty as fmt } from '../lib/meta';

export interface QtyRateResult { qty: number; price: number; tier: Tier | null; shade: string }

export function QtyRateModal({ item, tiers, baseRate, rateLabel, paint, startQty, onClose, onConfirm }: {
  item: PosItem;
  tiers: Tier[];
  /** Rate without a tier: retail, or wholesale when the bill is on contractor rate. */
  baseRate: number;
  rateLabel: string;
  paint: boolean;
  startQty: number;
  onClose: () => void;
  onConfirm: (r: QtyRateResult) => void;
}) {
  const [text, setText] = useState(String(startQty));
  const [shade, setShade] = useState('');
  const q = Number(text);
  const valid = q > 0 && Number.isFinite(q);
  const tier = valid ? tierFor(tiers, q) : null;
  const rate = tier && tier.price < baseRate ? tier.price : baseRate;
  const over = valid && q > item.stock;
  const submit = () => { if (valid) onConfirm({ qty: q, price: rate, tier: tier && tier.price < baseRate ? tier : null, shade: shade.trim() }); };

  return (
    <Modal open onClose={onClose} size="sm" title={item.name} description={`${rateLabel}: ${formatPKR(baseRate)} / ${item.unit} · stock ${fmt(item.stock)}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        <Button onClick={submit} disabled={!valid}>Bill me dalein · {formatPKR(valid ? q * rate : 0)}</Button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitna ({item.unit})</span>
          <input data-autofocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
            className="h-12 w-full rounded-xl border-0 bg-slate-100 px-4 text-xl font-bold tabular-nums outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
          {over && <span className="mt-1 block text-[0.75rem] font-medium text-amber-700">Stock {fmt(item.stock)} hai — zyada bechne ki ijazat Settings se hai</span>}
        </label>
        {tiers.length > 0 && (
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><Tags className="h-4 w-4 text-emerald-600" />Quantity rate</span>
            <div className="flex flex-wrap gap-1.5">
              {tiers.map((t) => (
                <button key={t.id} type="button" onClick={() => setText(String(t.minQuantity))}
                  className={cn('rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold ring-1 transition', tier?.id === t.id ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50')}>
                  {fmt(t.minQuantity)}+ · {formatPKR(t.price)}
                </button>
              ))}
            </div>
          </div>
        )}
        {paint && (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><Paintbrush className="h-4 w-4 text-violet-600" />Shade (tinting) — marzi</span>
            <input value={shade} onChange={(e) => setShade(e.target.value)} placeholder="Code ya naam: 1234 Sky blue"
              className="h-11 w-full rounded-xl border-0 bg-slate-100 px-4 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
          </label>
        )}
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">
          Rate: <strong className="tabular-nums">{formatPKR(rate)}</strong> / {item.unit}
          {tier && tier.price < baseRate && <span className="ml-1 text-emerald-700">({fmt(tier.minQuantity)}+ wala rate{tier.label ? ` · ${tier.label}` : ''})</span>}
        </p>
      </form>
    </Modal>
  );
}
