/**
 * Price calculator page (Online store → Price calculator). "Ek product":
 * pick a product or type a cost and see the price per channel. "Bulk": the
 * same inputs over a filtered product list, with a preview, then set the
 * Retail price or one channel's price on the ticked products.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Calculator, Layers, Package, PieChart, Search, Store, X } from 'lucide-react';
import {
  Alert, Button, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, ViewTabs, confirmDialog,
} from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';

/** Whole rupees: prices and profit per order read better without paisa. */
const rs = (n: number | null | undefined) => formatPKR(n ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { onlineProductsApi } from '@integrations/online-orders/api/online-products.api';
import { PRICE_CALC_KEY, apiError, priceCalcApi, type CalcContext, type ChannelKind } from '../api/growth.api';
import { CalcInputs, ResultCards, inputCls, useQuote } from './PriceCalculator';
import { KIND_BRAND, KIND_LABEL, initialState, num, quoteBody, type CalcState } from './meta';

type Tab = 'single' | 'bulk';

export default function PriceCalculatorPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'bulk' ? 'bulk' : 'single');
  const [productId, setProductId] = useState(params.get('productId') ?? '');
  const { costHidden } = useMasked();
  const ctxQ = useQuery({ queryKey: [PRICE_CALC_KEY, 'context', productId], queryFn: () => priceCalcApi.context(productId || undefined), placeholderData: (p) => p, staleTime: 60_000 });
  const ctx = ctxQ.data;
  const [state, setState] = useState<CalcState | null>(null);
  const set = (patch: Partial<CalcState>) => setState((s) => (s ? { ...s, ...patch } : s));

  // First load sets every input; picking another product only changes its cost and weight.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ctx || ctxQ.isPlaceholderData) return;
    const key = ctx.product?.id ?? '';
    if (!state) { setState(initialState(ctx)); loadedFor.current = key; return; }
    if (loadedFor.current !== key && ctx.product) {
      set({ cost: String(ctx.product.cost || ''), ...(ctx.product.weightKg ? { weightKg: String(ctx.product.weightKg) } : {}) });
      loadedFor.current = key;
    }
  }, [ctx, ctxQ.isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    setProductId(id);
    setParams((p) => { if (id) p.set('productId', id); else p.delete('productId'); return p; }, { replace: true });
  };

  const quote = useQuote(state, state ? num(state.cost) : null);
  const product = ctx?.product && ctx.product.id === productId ? ctx.product : null;

  return (
    <PageShell>
      <PageHero
        title="Price calculator"
        chip={<><Calculator /> Price nikalein</>}
        meta="Cost, courier, COD, channel fees, ads aur RTO — sab ke baad har channel par kitne me bechein ke Profit bache"
        busy={quote.isFetching || ctxQ.isFetching}
        loading={ctxQ.isLoading}
        stats={ctx ? [
          { label: 'Channels', value: String(ctx.channels.length || '—') },
          { label: 'RTO (90 din)', value: ctx.rto.ALL.pct != null ? `${ctx.rto.ALL.pct}%` : '—', hint: `${ctx.rto.ALL.parcels} parcel` },
          { label: 'Ads / order', value: ctx.ads.value != null ? rs(ctx.ads.value) : '—', hint: 'pichle 30 din' },
        ] : [{ label: 'Channels', value: '—' }]}
      />

      {costHidden ? (
        <Alert tone="warning">Cost aur Profit abhi chhupe hain (privacy lock). Unlock karke calculator chalayein.</Alert>
      ) : (<>
        <ViewTabs value={tab} onChange={setTab}
          tabs={[{ id: 'single', label: 'Ek product', icon: Package }, { id: 'bulk', label: 'Bulk (bohat products)', icon: Layers }]} />

        {!ctx || !state ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]"><Skeleton className="h-[36rem] rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
        ) : tab === 'single' ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <div className="space-y-3">
              <ProductPicker ctx={ctx} productId={productId} onPick={pick} />
              <CalcInputs ctx={ctx} state={state} set={set} courier={quote.data?.courier} />
            </div>
            <div className="lg:sticky lg:top-4">
              <ResultCards results={num(state.cost) ? quote.data?.results : undefined} loading={quote.isLoading} product={product} ctx={ctx}
                checkPrice={state.checkPrice} onCheckPrice={(v) => set({ checkPrice: v })} />
            </div>
          </div>
        ) : (
          <BulkView ctx={ctx} state={state} set={set} />
        )}
      </>)}
    </PageShell>
  );
}

/** Search a product to prefill its cost and see its links. */
function ProductPicker({ ctx, productId, onPick }: { ctx: CalcContext; productId: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const listQ = useQuery({
    queryKey: ['products', 'price-calc-picker', debounced],
    queryFn: () => productsApi.list({ search: debounced, limit: 8, isActive: true }),
    enabled: open && debounced.length >= 2,
  });
  const p = ctx.product && ctx.product.id === productId ? ctx.product : null;
  if (p) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Package className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">
            Cost {rs(p.cost)} · Retail {rs(p.price)}{p.links.length ? ` · ${p.links.length} channel link` : ''}
          </p>
        </div>
        <button type="button" onClick={() => onPick('')} aria-label="Product hatayein" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Product dhoondein (ya neeche Cost khud likhein)" aria-label="Product dhoondein" className={cn(inputCls, 'h-11 pl-9 text-[0.875rem]')} />
      {open && debounced.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {listQ.isLoading && <li className="px-3 py-2 text-sm text-slate-500">Dhoond rahe hain…</li>}
          {listQ.data?.items.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Koi product nahi mila</li>}
          {listQ.data?.items.map((it) => (
            <li key={it.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(it.id); setQ(''); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="truncate font-medium text-slate-800">{it.name}</span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-slate-500">{rs(Number((it as any).price ?? 0))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── bulk ───────────────────────── */

function BulkView({ ctx, state, set }: { ctx: CalcContext; state: CalcState; set: (patch: Partial<CalcState>) => void }) {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canChannel = usePermission(PERMISSIONS.ONLINE_PRODUCTS_MANAGE);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [kind, setKind] = useState<ChannelKind>(state.kinds[0] ?? 'WEBSITE');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if (!state.kinds.includes(kind) && state.kinds[0]) setKind(state.kinds[0]); }, [state.kinds, kind]);

  const catsQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const body = useMemo(() => ({ ...quoteBody(state), search: query || undefined, categoryId: categoryId || undefined, integrationId: channelId || undefined, limit: 100 }), [state, query, categoryId, channelId]);
  const [debounced, setDebounced] = useState(body);
  useEffect(() => { const t = setTimeout(() => setDebounced(body), 300); return () => clearTimeout(t); }, [body]);
  const listQ = useQuery({ queryKey: [PRICE_CALC_KEY, 'bulk', debounced], queryFn: () => priceCalcApi.bulk(debounced), placeholderData: (p) => p, enabled: debounced.channels!.length > 0 });
  const items = listQ.data?.items ?? [];
  useEffect(() => { setPicked(new Set()); }, [query, categoryId, channelId]);

  const rows = items.map((it) => ({ it, r: it.results.find((x) => x.kind === kind) ?? null }));
  const ready = rows.filter((x) => x.r?.price);
  const chosen = ready.filter((x) => picked.has(x.it.id));
  const allOn = ready.length > 0 && chosen.length === ready.length;
  const linksOf = (it: (typeof items)[number]) => it.links.filter((l) => l.kind === kind && l.canSetPrice);
  const filtered = !!query || !!categoryId || !!channelId;

  const apply = useMutation({
    mutationFn: async (target: 'RETAIL' | 'CHANNEL') => {
      let done = 0; let failed = 0;
      const jobs: Array<() => Promise<unknown>> = chosen.flatMap(({ it, r }): Array<() => Promise<unknown>> => target === 'RETAIL'
        ? [() => productsApi.update(it.id, { price: r!.price } as any)]
        : linksOf(it).map((l) => () => onlineProductsApi.setPrice(l.mappingId, r!.price)));
      // A few at a time, so a long list does not flood the server.
      for (let i = 0; i < jobs.length; i += 4) {
        const res = await Promise.allSettled(jobs.slice(i, i + 4).map((j) => j()));
        res.forEach((x) => (x.status === 'fulfilled' ? done++ : failed++));
      }
      return { done, failed };
    },
    onSuccess: ({ done, failed }) => {
      toast[failed ? 'warning' : 'success'](`${done} Price lag gayi${failed ? ` · ${failed} nahi lagi` : ''}`);
      setPicked(new Set());
      qc.invalidateQueries({ queryKey: [PRICE_CALC_KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['online-products'] });
    },
    onError: (e) => toast.error(apiError(e, 'Price nahi lagi')),
  });
  const channelLinks = chosen.reduce((s, x) => s + linksOf(x.it).length, 0);
  const ask = async (target: 'RETAIL' | 'CHANNEL') => {
    const ok = await confirmDialog(target === 'RETAIL'
      ? { title: `${chosen.length} products ki Retail price badlein?`, text: `${KIND_LABEL[kind]} ke hisaab se nikli Price Nafaa ki Retail price ban jayegi. Jo channel Nafaa ki Price lete hain un par bhi jayegi.` }
      : { title: `Sirf ${KIND_LABEL[kind]} par ${channelLinks} links ki Price lagayein?`, text: 'Nafaa ki Retail price wahi rahegi; sirf is channel par apni Price jayegi.' });
    if (ok) apply.mutate(target);
  };

  return (
    <div className="min-w-0 space-y-3">
      <CalcInputs ctx={ctx} state={state} set={set} courier={listQ.data?.courier} hideCost wide />
      <FilterBar
        search={<SearchField value={search} onChange={setSearch} placeholder="Product, SKU ya barcode…" label="Search" />}
        chips={filtered ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {categoryId && <FilterChip onRemove={() => setCategoryId('')}>{catsQ.data?.find((c) => c.id === categoryId)?.name ?? 'Category'}</FilterChip>}
          {channelId && <FilterChip onRemove={() => setChannelId('')}>{ctx.channels.find((c) => c.id === channelId)?.name ?? 'Channel'}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setCategoryId(''); setChannelId(''); }}>
        <FilterMenu icon={PieChart} label="Category" value={categoryId} active={!!categoryId} onChange={setCategoryId} width="w-72"
          options={[{ value: '', label: 'Sab categories' }, ...(catsQ.data ?? []).map((c) => ({ value: c.id, label: c.name, color: c.color }))]} />
        {ctx.channels.length > 0 && (
          <FilterMenu icon={Store} label="Channel par jura" value={channelId} active={!!channelId} onChange={setChannelId} align="right"
            options={[{ value: '', label: 'Sab products' }, ...ctx.channels.map((c) => ({ value: c.id, label: c.name }))]} />
        )}
      </FilterBar>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.8125rem] text-slate-600">Price kis channel ke hisaab se:</span>
        {state.kinds.map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 transition',
              kind === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            <BrandLogo name={KIND_BRAND[k]} size={16} />{KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {listQ.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : !items.length ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
          <Package className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-2 font-semibold text-slate-900">Is filter me koi product nahi</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-[0.8125rem]">
            <label className="inline-flex items-center gap-2 font-medium text-slate-700">
              <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(ready.map((x) => x.it.id)))} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              Sab chunein
            </label>
            <span className="text-slate-500">{listQ.data!.shown} / {listQ.data!.total} products{listQ.data!.total > listQ.data!.shown ? ' — filter se kam karein' : ''}</span>
            <span className="ml-auto flex flex-wrap gap-2">
              {canEdit && <Button size="sm" disabled={!chosen.length} loading={apply.isPending && apply.variables === 'RETAIL'} onClick={() => ask('RETAIL')}>Retail price lagao ({chosen.length})</Button>}
              {canChannel && kind !== 'WEBSITE' && (
                <Button size="sm" variant="secondary" disabled={!channelLinks} loading={apply.isPending && apply.variables === 'CHANNEL'} onClick={() => ask('CHANNEL')}>
                  Sirf {KIND_LABEL[kind]} par ({channelLinks})
                </Button>
              )}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-[0.8125rem]">
              <thead className="bg-slate-50 text-left text-[0.75rem] text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                  <th className="px-2 py-2 text-right font-medium">Abhi Price</th>
                  <th className="px-2 py-2 text-right font-medium">Break-even</th>
                  <th className="px-2 py-2 text-right font-medium">Nayi Price</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ it, r }) => {
                  const now = linksOf(it)[0]?.price ?? it.price;
                  const up = r?.price != null ? r.price - now : 0;
                  return (
                    <tr key={it.id} className={cn(picked.has(it.id) && 'bg-brand-50/50')}>
                      <td className="px-3 py-2">
                        <input type="checkbox" disabled={!r?.price} checked={picked.has(it.id)} aria-label={`${it.name} chunein`}
                          onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 disabled:opacity-40" />
                      </td>
                      <td className="max-w-[16rem] px-2 py-2">
                        <p className="truncate font-medium text-slate-900">{it.name}</p>
                        <p className="truncate text-[0.6875rem] text-slate-500">{[it.sku, it.category, linksOf(it).length ? `${linksOf(it).length} ${KIND_LABEL[kind]} link` : null].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{it.cost > 0 ? rs(it.cost) : <span className="text-amber-600">Cost nahi</span>}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{rs(now)}</td>
                      <td className={cn('px-2 py-2 text-right tabular-nums', r?.breakEven != null && now < r.breakEven ? 'font-semibold text-rose-600' : 'text-slate-600')}>
                        {r?.breakEven != null ? rs(r.breakEven) : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {r?.price != null ? (
                          <span className="font-semibold tabular-nums text-slate-900">{rs(r.price)}
                            {Math.abs(up) >= 1 && <span className={cn('ml-1 text-[0.6875rem] font-medium', up > 0 ? 'text-amber-700' : 'text-success-700')}>{up > 0 ? '+' : ''}{Math.round(up)}</span>}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-success-700">{r?.profit != null ? rs(r.profit) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[0.75rem] text-slate-500">Laal break-even ka matlab: abhi wali Price par har order me nuksan ho raha hai. Sizes wale products par ek hi Price lagti hai.</p>
    </div>
  );
}
