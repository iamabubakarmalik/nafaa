/**
 * Stock moved between branches, for every industry: what is coming in,
 * what went out, what is still on the way, short deliveries and analytics.
 * Sending covers plain products (any unit, variants), carpet rolls, IMEI
 * phones, used phones and electronics serials; receiving records what
 * actually arrived. Staff tied to a branch see only transfers touching it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Ban, BarChart3, Building2, CalendarRange, Clock, GraduationCap, ListChecks, ListFilter,
  PackageCheck, Plus, Send, ShieldCheck, Truck,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, type ViewTab,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore, useCanSwitchShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { transfersApi, type StockTransfer, type TransferQuery, type TransferStatusFilter } from '../api/transfers.api';
import { transfersListDoc } from '../components/print';
import { ReceiveModal } from '../components/ReceiveModal';
import { TransferAnalytics } from '../components/TransferAnalytics';
import { TransferDetail } from '../components/TransferDetail';
import { TransferForm } from '../components/TransferForm';
import { TransferPrintModal } from '../components/TransferPrintModal';
import { StatusBadge, dayTime, duration, preview, shortValue } from '../components/transferMeta';
import { t as tr } from '@core/i18n';

type Tab = 'in' | 'out' | 'all' | 'analytics';

/** Everything whose stock a transfer changes. */
const STOCK_KEYS = /transfer|product|stock|carpet|imei|used-phone|serial|mobile-pos|electronics|dashboard-overview/;

export default function TransfersPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const industry = useCurrentIndustry();
  const currentShop = useShopParam();
  const owner = useCanSwitchShops();
  const user = useAuthStore((s) => s.user);
  const locked = owner ? null : user?.shopId ?? user?.assignedShop?.id ?? null;
  const canManage = usePermission(PERMISSIONS.STOCK_TRANSFERS_MANAGE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [tab, setTab] = useState<Tab>('all');
  const [status, setStatus] = useState<TransferStatusFilter>('all');
  const [branch, setBranch] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<StockTransfer | null>(null);
  const [receiving, setReceiving] = useState<StockTransfer | null>(null);
  const [printing, setPrinting] = useState<StockTransfer | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, tab, status, branch, query]);

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: () => shopsApi.list(), staleTime: 60_000, enabled: owner });
  const shopName = (id?: string | null) => (shopsQ.data ?? []).find((s) => s.id === id)?.name ?? user?.assignedShop?.name;
  /** The branch "in" and "out" are measured against. */
  const viewShop = locked ?? (branch || currentShop);
  const direction = viewShop && (tab === 'in' || tab === 'out') ? tab : 'all';
  useEffect(() => { if (!viewShop) setTab((t) => (t === 'in' || t === 'out' ? 'all' : t)); }, [viewShop]);

  const period = resolveRange(range, startHour);
  const base: TransferQuery = { ...(period ?? {}), direction, shopId: branch || undefined, search: query || undefined };
  const q: TransferQuery = { ...base, status, page, limit: 30 };
  const listQ = useQuery({ queryKey: ['transfers', 'list', q], queryFn: () => transfersApi.list(q), placeholderData: (prev) => prev, enabled: tab !== 'analytics' });
  const countsQ = useQuery({ queryKey: ['transfers', 'counts', base], queryFn: () => transfersApi.list({ ...base, limit: 1 }), enabled: tab !== 'analytics' });
  const statsQ = useQuery({ queryKey: ['transfers', 'analytics', period, branch], queryFn: () => transfersApi.analytics({ ...(period ?? {}), shopId: branch || undefined }) });
  const onWayQ = useQuery({ queryKey: ['transfers', 'on-way', branch], queryFn: () => transfersApi.list({ status: 'IN_TRANSIT', shopId: branch || undefined, limit: 100 }) });

  const data = listQ.data;
  const counts = countsQ.data?.totals;
  const stats = statsQ.data?.totals;
  const onWay = onWayQ.data;
  const waiting = useMemo(() => (onWay?.items ?? []).filter((t) => !viewShop || t.toShopId === viewShop), [onWay, viewShop]);

  const canReceive = (t: StockTransfer) => canManage && t.status === 'IN_TRANSIT' && (!locked || locked === t.toShopId);
  const canCancel = (t: StockTransfer) => canManage && t.status === 'IN_TRANSIT' && (!locked || locked === t.fromShopId);

  const refresh = () => qc.invalidateQueries({ predicate: (x) => STOCK_KEYS.test(String(x.queryKey[0] ?? '')) });

  const scope = viewShop ? shopName(viewShop) ?? tr('Branch') : tr('Sab branches');
  const printDoc = async () => transfersListDoc(await transfersApi.list({ ...q, page: 1, limit: 200 }), period ? `${period.from} — ${period.to}` : tr('Sab tareekhen'), scope);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setSending(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const statusOptions: Array<{ value: TransferStatusFilter; label: string; hint?: string }> = [
    { value: 'all', label: tr('Har halat'), hint: counts ? tr('{{count}} transfer', { count: counts.count }) : undefined },
    { value: 'IN_TRANSIT', label: tr('Raste me'), hint: counts ? String(counts.inTransit) : undefined },
    { value: 'RECEIVED', label: tr('Receive'), hint: counts ? String(counts.received) : undefined },
    { value: 'CANCELLED', label: tr('Cancel'), hint: counts ? String(counts.cancelled) : undefined },
  ];
  const branchOptions = [{ value: '', label: currentShop ? tr('Upar chuni branch') : tr('Sab branches') }, ...(shopsQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))];
  const tabs: ViewTab<Tab>[] = ([
    ...(viewShop ? [{ id: 'in', label: tr('Aane wala'), icon: ArrowDownLeft }, { id: 'out', label: tr('Bheja hua'), icon: ArrowUpRight }] : []),
    { id: 'all', label: tr('Sab'), icon: ListChecks },
    { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
  ] as ViewTab<Tab>[]).map((x) => ({ ...x, count: x.id === tab && tab !== 'analytics' ? counts?.count : undefined }));
  const hasFilters = status !== 'all' || !!branch || !!search.trim();
  const clearFilters = () => { setStatus('all'); setBranch(''); setSearch(''); };
  const toggleStatus = (s: TransferStatusFilter) => { setStatus((x) => (x === s ? 'all' : s)); setTab((t) => (t === 'analytics' ? 'all' : t)); };

  return (
    <PageShell>
      <PageHero
        title={tr('Stock transfer')}
        chip={<><Truck /> {viewShop ? scope : tr('Branches ke beech maal')}</>}
        meta={tr('Bhejte hi stock nikalta hai, receive par barhta hai')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading || onWayQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setSending(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Maal bhejein')}</button>}
        </>}
        stats={[
          { label: tr('Kul maal gaya · {{value}} transfer', { value: stats?.count ?? 0 }), value: money(stats?.value ?? 0) },
          { label: tr('Raste me'), value: money(onWay?.totals.inTransitValue ?? 0), hint: tr('{{value}} transfer', { value: onWay?.total ?? 0 }) },
          { label: tr('Ausat receiving waqt'), value: stats?.avgHours != null ? `${stats.avgHours} ghante` : '—' },
          { label: tr('Kam aaya'), value: money(stats?.shortValue ?? 0) },
        ]}
      />

      <KpiRow>
        {statsQ.isLoading || onWayQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#2563eb" label={tr('Receive ka intezar')} value={String(waiting.length)} hint={waiting.length ? `${money(waiting.reduce((s, t) => s + t.value, 0))} · ${viewShop ? 'is branch ke liye' : 'sab branches'}` : tr('Kuch baqi nahi')} />
            <KpiCard icon={Truck} color="#d97706" label={tr('Raste me (is period)')} value={String(stats?.inTransit ?? 0)} hint={tr('Dabayein — sirf yeh dekhein')} onClick={() => toggleStatus('IN_TRANSIT')} active={status === 'IN_TRANSIT'} />
            <KpiCard icon={PackageCheck} color="#16a34a" label={tr('Receive')} value={String(stats?.received ?? 0)} hint={stats?.avgHours != null ? tr('ausat {{avgHours}} ghante me', { avgHours: stats.avgHours }) : tr('Dabayein')} onClick={() => toggleStatus('RECEIVED')} active={status === 'RECEIVED'} />
            <KpiCard icon={AlertTriangle} color="#dc2626" label={tr('Kam aaya')} value={money(stats?.shortValue ?? 0)} hint={stats?.shortValue ? tr('Raste me gum / toota') : tr('Koi kami nahi')} />
            <KpiCard icon={Ban} color="#64748b" label={tr('Cancel')} value={String(stats?.cancelled ?? 0)} hint={tr('Dabayein')} onClick={() => toggleStatus('CANCELLED')} active={status === 'CANCELLED'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch}
          placeholder={tr('Transfer #, product, IMEI ya note…')} label={tr('Transfer search')} />}
        chips={hasFilters ? <>
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{statusOptions.find((x) => x.value === status)?.label}</FilterChip>}
          {branch && <FilterChip onRemove={() => setBranch('')}>{shopName(branch) ?? tr('Branch')}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={clearFilters}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={ListFilter} label={tr('Halat')} value={status} active={status !== 'all'} options={statusOptions} onChange={setStatus} />
        {owner && <FilterMenu icon={Building2} label={tr('Branch')} value={branch} active={!!branch} onChange={setBranch} options={branchOptions} width="w-72" align="right" />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs}
        hint={tab === 'analytics' ? tr('Saare charts upar chuni period ke hain') : data ? <>{tr('Maal')}{' '} <b className="tabular-nums text-slate-800">{money(data.totals.value)}</b></> : undefined} />

      {tab === 'analytics' ? (
        <TransferAnalytics data={statsQ.data} loading={statsQ.isLoading} money={money} />
      ) : (<>
        {waiting.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-blue-900">
              <Clock className="h-4 w-4" /> {viewShop ? tr('{{scope}} ke liye raste me', { scope }) : tr('Receive ka intezar')} · {waiting.length}
            </p>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {waiting.slice(0, 12).map((t) => (
                <li key={t.id} className="w-64 shrink-0 rounded-xl bg-white p-2.5 ring-1 ring-blue-100">
                  <button type="button" onClick={() => setViewing(t)} className="block w-full text-start">
                    <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-900">{t.fromShop.name}<ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 rtl-flip" />{t.toShop.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{tr('{{transferNumber}} · {{count}} cheezein · {{duration}} se', { transferNumber: t.transferNumber, count: t.items.length, duration: duration(t.transferredAt ?? t.createdAt) })}</p>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{money(t.value)}</span>
                    {canReceive(t) && <Button size="sm" onClick={() => setReceiving(t)} leftIcon={<PackageCheck className="h-3.5 w-3.5" />}>{tr('Receive karein')}</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : !data?.items.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{tr('Is filter me koi transfer nahi')}</p>
            <p className="mt-1 text-sm text-slate-500">{tr('Period ya filter badlein, ya dusri branch ko maal bhejein')}</p>
            {canManage && <Button className="mt-4" onClick={() => setSending(true)} leftIcon={<Plus className="h-4 w-4" />}>{tr('Maal bhejein')}</Button>}
          </div>
        ) : (
          <ul className="space-y-2">
            {data.items.map((t) => <Row key={t.id} t={t} money={money} viewShop={viewShop} canReceive={canReceive(t)} onOpen={() => setViewing(t)} onReceive={() => setReceiving(t)} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
            <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
          </div>
        )}
      </>)}

      {guide.isOpen && (
        <PageGuide title={tr('Stock transfer — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Send, color: '#2563eb', title: tr('Maal bhejna'), text: tr('"Maal bhejein" dabayein, kahan se aur kahan chunein, cheezein search ya scan karein, quantity likhein aur pakka karein. Carton ya box me bhi bhej sakte hain.') },
            { icon: Truck, color: '#d97706', title: tr('Raste me ka matlab'), text: tr('Bhejte hi maal bhejne wali branch ke stock se nikal jata hai, magar lene wali me tab tak nahi judta jab tak wahan receive na ho. Yeh maal "Raste me" dikhta hai.') },
            { icon: PackageCheck, color: '#16a34a', title: tr('Receive karna'), text: tr('Lene wali branch upar wali neeli patti ya transfer khol kar "Receive karein" dabaye. Har cheez poori maani jati hai — kam aayi ho to wohi ginti likhein.') },
            { icon: AlertTriangle, color: '#dc2626', title: tr('Kam aaya to kya'), text: tr('Jo kam aaya woh kisi stock me nahi judta — raste ka nuqsan darj hota hai, list me laal nishan aata hai aur owner ko notification jati hai.') },
            { icon: Ban, color: '#64748b', title: tr('Cancel kab hota hai'), text: tr('Sirf jab tak maal raste me hai, aur sirf bhejne wali branch (ya owner) kar sakti hai. Saara maal wapas bhejne wali branch ke stock me aa jata hai.') },
            { icon: ShieldCheck, color: '#7c3aed', title: tr('Branch ke usool'), text: tr('Staff sirf apni branch se bhej sakta hai aur sirf apni branch me receive kar sakta hai. Owner har branch ka kaam kar sakta hai.') },
          ]}
          tips={[
            tr('Phone IMEI se, used phone code se, electronics serial se aur carpet poore roll ke hisaab se jata hai — ek unit, poora aata hai ya bilkul nahi.'),
            tr('Bhejne se pehle har line par "abhi X, bhejne ke baad Y" dikhta hai; stock se zyada nahi bhej sakte.'),
            tr('Transfer khol kar "Print slip" se delivery challan nikaalein — rates chhupa kar driver ke haath bhejein, dono branch dastkhat karein.'),
            tr('Analytics me dekhein kis raaste par sab se zyada maal jata hai aur receive me kitna waqt lagta hai.'),
          ]}
          shortcuts={[['N', tr('maal bhejein')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
          footer={<span className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-500"><CalendarRange className="h-4 w-4" /> {' '}{tr('Raste me wala maal har period me upar dikhta hai')}</span>}
        />
      )}

      {sending && (
        <TransferForm defaultFrom={currentShop} locked={locked} industryId={industry?.id} money={money} onClose={() => setSending(false)}
          onSent={(t) => { setSending(false); refresh(); setViewing(t); }} />
      )}
      {viewing && !receiving && !printing && (
        <TransferDetail row={viewing} money={money} canReceive={canReceive} canCancel={canCancel}
          onReceive={(t) => setReceiving(t)} onPrint={(t) => setPrinting(t)} onClose={() => setViewing(null)}
          onChanged={() => { setViewing(null); refresh(); }} />
      )}
      {receiving && <ReceiveModal t={receiving} money={money} onClose={() => setReceiving(null)} onDone={() => { setReceiving(null); setViewing(null); refresh(); }} />}
      {printing && <TransferPrintModal t={printing} onClose={() => setPrinting(null)} />}
    </PageShell>
  );
}

function Row({ t, money, viewShop, canReceive, onOpen, onReceive }: {
  t: StockTransfer;
  money: (n: number) => string;
  viewShop?: string | null;
  canReceive: boolean;
  onOpen: () => void;
  onReceive: () => void;
}) {
  const short = shortValue(t);
  const sentAt = t.transferredAt ?? t.createdAt;
  const dir = viewShop ? (t.toShopId === viewShop ? tr('Aaya') : t.fromShopId === viewShop ? tr('Gaya') : '') : '';
  return (
    <li className={cn('flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4', short > 0 ? 'border-amber-300' : 'border-slate-200 hover:border-slate-300')}>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900"><span className="truncate">{t.fromShop.name}</span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 rtl-flip" /><span className="truncate">{t.toShop.name}</span></span>
          <StatusBadge status={t.status} />
          {dir && <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium', dir === 'Aaya' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}>{dir}</span>}
          {short > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="h-3 w-3" /> {' '}{tr('Kam aaya {{short}}', { short: money(short) })}</span>}
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{tr('{{count}} cheezein · {{preview}}', { count: t.items.length, preview: preview(t) })}</p>
        <p className="mt-0.5 text-[0.75rem] text-slate-400">
          {tr('{{transferNumber}} · bheja {{sentAt}}{{value}}{{value2}}{{value3}}{{value4}}', { transferNumber: t.transferNumber, sentAt: dayTime(sentAt), value: t.createdBy ? ` · ${t.createdBy.fullName}` : '', value2: t.status === 'RECEIVED' ? tr(' · receive {{receivedAt}}{{value}} ({{sentAt}})', { receivedAt: dayTime(t.receivedAt), value: t.receivedBy ? ` · ${t.receivedBy.fullName}` : '', sentAt: duration(sentAt, t.receivedAt) }) : '', value3: t.status === 'IN_TRANSIT' ? tr(' · {{sentAt}} se raste me', { sentAt: duration(sentAt) }) : '', value4: t.status === 'CANCELLED' ? tr(' · cancel{{value}}', { value: t.cancelReason ? `: ${t.cancelReason}` : '' }) : '' })}
        </p>
      </button>
      <div className="flex items-center gap-3">
        <p className={cn('text-lg font-bold tabular-nums', t.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(t.value)}</p>
        {canReceive && <Button size="sm" onClick={onReceive} leftIcon={<PackageCheck className="h-3.5 w-3.5" />}>{tr('Receive')}</Button>}
      </div>
    </li>
  );
}
