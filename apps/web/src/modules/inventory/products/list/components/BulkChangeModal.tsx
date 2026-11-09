/**
 * One change for the selected products: move to a category, add a supplier,
 * change a price by a percent, or add a pack (carton = 24). Each runs on the
 * server over all selected products at once.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Modal } from '@/design-system/components';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { treeOrder } from '@modules/inventory/categories/lib/tree';
import { productSuppliersApi } from '@modules/inventory/products/api/product-suppliers.api';
import { unitsPageApi } from '@modules/inventory/product-units/api/units-page.api';
import { SupplierPicker } from '@modules/inventory/products/editor/SuppliersField';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

export type BulkChange = 'category' | 'supplier' | 'price' | 'pack';

const field = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const PACKS = [{ name: 'Darjan', rate: 12, type: 'DOZEN' }, { name: 'Dabba', rate: 24, type: 'BOX' }, { name: 'Carton', rate: 48, type: 'CARTON' }, { name: 'Pack', rate: 6, type: 'PACK' }] as const;

export function BulkChangeModal({ kind, ids, onClose, onDone }: { kind: BulkChange; ids: string[]; onClose: () => void; onDone: () => void }) {
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 60_000, enabled: kind === 'category' });
  const [categoryId, setCategoryId] = useState('');
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [preferred, setPreferred] = useState(true);
  const [pct, setPct] = useState('');
  const [priceField, setPriceField] = useState<'price' | 'wholesalePrice' | 'creditPrice'>('price');
  const [roundTo, setRoundTo] = useState(1);
  const [withPacks, setWithPacks] = useState(true);
  const [pack, setPack] = useState({ name: 'Carton', rate: '24', type: 'CARTON' as string, off: '' });
  const tree = useMemo(() => treeOrder((cats.data ?? []).filter((c) => c.isActive !== false)), [cats.data]);

  const run = useMutation({
    mutationFn: async () => {
      if (kind === 'pack') {
        const r = await unitsPageApi.bulkAdd({
          productIds: ids, unitName: pack.name.trim(), conversionType: pack.type as never, conversionRate: Number(pack.rate),
          discountPercent: Number(pack.off) || undefined, roundTo: 1,
        });
        return t('{{created}} products me {{name}} jur gaya{{value}}', { created: r.created, name: pack.name.trim(), value: r.skipped ? t(' · {{skipped}} me pehle se tha', { skipped: r.skipped }) : '' });
      }
      const r = await productSuppliersApi.bulkUpdate({
        productIds: ids,
        ...(kind === 'category' && { categoryId: categoryId || 'none' }),
        ...(kind === 'supplier' && supplier && { supplierId: supplier.id, preferred }),
        ...(kind === 'price' && { pricePercent: Number(pct), priceField, roundTo, withPacks }),
      });
      return r.message;
    },
    onSuccess: (msg) => { toast.success(msg); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Nahi hua')),
  });

  const pctNum = Number(pct);
  const ready = kind === 'category' ? true
    : kind === 'supplier' ? !!supplier
      : kind === 'price' ? Number.isFinite(pctNum) && pctNum !== 0 && pctNum >= -90 && pctNum <= 500
        : !!pack.name.trim() && Number(pack.rate) > 0;
  const title = {
    category: t('{{count}} products ki category badlein', { count: ids.length }),
    supplier: t('{{count}} products me supplier jorein', { count: ids.length }),
    price: t('{{count}} products ki qeemat % se badlein', { count: ids.length }),
    pack: t('{{count}} products me packing jorein', { count: ids.length }),
  }[kind];

  return (
    <Modal open onClose={onClose} size="md" title={title}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={run.isPending} disabled={!ready} onClick={() => run.mutate()}>{t('Laagu karein')}</Button></>}>
      {kind === 'category' && (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          <button type="button" onClick={() => setCategoryId('')} className={cn('w-full rounded-xl px-3 py-2 text-start text-[0.875rem]', !categoryId ? 'bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-300' : 'hover:bg-slate-50')}>{t('Koi category nahi')}</button>
          {tree.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategoryId(c.id)} style={{ paddingInlineStart: `${0.75 + c.depth * 1.25}rem` }}
              className={cn('flex w-full items-center gap-2 rounded-xl py-2 pe-3 text-start text-[0.875rem]', categoryId === c.id ? 'bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-300' : 'hover:bg-slate-50')}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />{c.depth ? '↳ ' : ''}{c.name}
            </button>
          ))}
        </div>
      )}
      {kind === 'supplier' && (
        <div className="space-y-3">
          <SupplierPicker exclude={[]} onPick={setSupplier} />
          {supplier && <p className="rounded-xl bg-brand-50 px-3 py-2 text-[0.875rem] font-semibold text-brand-900">{supplier.name}</p>}
          <label className="flex items-center gap-2 text-[0.875rem] text-slate-700">
            <input type="checkbox" checked={preferred} onChange={(e) => setPreferred(e.target.checked)} className="h-4 w-4 rounded" />
            {t('Isay Preferred supplier banayein (purchase order isi se shuru)')}
          </label>
        </div>
      )}
      {kind === 'price' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[['price', t('Retail')], ['wholesalePrice', t('Wholesale')], ['creditPrice', t('Credit')]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setPriceField(v as typeof priceField)} aria-pressed={priceField === v}
                className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1', priceField === v ? 'bg-slate-900 text-white ring-slate-900' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>{l}</button>
            ))}
          </div>
          <label className="block text-[0.8125rem] font-medium text-slate-700">{t('Kitne % (+ barhayein, − kam karein)')}
            <input autoFocus inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.-]/g, ''))} placeholder="10" className={cn(field, 'mt-1 tabular-nums')} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[-10, -5, 5, 10, 15, 20].map((v) => <button key={v} type="button" onClick={() => setPct(String(v))} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">{v > 0 ? `+${v}` : v}%</button>)}
          </div>
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700">{t('Round karein:')}
            <select value={roundTo} onChange={(e) => setRoundTo(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 px-2">
              {[1, 5, 10, 50].map((v) => <option key={v} value={v}>{t('Rs {{value}}', { value: v })}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[0.875rem] text-slate-700">
            <input type="checkbox" checked={withPacks} onChange={(e) => setWithPacks(e.target.checked)} className="h-4 w-4 rounded" />
            {t('Packing (darjan, carton) ki qeemat bhi isi % se')}
          </label>
          <p className="text-[0.75rem] text-slate-500">{t('Jin ki yeh qeemat khaali hai woh wese hi rahengi.')}</p>
        </div>
      )}
      {kind === 'pack' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PACKS.map((p) => <button key={p.name} type="button" onClick={() => setPack({ ...pack, name: p.name, rate: String(p.rate), type: p.type })} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">{p.name} ({p.rate})</button>)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-1 text-[0.8125rem] font-medium text-slate-700">{t('Naam')}<input value={pack.name} onChange={(e) => setPack({ ...pack, name: e.target.value })} className={cn(field, 'mt-1')} /></label>
            <label className="text-[0.8125rem] font-medium text-slate-700">{t('Kitne ka ek')}<input inputMode="decimal" value={pack.rate} onChange={(e) => setPack({ ...pack, rate: e.target.value.replace(/[^\d.]/g, '') })} className={cn(field, 'mt-1 tabular-nums')} /></label>
            <label className="text-[0.8125rem] font-medium text-slate-700">{t('Discount %')}<input inputMode="decimal" value={pack.off} onChange={(e) => setPack({ ...pack, off: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" className={cn(field, 'mt-1 tabular-nums')} /></label>
          </div>
          <p className="text-[0.75rem] text-slate-500">{t('Qeemat = ek ki qeemat × kitne, Discount kam kar ke. Cost bhi isi hisaab se. Jin me yeh packing pehle se hai woh chhor di jayengi.')}</p>
        </div>
      )}
    </Modal>
  );
}
