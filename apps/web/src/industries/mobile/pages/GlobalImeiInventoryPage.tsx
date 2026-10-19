/**
 * IMEI stock: every new phone by its IMEI — what is on the shelf and for how
 * long, PTA status, what was sold, to whom and the warranty left. Opened from
 * a product (/products/:id/imei) it shows that model only.
 *
 * Keys: N add IMEIs · C IMEI check · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, ArrowLeft, BarChart3, Calendar, CheckCircle2, Clock, Download, Filter, GraduationCap, Hash, ListChecks,
  Pencil, Plus, ScanSearch, ShieldCheck, Smartphone, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { imeiApi, type ImeiListParams, type ImeiRow, type ImeiSort, type ImeiStatus, type PtaStatus } from '../api/imei.api';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { AddImeisModal } from '../components/imei/AddImeisModal';
import { EditImeiModal } from '../components/imei/EditImeiModal';
import { ImeiLookupModal } from '../components/imei/ImeiLookupModal';
import { IMEI_KEY, IMEI_STATUSES, PTA_LIST, ageText, dayOnly, imeiStatusOf, ptaOf } from '../components/meta';

type Tab = 'list' | 'analytics';
type StatusPick = ImeiStatus | 'all';
const AGED = [{ value: '', label: 'Koi bhi' }, { value: '30', label: '30 din se purane' }, { value: '60', label: '60 din se purane' }, { value: '90', label: '90 din se purane' }];
const SORTS: Array<{ value: ImeiSort; label: string }> = [
  { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' }, { value: 'sold', label: 'Abhi bike pehle' },
  { value: 'costHigh', label: 'Mehnge pehle' }, { value: 'costLow', label: 'Saste pehle' },
];

export default function GlobalImeiInventoryPage() {
  const { id: productId } = useParams();
  const [params, setParams] = useSearchParams();
  const shopId = useShopParam();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.MOBILE_IMEI_MANAGE);
  const { sales, cost } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [status, setStatus] = useState<StatusPick>((params.get('status') as StatusPick) || 'IN_STOCK');
  const [pta, setPta] = useState<PtaStatus | ''>('');
  const [aged, setAged] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [sort, setSort] = useState<ImeiSort>('new');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [lookup, setLookup] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImeiRow | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, pta, aged, range, sort, query, productId]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (status === 'IN_STOCK') next.delete('status'); else next.set('status', status);
    next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const period = resolveRange(range, startHour);
  const q: ImeiListParams = {
    productId, shopId, page, limit: 50, sort, search: query || undefined,
    status: status === 'all' ? undefined : status, ptaStatus: pta || undefined, agedDays: aged ? Number(aged) : undefined,
    ...(period && period.from !== 'all' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [IMEI_KEY, 'page', q], queryFn: () => imeiApi.listAll(q), placeholderData: (p) => p, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: ['imei-stats', shopId], queryFn: () => imeiApi.stats(shopId), refetchInterval: 60_000 });
  const productQ = useQuery({ queryKey: ['product', productId], queryFn: () => productsApi.getOne(productId!), enabled: !!productId });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const filtered = !!pta || !!aged || !!query || range.preset !== 'all';
  const clear = () => { setPta(''); setAged(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (st: StatusPick, extra?: () => void) => { setTab('list'); setStatus(st); extra?.(); };
  const nonPta = s?.byPta?.find((b) => b.ptaStatus === 'NON_PTA')?.count ?? 0;
  const statusLabel = status === 'all' ? 'Sab phone' : imeiStatusOf(status).label;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setAdding(true); }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setLookup(''); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => imeiApi.listAll({ ...q, page: 1, limit: 500 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `IMEI stock — ${statusLabel}${productQ.data ? ` · ${productQ.data.name}` : ''}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Phone', String(all.total)], ['Cost', formatPKR(all.totals.cost)], ...(all.totals.sold ? [['Bika', formatPKR(all.totals.sold)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Phone' }, { label: 'IMEI' }, { label: 'PTA', wideOnly: true }, { label: 'Halat' }, { label: 'Din', align: 'right', wideOnly: true }, { label: 'Cost', align: 'right' }],
        rows: all.items.map((r) => [
          `${r.product.name}${r.variant ? ` ${r.variant.name}` : ''}`, `${r.imei1}${r.imei2 ? ` / ${r.imei2}` : ''}`, ptaOf(r.ptaStatus).label,
          `${imeiStatusOf(r.status).label}${r.sale ? ` · ${r.sale.saleNumber}` : ''}`, r.status === 'IN_STOCK' ? String(r.daysInStock ?? '') : '', formatPKR(r.costPrice),
        ]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} phone (kul ${all.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv(`imei-${statusLabel.toLowerCase().replace(/\s+/g, '-')}.csv`, [
      ['Phone', 'Variant', 'IMEI 1', 'IMEI 2', 'PTA', 'Halat', 'Aaya', 'Din shelf par', 'Cost', 'Bechne ki qeemat', 'Bika', 'Bill', 'Customer', 'Branch'],
      ...all.items.map((r) => [r.product.name, r.variant?.name, r.imei1, r.imei2, ptaOf(r.ptaStatus).label, imeiStatusOf(r.status).label, dayOnly(r.purchasedAt),
        r.daysInStock, r.costPrice, r.salePrice, r.soldPrice, r.sale?.saleNumber, r.sale?.customer?.name, r.shop?.name]),
    ]);
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title={productQ.data ? productQ.data.name : 'IMEI stock'}
        chip={<><Smartphone /> {productId ? 'Is model ke phone' : 'Naye phone'}</>}
        meta="Har phone apne IMEI se — shelf, PTA, bill aur warranty"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          {productId && <Link to={`/mobile-products/${productId}`} className={heroButton}><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Product</span></Link>}
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={() => setLookup('')} title="IMEI check (C)" className={heroButton}><ScanSearch className="h-4 w-4" /><span className="hidden sm:inline">IMEI check</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} title="Naye IMEI (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> IMEI daalein</button>}
        </>}
        stats={s ? [
          { label: 'Shelf par', value: s.inStock, hint: cost(Number(s.stockValue ?? 0)) },
          { label: 'Is mahine bike', value: s.soldThisMonth ?? 0, hint: sales(s.soldThisMonthValue ?? 0) },
          { label: 'Aaj bike', value: s.soldToday ?? 0 },
        ] : [{ label: 'Shelf par', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Smartphone} color="#10b981" label="Shelf par" value={s.inStock} hint={`Bechne par ${sales(Number(s.retailValue ?? 0))}`} onClick={() => pick('IN_STOCK', () => setAged(''))} active={tab === 'list' && status === 'IN_STOCK' && !aged} />
          <KpiCard icon={Clock} color={s.aged60 ? '#d97706' : '#64748b'} label="60 din se purane" value={s.aged60 ?? 0} hint={s.aged60 ? 'Qeemat girne se pehle bechein' : 'Sab taaza'} onClick={() => pick('IN_STOCK', () => setAged('60'))} active={tab === 'list' && aged === '60'} />
          <KpiCard icon={AlertTriangle} color={nonPta ? '#e11d48' : '#64748b'} label="Non-PTA shelf par" value={nonPta} hint="Customer ko zaroor batayein" onClick={() => pick('IN_STOCK', () => setPta('NON_PTA'))} active={tab === 'list' && pta === 'NON_PTA'} />
          <KpiCard icon={CheckCircle2} color="#8b5cf6" label="Bik chuke" value={s.sold} hint={`Is mahine profit ${cost(Math.max((s.soldThisMonthValue ?? 0) - (s.soldThisMonthCost ?? 0), 0))}`} onClick={() => pick('SOLD', () => setSort('sold'))} active={tab === 'list' && status === 'SOLD'} />
          <KpiCard icon={Wallet} color={(s.damaged ?? 0) + (s.lost ?? 0) ? '#e11d48' : '#64748b'} label="Kharab / gum" value={(s.damaged ?? 0) + (s.lost ?? 0)} hint={s.reserved ? `${s.reserved} rakhe hue` : undefined} onClick={() => pick('DAMAGED')} active={tab === 'list' && status === 'DAMAGED'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Shelf ke phone — PTA aur kitne din se pare hain</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="IMEI, model, rang…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {pta && <FilterChip onRemove={() => setPta('')}>{ptaOf(pta).label}</FilterChip>}
            {aged && <FilterChip onRemove={() => setAged('')}>{aged} din se purane</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{status === 'SOLD' ? 'Bika' : 'Aaya'}: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={statusLabel} value={status} active={status !== 'IN_STOCK'} onChange={setStatus} width="w-64"
            options={[...IMEI_STATUSES.map((st) => ({ value: st as StatusPick, label: imeiStatusOf(st).label, hint: counts?.[st] != null ? `${counts[st]} phone` : undefined })), { value: 'all' as StatusPick, label: 'Sab phone' }]} />
          <FilterMenu icon={ShieldCheck} label={pta ? ptaOf(pta).label : 'PTA'} value={pta} active={!!pta} onChange={setPta}
            options={[{ value: '' as PtaStatus | '', label: 'Sab' }, ...PTA_LIST.map((p) => ({ value: p as PtaStatus | '', label: ptaOf(p).label }))]} />
          <FilterMenu icon={Clock} label={aged ? `${aged}+ din` : 'Kitna purana'} value={aged} active={!!aged} onChange={setAged} options={AGED} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={status === 'SOLD' ? 'Bikne ki date' : 'Aane ki date'} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? 'Tarteeb'} value={sort} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> IMEI · </>}<Kbd>C</Kbd> check · <Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'list', label: 'Phone', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <ImeiAnalytics shopId={shopId} onBucket={(days) => pick('IN_STOCK', () => setAged(days))} onPta={(p) => pick('IN_STOCK', () => setPta(p))} /> : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{statusLabel}</span>
            <span className="font-semibold text-slate-900">{data.total} phone · cost {cost(data.totals.cost)}</span>
            {data.totals.sold > 0 && <span className="text-violet-700">bike {sales(data.totals.sold)}</span>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Phone load nahi hue</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Smartphone className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi phone nahi' : status === 'IN_STOCK' ? 'Shelf par koi phone nahi' : 'Koi phone nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Naye phone aayein to unke IMEI yahan daalein — POS par wohi phone bikenge.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>IMEI daalein</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
              {!filtered && status !== 'all' && <Button variant="ghost" onClick={() => setStatus('all')}>Sab phone dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((r) => <ImeiRowItem key={r.id} r={r} money={sales} costOf={cost} onOpen={() => setEditing(r)} onCheck={() => setLookup(r.imei1)} />)}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {adding && <AddImeisModal productId={productId} onClose={() => setAdding(false)} />}
      {lookup !== null && <ImeiLookupModal initial={lookup} onClose={() => setLookup(null)} />}
      {editing && <EditImeiModal row={editing} canManage={canManage} onClose={() => setEditing(null)} />}

      {guide.isOpen && (
        <PageGuide title="IMEI stock — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Naye phone', text: 'Purchase ke baad "IMEI daalein": model chunein, dabbe scan karein. Jitne IMEI, utna stock — purchase wala stock barabar ho jata hai.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'PTA', text: 'Har phone ki PTA halat likhein. Non-PTA phone bechne se pehle customer ko batayein — SIM kuch din baad band ho jati hai.' },
            { icon: ScanSearch, color: '#7c3aed', title: 'IMEI check', text: 'Customer warranty ke liye aaye ya koi phone bechne aaye — IMEI check se pata chalta hai kab bika, kis ko, warranty kitni baqi, aur purana record.' },
            { icon: Clock, color: '#d97706', title: 'Purana maal', text: '60 din se pare phone ki qeemat girti hai. Peela card dabayein aur unhe pehle bechein.' },
            { icon: Pencil, color: '#e11d48', title: 'Kharab ya gum', text: 'Phone par click kar ke halat "Kharab" ya "Gum" karein — stock se nikal kar nuqsan me likha jata hai.' },
            { icon: Hash, color: '#0891b2', title: 'Bika hua phone', text: 'Bika phone sirf Return se wapas aata hai — Sales me bill khol kar Return karein.' },
          ]}
          tips={['Phone POS par IMEI se bikta hai, is liye IMEI ke bagair phone counter par nahi aata.', 'IMEI daalne ke liye "Mobile IMEI sambhalna" ki permission chahiye.']}
          shortcuts={[['N', 'IMEI daalein'], ['C', 'IMEI check'], ['/', 'dhoondein'], ['1', 'phone'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ImeiRowItem({ r, money, costOf, onOpen, onCheck }: { r: ImeiRow; money: (n: number) => string; costOf: (n: number) => string; onOpen: () => void; onCheck: () => void }) {
  const st = imeiStatusOf(r.status);
  const old = r.status === 'IN_STOCK' && (r.daysInStock ?? 0) >= 60;
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.status === 'IN_STOCK' ? (old ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600') : 'bg-slate-100 text-slate-500')}>
        <Smartphone className="h-5 w-5" />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{r.product.name}{r.variant ? ` · ${r.variant.name}` : ''}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', ptaOf(r.ptaStatus).tone)}>{ptaOf(r.ptaStatus).label}</span>
        </div>
        <p className="mt-0.5 font-mono text-[0.8125rem] text-slate-600">{r.imei1}{r.imei2 ? ` / ${r.imei2}` : ''}{r.color ? <span className="font-sans text-slate-500"> · {r.color}</span> : null}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
          {r.status === 'IN_STOCK' ? (
            <span className={cn('inline-flex items-center gap-1', old && 'font-semibold text-amber-700')}><Calendar className="h-3 w-3" />{ageText(r.daysInStock)} se shelf par</span>
          ) : r.sale ? (
            <span>{r.sale.saleNumber}{r.sale.customer ? ` · ${r.sale.customer.name}` : ''}{r.soldAt ? ` · ${dayOnly(r.soldAt)}` : ''}</span>
          ) : <span>Aaya {dayOnly(r.purchasedAt)}</span>}
          {r.status === 'SOLD' && r.warranty.months > 0 && (
            <span className={r.warranty.active ? 'text-emerald-700' : 'text-slate-400'}>{r.warranty.active ? `Warranty ${r.warranty.daysLeft} din` : 'Warranty khatam'}</span>
          )}
          {r.shop && <span className="text-slate-400">{r.shop.name}</span>}
        </p>
      </button>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{r.status === 'SOLD' && r.soldPrice ? money(r.soldPrice) : money(r.salePrice)}</p>
        <p className="text-[0.75rem] tabular-nums text-slate-500">cost {costOf(r.costPrice)}</p>
        <button type="button" onClick={onCheck} className="mt-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">Check</button>
      </div>
    </li>
  );
}

/** PTA mix and shelf age of the phones on hand. */
function ImeiAnalytics({ shopId, onBucket, onPta }: { shopId?: string; onBucket: (days: string) => void; onPta: (p: PtaStatus) => void }) {
  const { cost } = useMasked();
  const aging = useQuery({ queryKey: ['mobile-stock-aging', shopId], queryFn: () => mobileReportsApi.stockAging(shopId), staleTime: 60_000 });
  const pta = useQuery({ queryKey: ['mobile-pta', shopId], queryFn: () => imeiApi.stats(shopId), staleTime: 60_000 });
  if (aging.isLoading || pta.isLoading) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>;
  const buckets = aging.data?.buckets ?? [];
  const maxB = Math.max(1, ...buckets.map((b) => b.phones));
  const byPta = pta.data?.byPta ?? [];
  const total = Math.max(1, byPta.reduce((s2, b) => s2 + b.count, 0));
  const days = (k: string) => (k === '31-60' ? '30' : k === '61-90' ? '60' : k === '90+' ? '90' : '');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Kitne din se shelf par</h3>
        <p className="text-[0.75rem] text-slate-500">Naye phone — purane pehle bechein</p>
        <ul className="mt-4 space-y-3">
          {buckets.map((b) => (
            <li key={b.key}>
              <button type="button" onClick={() => onBucket(days(b.key))} className="w-full text-left">
                <div className="flex justify-between text-[0.8125rem]"><span className="font-medium text-slate-700">{b.label}</span><span className="tabular-nums text-slate-600">{b.phones} phone · {cost(b.phoneValue)}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className={cn('h-2.5 rounded-full', b.key === '0-30' ? 'bg-emerald-500' : b.key === '31-60' ? 'bg-amber-400' : 'bg-rose-500')} style={{ width: `${(b.phones / maxB) * 100}%` }} /></div>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">PTA — shelf ke phone</h3>
        <p className="text-[0.75rem] text-slate-500">Non-PTA aur Patched phone par customer ko batana zaroori</p>
        <ul className="mt-4 space-y-3">
          {byPta.length === 0 && <li className="text-[0.8125rem] text-slate-500">Shelf par koi phone nahi</li>}
          {byPta.map((b) => (
            <li key={b.ptaStatus}>
              <button type="button" onClick={() => onPta(b.ptaStatus)} className="w-full text-left">
                <div className="flex justify-between text-[0.8125rem]"><span className="font-medium" style={{ color: ptaOf(b.ptaStatus).color }}>{ptaOf(b.ptaStatus).label}</span><span className="tabular-nums text-slate-600">{b.count} phone{b.taxPaid ? ` · tax ${formatPKR(b.taxPaid)}` : ''}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(b.count / total) * 100}%`, backgroundColor: ptaOf(b.ptaStatus).color }} /></div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
