/**
 * Order from one supplier: the supplier's catalog at this shop's own prices
 * (the supplier's price list and schemes), "Stock kam hai" suggestions from
 * the shop's low stock, and a cart priced by the supplier's server before
 * the Order is sent.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BadgePercent, Minus, Package, Plus, Send, ShoppingCart, Sparkles, Trash2, X } from 'lucide-react';
import { Alert, Button, FilterBar, FilterMenu, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Empty, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { TRADE_KEY, tradeApi, tradeError, type CartLine, type CatalogItem, type Pack } from '../api/trade.api';
import { BizAvatar } from '../components/shared';

interface CartRow { productId: string; unitId: string | null; qty: number; name: string; unitName: string; price: number; conversionRate: number }
const key = (p: string, u: string | null) => `${p}|${u ?? ''}`;

export default function OrderPage() {
  const { linkId = '' } = useParams();
  const nav = useNavigate();
  const money = useMoney();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<Map<string, CartRow>>(() => readCart(linkId));
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { setPage(1); }, [search, categoryId]);
  useEffect(() => { writeCart(linkId, cart); }, [linkId, cart]);

  const q = useQuery({
    queryKey: [TRADE_KEY, 'catalog', linkId, search.trim(), categoryId, page],
    queryFn: () => tradeApi.catalog(linkId, { search: search.trim() || undefined, categoryId: categoryId || undefined, page, limit: 40 }),
    placeholderData: keepPreviousData, retry: false,
  });
  const sug = useQuery({ queryKey: [TRADE_KEY, 'suggestions', linkId], queryFn: () => tradeApi.suggestions(linkId), retry: false, staleTime: 60_000 });

  const lines: CartLine[] = useMemo(() => [...cart.values()].map((r) => ({ productId: r.productId, unitId: r.unitId, qty: r.qty })), [cart]);
  const preview = useQuery({
    queryKey: [TRADE_KEY, 'preview', linkId, lines],
    queryFn: () => tradeApi.preview(linkId, lines),
    enabled: lines.length > 0, placeholderData: keepPreviousData, retry: false,
  });
  const place = useMutation({
    mutationFn: () => tradeApi.place({ linkId, items: lines, note: note.trim() || undefined, clientRef: crypto.randomUUID() }),
    onSuccess: (r) => {
      toast.success(`Order ${r.order.orderNumber ?? ''} bhej diya`);
      r.warnings.forEach((w) => toast.message(w));
      setCart(new Map()); setCartOpen(false); setNote('');
      nav(`/network/orders?id=${r.order.id}`);
    },
    onError: (e) => toast.error(tradeError(e)),
  });

  const set = (item: { productId: string; name: string }, pack: Pack, qty: number) => setCart((prev) => {
    const next = new Map(prev);
    const k = key(item.productId, pack.unitId);
    if (qty <= 0) next.delete(k);
    else next.set(k, { productId: item.productId, unitId: pack.unitId, qty, name: item.name, unitName: pack.unitName, price: pack.price, conversionRate: pack.conversionRate });
    return next;
  });

  const data = q.data;
  const count = cart.size;
  const total = preview.data?.total ?? [...cart.values()].reduce((s, r) => s + r.qty * r.price, 0);
  const minOrder = data?.minOrderValue ?? 0;
  const short = minOrder > 0 && total < minOrder;

  if (q.isError) {
    return (
      <PageShell>
        <PageHero back="/network" backLabel="Suppliers" title="Order" />
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Empty icon={<AlertTriangle className="h-5 w-5" />} text={tradeError(q.error, 'Catalog nahi khula')} action={<Link to="/network"><Button variant="secondary">Suppliers</Button></Link>} />
        </section>
      </PageShell>
    );
  }

  const cartPanel = (
    <CartPanel cart={cart} preview={preview.data} loading={preview.isFetching} money={money} note={note} setNote={setNote} short={short} minOrder={minOrder}
      onQty={(r, qty) => setCart((prev) => { const n = new Map(prev); const k = key(r.productId, r.unitId); if (qty <= 0) n.delete(k); else n.set(k, { ...r, qty }); return n; })}
      onClear={() => setCart(new Map())} onPlace={() => place.mutate()} placing={place.isPending} />
  );

  return (
    <PageShell className="pb-28 lg:pb-12">
      <PageHero
        back="/network" backLabel="Suppliers"
        title={data?.seller?.name ?? 'Order'}
        chip={<><ShoppingCart /> Order from supplier</>}
        meta={data ? `${data.priceListName ? `Aap ki price list: ${data.priceListName} · ` : ''}${data.total} items${minOrder ? ` · Kam se kam Order ${money(minOrder)}` : ''}` : undefined}
        loading={q.isLoading} busy={q.isFetching && !q.isLoading}
        stats={[{ label: 'Cart', value: `${count} ${count === 1 ? 'item' : 'items'}` }, { label: 'Total', value: money(total) }]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          {(sug.data?.items.length ?? 0) > 0 && (
            <section className="rounded-3xl bg-amber-50/70 p-4 ring-1 ring-amber-200 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-amber-900"><Sparkles className="h-4 w-4" /> Stock kam hai</h2>
                <Button size="sm" variant="secondary" onClick={() => {
                  setCart((prev) => {
                    const n = new Map(prev);
                    for (const s of sug.data!.items) {
                      const k = key(s.seller.productId, s.suggest.unitId);
                      if (!n.has(k)) n.set(k, { productId: s.seller.productId, unitId: s.suggest.unitId, qty: s.suggest.qty, name: s.seller.name, unitName: s.suggest.unitName, price: s.suggest.price, conversionRate: s.suggest.conversionRate });
                    }
                    return n;
                  });
                  toast.success('Kam stock wale items cart me daal diye');
                }}>Add all</Button>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {sug.data!.items.slice(0, 8).map((s) => (
                  <li key={s.mine.productId} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-amber-100">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{s.seller.name}</span>
                      <span className="block truncate text-[0.6875rem] text-slate-500">Aap ke paas {s.mine.stock} {s.mine.unit} · had {s.mine.lowStockAlert}</span>
                    </span>
                    <span className="shrink-0 text-[0.75rem] font-semibold text-amber-800">{s.suggest.qty} {s.suggest.unitName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Item ka naam, SKU ya barcode" />}>
            <FilterMenu icon={Package} label="Category" value={categoryId} active={!!categoryId} valueLabel={data?.categories.find((c) => c.id === categoryId)?.name}
              options={[{ value: '', label: 'Sab categories' }, ...(data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} onChange={setCategoryId} />
          </FilterBar>

          {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
            : !data?.items.length ? <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><Empty icon={<Package className="h-5 w-5" />} text="Is talaash me koi item nahi." /></section>
              : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((it) => <ItemCard key={it.productId} item={it} cart={cart} onSet={set} money={money} />)}
                </div>
              )}
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between text-[0.8125rem] text-slate-600">
              <span>{(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} / {data.total}</span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
              </span>
            </div>
          )}
        </div>
        <aside className="hidden lg:block"><div className="sticky top-4">{cartPanel}</div></aside>
      </div>

      {/* Phone: cart bar */}
      <div className="fixed bottom-3 left-3 right-20 z-20 lg:hidden">
        <button type="button" onClick={() => setCartOpen(true)} disabled={!count}
          className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-white shadow-lg disabled:opacity-70">
          <ShoppingCart className="h-5 w-5" />
          <span className="flex-1 text-[0.875rem] font-semibold">{count ? `${count} items` : 'Cart khali hai'}</span>
          <span className="text-[0.9375rem] font-bold tabular-nums">{money(total)}</span>
        </button>
      </div>
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Cart" size="lg">{cartPanel}</Modal>
    </PageShell>
  );
}

function ItemCard({ item, cart, onSet, money }: { item: CatalogItem; cart: Map<string, CartRow>; onSet: (i: CatalogItem, p: Pack, q: number) => void; money: (n: number) => string }) {
  const [packIdx, setPackIdx] = useState(() => Math.max(0, item.packs.length - 1));
  const pack = item.packs[packIdx] ?? item.packs[0];
  if (!pack) return null;
  const inCart = cart.get(key(item.productId, pack.unitId))?.qty ?? 0;
  return (
    <article className={cn('flex flex-col rounded-3xl bg-white p-3 shadow-sm ring-1 transition sm:p-4', inCart ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
      <div className="flex gap-3">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200" />
          : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Package className="h-6 w-6" /></span>}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[0.875rem] font-semibold leading-snug text-slate-900">{item.name}</h3>
          <div className="mt-0.5 truncate text-[0.6875rem] text-slate-500">{[item.brandName, item.sku].filter(Boolean).join(' · ') || ' '}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {!item.inStock && <Pill tone="rose">Supplier ke paas khatam</Pill>}
        {item.schemes.slice(0, 2).map((s) => <Pill key={s.id} tone="green" className="gap-1"><BadgePercent className="h-3 w-3" />{s.label}</Pill>)}
        {item.mine && <Pill tone={item.mine.low ? 'amber' : 'slate'}>Aap ke paas {item.mine.stock}</Pill>}
      </div>
      {item.packs.length > 1 && (
        <div className="mt-2 inline-flex self-start rounded-lg bg-slate-100 p-0.5">
          {item.packs.map((p, i) => (
            <button key={p.unitId ?? 'base'} type="button" onClick={() => setPackIdx(i)}
              className={cn('rounded-md px-2 py-1 text-[0.75rem] font-semibold', i === packIdx ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
              {p.unitName}{p.conversionRate > 1 ? ` (${p.conversionRate})` : ''}
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto space-y-2 pt-3">
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[1rem] font-bold tabular-nums text-slate-900">{money(pack.price)}<span className="text-[0.75rem] font-normal text-slate-500"> / {pack.unitName}</span></div>
          {pack.retail > pack.price && <div className="whitespace-nowrap text-[0.6875rem] text-slate-500">Retail {money(pack.retail)}</div>}
        </div>
        {inCart ? (
          <div className="flex items-center justify-between gap-1 rounded-xl bg-slate-100 p-1">
            <button type="button" aria-label="Kam" onClick={() => onSet(item, pack, inCart - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"><Minus className="h-4 w-4" /></button>
            <input aria-label="Quantity" inputMode="decimal" value={inCart} onChange={(e) => onSet(item, pack, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              className="h-8 min-w-0 flex-1 rounded-lg bg-transparent text-center text-[0.875rem] font-semibold tabular-nums outline-none" />
            <button type="button" aria-label="Zyada" onClick={() => onSet(item, pack, inCart + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"><Plus className="h-4 w-4" /></button>
          </div>
        ) : <Button size="sm" fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={() => onSet(item, pack, 1)}>Add</Button>}
      </div>
    </article>
  );
}

function CartPanel({ cart, preview, loading, money, note, setNote, short, minOrder, onQty, onClear, onPlace, placing }: {
  cart: Map<string, CartRow>; preview?: Awaited<ReturnType<typeof tradeApi.preview>>; loading: boolean; money: (n: number) => string;
  note: string; setNote: (v: string) => void; short: boolean; minOrder: number;
  onQty: (r: CartRow, q: number) => void; onClear: () => void; onPlace: () => void; placing: boolean;
}) {
  const rows = [...cart.values()];
  const priced = (r: CartRow) => preview?.lines.find((l) => l.productId === r.productId && (l.unitId ?? null) === r.unitId);
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="flex items-center justify-between px-4 pt-4 sm:px-5">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><ShoppingCart className="h-4 w-4" /> Cart</h2>
        {rows.length > 0 && <button type="button" onClick={onClear} className="text-[0.75rem] font-medium text-slate-500 hover:text-rose-600">Clear</button>}
      </header>
      {!rows.length ? <Empty icon={<ShoppingCart className="h-5 w-5" />} text="Items ke saamne 'Daalein' dabayein." /> : (
        <>
          <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto px-4 sm:px-5">
            {rows.map((r) => {
              const l = priced(r);
              return (
                <li key={key(r.productId, r.unitId)} className="py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{r.name}</span>
                      <span className="block text-[0.75rem] text-slate-500">{r.qty} {r.unitName} × {money(l?.price ?? r.price)}</span>
                      {l?.schemeNote && <span className="block text-[0.6875rem] font-medium text-success-700">{l.schemeNote}{l.freeBaseQty > 0 ? ` · ${l.freeBaseQty} free` : ''}</span>}
                    </span>
                    <span className="text-right text-[0.8125rem] font-semibold tabular-nums text-slate-900">{money(l?.total ?? r.qty * r.price)}</span>
                    <button type="button" aria-label="Hatayein" onClick={() => onQty(r, 0)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 border-t border-slate-100 px-4 py-3 text-[0.8125rem] sm:px-5">
            <div className="flex justify-between text-slate-600"><span>Items</span><span className="tabular-nums">{money(preview?.subtotal ?? 0)}</span></div>
            {(preview?.schemeDiscount ?? 0) > 0 && <div className="flex justify-between text-success-700"><span>Scheme</span><span className="tabular-nums">− {money(preview!.schemeDiscount)}</span></div>}
            <div className={cn('flex justify-between text-[1rem] font-bold text-slate-900', loading && 'opacity-60')}><span>Total</span><span className="tabular-nums">{money(preview?.total ?? 0)}</span></div>
          </div>
          {preview?.warnings.length ? <div className="px-4 sm:px-5"><Alert tone="warning">{preview.warnings[0]}</Alert></div> : null}
          <div className="space-y-3 px-4 pb-4 pt-1 sm:px-5">
            <Textarea rows={2} placeholder="Supplier ke liye note (marzi)" value={note} onChange={(e) => setNote(e.target.value)} />
            {short && <p className="text-[0.75rem] font-medium text-amber-700">Kam se kam Order {money(minOrder)} ka hona chahiye.</p>}
            <Button fullWidth size="lg" leftIcon={<Send className="h-4 w-4" />} loading={placing} disabled={short || !preview?.lines.length} onClick={onPlace}>Send order</Button>
            <p className="text-center text-[0.6875rem] text-slate-500">Final price supplier ki Invoice par lagti hai.</p>
          </div>
        </>
      )}
    </section>
  );
}

/* The cart survives a reload or a trip to another page, per supplier. */
function readCart(linkId: string): Map<string, CartRow> {
  try {
    const raw = JSON.parse(localStorage.getItem(`nafaa-trade-cart-${linkId}`) || '[]') as CartRow[];
    return new Map(raw.map((r) => [key(r.productId, r.unitId), r]));
  } catch { return new Map(); }
}
function writeCart(linkId: string, cart: Map<string, CartRow>) {
  try { localStorage.setItem(`nafaa-trade-cart-${linkId}`, JSON.stringify([...cart.values()])); } catch { /* storage off */ }
}

export const CloseIcon = X;
