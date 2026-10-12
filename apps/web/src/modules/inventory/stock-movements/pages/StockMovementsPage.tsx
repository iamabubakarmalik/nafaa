/**
 * Stock movements: every unit that came in or went out, a page at a time
 * from the server, grouped by business day. Filters (period, type group,
 * direction, person, product, search) live in the URL, so a filtered view
 * can be shared or bookmarked. A second tab shows analytics for the same
 * filter.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, ArrowDownRight, ArrowDownUp, ArrowUpRight, BarChart3, CalendarRange, ExternalLink, FileSpreadsheet, GraduationCap, Hash,
  History, Layers, MousePointerClick, Package, PackageOpen, Rows3, Scale, User, Users, X,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, PageHero, PageShell, SearchField, ViewTabs, heroButton, heroIconButton,
  resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import type { DatePreset } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { purchasesApi } from '@modules/purchasing/purchases/api/purchases.api';
import { stockMovementsApi, type MovementQuery, type StockMovement } from '../api/stock-movements.api';
import { MOVEMENT_GROUPS, MOVEMENT_META, fmtQty, movementMeta, type MovementGroup } from '../components/movementMeta';
import { MovementAnalytics } from '../components/MovementAnalytics';
import { downloadMovementsCsv, movementsDoc } from '../components/print';

type Direction = 'all' | 'in' | 'out';
const PAGE_SIZES = ['50', '100', '200'] as const;
const DEFAULT_PRESET: DatePreset = 'month';
/** Sent for "Sab" so the server does not fall back to its 30-day default. */
const ALL_FROM = '2000-01-01';

/** "Kharidari: supplier se maal aaya. …" for every type in one direction. */
const describe = (dir: 'in' | 'out') =>
  `${Object.values(MOVEMENT_META).filter((x) => x.dir === dir).map((x) => `${x.label}: ${x.hint.toLowerCase()}`).join('. ')}.`;
const timeOf = (v: string) => new Date(v).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
const dayTitle = (key: string, today: string, yesterday: string) =>
  key === today ? 'Aaj' : key === yesterday ? 'Kal' : new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function StockMovementsPage() {
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const guide = usePageGuide();
  const [sp, setSp] = useSearchParams();

  const setParams = (patch: Record<string, string | null>) => setSp((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    return next;
  }, { replace: true });

  const tab = sp.get('tab') === 'analytics' ? 'analytics' : 'ledger';
  const range: DateRangeValue = { preset: (sp.get('p') as DatePreset) || DEFAULT_PRESET, custom: { from: sp.get('from') ?? '', to: sp.get('to') ?? '' } };
  const groups = (sp.get('g') ?? '').split(',').filter((g): g is MovementGroup => MOVEMENT_GROUPS.some((x) => x.id === g));
  const direction = (['in', 'out'].includes(sp.get('dir') ?? '') ? sp.get('dir') : 'all') as Direction;
  const userId = sp.get('user') ?? '';
  const productId = sp.get('product') ?? '';
  const query = sp.get('q') ?? '';
  const size = Number(PAGE_SIZES.find((s) => s === sp.get('size')) ?? 50);

  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(query);
  const [page, setPage] = useState(1);
  useEffect(() => { setSearch(query); }, [query]);
  useEffect(() => {
    const t = setTimeout(() => { if (search.trim() !== query) setParams({ q: search.trim() || null }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const period = resolveRange(range, startHour);
  const today = businessDayKey(new Date(), startHour);
  const types = groups.flatMap((g) => MOVEMENT_GROUPS.find((x) => x.id === g)!.types).join(',');
  // A product's history is all time unless a period is picked.
  const dates = period ?? (productId ? {} : { from: ALL_FROM, to: today });
  const q: MovementQuery = {
    ...dates, type: types || undefined, direction, userId: userId || undefined, productId: productId || undefined, search: query || undefined,
  };
  const qKey = JSON.stringify(q);
  useEffect(() => { setPage(1); }, [qKey, size]);

  const listQ = useQuery({ queryKey: ['stock-movements', q, page, size], queryFn: () => stockMovementsApi.list({ ...q, page, limit: size }), placeholderData: (prev) => prev });
  // Chip counts ignore the type filter so every chip keeps its number.
  const countsQ = useQuery({
    queryKey: ['stock-movements', 'counts', { ...q, type: undefined }],
    queryFn: () => stockMovementsApi.list({ ...q, type: undefined, page: 1, limit: 1 }),
    enabled: !!types, placeholderData: (prev) => prev,
  });
  const analyticsQ = useQuery({ queryKey: ['stock-movements', 'analytics', q], queryFn: () => stockMovementsApi.analytics(q), staleTime: 30_000, placeholderData: (prev) => prev });
  const peopleQ = useQuery({ queryKey: ['stock-movements', 'people'], queryFn: stockMovementsApi.people, staleTime: 5 * 60_000 });

  const data = listQ.data;
  const byType = (types ? countsQ.data : data)?.totals.byType ?? [];
  const groupCount = (g: (typeof MOVEMENT_GROUPS)[number]) => byType.filter((x) => g.types.includes(x.type)).reduce((s, x) => s + x.count, 0);
  const allCount = byType.reduce((s, x) => s + x.count, 0);

  // The product strip keeps the name once loaded, even if a filter empties the list.
  const [productInfo, setProductInfo] = useState<StockMovement['product'] | null>(null);
  const loadedProduct = data?.items.find((m) => m.product.id === productId)?.product;
  useEffect(() => { if (loadedProduct) setProductInfo(loadedProduct); }, [loadedProduct]);
  const product = productId ? (loadedProduct ?? (productInfo?.id === productId ? productInfo : null)) : null;

  const people = peopleQ.data ?? [];
  const personName = people.find((p) => p.id === userId)?.fullName;
  const filtersOn = groups.length > 0 || direction !== 'all' || !!userId || !!query || !!productId;
  const periodText = period ? (period.from === period.to ? period.from : `${period.from} — ${period.to}`) : productId ? 'Sab history' : 'Sab tareekhen';
  const filterLabels = [
    ...groups.map((g) => MOVEMENT_GROUPS.find((x) => x.id === g)!.label),
    ...(direction !== 'all' ? [direction === 'in' ? 'Sirf aaya' : 'Sirf gaya'] : []),
    ...(personName ? [personName] : []),
    ...(product ? [product.name] : []),
    ...(query ? [`"${query}"`] : []),
  ];

  const clearFilters = () => { setSearch(''); setParams({ g: null, dir: null, user: null, product: null, q: null }); };
  const toggleGroup = (g: MovementGroup) => setParams({ g: (groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g]).join(',') || null });
  const pickProduct = (id: string) => { setParams({ product: id, p: 'all', from: null, to: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pickReference = (ref: string) => { setSearch(ref); setParams({ q: ref }); };

  const printDoc = async () => movementsDoc(await stockMovementsApi.list({ ...q, page: 1, limit: 500 }), periodText, filterLabels);
  const exportCsv = () => data && downloadMovementsCsv(data.items, `stock-movements-${period?.from ?? 'sab'}-${period?.to ?? today}.csv`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); setParams({ tab: null }); setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rows grouped by business day, newest first, with the day's totals.
  const days = useMemo(() => {
    const out: Array<{ key: string; rows: StockMovement[]; valueIn: number; valueOut: number }> = [];
    for (const m of data?.items ?? []) {
      const key = businessDayKey(new Date(m.createdAt), startHour);
      let d = out[out.length - 1];
      if (!d || d.key !== key) { d = { key, rows: [], valueIn: 0, valueOut: 0 }; out.push(d); }
      d.rows.push(m);
      if (m.value >= 0) d.valueIn += m.value; else d.valueOut -= m.value;
    }
    return out;
  }, [data, startHour]);
  const yesterday = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 1); return businessDayKey(d, startHour); }, [startHour]);

  // Latest balance per branch, only when page one holds the product's newest unfiltered rows.
  const nowStock = useMemo(() => {
    if (!product || !data || page !== 1 || period || groups.length || direction !== 'all' || userId || query) return null;
    const seen = new Map<string, { name: string; balance: number }>();
    for (const m of data.items) {
      const k = m.shop?.id ?? '-';
      if (!seen.has(k)) seen.set(k, { name: m.shop?.name ?? 'Purana stock', balance: m.balanceAfter });
    }
    return [...seen.values()];
  }, [product, data, page, period, groups.length, direction, userId, query]);

  const a = analyticsQ.data?.totals;

  return (
    <PageShell>
      <PageHero
        title="Stock ka hisaab"
        chip={<><Activity /> {periodText}</>}
        meta="Har aaya aur gaya maal, ek jagah"
        busy={(listQ.isFetching && !listQ.isLoading) || (analyticsQ.isFetching && !analyticsQ.isLoading)}
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} disabled={!data?.items.length} title="Is safhe ki entries CSV me" className={heroButton}><FileSpreadsheet className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Entries', value: (data?.total ?? 0).toLocaleString('en-PK') },
          { label: 'Aaya', value: `+${fmtQty(data?.totals.qtyIn ?? 0)}`, hint: a ? money(a.valueIn) : undefined },
          { label: 'Gaya', value: `−${fmtQty(data?.totals.qtyOut ?? 0)}`, hint: a ? money(a.valueOut) : undefined },
          { label: 'Farq (cost)', value: a ? money(a.net) : '—' },
        ]}
      />

      {/* Filters */}
      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); if (!v) setParams({ q: null }); }}
          placeholder="Cheez, SKU, barcode, bill # ya note…" label="Dhoondein" />}
        chips={filtersOn ? <>
          {groups.map((g) => <FilterChip key={g} onRemove={() => toggleGroup(g)}>{MOVEMENT_GROUPS.find((x) => x.id === g)!.label}</FilterChip>)}
          {direction !== 'all' && <FilterChip onRemove={() => setParams({ dir: null })}>{direction === 'in' ? 'Sirf aaya' : 'Sirf gaya'}</FilterChip>}
          {userId && <FilterChip onRemove={() => setParams({ user: null })}>{personName ?? 'Kis ne'}</FilterChip>}
          {productId && <FilterChip onRemove={() => setParams({ product: null })}>{product?.name ?? 'Ek cheez'}</FilterChip>}
          {query && <FilterChip onRemove={() => { setSearch(''); setParams({ q: null }); }}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clearFilters}>
        <DateRangeMenu value={range} startHour={startHour} defaultPreset={DEFAULT_PRESET}
          onChange={(v) => setParams({ p: v.preset === DEFAULT_PRESET ? null : v.preset, from: v.preset === 'custom' ? v.custom.from : null, to: v.preset === 'custom' ? v.custom.to : null })} />
        <FilterMenu icon={ArrowDownUp} label="Aaya ya gaya" value={direction} active={direction !== 'all'} onChange={(v) => setParams({ dir: v === 'all' ? null : v })}
          options={[{ value: 'all', label: 'Sab' }, { value: 'in', label: 'Aaya', icon: ArrowDownRight, color: '#16a34a' }, { value: 'out', label: 'Gaya', icon: ArrowUpRight, color: '#e11d48' }]} />
        <FilterMenu icon={Users} label="Kis ne" value={userId} active={!!userId} onChange={(v) => setParams({ user: v || null })} width="w-72" align="right"
          options={[{ value: '', label: 'Sab log' }, ...people.map((p) => ({ value: p.id, label: p.fullName }))]} />
      </FilterBar>

      {/* Type groups with counts */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        <Chip active={!groups.length} onClick={() => setParams({ g: null })} label="Sab qism" count={allCount} icon={Layers} color="#64748b" />
        {MOVEMENT_GROUPS.map((g) => <Chip key={g.id} active={groups.includes(g.id)} onClick={() => toggleGroup(g.id)} label={g.label} count={groupCount(g)} icon={g.icon} color={g.color} />)}
      </div>

      {/* Tabs */}
      <ViewTabs value={tab} onChange={(v) => setParams({ tab: v === 'ledger' ? null : v })}
        hint={<><Kbd>/</Kbd> dhoondein · <Kbd>G</Kbd> guide</>}
        tabs={[{ id: 'ledger', label: 'Ledger', icon: History, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {productId && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-200"><Package className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{product?.name ?? 'Ek cheez'}</p>
            <p className="text-[0.75rem] text-slate-600">
              {product?.sku ? `${product.sku} · ` : ''}{period ? `Sirf ${periodText} — sab history ke liye muddat "Sab" karein` : 'Is cheez ki sab history, pehle din se'}
            </p>
            {nowStock && nowStock.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-3 text-[0.75rem] text-slate-700">
                <span className="font-semibold">Abhi stock:</span>
                {nowStock.map((s) => <span key={s.name} className="tabular-nums">{s.name} <b>{fmtQty(s.balance)}</b> {product?.unit}</span>)}
              </p>
            )}
          </div>
          <Link to={`/products/${productId}`} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cheez kholein <ExternalLink className="h-3.5 w-3.5" /></Link>
          <button type="button" onClick={() => setParams({ product: null })} aria-label="Product filter hatayein" className="rounded-full p-1 text-slate-500 hover:bg-white hover:text-slate-800"><X className="h-4 w-4" /></button>
        </div>
      )}

      {tab === 'analytics' ? (
        <MovementAnalytics data={analyticsQ.data} loading={analyticsQ.isLoading} money={money} />
      ) : listQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[4.5rem] animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : listQ.isError ? (
        <div className="rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200">
          <p className="font-semibold text-rose-800">Entries load nahi ho sakin</p>
          <Button className="mt-3" variant="secondary" size="sm" onClick={() => listQ.refetch()}>Dobara koshish</Button>
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
          {filtersOn ? (<>
            <p className="mt-3 font-semibold text-slate-900">Is filter me koi entry nahi</p>
            <p className="mt-1 text-sm text-slate-500">Muddat lambi karein ya filter hatayein</p>
            <Button className="mt-4" variant="secondary" onClick={clearFilters}>Filter hatayein</Button>
          </>) : (<>
            <p className="mt-3 font-semibold text-slate-900">Is muddat me stock nahi hila</p>
            <p className="mt-1 text-sm text-slate-500">Bikri, kharidari, wapsi, adjustment aur transfer yahan khud darj hote hain</p>
            {range.preset !== 'all' && <Button className="mt-4" variant="secondary" onClick={() => setParams({ p: 'all', from: null, to: null })}>Sab tareekhen dekhein</Button>}
          </>)}
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <section key={d.key} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(d.key, today, yesterday)} <span className="font-normal text-slate-500">· {d.rows.length}</span></h2>
                <p className="text-[0.75rem] tabular-nums text-slate-500">
                  <span className="text-emerald-700">Aaya {money(d.valueIn)}</span> · <span className="text-rose-700">Gaya {money(d.valueOut)}</span>
                </p>
              </header>
              <ul className="divide-y divide-slate-100">
                {d.rows.map((m) => <Row key={m.id} m={m} money={money} productFiltered={!!productId} onProduct={pickProduct} onReference={pickReference} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tab === 'ledger' && data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.8125rem] text-slate-500">{(page - 1) * size + 1}–{Math.min(page * size, data.total)} / {data.total.toLocaleString('en-PK')}</p>
          <div className="flex items-center gap-2">
            {data.pages > 1 && <>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
              <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
            </>}
            <FilterMenu icon={Rows3} label={`${size} fi safha`} value={String(size)} align="right" width="w-48"
              onChange={(v) => setParams({ size: v === '50' ? null : v })} options={PAGE_SIZES.map((s) => ({ value: s, label: `${s} entries` }))} />
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Stock ka hisaab — aasaan tareeqa" onClose={guide.close}
          description="Har cheez ka aana jana yahan khud likha jata hai — aap ko kuch likhna nahi padta"
          steps={[
            { icon: ArrowDownRight, color: '#16a34a', title: 'Aaya (+)', text: describe('in') },
            { icon: ArrowUpRight, color: '#e11d48', title: 'Gaya (−)', text: describe('out') },
            { icon: MousePointerClick, color: '#2563eb', title: 'Maal kahan gaya?', text: 'Kisi bhi cheez ke naam par click karein — us ki poori history pehle din se khul jayegi: kab aaya, kab bika, kab kharab hua.' },
            { icon: Scale, color: '#7c3aed', title: '"Baqi" ka matlab', text: 'Har entry ke baad us branch me kitna stock bacha. Do entries ke beech farq ho to wahi jagah dekhein jahan ginti ghalat hui.' },
            { icon: Hash, color: '#0891b2', title: 'Bill / reference', text: 'Reference par click karein to us bill ki sab entries aa jati hain. Teer wala nishan bill ka safha kholta hai.' },
            { icon: CalendarRange, color: '#d97706', title: 'Filter', text: 'Muddat, qism (Bikri, Wapas, Kharab…), Aaya / Gaya aur "Kis ne" se list chhoti karein. Link copy karein to filter saath jata hai.' },
            { icon: History, color: '#0d9488', title: 'Analytics', text: 'Roz ka aana jana, kis wajah se maal hila, sab se zyada hilne wali cheezein aur kis ne kitni entries kin.' },
            { icon: FileSpreadsheet, color: '#64748b', title: 'Print aur CSV', text: 'Print se A4, PDF ya thermal par is filter ki list (500 tak). CSV is safhe ki entries Excel ke liye.' },
          ]}
          tips={[
            'Value hamesha cost par hai (bechne ki qeemat par nahi), taake nuqsan aur stock ki asal qeemat pata chale.',
            'Kharab ya gum maal ka hisaab "Kharab / Gum" chip se dekhein — har mahine check karein.',
            'Branch ka naam har entry par likha hai; "Baqi" usi branch ka stock hai, poori dukaan ka nahi.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Chip({ active, onClick, label, count, icon: I, color }: { active: boolean; onClick: () => void; label: string; count: number; icon: typeof Layers; color: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition',
        active ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
      <I className="h-4 w-4" style={active ? undefined : { color }} />
      {label}
      <span className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-[0.6875rem] tabular-nums', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{count.toLocaleString('en-PK')}</span>
    </button>
  );
}

/** Page a reference number opens, by its prefix. */
const REF_PAGES: Array<{ prefix: string; to: string; title: string }> = [
  { prefix: 'NF-', to: '/sales', title: 'Bikri ka safha' },
  { prefix: 'RET-', to: '/returns', title: 'Wapsi ka safha' },
  { prefix: 'TR-', to: '/transfers', title: 'Transfers ka safha' },
  { prefix: 'PR-', to: '/purchases', title: 'Kharidari ka safha' },
];

function RefChip({ reference, onFilter }: { reference: string; onFilter: (ref: string) => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const page = REF_PAGES.find((r) => reference.startsWith(r.prefix));
  // Purchase numbers open the bill itself; the list endpoint resolves the number to its id.
  const openPurchase = async () => {
    setBusy(true);
    try {
      const hit = (await purchasesApi.page({ search: reference, limit: 1 })).items.find((p) => p.purchaseNumber === reference);
      navigate(hit ? `/purchases/${hit.id}` : '/purchases');
    } finally { setBusy(false); }
  };
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md bg-slate-100 text-[0.6875rem] font-medium text-slate-700 ring-1 ring-slate-200">
      <button type="button" onClick={() => onFilter(reference)} title="Is reference ki sab entries" className="px-1.5 py-0.5 font-mono hover:bg-slate-200">{reference}</button>
      {reference.startsWith('PO-') ? (
        <button type="button" onClick={openPurchase} disabled={busy} title="Kharidari ka bill kholein" className="border-l border-slate-200 px-1 py-0.5 hover:bg-slate-200 disabled:opacity-50"><ExternalLink className="h-3 w-3" /></button>
      ) : page && (
        <Link to={page.to} title={page.title} className="border-l border-slate-200 px-1 py-0.5 hover:bg-slate-200"><ExternalLink className="h-3 w-3" /></Link>
      )}
    </span>
  );
}

function Row({ m, money, productFiltered, onProduct, onReference }: {
  m: StockMovement;
  money: (n: number) => string;
  productFiltered: boolean;
  onProduct: (id: string) => void;
  onReference: (ref: string) => void;
}) {
  const meta = movementMeta(m.type);
  const isIn = m.quantity > 0;
  return (
    <li className="flex gap-3 px-3 py-2.5 sm:px-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}17`, color: meta.color }} title={meta.hint}>
        <meta.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {productFiltered ? (
            <span className="truncate font-medium text-slate-900">{m.product.name}</span>
          ) : (
            <button type="button" onClick={() => onProduct(m.product.id)} title="Is cheez ki sab history" className="truncate text-left font-medium text-slate-900 hover:text-brand-700 hover:underline">{m.product.name}</button>
          )}
          {m.variant && <span className="rounded bg-slate-100 px-1.5 text-[0.6875rem] text-slate-600">{m.variant.name}</span>}
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', meta.tone)}>{meta.label}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-slate-500">
          <span className="tabular-nums">{timeOf(m.createdAt)}</span>
          {m.shop && <span>· {m.shop.name}</span>}
          {m.createdBy && <span className="inline-flex items-center gap-0.5">· <User className="h-3 w-3" />{m.createdBy.fullName}</span>}
          {m.reference && <RefChip reference={m.reference} onFilter={onReference} />}
        </div>
        {m.note && <p className="mt-0.5 line-clamp-2 text-[0.75rem] italic text-slate-500">{m.note}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn('text-[0.9375rem] font-bold tabular-nums', isIn ? 'text-emerald-600' : 'text-rose-600')}>
          {isIn ? '+' : '−'}{fmtQty(Math.abs(m.quantity))} <span className="text-[0.75rem] font-medium">{m.product.unit}</span>
        </p>
        <p className="text-[0.75rem] tabular-nums text-slate-500" title="Is entry ke baad branch me bacha stock">Baqi {fmtQty(m.balanceAfter)}</p>
        <p className="text-[0.6875rem] tabular-nums text-slate-400">{money(Math.abs(m.value))}</p>
      </div>
    </li>
  );
}
