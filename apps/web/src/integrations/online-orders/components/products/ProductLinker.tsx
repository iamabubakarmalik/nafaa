import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Check, ChevronDown, ChevronRight, CloudDownload, CloudUpload, Link2, Link2Off, Package,
  RefreshCw, Search, Sparkles, TriangleAlert,
} from 'lucide-react';
import {
  apiErrorMessage, onlineOrdersApi, type CatalogProduct, type CatalogVariant, type LinkInput,
} from '../../api/online-orders.api';
import { rs, timeAgo } from '../../lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Segmented, inputCls } from '../ui/kit';
import { ProductPicker, type PickedProduct } from './ProductPicker';
import { cn } from '@core/lib/cn';

type View = 'website' | 'nafaa';
type Filter = 'all' | 'todo' | 'linked';

/**
 * Products ⇄ website: har website product aur us ke har variant ke saamne
 * Nafaa ka product/variant — jora hua, salah, ya chunna baqi.
 * Stock ka malik Nafaa: jora hua variant ka stock Nafaa se website par jata hai.
 */
export function ProductLinker({ channelId, siteName }: { channelId: string; siteName: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<View>('website');
  const key = ['channel-catalog', channelId];
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => onlineOrdersApi.catalog(channelId),
    staleTime: 60_000,
  });

  const refresh = useMutation({
    mutationFn: () => onlineOrdersApi.catalog(channelId, true),
    onSuccess: (d) => { qc.setQueryData(key, d); toast.success('Website se taaza list aa gayi'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['sales-channel', channelId] });
  };

  if (isLoading) {
    return <Card><div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div></Card>;
  }
  if (error || !data) {
    return <Banner tone="critical" title="Products nahi khule">{apiErrorMessage(error)}</Banner>;
  }

  const s = data.stats;
  const pct = s.variants ? Math.round((s.linked / s.variants) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ─── Khulasa ─── */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[14px] font-semibold text-slate-900 dark:text-white">
                {data.canFetch ? `${s.linked} / ${s.variants} jure hue` : 'Jore hue products'}
              </div>
              {data.canFetch && <div className="text-[12.5px] font-semibold tabular-nums text-slate-500">{pct}%</div>}
            </div>
            {data.canFetch && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              <Badge tone="success" dot>{s.linked} jure</Badge>
              {s.suggested > 0 && <Badge tone="warning" dot>{s.suggested} salah</Badge>}
              {s.unlinked > 0 && <Badge tone="neutral" dot>{s.unlinked} baqi</Badge>}
              {data.kind !== 'indolj' && <Badge tone="info">{s.nafaaUnlisted} Nafaa me, website par nahi</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.canFetch && (
              <Btn size="sm" variant="secondary" loading={refresh.isPending || isFetching} onClick={() => refresh.mutate()} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                Website se taaza
              </Btn>
            )}
            {s.suggested > 0 && <AcceptAll channelId={channelId} products={data.products} onDone={invalidate} />}
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-slate-500">
          {data.kind === 'indolj'
            ? <>🍪 <b>Indolj ka menu</b> — har item ko Nafaa product se jorein, phir Indolj ka har order khud bill banata aur stock kam karta hai. Menu / qeemat Indolj ke panel se badalti hai.</>
            : <>📦 <b>Stock ka malik Nafaa hai</b> — jora hua har variant ka stock Nafaa (branch) se {siteName} par jata hai: har 15 minute, aur har accept/cancel par foran.</>}
          {data.canFetch && ` · List ${timeAgo(data.fetchedAt)} ki`}
        </p>
      </Card>

      {data.remoteError && (
        <Banner tone="critical" icon={<TriangleAlert className="h-4 w-4 text-rose-600" />} title="Website ke products nahi aaye"
          action={<Btn size="sm" onClick={() => refetch()}>Dobara</Btn>}>{data.remoteError}</Banner>
      )}

      {data.orphans.length > 0 && <Orphans channelId={channelId} orphans={data.orphans} onDone={invalidate} />}

      {!data.canFetch ? (
        <>
          <IndoljConnect channelId={channelId} onDone={invalidate} />
          <CustomLinks channelId={channelId} links={data.links} onDone={invalidate} />
        </>
      ) : data.kind === 'indolj' ? (
        <>
          <WebsiteList channelId={channelId} products={data.products} onDone={invalidate} />
          <IndoljConnect channelId={channelId} onDone={invalidate} connected />
        </>
      ) : (
        <>
          <Segmented value={view} onChange={setView} items={[
            { value: 'website', label: `${siteName} ke products`, count: s.products },
            { value: 'nafaa', label: 'Nafaa ke products (website par nahi)', count: s.nafaaUnlisted },
          ]} />
          {view === 'website'
            ? <WebsiteList channelId={channelId} products={data.products} onDone={invalidate} />
            : <NafaaUnlisted channelId={channelId} siteName={siteName} onDone={invalidate} />}
        </>
      )}
    </div>
  );
}

/* ═════════════════════ Website ke products ═════════════════════ */

function WebsiteList({ channelId, products, onDone }: { channelId: string; products: CatalogProduct[]; onDone: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const importMut = useMutation({
    mutationFn: (ids: string[]) => onlineOrdersApi.importSelected(channelId, ids),
    onSuccess: (r) => {
      onDone();
      setPicked(new Set());
      toast.success(`${r.created} naye Nafaa products bane${r.linkedExisting ? `, ${r.linkedExisting} pehle walon se jure` : ''}`);
      if (r.errors[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const counts = useMemo(() => {
    let todo = 0; let linked = 0;
    for (const p of products) {
      const all = p.variants.every((v) => v.link);
      if (all) linked++; else todo++;
    }
    return { all: products.length, todo, linked };
  }, [products]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const all = p.variants.every((v) => v.link);
      if (filter === 'todo' && all) return false;
      if (filter === 'linked' && !all) return false;
      if (!term) return true;
      return p.title.toLowerCase().includes(term) || p.variants.some((v) => (v.sku ?? '').toLowerCase().includes(term) || v.title.toLowerCase().includes(term));
    });
  }, [products, filter, q]);

  const toggleOpen = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const unlinkedIds = rows.filter((p) => p.variants.every((v) => !v.link)).map((p) => p.externalProductId);

  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <Segmented value={filter} onChange={setFilter} items={[
          { value: 'all', label: 'Sab', count: counts.all },
          { value: 'todo', label: 'Jorna baqi', count: counts.todo },
          { value: 'linked', label: 'Jure hue', count: counts.linked },
        ]} />
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam ya SKU…" className={cn(inputCls, 'pl-8')} />
        </div>
      </div>

      {picked.size > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white sm:mx-5 dark:bg-slate-800">
          <span className="text-[13px] font-semibold">{picked.size} chune</span>
          <span className="text-[12px] text-white/70">— Nafaa me naye products (variants aur stock ke saath) ban jayenge aur jur jayenge</span>
          <span className="flex-1" />
          <Btn size="sm" variant="plain" className="text-white hover:bg-white/10" onClick={() => setPicked(new Set())}>Chhoro</Btn>
          <Btn size="sm" variant="success" loading={importMut.isPending} onClick={() => importMut.mutate([...picked])} icon={<CloudDownload className="h-3.5 w-3.5" />}>
            Nafaa me lao
          </Btn>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 dark:border-slate-800">
        {/* sar-khat */}
        <div className="hidden grid-cols-[28px_minmax(0,1.3fr)_minmax(0,0.7fr)_24px_minmax(0,1.4fr)] items-center gap-3 bg-slate-50 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40 md:grid sm:px-5">
          <input type="checkbox" aria-label="Sab jorne baqi chuno" className="h-4 w-4 rounded border-slate-300"
            checked={unlinkedIds.length > 0 && unlinkedIds.every((id) => picked.has(id))}
            onChange={(e) => setPicked(e.target.checked ? new Set(unlinkedIds) : new Set())} />
          <span>Website product</span>
          <span>SKU · qeemat · stock</span>
          <span />
          <span>Nafaa me</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title={products.length ? 'Is chaant me kuch nahi' : 'Website par koi product nahi mila'}>
            {products.length ? 'Filter badal kar dekhein.' : '"Nafaa ke products" tab se apne products website par bhej sakte hain.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((p) => {
              const linkedCount = p.variants.filter((v) => v.link).length;
              const allLinked = linkedCount === p.variants.length;
              const noneLinked = linkedCount === 0;
              const expanded = open.has(p.externalProductId) || (!p.hasVariants);
              return (
                <li key={p.externalProductId}>
                  {p.hasVariants ? (
                    <div className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,0.7fr)_24px_minmax(0,1.4fr)] sm:px-5">
                      <input type="checkbox" disabled={!noneLinked} checked={picked.has(p.externalProductId)} onChange={() => togglePick(p.externalProductId)}
                        className="h-4 w-4 rounded border-slate-300 disabled:opacity-30" aria-label={`${p.title} chuno`} />
                      <button onClick={() => toggleOpen(p.externalProductId)} className="flex min-w-0 items-center gap-2.5 text-left">
                        {open.has(p.externalProductId) ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                        <Thumb src={p.image} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{p.title}</span>
                          <span className="text-[12px] text-slate-500">{p.variants.length} variants · {p.status}</span>
                        </span>
                      </button>
                      <span className="hidden text-[12.5px] text-slate-500 md:block">—</span>
                      <span className="hidden md:block" />
                      <span className="col-start-2 md:col-start-auto">
                        <Badge tone={allLinked ? 'success' : noneLinked ? 'neutral' : 'warning'} dot>
                          {allLinked ? 'Sab variants jure' : `${linkedCount}/${p.variants.length} variants jure`}
                        </Badge>
                      </span>
                    </div>
                  ) : null}

                  {expanded && p.variants.map((v, idx) => (
                    <VariantRow key={v.externalVariantId ?? `p-${idx}`} channelId={channelId} product={p} variant={v}
                      nested={p.hasVariants} picked={picked.has(p.externalProductId)}
                      onTogglePick={() => togglePick(p.externalProductId)} onDone={onDone} />
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function VariantRow({ channelId, product, variant: v, nested, picked, onTogglePick, onDone }: {
  channelId: string; product: CatalogProduct; variant: CatalogVariant; nested: boolean;
  picked: boolean; onTogglePick: () => void; onDone: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const title = nested ? `${product.title} — ${v.title}` : product.title;

  const link = useMutation({
    mutationFn: (p: PickedProduct) => onlineOrdersApi.saveLinks(channelId, [toLink(product, v, p)]),
    onSuccess: (r) => { setChanging(false); onDone(); if (r.errors[0]) toast.error(r.errors[0]); else toast.success('Jor diya ✓'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: () => onlineOrdersApi.removeLink(channelId, v.link!.mappingId),
    onSuccess: () => { onDone(); toast.success('Link hata diya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className={cn('grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,0.7fr)_24px_minmax(0,1.4fr)] sm:px-5',
      nested && 'bg-slate-50/50 dark:bg-slate-800/20')}>
      {nested ? <span /> : (
        <input type="checkbox" disabled={!!v.link} checked={picked} onChange={onTogglePick}
          className="h-4 w-4 rounded border-slate-300 disabled:opacity-30" aria-label={`${product.title} chuno`} />
      )}
      <div className={cn('flex min-w-0 items-center gap-2.5', nested && 'pl-6')}>
        {!nested && <Thumb src={v.image ?? product.image} />}
        <span className="min-w-0">
          <span className={cn('block truncate text-slate-900 dark:text-white', nested ? 'text-[13px] font-medium' : 'text-[13.5px] font-semibold')}>
            {nested ? v.title : product.title}
          </span>
          {!nested && <span className="text-[12px] text-slate-500">{product.status}</span>}
        </span>
      </div>
      <div className="col-start-2 text-[12.5px] text-slate-600 dark:text-slate-300 md:col-start-auto">
        <span className="font-mono text-[12px]">{v.sku || '— SKU nahi'}</span>
        <span className="text-slate-400"> · </span>{rs(v.price)}
        <span className="text-slate-400"> · </span>{v.stock === null ? 'stock track nahi' : `stock ${v.stock}`}
      </div>
      <ArrowRight className="hidden h-4 w-4 text-slate-300 md:block" />

      <div className="col-start-2 min-w-0 md:col-start-auto">
        {v.link && !changing ? (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15"><Check className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">
                {v.link.name}{v.link.variantName ? <span className="text-slate-500"> — {v.link.variantName}</span> : null}
              </span>
              <span className="text-[12px] text-slate-500">
                Nafaa stock <b className={cn(v.link.stock <= 0 && 'text-rose-600')}>{v.link.stock}</b>
                {v.stock !== null && v.stock !== v.link.stock && <span className="text-amber-600"> · website par {v.stock} (agli sync me barabar)</span>}
                {v.link.inactive && <span className="text-rose-600"> · Nafaa me band</span>}
              </span>
            </span>
            <Btn size="sm" variant="plain" onClick={() => setChanging(true)}>Badlo</Btn>
            <Btn size="sm" variant="plain" loading={unlink.isPending} onClick={() => unlink.mutate()} icon={<Link2Off className="h-3.5 w-3.5" />} aria-label="Link hatao" />
          </div>
        ) : v.suggestion && !changing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-700 dark:text-amber-300"><Sparkles className="h-3.5 w-3.5" /> Salah ({v.suggestion.reason === 'sku' ? 'SKU mila' : 'naam mila'})</span>
              <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">
                {v.suggestion.name}{v.suggestion.variantName ? <span className="text-slate-500"> — {v.suggestion.variantName}</span> : null}
              </span>
            </span>
            <Btn size="sm" variant="primary" loading={link.isPending}
              onClick={() => link.mutate({ productId: v.suggestion!.productId, variantId: v.suggestion!.variantId, label: v.suggestion!.name })}
              icon={<Link2 className="h-3.5 w-3.5" />}>Jorein</Btn>
            <Btn size="sm" variant="plain" onClick={() => setChanging(true)}>Aur chuno</Btn>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <ProductPicker compact initialSearch={product.title.split(/\s+/).slice(0, 2).join(' ')} onPick={(p) => link.mutate(p)}
                placeholder={link.isPending ? 'Jor rahe hain…' : 'Nafaa product / variant chunein'} />
            </div>
            {changing && <Btn size="sm" variant="plain" onClick={() => setChanging(false)}>Wapas</Btn>}
          </div>
        )}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}

function toLink(p: CatalogProduct, v: CatalogVariant, picked: { productId: string; variantId: string | null }): LinkInput {
  return {
    externalProductId: p.externalProductId,
    externalVariantId: v.externalVariantId,
    productId: picked.productId,
    variantId: picked.variantId,
    externalTitle: p.hasVariants ? `${p.title} — ${v.title}` : p.title,
    externalImage: v.image ?? p.image,
    externalSku: v.sku,
  };
}

function AcceptAll({ channelId, products, onDone }: { channelId: string; products: CatalogProduct[]; onDone: () => void }) {
  const links = products.flatMap((p) => p.variants.filter((v) => !v.link && v.suggestion).map((v) => toLink(p, v, v.suggestion!)));
  const m = useMutation({
    mutationFn: () => onlineOrdersApi.saveLinks(channelId, links),
    onSuccess: (r) => { onDone(); toast.success(`${r.saved} jor diye ✓`); if (r.errors[0]) toast.error(r.errors[0]); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Btn size="sm" variant="primary" loading={m.isPending} onClick={() => m.mutate()} icon={<Sparkles className="h-3.5 w-3.5" />}>
      Sab {links.length} salahen qubool
    </Btn>
  );
}

/* ═════════════════════ Nafaa → website ═════════════════════ */

function NafaaUnlisted({ channelId, siteName, onDone }: { channelId: string; siteName: string; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['channel-unlisted', channelId, debounced],
    queryFn: () => onlineOrdersApi.unlisted(channelId, debounced || undefined),
  });
  const qc = useQueryClient();
  const send = useMutation({
    mutationFn: () => onlineOrdersApi.exportSelected(channelId, [...picked]),
    onSuccess: (r) => {
      setPicked(new Set());
      onDone();
      qc.invalidateQueries({ queryKey: ['channel-unlisted', channelId] });
      toast.success(`${siteName} par ${r.created} naye products bane${r.updated ? `, ${r.updated} update` : ''}`);
      if (r.errors?.[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const items = data ?? [];
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nafaa product dhoondein…" className={cn(inputCls, 'pl-8')} />
        </div>
        <Btn variant="success" disabled={!picked.size} loading={send.isPending} onClick={() => send.mutate()} icon={<CloudUpload className="h-4 w-4" />}>
          {picked.size ? `${picked.size} ${siteName} par bhejo` : `${siteName} par bhejo`}
        </Btn>
      </div>
      <p className="mt-2 px-4 text-[12.5px] text-slate-500 sm:px-5">
        Naam, qeemat, tasveerein, variants aur Nafaa ka stock website par ban jayega — aur har variant khud jur jayega.
      </p>
      <div className="mt-3 border-t border-slate-100 dark:border-slate-800">
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Check className="h-5 w-5" />} title="Sab products website par hain">Nafaa ka har active product is website se jura hua hai.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            <li className="flex items-center gap-3 bg-slate-50 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40 sm:px-5">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={items.length > 0 && items.every((p) => picked.has(p.id))}
                onChange={(e) => setPicked(e.target.checked ? new Set(items.map((p) => p.id)) : new Set())} aria-label="Sab chuno" />
              <span className="flex-1">Nafaa product</span>
              <span className="w-28 text-right">Stock</span>
              <span className="w-24 text-right">Qeemat</span>
            </li>
            {items.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                  <Thumb src={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{p.name}</span>
                    <span className="text-[12px] text-slate-500">
                      {p.sku ? `SKU ${p.sku}` : 'SKU nahi'}{p.category ? ` · ${p.category}` : ''}
                      {p.variants.length > 0 && ` · ${p.variants.length} variants (${p.variants.slice(0, 4).map((v) => v.name).join(', ')}${p.variants.length > 4 ? '…' : ''})`}
                    </span>
                  </span>
                  <span className={cn('w-28 text-right text-[13px] tabular-nums', p.stock <= 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200')}>{p.stock}</span>
                  <span className="w-24 text-right text-[13px] font-medium tabular-nums text-slate-900 dark:text-white">{rs(p.price)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ═════════════════════ Chhote hisse ═════════════════════ */

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

function Orphans({ channelId, orphans, onDone }: { channelId: string; orphans: { mappingId: string; externalTitle: string | null; name: string; variantName: string | null }[]; onDone: () => void }) {
  const m = useMutation({
    mutationFn: async () => { for (const o of orphans) await onlineOrdersApi.removeLink(channelId, o.mappingId); },
    onSuccess: () => { onDone(); toast.success('Purane links saaf'); },
  });
  return (
    <Banner tone="warning" icon={<TriangleAlert className="h-4 w-4 text-amber-600" />}
      title={`${orphans.length} link aise hain jin ka product website par ab nahi`}
      action={<Btn size="sm" loading={m.isPending} onClick={() => m.mutate()}>Saaf karo</Btn>}>
      {orphans.slice(0, 3).map((o) => `${o.externalTitle ?? '—'} → ${o.name}${o.variantName ? ` (${o.variantName})` : ''}`).join(' · ')}
      {orphans.length > 3 ? ' …' : ''}
    </Banner>
  );
}

/** Apni banayi website: us ke products hum nahi dekh sakte — bane hue links + orders se khud bante hain */
function CustomLinks({ channelId, links, onDone }: { channelId: string; links: { mappingId: string; externalProductId: string | null; externalSku: string | null; externalTitle: string | null; name: string; variantName: string | null; stock: number }[]; onDone: () => void }) {
  const unlink = useMutation({
    mutationFn: (id: string) => onlineOrdersApi.removeLink(channelId, id),
    onSuccess: () => { onDone(); toast.success('Link hata diya'); },
  });
  return (
    <Card title="Jore hue products" description="Apni banayi website ke products hum khud nahi dekh sakte. Order me pehli dafa product jorte hi yahan aa jata hai — ya Developer tab se CSV import karein.">
      {links.length === 0 ? (
        <EmptyState icon={<Link2 className="h-5 w-5" />} title="Abhi koi link nahi">Website se order aaye ya CSV import karein — products khud jurte jayenge.</EmptyState>
      ) : (
        <ul className="-my-2 divide-y divide-slate-100 dark:divide-slate-800">
          {links.map((l) => (
            <li key={l.mappingId} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 text-[13px]">
                <span className="font-medium text-slate-900 dark:text-white">{l.externalTitle ?? l.externalSku ?? l.externalProductId}</span>
                <span className="text-slate-400"> → </span>
                <span className="text-slate-700 dark:text-slate-200">{l.name}{l.variantName ? ` — ${l.variantName}` : ''}</span>
                <span className="text-slate-500"> · stock {l.stock}</span>
              </span>
              <Btn size="sm" variant="plain" loading={unlink.isPending && unlink.variables === l.mappingId} onClick={() => unlink.mutate(l.mappingId)} icon={<Link2Off className="h-3.5 w-3.5" />} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Indolj (restaurant ordering) par bani website — menu ki keys se products yahan */
function IndoljConnect({ channelId, onDone, connected }: { channelId: string; onDone: () => void; connected?: boolean }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ activationToken: '', merchantId: '', secret: '', baseUrl: '', branchId: '' });
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.connectIndolj(channelId, { ...f, baseUrl: f.baseUrl || undefined, branchId: f.branchId || undefined }),
    onSuccess: (r) => { toast.success(`Indolj se ${r.items} items aa gaye ✓`); setOpen(false); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const off = useMutation({ mutationFn: () => onlineOrdersApi.disconnectIndolj(channelId), onSuccess: () => { toast.success('Indolj menu hata diya'); onDone(); } });
  if (connected) {
    return (
      <p className="text-[12.5px] text-slate-500">
        Indolj menu jura hai. <button type="button" className="font-semibold text-rose-600 hover:underline" onClick={() => { if (confirm('Indolj ka menu link hatayein? Jore hue products waise hi rahenge.')) off.mutate(); }}>Hatayein</button>
      </p>
    );
  }
  return (
    <Card title="Website Indolj par bani hai?" description="Indolj ki keys daalein — aap ka poora menu (sizes ke saath) yahan aa jayega aur har item Nafaa product se jur jayega, bilkul WooCommerce ki tarah."
      actions={!open ? <Btn size="sm" onClick={() => setOpen(true)}>Indolj jorein</Btn> : undefined}>
      {open && (
        <div className="space-y-3">
          <p className="text-[12.5px] text-slate-500">Ye teeno cheezein Indolj ki team (CSR) deti hai: <b>activation token</b>, <b>merchant ID</b> aur <b>JWT secret key</b>.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([['activationToken', 'Activation token'], ['merchantId', 'Merchant ID'], ['secret', 'JWT secret key'], ['branchId', 'Branch ID (optional)'], ['baseUrl', 'API URL (khali = console.indolj.io)']] as const).map(([k, label]) => (
              <label key={k} className="block text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
                {label}
                <input type={k === 'secret' ? 'password' : 'text'} autoComplete="off" value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={cn(inputCls, 'mt-1 font-mono')} />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="plain" onClick={() => setOpen(false)}>Rehne dein</Btn>
            <Btn variant="primary" loading={save.isPending} disabled={!f.activationToken || !f.merchantId || !f.secret} onClick={() => save.mutate()}>Menu check karke jorein</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
