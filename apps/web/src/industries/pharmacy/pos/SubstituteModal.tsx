/**
 * The asked-for brand is out of stock: other medicines with the same salt
 * and strength that are on this branch's shelf, cheapest first.
 */

import { ArrowRightLeft, PackageX } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PosItem } from '@modules/pos/engine';

export function SubstituteModal({ item, options, onPick, onSellAnyway, onClose }: {
  item: PosItem;
  options: PosItem[];
  onPick: (sub: PosItem) => void;
  /** Present when the shop allows selling without stock. */
  onSellAnyway?: () => void;
  onClose: () => void;
}) {
  const generic = String(item.meta?.generic ?? '');
  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="inline-flex items-center gap-2"><PackageX className="h-5 w-5 text-rose-600" />{item.name} — stock khatam</span>}
      description={generic ? `Yehi formula (${generic}) wali dawaiyan jo shelf par hain` : 'Is dawai ka formula (salt) likha nahi — product me salt jorein to yahan substitute dikhenge'}
      footer={<div className="flex justify-end gap-2">{onSellAnyway && <Button variant="secondary" onClick={onSellAnyway}>Phir bhi bechein</Button>}<Button variant="ghost" onClick={onClose}>Band karein</Button></div>}>
      {options.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-[0.875rem] text-slate-600">Is formula ki koi aur dawai shelf par nahi. Distributor se mangwayein.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
          {options.map((o) => {
            const diff = o.price - item.price;
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onPick(o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ArrowRightLeft className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{o.name}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{[o.meta?.manufacturer, o.meta?.dosageForm, `${Number(o.stock.toFixed(2))} ${o.unit} shelf par`].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(o.price)}</span>
                    {diff !== 0 && <span className={cn('block text-[0.75rem] font-medium tabular-nums', diff < 0 ? 'text-emerald-700' : 'text-amber-700')}>{diff < 0 ? `${formatPKR(-diff)} sasti` : `${formatPKR(diff)} mehngi`}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
