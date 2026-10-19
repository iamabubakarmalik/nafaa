/**
 * Used phones: what was bought in, taken as exchange or kept for an owner —
 * waiting for a check, ready to sell, in repair, sold — with the seller and
 * CNIC, PTA, condition, cost, price and days in the shop. Analytics shows the
 * profit on resale and the mix of conditions.
 *
 * Keys: N take a phone · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownWideNarrow, BadgeCheck, BarChart3, ClipboardCheck, Clock, Download, Filter, GraduationCap, IdCard, ListChecks, Plus, Recycle, ShieldCheck,
  ShoppingCart, Smartphone, Wallet, Wrench,
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
import { usedPhonesApi, type TradeInSource, type UsedPhone, type UsedPhoneCondition, type UsedPhoneListParams, type UsedPhoneSort, type UsedPhoneStatus } from '../api/used-phones.api';
import type { PtaStatus } from '../api/imei.api';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { CONDITIONS, PTA_LIST, SOURCES, USED_KEY, USED_STATUSES, ageText, conditionOf, dayOnly, ptaOf, sourceOf, usedStatusOf } from '../components/meta';

type Tab = 'list' | 'analytics';
type StatusPick = UsedPhoneStatus | 'all';
const SORTS: Array<{ value: UsedPhoneSort; label: string }> = [
  { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' }, { value: 'priceHigh', label: 'Mehnge pehle' },
  { value: 'margin', label: 'Zyada profit pehle' }, { value: 'sold', label: 'Abhi bike pehle' },
];

export default function UsedPhonesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const shopId = useShopParam();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.MOBILE_IMEI_MANAGE);
  const { sales, cost } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [status, setStatus] = useState<StatusPick>((params.get('status') as StatusPick) || 'IN_STOCK');
  const [source, setSource] = useState<TradeInSource | ''>('');
  const [condition, setCondition] = useState<UsedPhoneCondition | ''>('');
  const [pta, setPta] = useState<PtaStatus | ''>('');
  const [aged, setAged] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [sort, setSort] = useState<UsedPhoneSort>('new');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, source, condition, pta, aged, range, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'list') next.delete('tab'); else next.set('tab', tab);
    if (status === 'IN_STOCK') next.delete('status'); else next.set('status', status);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  const period = resolveRange(range, startHour);
  const q: UsedPhoneListParams = {
    shopId, page, limit: 40, sort, search: query || undefined, status: status === 'all' ? undefined : status,
    source: source || undefined, condition: condition || undefined, ptaStatus: pta || undefined, agedDays: aged ? Number(aged) : undefined,
    ...(period && period.from !== 'all' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [USED_KEY, 'page', q], queryFn: () => usedPhonesApi.list(q), placeholderData: (p) => p, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: ['used-phones-stats'], queryFn: () => usedPhonesApi.stats(), refetchInterval: 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const by = (st: UsedPhoneStatus) => s?.byStatus.find((x) => x.status === st)?.count ?? 0;
  const filtered = !!source || !!condition || !!pta || !!aged || !!query || range.preset !== 'all';
  const clear = () => { setSource(''); setCondition(''); setPta(''); setAged(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (st: StatusPick) => { setTab('list'); setStatus(st); };
  const statusLabel = status === 'all' ? 'Sab phone' : usedStatusOf(status).label;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/used-phones/new'); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const fetchAll = () => usedPhonesApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Used phones — ${statusLabel}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Phone', String(all.total)], ['Cost', formatPKR(all.totals.cost)], ['Bechne ki qeemat', formatPKR(all.totals.resale)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Code' }, { label: 'Phone' }, { label: 'IMEI', wideOnly: true }, { label: 'Kis se', wideOnly: true }, { label: 'Halat' }, { label: 'Cost', align: 'right' }, { label: 'Qeemat', align: 'right' }],
        rows: all.items.map((p) => [p.usedPhoneCode, `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}`, p.imei1, `${p.fromCustomerName ?? ''} ${p.fromCustomerCnic ?? ''}`.trim(),
          usedStatusOf(p.status).label, formatPKR(p.totalCost), formatPKR(p.finalSoldPrice ?? p.resalePrice)]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} phone (kul ${all.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('used-phones.csv', [
      ['Code', 'Brand', 'Model', 'Storage', 'IMEI 1', 'IMEI 2', 'PTA', 'Halat', 'Kaise aaya', 'Kis se', 'Phone', 'CNIC', 'Aaya', 'Status', 'Khareed', 'Repair', 'Cost', 'Bechne ki qeemat', 'Bika'],
      ...all.items.map((p) => [p.usedPhoneCode, p.brand, p.model, p.storage, p.imei1, p.imei2, ptaOf(p.ptaStatus).label, conditionOf(p.condition).label, sourceOf(p.source).label,
        p.fromCustomerName, p.fromCustomerPhone, p.fromCustomerCnic, dayOnly(p.receivedAt), usedStatusOf(p.status).label, p.buybackPrice, p.refurbishCost, p.totalCost, p.resalePrice, p.finalSoldPrice]),
    ]);
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title="Used phones"
        chip={<><Recycle /> Khareed aur exchange</>}
        meta="Khareedein, check karein, POS par bechein — CNIC aur IMEI ke saath"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <Link to="/imei-inventory" className={heroButton}><Smartphone className="h-4 w-4" /><span className="hidden sm:inline">IMEI check</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/used-phones/new" title="Phone lein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Phone lein</Link>}
        </>}
        stats={s ? [
          { label: 'Bikne ko tayyar', value: by('IN_STOCK'), hint: cost(Number(s.inStockCost)) },
          { label: 'Bechne par profit', value: cost(Number(s.potentialProfit)) },
          { label: 'Ab tak bike', value: s.totalSold, hint: `profit ${cost(Number(s.totalProfit))}` },
        ] : [{ label: 'Bikne ko tayyar', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShoppingCart} color="#10b981" label="Bikne ko tayyar" value={by('IN_STOCK')} hint={sales(Number(s.inStockResaleValue))} onClick={() => pick('IN_STOCK')} active={tab === 'list' && status === 'IN_STOCK'} />
          <KpiCard icon={ClipboardCheck} color={by('PENDING_INSPECTION') ? '#d97706' : '#64748b'} label="Check baqi" value={by('PENDING_INSPECTION')} hint="Check ke baad POS par aate hain" onClick={() => pick('PENDING_INSPECTION')} active={tab === 'list' && status === 'PENDING_INSPECTION'} />
          <KpiCard icon={Wrench} color="#f97316" label="Repair me" value={by('REPAIRING')} onClick={() => pick('REPAIRING')} active={tab === 'list' && status === 'REPAIRING'} />
          <KpiCard icon={BadgeCheck} color="#8b5cf6" label="Bik gaye" value={by('SOLD')} hint={sales(Number(s.totalRevenue))} onClick={() => { pick('SOLD'); setSort('sold'); }} active={tab === 'list' && status === 'SOLD'} />
          <KpiCard icon={Clock} color="#64748b" label="Purane (60+ din)" value="Dekhein" hint="Jo bik nahi rahe" onClick={() => { pick('IN_STOCK'); setAged('60'); }} active={tab === 'list' && aged === '60'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Pichle 30 din ki Sale aur shelf ki halat</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="IMEI, code, brand, model, bechne wala, CNIC…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {source && <FilterChip onRemove={() => setSource('')}>{sourceOf(source).label}</FilterChip>}
            {condition && <FilterChip onRemove={() => setCondition('')}>{conditionOf(condition).label}</FilterChip>}
            {pta && <FilterChip onRemove={() => setPta('')}>{ptaOf(pta).label}</FilterChip>}
            {aged && <FilterChip onRemove={() => setAged('')}>{aged}+ din</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={statusLabel} value={status} active={status !== 'IN_STOCK'} onChange={setStatus} width="w-64"
            options={[...USED_STATUSES.map((st) => ({ value: st as StatusPick, label: usedStatusOf(st).label, hint: counts?.[st] != null ? `${counts[st]} phone` : undefined })), { value: 'all' as StatusPick, label: 'Sab phone' }]} />
          <FilterMenu icon={Recycle} label={source ? sourceOf(source).label : 'Kaise aaya'} value={source} active={!!source} onChange={setSource}
            options={[{ value: '' as TradeInSource | '', label: 'Sab' }, ...SOURCES.map((x) => ({ value: x as TradeInSource | '', label: sourceOf(x).label }))]} />
          <FilterMenu icon={BadgeCheck} label={condition ? conditionOf(condition).label : 'Halat'} value={condition} active={!!condition} onChange={setCondition}
            options={[{ value: '' as UsedPhoneCondition | '', label: 'Sab' }, ...CONDITIONS.map((c) => ({ value: c as UsedPhoneCondition | '', label: `${conditionOf(c).label} (${conditionOf(c).score})` }))]} />
          <FilterMenu icon={ShieldCheck} label={pta ? ptaOf(pta).label : 'PTA'} value={pta} active={!!pta} onChange={setPta}
            options={[{ value: '' as PtaStatus | '', label: 'Sab' }, ...PTA_LIST.map((p) => ({ value: p as PtaStatus | '', label: ptaOf(p).label }))]} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={status === 'SOLD' ? 'Bikne ki date' : 'Aane ki date'} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? 'Tarteeb'} value={sort} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> phone lein · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'list', label: 'Phone', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <UsedAnalytics onCondition={(c) => { setCondition(c); pick('IN_STOCK'); }} /> : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{statusLabel}</span>
            <span className="font-semibold text-slate-900">{data.total} phone · cost {cost(data.totals.cost)}</span>
            {status !== 'SOLD' && <span className="text-emerald-700">bechne par {sales(data.totals.resale)}</span>}
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
            <Recycle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi phone nahi' : status === 'PENDING_INSPECTION' ? 'Koi phone check ke liye nahi' : 'Koi phone nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Customer se phone khareedein ya exchange me lein — CNIC aur IMEI ke saath record rahega.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => navigate('/used-phones/new')} leftIcon={<Plus className="h-4 w-4" />}>Phone lein</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
              {!filtered && status !== 'all' && <Button variant="ghost" onClick={() => setStatus('all')}>Sab phone dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((p) => <UsedRow key={p.id} p={p} money={sales} costOf={cost} />)}
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

      {guide.isOpen && (
        <PageGuide title="Used phones — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#6366f1', title: 'Phone lein', text: '"Phone lein": bechne wale ka naam, phone aur CNIC; phone ka IMEI, PTA aur halat; aur kitne me liya. Cash me liya to paise galle se nikalte hain.' },
            { icon: IdCard, color: '#e11d48', title: 'Pehle check', text: 'IMEI check se dekhein ke phone pehle kahin record me to nahi, aur CNIC ki tasveer rakhein.' },
            { icon: ClipboardCheck, color: '#d97706', title: 'Check aur tayyar', text: 'Naya aaya phone "Check baqi" me hota hai. Check ke baad "Bikne ko tayyar" ho kar POS ke Used tab me aata hai.' },
            { icon: ShoppingCart, color: '#10b981', title: 'Bechna', text: 'POS par Used tab se phone bill me daalein. Bill se hi profit, cash aur khata theek rehte hain.' },
            { icon: Recycle, color: '#f97316', title: 'Exchange', text: 'Naya phone lene wale ka purana phone "Exchange" me lein. Phir POS par Split / Trade-in se us ki qeemat bill se katein.' },
            { icon: Wallet, color: '#0891b2', title: 'Profit', text: 'Cost = khareed + repair. Bikne par profit Sales aur Profit report me aata hai.' },
          ]}
          tips={['60 din se zyada para phone sasta hota jata hai — "Purane" card se dekhein.', 'Phone lene aur badalne ke liye "Mobile IMEI sambhalna" ki permission chahiye.']}
          shortcuts={[['N', 'phone lein'], ['/', 'dhoondein'], ['1', 'phone'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function UsedRow({ p, money, costOf }: { p: UsedPhone; money: (n: number) => string; costOf: (n: number) => string }) {
  const st = usedStatusOf(p.status);
  const sold = p.status === 'SOLD';
  const old = p.status === 'IN_STOCK' && (p.daysInStock ?? 0) >= 60;
  const margin = (sold ? Number(p.finalSoldPrice ?? 0) : Number(p.resalePrice)) - Number(p.totalCost);
  return (
    <li>
      <Link to={`/used-phones/${p.id}`} className="flex items-start gap-3 px-3 py-3 hover:bg-slate-50/70 sm:px-4">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', sold ? 'bg-violet-50 text-violet-600' : old ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600')}>
          <Recycle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{p.brand} {p.model}{p.storage ? ` ${p.storage}` : ''}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', conditionOf(p.condition).tone)}>{conditionOf(p.condition).label}</span>
            <span className="text-[0.6875rem] font-medium" style={{ color: ptaOf(p.ptaStatus).color }}>{ptaOf(p.ptaStatus).label}</span>
          </div>
          <p className="mt-0.5 font-mono text-[0.75rem] text-slate-500">{p.usedPhoneCode} · {p.imei1}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-[0.75rem] text-slate-500">
            <span>{sourceOf(p.source).label}{p.fromCustomerName ? ` · ${p.fromCustomerName}` : ''}{p.fromCustomerCnic ? '' : p.source !== 'CONSIGNMENT' ? ' · CNIC nahi' : ''}</span>
            <span className={cn(old && 'font-semibold text-amber-700')}>{sold ? `Bika ${dayOnly(p.soldAt)}` : `${ageText(p.daysInStock)} se`}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold tabular-nums text-slate-900">{money(sold ? Number(p.finalSoldPrice ?? 0) : p.resalePrice)}</p>
          <p className="text-[0.75rem] tabular-nums text-slate-500">cost {costOf(p.totalCost)}</p>
          {(sold || Number(p.resalePrice) > 0) && <p className={cn('text-[0.75rem] font-semibold tabular-nums', margin < 0 ? 'text-rose-600' : 'text-emerald-700')}>{margin >= 0 ? '+' : ''}{costOf(margin)}</p>}
        </div>
      </Link>
    </li>
  );
}

function UsedAnalytics({ onCondition }: { onCondition: (c: UsedPhoneCondition) => void }) {
  const { cost, sales } = useMasked();
  const q = useQuery({ queryKey: ['used-phone-analytics', 30], queryFn: () => mobileReportsApi.usedPhoneAnalytics(30), staleTime: 60_000 });
  const d = q.data;
  if (q.isLoading || !d) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const max = Math.max(1, ...d.byCondition.map((c) => c.count));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Pichle 30 din</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <Box label="Bike" value={String(d.soldCount)} />
          <Box label="Sale" value={sales(d.soldRevenue)} />
          <Box label="Cost" value={cost(d.soldCogs)} />
          <Box label="Profit" value={cost(d.soldProfit)} tone={d.soldProfit < 0 ? 'text-rose-600' : 'text-emerald-700'} />
        </dl>
        <p className="mt-3 text-[0.75rem] text-slate-500">Shelf par {d.inStockCount} phone · cost {cost(d.inStockCost)} · bechne par profit {cost(d.inStockPotentialProfit)}</p>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Shelf ke phone — halat</h3>
        <ul className="mt-4 space-y-3">
          {d.byCondition.length === 0 && <li className="text-[0.8125rem] text-slate-500">Shelf par koi phone nahi</li>}
          {d.byCondition.map((c) => (
            <li key={c.condition}>
              <button type="button" onClick={() => onCondition(c.condition)} className="w-full text-left">
                <div className="flex justify-between text-[0.8125rem]"><span className="font-medium text-slate-700">{conditionOf(c.condition).label}</span><span className="tabular-nums text-slate-600">{c.count} · cost {cost(c.totalCost)}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: conditionOf(c.condition).color }} /></div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Box({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums', tone)}>{value}</dd></div>;
}
