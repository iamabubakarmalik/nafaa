/**
 * "Test karein": an item, a quantity in packs and optionally a customer go
 * to the server, which prices the line on the customer's list and applies
 * the running schemes exactly as an order would. Shows the scheme that won,
 * the rupees off, the free goods and the net rate.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles, X } from 'lucide-react';
import { Input, Select, Skeleton } from '@/design-system/components';
import { DIST_KEY, distError, distSetupApi } from '../../api/distribution.api';
import { packText, partyName, rs } from '../../lib/meta';
import { num, useCustomerRoster, useDebounced } from '../shared';
import { ProductSearch, type PickedProduct } from '../ProductSearch';

export function SchemePreviewBox({ title, hint, initialProduct, note }: { title: string; hint?: string; initialProduct?: PickedProduct | null; note?: string }) {
  const [product, setProduct] = useState<PickedProduct | null>(initialProduct ?? null);
  const [qty, setQty] = useState('10');
  const [unitKey, setUnitKey] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const rosterQ = useCustomerRoster();
  // The sample item arrives with the page data; it is used once, so clearing it keeps the box empty.
  const seeded = useRef(!!initialProduct);
  useEffect(() => { if (initialProduct && !seeded.current) { seeded.current = true; setProduct(initialProduct); } }, [initialProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveQ = useQuery({
    queryKey: [DIST_KEY, 'resolve', product?.id, customerId],
    queryFn: () => distSetupApi.resolve({ productIds: [product!.id], customerId: customerId || undefined }),
    enabled: !!product,
  });
  const packs = useMemo(() => (resolveQ.data?.items ?? []).filter((i) => i.productId === product?.id && !i.variantId).sort((a, b) => a.conversionRate - b.conversionRate), [resolveQ.data, product]);
  const pack = packs.find((p) => (p.unitId ?? '') === unitKey) ?? packs[packs.length - 1];
  const q = useDebounced(num(qty) ?? 0, 300);
  const baseQty = pack ? q * pack.conversionRate : 0;

  const previewQ = useQuery({
    queryKey: [DIST_KEY, 'scheme-preview', product?.id, pack?.unitId, pack?.perBase, baseQty, customerId],
    queryFn: () => distSetupApi.schemePreview({ customerId: customerId || undefined, lines: [{ productId: product!.id, baseQty, unitPrice: pack!.perBase }] }),
    enabled: !!product && !!pack && baseQty > 0,
  });
  const r = previewQ.data?.lines[0];
  const gross = pack ? q * pack.price : 0;
  const net = gross - (r?.discount ?? 0);
  const customers = (rosterQ.data ?? []).filter((c) => c.isActive !== false).slice(0, 300);
  const baseUnit = packs[0]?.unitName ?? product?.unit ?? 'pcs';

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h3>
          {hint && <p className="text-[0.75rem] text-slate-500">{hint}</p>}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {product ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{product.name}</span>
            <button type="button" aria-label="Item badlein" onClick={() => { setProduct(null); setUnitKey(null); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
          </div>
        ) : <ProductSearch onPick={(p) => { setProduct(p); setUnitKey(null); }} placeholder="Item chunein…" />}
        <div className="grid grid-cols-2 gap-2">
          <Input size="sm" label="Qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
          <Select size="sm" label="Pack" value={pack?.unitId ?? ''} onChange={(e) => setUnitKey(e.target.value)} disabled={!packs.length}
            options={packs.length ? packs.map((p) => ({ value: p.unitId ?? '', label: p.conversionRate > 1 ? `${p.unitName} (${p.conversionRate})` : p.unitName })) : [{ value: '', label: '—' }]} />
        </div>
        {customers.length > 0 && (
          <Select size="sm" label="Customer (marzi)" value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            options={[{ value: '', label: 'Default list wala customer' }, ...customers.map((c) => ({ value: c.id, label: partyName(c) }))]} />
        )}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
        {!product ? <p className="text-center text-[0.8125rem] text-slate-500">Item chunein</p>
          : resolveQ.isLoading || previewQ.isLoading ? <Skeleton className="h-24" />
          : resolveQ.error || previewQ.error ? <p className="text-[0.8125rem] text-rose-700">{distError(resolveQ.error ?? previewQ.error)}</p>
          : !pack ? <p className="text-[0.8125rem] text-slate-500">Is item ka rate nahi mila</p>
          : (
            <div className="space-y-1.5 text-[0.8125rem]">
              <Row k={`${q} ${pack.unitName} × ${rs(pack.price)}`} v={rs(gross)} />
              {resolveQ.data?.priceListName && <p className="text-[0.6875rem] text-slate-500">Rate: {resolveQ.data.priceListName} list</p>}
              {r?.schemeId ? (<>
                <p className="flex items-center gap-1.5 pt-1 font-semibold text-violet-800"><Sparkles className="h-3.5 w-3.5" />{r.schemeName}</p>
                {r.discount > 0 && <Row k="Discount" v={`− ${rs(r.discount)}`} tone="text-success-700" />}
                {r.freeBaseQty > 0 && (
                  <p className="flex items-center gap-1.5 font-semibold text-success-700">
                    <Gift className="h-3.5 w-3.5" />{packText(r.freeBaseQty, r.freeProductId ? null : pack.conversionRate, r.freeProductId ? null : pack.unitName, baseUnit)} free{r.freeProductId ? ' (doosra item)' : ''}
                  </p>
                )}
              </>) : <p className="pt-1 text-slate-500">Is qty par koi scheme nahi lagti</p>}
              <div className="border-t border-slate-200 pt-1.5">
                <Row k="Kul" v={rs(net)} bold />
                {q > 0 && <p className="text-right text-[0.6875rem] text-slate-500">{rs(net / q)} per {pack.unitName}</p>}
              </div>
            </div>
          )}
      </div>
      {note && <p className="mt-2 text-[0.6875rem] text-slate-500">{note}</p>}
    </section>
  );
}

function Row({ k, v, tone, bold }: { k: string; v: string; tone?: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate text-slate-600">{k}</span>
      <span className={`shrink-0 tabular-nums ${bold ? 'text-[0.9375rem] font-bold text-slate-900' : 'font-semibold'} ${tone ?? 'text-slate-900'}`}>{v}</span>
    </div>
  );
}
