/**
 * Order items editor shared by Edit order and Add order: quantity, price and
 * remove per line, add a product through the product picker, link a line
 * that is not tied to a Nafaa product, and the live totals box.
 */

import { Link2, Package, Trash2 } from 'lucide-react';
import { controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductPicker, type PickedProduct } from '../products/ProductPicker';
import { t } from '@core/i18n';

export interface ItemLine {
  key: string;
  productId?: string | null;
  variantId?: string | null;
  name: string;
  sku?: string | null;
  variant?: string | null;
  quantity: number;
  price: number;
  image?: string | null;
}

let seq = 0;
export const lineKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export const lineFromPick = (p: PickedProduct, quantity = 1): ItemLine => ({
  key: lineKey(), productId: p.productId, variantId: p.variantId, name: p.name ?? p.label, variant: p.variantName ?? null,
  sku: p.sku ?? null, price: p.price ?? 0, quantity, image: p.image ?? null,
});

export const subtotalOf = (items: ItemLine[]) => items.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

const num = cn(controlClass(), 'h-9 px-2.5 text-[0.875rem] tabular-nums');

export function ItemsEditor({ items, onChange, money, requireProduct }: {
  items: ItemLine[];
  onChange: (items: ItemLine[]) => void;
  money: (n: number) => string;
  /** Every line must be a Nafaa product (manual orders). */
  requireProduct?: boolean;
}) {
  const patch = (key: string, p: Partial<ItemLine>) => onChange(items.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const add = (p: PickedProduct) => {
    const same = items.find((i) => i.productId === p.productId && (i.variantId ?? null) === (p.variantId ?? null));
    if (same) patch(same.key, { quantity: Number(same.quantity) + 1 });
    else onChange([...items, lineFromPick(p)]);
  };

  return (
    <div className="space-y-2">
      {!items.length && <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.8125rem] text-slate-500 ring-1 ring-slate-100">{t('Abhi koi cheez nahi — neeche se product jorein')}</p>}
      {items.map((it) => {
        const unlinked = !it.productId;
        return (
          <div key={it.key} className={cn('flex flex-wrap items-center gap-2.5 rounded-xl p-2.5 ring-1', unlinked && requireProduct ? 'bg-amber-50/60 ring-amber-200' : 'ring-slate-200')}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-slate-400" />}
            </span>
            <div className="min-w-0 flex-[1_1_12rem]">
              <p className="truncate text-[0.875rem] font-medium text-slate-900">{it.name}{it.variant ? <span className="text-slate-500"> · {it.variant}</span> : null}</p>
              {unlinked ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1"><ProductPicker compact initialSearch={it.name} placeholder={t('Nafaa product se jorein')}
                    onPick={(p) => patch(it.key, { productId: p.productId, variantId: p.variantId, image: it.image ?? p.image ?? null })} /></div>
                </div>
              ) : it.sku ? <p className="text-[0.75rem] text-slate-500">{t('SKU {{sku}}', { sku: it.sku })}</p> : null}
            </div>
            <label className="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
              {t('Qty')}
              <input type="number" min={1} step="any" inputMode="decimal" value={it.quantity} aria-label={t('Qty')}
                onChange={(e) => patch(it.key, { quantity: Math.max(0, Number(e.target.value)) })} className={cn(num, 'w-20')} />
            </label>
            <label className="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
              {t('Price')}
              <input type="number" min={0} step="any" inputMode="decimal" value={it.price} aria-label={t('Price')}
                onChange={(e) => patch(it.key, { price: Math.max(0, Number(e.target.value)) })} className={cn(num, 'w-28')} />
            </label>
            <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{money((Number(it.quantity) || 0) * (Number(it.price) || 0))}</span>
            <button type="button" onClick={() => onChange(items.filter((i) => i.key !== it.key))} aria-label={t('Hatayein')}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        );
      })}
      <ProductPicker onPick={add} placeholder={t('Cheez jorein — naam, SKU ya barcode')} />
    </div>
  );
}

export function TotalsBox({ subtotal, discount, deliveryFee, money, advance }: {
  subtotal: number; discount: number; deliveryFee: number; money: (n: number) => string; advance?: number;
}) {
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const row = 'flex items-center justify-between text-[0.875rem]';
  return (
    <div className="space-y-1.5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className={row}><span className="text-slate-500">{t('Cheezein')}</span><span className="tabular-nums text-slate-800">{money(subtotal)}</span></div>
      {discount > 0 && <div className={row}><span className="text-slate-500">{t('Discount')}</span><span className="tabular-nums text-rose-600">− {money(discount)}</span></div>}
      {deliveryFee > 0 && <div className={row}><span className="text-slate-500">{t('Delivery charges')}</span><span className="tabular-nums text-slate-800">{money(deliveryFee)}</span></div>}
      <div className={cn(row, 'border-t border-slate-200 pt-2 text-[1rem] font-bold')}><span className="text-slate-900">{t('Total')}</span><span className="tabular-nums text-slate-900">{money(total)}</span></div>
      {!!advance && advance > 0 && (
        <div className={cn(row, 'text-[0.8125rem]')}><span className="text-slate-500">{t('COD (advance ke baad)')}</span><span className="font-semibold tabular-nums text-orange-700">{money(Math.max(0, total - advance))}</span></div>
      )}
    </div>
  );
}
