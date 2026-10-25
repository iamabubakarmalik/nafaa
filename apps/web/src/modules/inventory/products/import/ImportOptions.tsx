/**
 * Import settings for new-product mode: the branch that receives the stock
 * and what happens to rows whose product is already in the shop (add stock,
 * set stock to the file's number, or leave stock alone; optionally update
 * price and cost).
 */

import { Store } from 'lucide-react';
import { Checkbox, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { ExistingOptions, ExistingStockMode } from './api';

const MODES: Array<{ id: ExistingStockMode; title: string; text: string }> = [
  { id: 'set', title: 'Stock file wala kar dein', text: 'System me 10 hain, file me 24 → +14 ka adjustment. Dobara import karne se stock dugna nahi hota.' },
  { id: 'add', title: 'Stock me jama karein', text: 'File ka stock maujooda stock me jur jata hai (opening stock). Naya maal aaya ho to.' },
  { id: 'skip', title: 'Stock na chheren', text: 'Pehle se bane products ka stock wesa hi rahega.' },
];

export function ImportOptions({ shops, shopId, onShop, lockedShop, existing, onExisting, canStock, canPrices, compact }: {
  shops: Array<{ id: string; name: string; isMain?: boolean }>;
  shopId: string;
  onShop: (id: string) => void;
  lockedShop: string | null;
  existing: ExistingOptions;
  onExisting: (next: ExistingOptions) => void;
  canStock: boolean;
  canPrices: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5')}>
      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]')}>
        <div>
          <Select label={<span className="inline-flex items-center gap-1.5"><Store className="h-4 w-4 text-brand-600" />Stock kis branch me?</span>}
            value={shopId} onChange={(e) => onShop(e.target.value)} disabled={!!lockedShop || shops.length < 2}
            options={shops.map((s) => ({ value: s.id, label: `${s.name}${s.isMain ? ' (main)' : ''}` }))}
            hint={lockedShop ? 'Aap sirf apni branch me stock daal sakte hain' : 'Har line ka stock isi branch me jata hai; baqi branches me 0 se shuru'} />
        </div>
        <div>
          <p className="text-[0.8125rem] font-semibold text-slate-800">Jo products pehle se hain (same naam, SKU ya barcode) unka stock:</p>
          {!canStock && <p className="mt-0.5 text-[0.75rem] text-amber-700">Aap ke paas Stock adjustment ki ijazat nahi — pehle se bane products ka stock nahi badlega.</p>}
          <div className={cn('mt-2 grid gap-2', compact ? 'sm:grid-cols-3' : 'md:grid-cols-3')}>
            {MODES.map((m) => {
              const on = existing.stock === m.id;
              return (
                <button key={m.id} type="button" disabled={!canStock && m.id !== 'skip'} onClick={() => onExisting({ ...existing, stock: m.id })}
                  aria-pressed={on}
                  className={cn('rounded-2xl p-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50',
                    on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-slate-50 ring-slate-200 hover:bg-slate-100')}>
                  <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900">
                    <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full ring-2', on ? 'bg-brand-600 ring-brand-200' : 'bg-white ring-slate-300')} />{m.title}
                  </span>
                  {!compact && <span className="mt-1 block text-[0.75rem] leading-snug text-slate-600">{m.text}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <Checkbox label="Price / Cost bhi file wali kar dein" checked={existing.prices} disabled={!canPrices}
              onChange={(e) => onExisting({ ...existing, prices: e.target.checked })}
              description={canPrices ? 'Khaali cell ka matlab: wesi hi rahe' : 'Products edit ki ijazat chahiye'} />
          </div>
        </div>
      </div>
    </div>
  );
}
