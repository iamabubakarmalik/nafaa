/**
 * Product library: ready-made products for the shop's industry (DRAP
 * medicines for pharmacies, the grocery catalog, starter packs), searched and
 * paged on the server. Pick rows, or every result of a search with "select
 * all", set the margin, branch and opening stock, and add them as normal
 * products in a background job with live progress.
 *
 * `pickBarcode` opens it for one scanned code that matched no product: the
 * chosen item is created with that barcode.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Barcode, Beaker, BookOpen, Building2, Check, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap,
  Layers, Library, Loader2, PackagePlus, Pill, Tags, X,
} from 'lucide-react';
import { Button, Checkbox, EmptyState, FilterChip, FilterMenu, Input, Modal, SearchField, Select, Skeleton, type FilterOption } from '@/design-system/components';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { libraryApi, type LibraryFilters, type LibraryItem, type LibraryJob } from './api';
import { LibraryGuide } from './LibraryGuide';
import { t } from '@core/i18n';

export interface ProductLibraryProps {
  onClose: () => void;
  /** Called after an import adds products, so lists can refresh. */
  onImported?: () => void;
  initial?: { q?: string; formula?: string; formulaLabel?: string; library?: string };
  /** A scanned barcode that matched no product; the picked item gets it. */
  pickBarcode?: string;
}

const PAGE_SIZE = 50;
const ALL = '__all';

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function ProductLibrary({ onClose, onImported, initial, pickBarcode }: ProductLibraryProps) {
  const [library, setLibrary] = useState(initial?.library);
  const [search, setSearch] = useState(initial?.q ?? pickBarcode ?? '');
  const q = useDebounced(search.trim(), 300);
  const [category, setCategory] = useState('');
  const [company, setCompany] = useState('');
  const [formula, setFormula] = useState<{ key: string; label: string } | null>(initial?.formula ? { key: initial.formula, label: initial.formulaLabel ?? initial.formula } : null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, LibraryItem>>(new Map());
  const [allMode, setAllMode] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [margin, setMargin] = useState('');
  const [stock, setStock] = useState('');
  const [genBarcodes, setGenBarcodes] = useState(false);
  const currentShop = useShopParam();
  const [shopId, setShopId] = useState<string>(currentShop ?? '');
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [guide, setGuide] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const role = useAuthStore((s) => s.user?.role);
  const isOwner = role === 'OWNER' || role === 'SUPER_ADMIN';

  const meta = useQuery({ queryKey: ['product-library', 'meta', library ?? ''], queryFn: () => libraryApi.meta(library), staleTime: 5 * 60_000 });
  const m = meta.data;
  const pharmacy = m?.kind === 'pharmacy';
  const filters: LibraryFilters = useMemo(() => ({
    library: m?.library, q: q || undefined, category: category || undefined, manufacturer: company || undefined, formula: formula?.key,
  }), [m?.library, q, category, company, formula]);
  const list = useQuery({
    queryKey: ['product-library', 'items', filters, page],
    queryFn: () => libraryApi.items(filters, page, PAGE_SIZE),
    enabled: !!m?.available,
    placeholderData: (prev) => prev,
  });
  const shops = useQuery({ queryKey: ['shops-selector'], queryFn: shopsApi.list, enabled: isOwner, staleTime: 5 * 60_000 });
  const activeShops = (shops.data ?? []).filter((s) => s.isActive);

  const job = useQuery({
    queryKey: ['product-library', 'job', jobId],
    queryFn: () => libraryApi.job(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' || !query.state.data ? 700 : false),
  });
  const finished = job.data && job.data.status !== 'running';
  useEffect(() => {
    if (finished && job.data!.created > 0) onImported?.();
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new search or filter starts at page 1 and drops "select all".
  useEffect(() => { setPage(1); setAllMode(false); }, [q, category, company, formula, m?.library]);
  useEffect(() => {
    if (m?.defaultMargin != null && margin === '') setMargin(String(m.defaultMargin));
  }, [m?.defaultMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === 'g') setGuide((g) => !g);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const marginNum = Math.min(99, Math.max(0, Number(margin) || 0));
  const costOf = (it: LibraryItem, price: number) => (pharmacy || it.costPrice == null ? round2(price * (1 - marginNum / 100)) : it.costPrice);
  const priceOf = (it: LibraryItem) => {
    const typed = Number(prices[it.id]);
    return typed > 0 ? typed : it.price;
  };

  const pickable = (it: LibraryItem) => !it.alreadyAdded;
  const toggle = (it: LibraryItem) => {
    if (allMode) setAllMode(false);
    setSelected((cur) => {
      const n = new Map(pickBarcode ? [] : cur);
      if (cur.has(it.id)) n.delete(it.id); else n.set(it.id, it);
      return n;
    });
  };
  const pagePickable = items.filter(pickable);
  const pageAllOn = pagePickable.length > 0 && pagePickable.every((i) => selected.has(i.id));
  const togglePage = () => setSelected((cur) => {
    const n = new Map(cur);
    if (pageAllOn) pagePickable.forEach((i) => n.delete(i.id)); else pagePickable.forEach((i) => n.set(i.id, i));
    return n;
  });
  const count = allMode ? total : selected.size;
  const missingPrice = allMode ? 0 : [...selected.values()].filter((i) => i.needsPrice && !(Number(prices[i.id]) > 0)).length;

  const start = async () => {
    if (!m) return;
    setStarting(true);
    try {
      const typed = Object.fromEntries(Object.entries(prices).filter(([, v]) => Number(v) > 0).map(([id, v]) => [id, { price: Number(v) }]));
      const ids = [...selected.keys()];
      const res = await libraryApi.startImport({
        library: m.library,
        ...(allMode ? { all: { ...filters, library: undefined } } : { ids }),
        marginPercent: marginNum,
        shopId: shopId || undefined,
        openingStock: Number(stock) > 0 ? Number(stock) : undefined,
        prices: typed,
        generateBarcodes: genBarcodes,
        ...(pickBarcode && ids[0] && { barcodes: { [ids[0]]: pickBarcode } }),
      });
      setJobId(res.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('Add nahi hue — dobara koshish karein'));
    } finally {
      setStarting(false);
    }
  };

  const catOptions: Array<FilterOption<string>> = [
    { value: ALL, label: pharmacy ? t('Har form') : t('Har category') },
    ...(m?.categories ?? []).map((c) => ({ value: c.name, label: t(c.name), hint: String(c.count) })),
  ];
  const companyOptions: Array<FilterOption<string>> = [
    { value: ALL, label: pharmacy ? t('Har company') : t('Har brand') },
    ...(m?.companies ?? []).map((c) => ({ value: c.name, label: c.name, hint: String(c.count) })),
  ];
  const libOptions: Array<FilterOption<string>> = (m?.libraries ?? []).map((l) => ({ value: l.key, label: t(l.label), hint: t('{{count}} products', { count: l.count.toLocaleString('en-PK') }) }));

  const title = pickBarcode ? t('Barcode {{code}} — library me dhoondein', { code: pickBarcode }) : t('Library se products');
  const description = m?.available
    ? pharmacy
      ? t('{{total}} dawaiyan · {{source}}, {{date}}', { total: (m.total ?? 0).toLocaleString('en-PK'), source: m.source ?? '', date: m.updated ?? '' })
      : t('{{total}} tayyar products · {{label}}', { total: (m.total ?? 0).toLocaleString('en-PK'), label: t(m.label) })
    : undefined;

  if (jobId) {
    return <Modal open onClose={onClose} size="lg" title={title} closeOnBackdrop={false}><ImportProgress job={job.data} onClose={onClose} onMore={() => { setJobId(null); setSelected(new Map()); setAllMode(false); void list.refetch(); }} /></Modal>;
  }

  return (
    <Modal open onClose={onClose} size="full" title={title} description={description} closeOnBackdrop={false}>
      {guide && <LibraryGuide pharmacy={pharmacy} onClose={() => setGuide(false)} />}
      {meta.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !m?.available ? (
        <div className="space-y-4">
          <EmptyState icon={<Library className="h-6 w-6" />} title={t('Coming soon')}
            description={t('{{label}} ke liye tayyar products ki list abhi ban rahi hai. Tab tak "Naya" ya Excel import se products daalein.', { label: t(m?.label ?? '') })} />
          {!!m?.libraries.length && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[0.8125rem] text-slate-500">{t('Doosri library dekhein:')}</span>
              {m.libraries.map((l) => <Button key={l.key} size="xs" variant="outline" onClick={() => setLibrary(l.key)}>{t(l.label)}</Button>)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchField ref={searchRef} value={search} onChange={setSearch}
              placeholder={pharmacy ? t('Naam, formula, company, reg. no ya barcode… (/)') : t('Naam, brand, category ya barcode… (/)')} />
            {libOptions.length > 1 && !pickBarcode && (
              <FilterMenu icon={BookOpen} label={t('Library')} value={m.library} options={libOptions} onChange={(v) => { setLibrary(v); setCategory(''); setCompany(''); setFormula(null); setSelected(new Map()); }} active={!!library} align="right" />
            )}
            <button type="button" onClick={() => setGuide(true)} title={t('Guide (G)')} className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><GraduationCap className="h-5 w-5" /></button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterMenu icon={pharmacy ? Pill : Layers} label={pharmacy ? t('Form') : t('Category')} value={category || ALL} options={catOptions} onChange={(v) => setCategory(v === ALL ? '' : v)} active={!!category} />
            <FilterMenu icon={pharmacy ? Building2 : Tags} label={pharmacy ? t('Company') : t('Brand')} value={company || ALL} options={companyOptions} onChange={(v) => setCompany(v === ALL ? '' : v)} active={!!company} width="w-80" />
            {formula && <FilterChip onRemove={() => setFormula(null)}><Beaker className="h-3 w-3" />{t('Same formula: {{name}}', { name: formula.label })}</FilterChip>}
            <span className="ms-auto text-[0.8125rem] text-slate-500">
              {list.isFetching ? <Loader2 className="inline h-4 w-4 animate-spin" /> : t('{{total}} mile', { total: total.toLocaleString('en-PK') })}
            </span>
          </div>

          {m.estimates && (
            <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-200/70">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />{t('Andaza price — apni price check kar lein')}
            </p>
          )}

          {!pickBarcode && total > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
              {allMode ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-800 ring-1 ring-brand-100">
                  <CheckCircle2 className="h-4 w-4" />{t('Sab {{total}} results chune (jo pehle se hain wo chhoot jayenge)', { total: total.toLocaleString('en-PK') })}
                  <button type="button" onClick={() => setAllMode(false)} className="underline">{t('Hatayein')}</button>
                </span>
              ) : (
                <>
                  {selected.size > 0 && <span className="font-semibold text-slate-800">{t('{{count}} chune', { count: selected.size })}</span>}
                  <Button size="xs" variant="outline" onClick={() => { setSelected(new Map()); setAllMode(true); }}>{t('Sab {{total}} results chunein', { total: total.toLocaleString('en-PK') })}</Button>
                  {selected.size > 0 && <Button size="xs" variant="ghost" onClick={() => setSelected(new Map())}>{t('Saaf karein')}</Button>}
                </>
              )}
            </div>
          )}

          <div className="min-h-[16rem] flex-1 overflow-auto rounded-2xl ring-1 ring-slate-200">
            {list.isLoading ? (
              <div className="space-y-2 p-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : items.length === 0 ? (
              <EmptyState icon={<Library className="h-6 w-6" />} title={t('Kuch nahi mila')} description={q ? t('"{{q}}" library me nahi. Doosra lafz likhein ya filter hatayein.', { q }) : undefined} />
            ) : (
              <table className="w-full text-[0.8125rem]">
                <thead className="sticky top-0 z-[1] bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-start">
                      {!pickBarcode && <input type="checkbox" aria-label={t('Ye page chunein')} checked={allMode || pageAllOn} onChange={togglePage} disabled={allMode} className="h-4 w-4 rounded border-slate-300 text-brand-600" />}
                    </th>
                    <th className="px-2 py-2.5 text-start">{pharmacy ? t('Dawai') : t('Product')}</th>
                    <th className="hidden px-2 py-2.5 text-start md:table-cell">{pharmacy ? t('Company') : t('Brand')}</th>
                    <th className="hidden px-2 py-2.5 text-start sm:table-cell">{pharmacy ? t('Pack') : t('Unit')}</th>
                    <th className="px-2 py-2.5 text-end">{pharmacy ? t('MRP') : t('Price')}</th>
                    <th className="hidden px-2 py-2.5 text-end sm:table-cell">{t('Cost')}</th>
                    <th className="w-28 px-3 py-2.5 text-end" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const on = allMode ? !it.alreadyAdded : selected.has(it.id);
                    const price = priceOf(it);
                    return (
                      <tr key={it.id} className={cn('align-top', on && 'bg-brand-50/50', it.alreadyAdded && 'opacity-60')}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" aria-label={it.name} checked={on} disabled={it.alreadyAdded || allMode} onChange={() => toggle(it)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                        </td>
                        <td className="min-w-0 px-2 py-2.5">
                          <button type="button" onClick={() => !it.alreadyAdded && !allMode && toggle(it)} className="block text-start">
                            <span className="font-semibold text-slate-900">{it.name}</span>
                            {it.drapCategory === 'Essential' && <span className="ms-1.5 rounded bg-emerald-50 px-1 py-0.5 text-[0.625rem] font-semibold text-emerald-700 ring-1 ring-emerald-100">{t('Essential')}</span>}
                          </button>
                          {pharmacy && it.salts?.length ? (
                            <span className="mt-0.5 block text-[0.75rem] text-slate-500">{it.salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ')}{it.form ? ` · ${t(it.form)}` : ''}</span>
                          ) : (
                            <span className="mt-0.5 block text-[0.75rem] text-slate-500">{[it.category && t(it.category), it.barcode].filter(Boolean).join(' · ')}</span>
                          )}
                          <span className="mt-0.5 block text-[0.6875rem] text-slate-400 md:hidden">{it.company}</span>
                        </td>
                        <td className="hidden px-2 py-2.5 text-slate-700 md:table-cell">{it.company ?? '—'}</td>
                        <td className="hidden px-2 py-2.5 text-slate-600 sm:table-cell">{pharmacy ? it.pack ?? '—' : t(it.unit)}</td>
                        <td className="px-2 py-2.5 text-end tabular-nums">
                          {it.needsPrice ? (
                            <input type="number" min={0} inputMode="decimal" placeholder={t('Price')} value={prices[it.id] ?? ''} disabled={it.alreadyAdded}
                              onChange={(e) => { setPrices((p) => ({ ...p, [it.id]: e.target.value })); if (!selected.has(it.id) && Number(e.target.value) > 0 && !allMode) toggle(it); }}
                              className="h-8 w-24 rounded-lg border border-amber-300 bg-amber-50 px-2 text-end text-[0.8125rem] focus:outline-none focus:ring-2 focus:ring-amber-300" />
                          ) : formatPKR(price)}
                        </td>
                        <td className="hidden px-2 py-2.5 text-end tabular-nums text-slate-600 sm:table-cell">{price > 0 ? formatPKR(costOf(it, price)) : '—'}</td>
                        <td className="px-3 py-2.5 text-end">
                          {it.alreadyAdded ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-emerald-700 ring-1 ring-emerald-100"><Check className="h-3 w-3" />{t('Added')}</span>
                          ) : pharmacy && (it.sameFormula ?? 0) > 1 && it.formulaKey && formula?.key !== it.formulaKey ? (
                            <button type="button" onClick={() => setFormula({ key: it.formulaKey!, label: (it.salts ?? []).map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ') })}
                              className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-cyan-800 ring-1 ring-cyan-100 hover:bg-cyan-100">
                              <Beaker className="h-3 w-3" />{t('Same formula ({{count}})', { count: it.sameFormula })}
                            </button>
                          ) : it.needsPrice && !(Number(prices[it.id]) > 0) ? (
                            <span className="text-[0.6875rem] font-semibold text-amber-700">{t('Price likhein')}</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {(list.data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-end gap-2 text-[0.8125rem] text-slate-600">
              <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4 rtl-flip" />}>{t('Pichhla')}</Button>
              <span className="tabular-nums">{t('Page {{page}} / {{pages}}', { page, pages: list.data?.pages ?? 1 })}</span>
              <Button size="xs" variant="outline" disabled={page >= (list.data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-4 w-4 rtl-flip" />}>{t('Agla')}</Button>
            </div>
          )}

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <Input size="sm" type="number" min={0} max={99} label={pharmacy ? t('Margin % (MRP se)') : t('Margin % (jin ki cost nahi)')} value={margin} placeholder="15" onChange={(e) => setMargin(e.target.value)} />
            {isOwner && activeShops.length > 1 ? (
              <Select size="sm" label={t('Branch (stock kahan)')} value={shopId} onChange={(e) => setShopId(e.target.value)}
                options={[{ value: '', label: t('Main branch') }, ...activeShops.map((s) => ({ value: s.id, label: s.name }))]} />
            ) : <div className="hidden lg:block" />}
            <Input size="sm" type="number" min={0} label={t('Opening stock (har ek)')} value={stock} placeholder="0" onChange={(e) => setStock(e.target.value)} />
            <Checkbox checked={genBarcodes} onChange={(e) => setGenBarcodes(e.target.checked)}
              label={<span className="text-[0.8125rem]">{t('Jin ka barcode nahi, un ka Nafaa barcode bana do')}</span>} />
            <Button onClick={() => void start()} loading={starting} disabled={count === 0} leftIcon={<PackagePlus className="h-4 w-4" />}>
              {pickBarcode ? t('Is barcode ke saath add karein') : t('{{count}} add karein', { count: count.toLocaleString('en-PK') })}
            </Button>
            {missingPrice > 0 && <p className="text-[0.75rem] font-medium text-amber-700 sm:col-span-2 lg:col-span-5">{t('{{count}} chuni hui cheezon ki price nahi — wo add nahi hongi. Khane me price likhein.', { count: missingPrice })}</p>}
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-slate-400">
            {pharmacy && <span>{t('Source: DRAP Pharmaceutical Product Price Index (e.drap.gov.pk)')}</span>}
            {m.openFoodFacts && <span className="inline-flex items-center gap-1"><Barcode className="h-3 w-3" />{t('Barcodes: Open Food Facts (ODbL)')}</span>}
          </p>
        </div>
      )}
    </Modal>
  );
}

function ImportProgress({ job, onClose, onMore }: { job?: LibraryJob; onClose: () => void; onMore: () => void }) {
  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const running = !job || job.status === 'running';
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', running ? 'bg-brand-50 text-brand-600' : job?.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>
          {running ? <Loader2 className="h-5 w-5 animate-spin" /> : job?.status === 'failed' ? <X className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-[0.9375rem] font-semibold text-slate-900">
            {running ? t('Products ban rahe hain…') : job?.status === 'failed' ? t('Add karte hue masla aaya') : t('{{created}} products add ho gaye', { created: job!.created.toLocaleString('en-PK') })}
          </p>
          <p className="text-[0.8125rem] text-slate-500">
            {job ? t('{{done}} / {{total}} dekhe', { done: job.done.toLocaleString('en-PK'), total: job.total.toLocaleString('en-PK') }) : t('Shuru ho raha hai…')}
          </p>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${running ? Math.max(pct, 3) : 100}%` }} />
      </div>
      {job && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([
            [t('Naye bane'), job.created],
            [t('Pehle se the'), job.skipped],
            [t('Price nahi thi'), job.needsPrice],
            [t('Naye brands/companies'), job.brandsCreated],
            [t('Naye salts'), job.saltsCreated],
            [t('Barcode pehle se kisi aur par'), job.barcodeDuplicates],
            [t('Nafaa barcode bane'), job.barcodesGenerated],
          ] as Array<[string, number]>).filter(([, v], i) => i < 2 || v > 0).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
              <dt className="text-[0.6875rem] text-slate-500">{label}</dt>
              <dd className="text-[1rem] font-semibold tabular-nums text-slate-900">{v.toLocaleString('en-PK')}</dd>
            </div>
          ))}
        </dl>
      )}
      {job?.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-100">{job.error}</p>}
      {!!job?.errors.length && (
        <ul className="max-h-32 space-y-1 overflow-auto text-[0.75rem] text-rose-700">
          {job.errors.map((e) => <li key={e.name}>{e.name}: {e.error}</li>)}
        </ul>
      )}
      {!running && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onMore}>{t('Aur chunein')}</Button>
          <Button onClick={onClose}>{t('Products dekhein')}</Button>
        </div>
      )}
    </div>
  );
}
