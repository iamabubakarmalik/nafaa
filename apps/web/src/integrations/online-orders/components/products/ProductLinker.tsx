import { Alert, Badge, Button, Card, confirmDialog, controlClass, EmptyState, Segmented } from '@/design-system/components';
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
import { ProductPicker, type PickedProduct } from './ProductPicker';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';

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
    onSuccess: (d) => { qc.setQueryData(key, d); toast.success(tr('Website se taaza list aa gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['sales-channel', channelId] });
  };

  if (isLoading) {
    return <Card><div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-ink-800" />)}</div></Card>;
  }
  if (error || !data) {
    return <Alert tone="danger" title={tr('Products nahi khule')}>{apiErrorMessage(error)}</Alert>;
  }

  const s = data.stats;
  const pct = s.variants ? Math.round((s.linked / s.variants) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ─── Khulasa ─── */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[13.75rem] flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[0.875rem] font-semibold text-slate-900 dark:text-ink-white">
                {data.canFetch ? tr('{{linked}} / {{variants}} jure hue', { linked: s.linked, variants: s.variants }) : tr('Jore hue products')}
              </div>
              {data.canFetch && <div className="text-[0.78125rem] font-semibold tabular-nums text-slate-500">{pct}%</div>}
            </div>
            {data.canFetch && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
              <Badge size="xs" variant="success" dot>{tr('{{linked}} jure', { linked: s.linked })}</Badge>
              {s.suggested > 0 && <Badge size="xs" variant="warning" dot>{tr('{{suggested}} salah', { suggested: s.suggested })}</Badge>}
              {s.unlinked > 0 && <Badge size="xs" variant="default" dot>{tr('{{unlinked}} baqi', { unlinked: s.unlinked })}</Badge>}
              {data.kind !== 'indolj' && <Badge size="xs" variant="info">{tr('{{nafaaUnlisted}} Nafaa me, website par nahi', { nafaaUnlisted: s.nafaaUnlisted })}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.canFetch && (
              <Button size="xs" variant="secondary" loading={refresh.isPending || isFetching} onClick={() => refresh.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                {tr('Website se taaza')}
              </Button>
            )}
            {s.suggested > 0 && <AcceptAll channelId={channelId} products={data.products} onDone={invalidate} />}
          </div>
        </div>
        <p className="mt-3 text-[0.78125rem] text-slate-500">
          {data.kind === 'indolj'
            ? <><b>{tr('Indolj ka menu')}</b> {' '}{tr('— har item ko Nafaa product se jorein, phir Indolj ka har order khud bill banata aur stock kam karta hai. Menu / qeemat Indolj ke panel se badalti hai.')}</>
            : <><b>{tr('Stock ka malik Nafaa hai')}</b> {' '}{tr('— jora hua har variant ka stock Nafaa (branch) se {{siteName}} par jata hai: har 15 minute, aur har accept/cancel par foran.', { siteName })}</>}
          {data.canFetch && tr(' · List {{fetchedAt}} ki', { fetchedAt: timeAgo(data.fetchedAt) })}
        </p>
      </Card>

      {data.remoteError && (
        <Alert tone="danger" icon={<TriangleAlert className="h-4 w-4 text-rose-600" />} title={tr('Website ke products nahi aaye')}
          action={<Button size="xs" onClick={() => refetch()}>{tr('Dobara')}</Button>}>{data.remoteError}</Alert>
      )}

      {data.orphans.length > 0 && <Orphans channelId={channelId} orphans={data.orphans} onDone={invalidate} />}

      {!data.canFetch ? (
        <CustomLinks channelId={channelId} links={data.links} onDone={invalidate} />
      ) : data.kind === 'indolj' ? (
        <WebsiteList channelId={channelId} products={data.products} onDone={invalidate} />
      ) : (
        <>
          <Segmented value={view} onChange={setView} items={[
            { value: 'website', label: tr('{{siteName}} ke products', { siteName }), count: s.products },
            { value: 'nafaa', label: tr('Nafaa ke products (website par nahi)'), count: s.nafaaUnlisted },
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
      toast.success(tr('{{created}} naye Nafaa products bane{{value}}', { created: r.created, value: r.linkedExisting ? tr(', {{linkedExisting}} pehle walon se jure', { linkedExisting: r.linkedExisting }) : '' }));
      if (r.errors[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const intoMut = useMutation({
    mutationFn: (a: { ext: string; productId: string }) => onlineOrdersApi.importInto(channelId, a.ext, a.productId),
    onSuccess: (r) => { onDone(); toast.success(tr('{{product}} se jor diya{{value}}', { product: r.product, value: r.variantsCreated ? tr(' — {{variantsCreated}} naye variants bane', { variantsCreated: r.variantsCreated }) : '' })); },
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
          { value: 'all', label: tr('Sab'), count: counts.all },
          { value: 'todo', label: tr('Jorna baqi'), count: counts.todo },
          { value: 'linked', label: tr('Jure hue'), count: counts.linked },
        ]} />
        <div className="relative min-w-[12.5rem] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Naam ya SKU…')} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] ps-8')} />
        </div>
        {unlinkedIds.length > 0 && (
          <Button size="xs" variant="success" loading={importMut.isPending} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}
            onClick={async () => { if ((await confirmDialog({ title: tr('{{count}} products Nafaa me banayein?', { count: unlinkedIds.length }), text: tr('Naam, qeemat, tasveer aur variants sab aa jayenge. Jo naam Nafaa me pehle se hai wo nahi banega — usi se jur jayega.'), danger: true }))) importMut.mutate(unlinkedIds); }}>
            {tr('Baqi {{count}} Nafaa me banao', { count: unlinkedIds.length })}
          </Button>
        )}
      </div>

      {picked.size > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white sm:mx-5 dark:bg-ink-800">
          <span className="text-[0.8125rem] font-semibold">{tr('{{size}} chune', { size: picked.size })}</span>
          <span className="text-[0.75rem] text-white/70">{tr('— Nafaa me ban jayenge (naam, qeemat, tasveer, variants) aur jur jayenge · jo pehle se hai us se jurenge')}</span>
          <span className="flex-1" />
          <Button size="xs" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setPicked(new Set())}>{tr('Chhoro')}</Button>
          <Button size="xs" variant="success" loading={importMut.isPending} onClick={() => importMut.mutate([...picked])} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>
            {tr('Nafaa me lao')}
          </Button>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 dark:border-ink-800">
        {/* sar-khat */}
        <div className="hidden grid-cols-[1.75rem_minmax(0,1.3fr)_minmax(0,0.7fr)_1.5rem_minmax(0,1.4fr)] items-center gap-3 bg-slate-50 px-4 py-2 text-[0.71875rem] font-semibold uppercase tracking-wide text-slate-500 dark:bg-ink-800/40 md:grid sm:px-5">
          <input type="checkbox" aria-label={tr('Sab jorne baqi chuno')} className="h-4 w-4 rounded border-slate-300"
            checked={unlinkedIds.length > 0 && unlinkedIds.every((id) => picked.has(id))}
            onChange={(e) => setPicked(e.target.checked ? new Set(unlinkedIds) : new Set())} />
          <span>{tr('Website product')}</span>
          <span>{tr('SKU · qeemat · stock')}</span>
          <span />
          <span>{tr('Nafaa me')}</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Package className="h-5 w-5" />} title={products.length ? tr('Is chaant me kuch nahi') : tr('Website par koi product nahi mila')} description={products.length ? tr('Filter badal kar dekhein.') : tr('"Nafaa ke products" tab se apne products website par bhej sakte hain.')} />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {rows.map((p) => {
              const linkedCount = p.variants.filter((v) => v.link).length;
              const allLinked = linkedCount === p.variants.length;
              const noneLinked = linkedCount === 0;
              const expanded = open.has(p.externalProductId) || (!p.hasVariants);
              return (
                <li key={p.externalProductId}>
                  {p.hasVariants ? (
                    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 md:grid-cols-[1.75rem_minmax(0,1.3fr)_minmax(0,0.7fr)_1.5rem_minmax(0,1.4fr)] sm:px-5">
                      <input type="checkbox" disabled={!noneLinked} checked={picked.has(p.externalProductId)} onChange={() => togglePick(p.externalProductId)}
                        className="h-4 w-4 rounded border-slate-300 disabled:opacity-30" aria-label={tr('{{title}} chuno', { title: p.title })} />
                      <button onClick={() => toggleOpen(p.externalProductId)} className="flex min-w-0 items-center gap-2.5 text-start">
                        {open.has(p.externalProductId) ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 rtl-flip" />}
                        <Thumb src={p.image} />
                        <span className="min-w-0">
                          <span className="block truncate text-[0.84375rem] font-semibold text-slate-900 dark:text-ink-white">{p.title}</span>
                          <span className="text-[0.75rem] text-slate-500">{tr('{{count}} variants · {{status}}', { count: p.variants.length, status: p.status })}</span>
                        </span>
                      </button>
                      <span className="hidden text-[0.78125rem] text-slate-500 md:block">—</span>
                      <span className="hidden md:block" />
                      <span className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto">
                        <Badge size="xs" variant={allLinked ? 'success' : noneLinked ? 'default' : 'warning'} dot>
                          {allLinked ? tr('Sab variants jure') : tr('{{linkedCount}}/{{count}} variants jure', { linkedCount, count: p.variants.length })}
                        </Badge>
                        {!allLinked && (
                          <>
                            {noneLinked && (
                              <Button size="xs" variant="success" loading={importMut.isPending && importMut.variables?.[0] === p.externalProductId}
                                onClick={() => importMut.mutate([p.externalProductId])} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>{tr('Naya banao')}</Button>
                            )}
                            <span className="min-w-[11.25rem] flex-1">
                              <ProductPicker compact initialSearch={p.title.split(/\s+/).slice(0, 2).join(' ')} placeholder={tr('Nafaa product me variants jorein')}
                                onPick={(x) => intoMut.mutate({ ext: p.externalProductId, productId: x.productId })} />
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  ) : null}

                  {expanded && p.variants.map((v, idx) => (
                    <VariantRow key={v.externalVariantId ?? `p-${idx}`} channelId={channelId} product={p} variant={v}
                      nested={p.hasVariants} picked={picked.has(p.externalProductId)}
                      onTogglePick={() => togglePick(p.externalProductId)} onDone={onDone}
                      onCreate={p.hasVariants ? undefined : () => importMut.mutate([p.externalProductId])}
                      creating={importMut.isPending && importMut.variables?.[0] === p.externalProductId} />
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

function VariantRow({ channelId, product, variant: v, nested, picked, onTogglePick, onDone, onCreate, creating }: {
  channelId: string; product: CatalogProduct; variant: CatalogVariant; nested: boolean;
  picked: boolean; onTogglePick: () => void; onDone: () => void; onCreate?: () => void; creating?: boolean;
}) {
  const [changing, setChanging] = useState(false);
  const title = nested ? `${product.title} — ${v.title}` : product.title;

  const link = useMutation({
    mutationFn: (p: PickedProduct) => onlineOrdersApi.saveLinks(channelId, [toLink(product, v, p)]),
    onSuccess: (r) => { setChanging(false); onDone(); if (r.errors[0]) toast.error(r.errors[0]); else toast.success(tr('Jor diya ✓')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: () => onlineOrdersApi.removeLink(channelId, v.link!.mappingId),
    onSuccess: () => { onDone(); toast.success(tr('Link hata diya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className={cn('grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 md:grid-cols-[1.75rem_minmax(0,1.3fr)_minmax(0,0.7fr)_1.5rem_minmax(0,1.4fr)] sm:px-5',
      nested && 'bg-slate-50/50 dark:bg-ink-800/20')}>
      {nested ? <span /> : (
        <input type="checkbox" disabled={!!v.link} checked={picked} onChange={onTogglePick}
          className="h-4 w-4 rounded border-slate-300 disabled:opacity-30" aria-label={tr('{{title}} chuno', { title: product.title })} />
      )}
      <div className={cn('flex min-w-0 items-center gap-2.5', nested && 'ps-6')}>
        {!nested && <Thumb src={v.image ?? product.image} />}
        <span className="min-w-0">
          <span className={cn('block truncate text-slate-900 dark:text-ink-white', nested ? 'text-[0.8125rem] font-medium' : 'text-[0.84375rem] font-semibold')}>
            {nested ? v.title : product.title}
          </span>
          {!nested && <span className="text-[0.75rem] text-slate-500">{product.status}</span>}
        </span>
      </div>
      <div className="col-start-2 text-[0.78125rem] text-slate-600 dark:text-ink-300 md:col-start-auto">
        <span className="font-mono text-[0.75rem]">{v.sku || tr('— SKU nahi')}</span>
        <span className="text-slate-400"> · </span>{rs(v.price)}
        <span className="text-slate-400"> · </span>{v.stock === null ? tr('stock track nahi') : <StockText n={v.stock} />}
      </div>
      <ArrowRight className="hidden h-4 w-4 text-slate-300 md:block rtl-flip" />

      <div className="col-start-2 min-w-0 md:col-start-auto">
        {v.link && !changing ? (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700"><Check className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-slate-900 dark:text-ink-white">
                {v.link.name}{v.link.variantName ? <span className="text-slate-500"> — {v.link.variantName}</span> : null}
              </span>
              <span className="text-[0.75rem] text-slate-500">
                {tr('Nafaa')}{' '} <StockText n={v.link.stock} />
                {v.stock !== null && v.stock !== Math.max(0, v.link.stock) && <span className="text-amber-600"> {' '}{tr('· website par {{stock}} (agli sync me barabar)', { stock: v.stock })}</span>}
                {v.link.inactive && <span className="text-rose-600"> {' '}{tr('· Nafaa me band')}</span>}
              </span>
            </span>
            <Button size="xs" variant="ghost" onClick={() => setChanging(true)}>{tr('Badlo')}</Button>
            <Button size="xs" variant="ghost" loading={unlink.isPending} onClick={() => unlink.mutate()} leftIcon={<Link2Off className="h-3.5 w-3.5" />} aria-label={tr('Link hatao')} />
          </div>
        ) : v.suggestion && !changing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-amber-700"><Sparkles className="h-3.5 w-3.5" /> {' '}{tr('Salah ({{value}})', { value: v.suggestion.reason === 'sku' ? tr('SKU mila') : tr('naam mila') })}</span>
              <span className="block truncate text-[0.8125rem] font-medium text-slate-900 dark:text-ink-white">
                {v.suggestion.name}{v.suggestion.variantName ? <span className="text-slate-500"> — {v.suggestion.variantName}</span> : null}
              </span>
            </span>
            <Button size="xs" variant="primary" loading={link.isPending}
              onClick={() => link.mutate({ productId: v.suggestion!.productId, variantId: v.suggestion!.variantId, label: v.suggestion!.name })}
              leftIcon={<Link2 className="h-3.5 w-3.5" />}>{tr('Jorein')}</Button>
            <Button size="xs" variant="ghost" onClick={() => setChanging(true)}>{tr('Aur chuno')}</Button>
            {onCreate && <Button size="xs" variant="ghost" loading={creating} onClick={onCreate}>{tr('Naya banao')}</Button>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <ProductPicker compact initialSearch={product.title.split(/\s+/).slice(0, 2).join(' ')} onPick={(p) => link.mutate(p)}
                placeholder={link.isPending ? tr('Jor rahe hain…') : tr('Nafaa product / variant chunein')} />
            </div>
            {!changing && onCreate && (
              <Button size="xs" variant="success" loading={creating} onClick={onCreate} leftIcon={<CloudDownload className="h-3.5 w-3.5" />}>{tr('Naya banao')}</Button>
            )}
            {changing && <Button size="xs" variant="ghost" onClick={() => setChanging(false)}>{tr('Wapas')}</Button>}
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
    onSuccess: (r) => { onDone(); toast.success(tr('{{saved}} jor diye ✓', { saved: r.saved })); if (r.errors[0]) toast.error(r.errors[0]); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Button size="xs" variant="primary" loading={m.isPending} onClick={() => m.mutate()} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
      {tr('Sab {{count}} salahen qubool', { count: links.length })}
    </Button>
  );
}

/* ═════════════════════ Nafaa → website ═════════════════════ */

export function NafaaUnlisted({ channelId, siteName, onDone }: { channelId: string; siteName: string; onDone: () => void }) {
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
      toast.success(tr('{{siteName}} par {{created}} naye products bane{{value}}', { siteName, created: r.created, value: r.updated ? tr(', {{updated}} update', { updated: r.updated }) : '' }));
      if (r.errors?.[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const items = data ?? [];
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <div className="relative min-w-[12.5rem] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Nafaa product search…')} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem] ps-8')} />
        </div>
        <Button size="sm" variant="success" disabled={!picked.size} loading={send.isPending} onClick={() => send.mutate()} leftIcon={<CloudUpload className="h-4 w-4" />}>
          {picked.size ? tr('{{size}} {{siteName}} par bhejo', { size: picked.size, siteName }) : tr('{{siteName}} par bhejo', { siteName })}
        </Button>
      </div>
      <p className="mt-2 px-4 text-[0.78125rem] text-slate-500 sm:px-5">
        {tr('Naam, qeemat, tasveerein, variants aur Nafaa ka stock website par ban jayega — aur har variant khud jur jayega.')}
      </p>
      <div className="mt-3 border-t border-slate-100 dark:border-ink-800">
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-ink-800" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Check className="h-5 w-5" />} title={tr('Sab products website par hain')} description={tr('Nafaa ka har active product is website se jura hua hai.')} />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            <li className="flex items-center gap-3 bg-slate-50 px-4 py-2 text-[0.71875rem] font-semibold uppercase tracking-wide text-slate-500 dark:bg-ink-800/40 sm:px-5">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={items.length > 0 && items.every((p) => picked.has(p.id))}
                onChange={(e) => setPicked(e.target.checked ? new Set(items.map((p) => p.id)) : new Set())} aria-label={tr('Sab chuno')} />
              <span className="flex-1">{tr('Nafaa product')}</span>
              <span className="w-28 text-end">{tr('Stock')}</span>
              <span className="w-24 text-end">{tr('Qeemat')}</span>
            </li>
            {items.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-ink-800/40 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                  <Thumb src={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.84375rem] font-medium text-slate-900 dark:text-ink-white">{p.name}</span>
                    <span className="text-[0.75rem] text-slate-500">
                      {p.sku ? tr('SKU {{sku}}', { sku: p.sku }) : tr('SKU nahi')}{p.category ? ` · ${p.category}` : ''}
                      {p.variants.length > 0 && tr(' · {{count}} variants ({{value}}{{value2}})', { count: p.variants.length, value: p.variants.slice(0, 4).map((v) => v.name).join(', '), value2: p.variants.length > 4 ? '…' : '' })}
                    </span>
                  </span>
                  <span className="w-28 text-end text-[0.8125rem] tabular-nums"><StockText n={p.stock} bare /></span>
                  <span className="w-24 text-end text-[0.8125rem] font-medium tabular-nums text-slate-900 dark:text-ink-white">{rs(p.price)}</span>
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

/**
 * Stock as a person reads it: a negative count (sold more than recorded)
 * shows as "khatam" with the shortfall in the tooltip, never as "-26".
 */
function StockText({ n, bare }: { n: number; bare?: boolean }) {
  if (n <= 0) {
    return (
      <span className="font-semibold text-rose-600" title={n < 0 ? tr('Nafaa me {{n}} zyada bik chuke — stock theek karein', { n: Math.abs(n) }) : undefined}>
        {bare ? tr('Khatam') : tr('stock khatam')}
      </span>
    );
  }
  return <span>{bare ? n : tr('stock {{n}}', { n })}</span>;
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-ink-700 dark:bg-ink-800">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

function Orphans({ channelId, orphans, onDone }: { channelId: string; orphans: { mappingId: string; externalTitle: string | null; name: string; variantName: string | null }[]; onDone: () => void }) {
  const m = useMutation({
    mutationFn: async () => { for (const o of orphans) await onlineOrdersApi.removeLink(channelId, o.mappingId); },
    onSuccess: () => { onDone(); toast.success(tr('Purane links saaf')); },
  });
  return (
    <Alert tone="warning" icon={<TriangleAlert className="h-4 w-4 text-amber-600" />}
      title={tr('{{count}} link aise hain jin ka product website par ab nahi', { count: orphans.length })}
      action={<Button size="xs" loading={m.isPending} onClick={() => m.mutate()}>{tr('Saaf karo')}</Button>}>
      {orphans.slice(0, 3).map((o) => `${o.externalTitle ?? '—'} → ${o.name}${o.variantName ? ` (${o.variantName})` : ''}`).join(' · ')}
      {orphans.length > 3 ? ' …' : ''}
    </Alert>
  );
}

/** Apni banayi website: us ke products hum nahi dekh sakte — bane hue links + orders se khud bante hain */
export function CustomLinks({ channelId, links, onDone }: { channelId: string; links: { mappingId: string; externalProductId: string | null; externalSku: string | null; externalTitle: string | null; name: string; variantName: string | null; stock: number }[]; onDone: () => void }) {
  const unlink = useMutation({
    mutationFn: (id: string) => onlineOrdersApi.removeLink(channelId, id),
    onSuccess: () => { onDone(); toast.success(tr('Link hata diya')); },
  });
  return (
    <Card title={tr('Jore hue products')} description={tr('Website ka har product jo Nafaa product se jura hai. Naya link pehle order ko accept karte waqt banta hai, ya neeche CSV se ek saath.')}>
      {links.length === 0 ? (
        <EmptyState icon={<Link2 className="h-5 w-5" />} title={tr('Abhi koi link nahi')} description={tr('Website se order aaye ya CSV import karein — products khud jurte jayenge.')} />
      ) : (
        <ul className="-my-2 divide-y divide-slate-100 dark:divide-ink-800">
          {links.map((l) => (
            <li key={l.mappingId} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 text-[0.8125rem]">
                <span className="font-medium text-slate-900 dark:text-ink-white">{l.externalTitle ?? l.externalSku ?? l.externalProductId}</span>
                <span className="text-slate-400"> → </span>
                <span className="text-slate-700 dark:text-ink-200">{l.name}{l.variantName ? ` — ${l.variantName}` : ''}</span>
                <span className="text-slate-500"> · </span><StockText n={l.stock} />
              </span>
              <Button size="xs" variant="ghost" loading={unlink.isPending && unlink.variables === l.mappingId} onClick={() => unlink.mutate(l.mappingId)} leftIcon={<Link2Off className="h-3.5 w-3.5" />} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
