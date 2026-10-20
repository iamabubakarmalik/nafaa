/**
 * Team and school orders: kits with name / number printing, an advance on
 * the team's khata and the bill on delivery. Views, counts, search and
 * paging come from the server; CSV and print take the whole filter.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlarmClock, Ban, CalendarRange, CheckCircle2, ClipboardList, Download, Factory, FileText, GraduationCap, ListChecks,
  PackageCheck, Plus, Shirt, Users, Wallet,
} from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { teamOrdersApi, type SportsTeamOrder, type TeamQuery, type TeamView } from '../api/team-orders.api';
import { TEAM_KEY, TEAM_STATUS, dayOnly } from '../components/meta';
import { TeamOrderModal } from '../components/TeamOrderModal';
import { EmptyBlock, Pager, StatusPill, card, fetchAll, useDebounced, useListKeys } from '../components/ui';

const LIMIT = 25;
const TABS: Array<{ id: TeamView; label: string; icon: typeof ListChecks }> = [
  { id: 'active', label: 'Chalu', icon: ListChecks },
  { id: 'quote', label: 'Rate / kacha', icon: FileText },
  { id: 'production', label: 'Ban raha', icon: Factory },
  { id: 'ready', label: 'Tayyar', icon: PackageCheck },
  { id: 'late', label: 'Late', icon: AlarmClock },
  { id: 'unpaid', label: 'Paise baqi', icon: Wallet },
  { id: 'done', label: 'Mukammal / cancel', icon: CheckCircle2 },
  { id: 'all', label: 'Sab', icon: ClipboardList },
];

const isLate = (o: SportsTeamOrder) => ['CONFIRMED', 'IN_PRODUCTION', 'READY'].includes(o.status) && !!o.expectedDeliveryDate
  && new Date(o.expectedDeliveryDate).getTime() < new Date().setHours(0, 0, 0, 0);

export default function TeamOrdersPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const canCreate = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TeamView>(params.get('q') ? 'all' : 'active');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(search.trim());
  const range = resolveRange(period, startHour);

  const query: TeamQuery = useMemo(() => ({ view: tab, search: term || undefined, from: range?.from, to: range?.to }), [tab, term, range?.from, range?.to]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [TEAM_KEY, 'page', query, page],
    queryFn: () => teamOrdersApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const c = data?.counts;
  const go = (t: TeamView) => { setTab(t); setPage(1); };
  const newOrder = useCallback(() => { if (canCreate) navigate('/sports/team-orders/new'); }, [canCreate, navigate]);
  useListKeys(searchRef, newOrder);

  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';
  const all = () => fetchAll((p) => teamOrdersApi.page({ ...query, page: p, limit: 100 }));
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await all();
      if (!rows.length) { toast.error('Is filter me koi order nahi'); return; }
      downloadCsv('team-orders.csv', [
        ['Order', 'Date', 'Team', 'Idara', 'Rabta', 'Phone', 'Piece', 'Players', 'Delivery', 'Kul', 'Advance', 'Baqi', 'Status'],
        ...rows.map((o) => [o.orderNumber, o.createdAt.slice(0, 10), o.teamName, o.organization, o.contactPerson, o.contactPhone, o.totalQuantity,
          o.playerNames?.length ?? 0, o.expectedDeliveryDate?.slice(0, 10), o.totalAmount, o.advancePaid, o.balanceAmount, TEAM_STATUS[o.status]?.label]),
      ]);
      toast.success(`${rows.length} orders CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await all();
    return {
      title: 'Team orders', subtitle: `${TABS.find((t) => t.id === tab)?.label} · ${label}`,
      meta: [['Orders', String(rows.length)], ['Kul', money(data?.totals.value ?? 0)], ['Baqi', money(data?.totals.due ?? 0)]],
      sections: [{
        kind: 'table', title: 'Orders',
        columns: [{ label: 'Order' }, { label: 'Team' }, { label: 'Delivery', wideOnly: true }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }, { label: 'Status', wideOnly: true }],
        rows: rows.map((o) => [o.orderNumber, o.teamName, dayOnly(o.expectedDeliveryDate), money(o.totalAmount), money(o.balanceAmount), TEAM_STATUS[o.status]?.label ?? o.status]),
      }],
    };
  };
  const closeModal = () => {
    setOpenId(null);
    if (params.get('open')) { params.delete('open'); setParams(params, { replace: true }); }
  };

  const items = data?.items ?? [];
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Team orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Users, color: '#2563eb', title: 'Order likhein', text: 'Team / school, rabte wala, kit ka maal aur har piece ki printing. Players ke naam, number aur size list me daalein.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance team ke khate me jama hota hai aur aaj ke cash me ginta hai. Baad ki payment "Payment lein" se.' },
            { icon: Factory, color: '#7c3aed', title: 'Kaam ka haal', text: 'Rate diya → Pakka → Ban raha → Tayyar. Tayyar hone par WhatsApp se team ko batayein.' },
            { icon: PackageCheck, color: '#ea580c', title: 'Deliver + bill', text: 'Deliver par bill banta hai, stock nikalta hai aur advance bill me lag jata hai. Baqi team ke khate me udhaar.' },
            { icon: Ban, color: '#e11d48', title: 'Cancel', text: 'Cancel par advance khate me rehta hai; "Advance wapas" se cash lautayein (Return ki permission chahiye).' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya order'], ['G', 'guide']]} />
      )}

      <PageHero title="Team orders" chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="School, club aur team ki kit — naam / number printing, advance aur delivery"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/sports/team-orders/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya order</Link>}
        </>}
        stats={[
          { label: 'Is filter ki value', value: money(data?.totals.value ?? 0) },
          { label: 'Advance mila', value: money(data?.totals.advance ?? 0) },
          { label: 'Baqi', value: money(data?.totals.due ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={FileText} color="#0284c7" label="Rate / kacha" value={c.quote} hint="Pakka karwana hai" onClick={() => go('quote')} active={tab === 'quote'} />
            <KpiCard icon={Factory} color="#7c3aed" label="Ban raha / printing" value={c.production} onClick={() => go('production')} active={tab === 'production'} />
            <KpiCard icon={PackageCheck} color="#16a34a" label="Tayyar" value={c.ready} hint="Team ko batayein" onClick={() => go('ready')} active={tab === 'ready'} />
            <KpiCard icon={AlarmClock} color="#e11d48" label="Late" value={c.late} hint="Delivery ki date guzar gayi" onClick={() => go('late')} active={tab === 'late'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Order number, team, school, rabta, phone ya PO…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Order date" />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint={<>Order par click kar ke kholein</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? c[t.id] : null }))} />

      <section className={card}>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyBlock icon={Shirt} title={search || tab !== 'active' ? 'Is filter me koi order nahi' : 'Abhi koi chalu order nahi'}
            text="School ya club ki kit ka order yahan likhein — printing list, advance aur delivery sab ek jagah."
            action={canCreate ? <Link to="/sports/team-orders/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya order</Link> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((o) => {
              const st = TEAM_STATUS[o.status];
              const late = isLate(o);
              return (
                <li key={o.id}>
                  <button type="button" onClick={() => setOpenId(o.id)}
                    className="grid w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1.4fr)_8rem_10rem_9rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{o.orderNumber}</p>
                      <p className="text-[0.75rem] text-slate-500">{dayOnly(o.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{o.teamName}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[o.organization, o.contactPerson, o.contactPhone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className="min-w-0 truncate text-[0.8125rem] text-slate-600">
                      {o.items.map((i) => `${i.productName}${i.size ? ` ${i.size}` : ''} ×${i.quantity}`).join(', ')}
                      {(o.playerNames?.length ?? 0) > 0 && <span className="ml-1 text-violet-700">· {o.playerNames!.length} naam printing</span>}
                    </p>
                    <p className={cn('text-[0.8125rem]', late ? 'font-semibold text-rose-600' : 'text-slate-600')}>
                      {o.expectedDeliveryDate ? `${late ? 'Late · ' : ''}${dayOnly(o.expectedDeliveryDate)}` : 'Date tay nahi'}
                    </p>
                    <div className="text-[0.8125rem] lg:text-right">
                      <p className="font-semibold tabular-nums text-slate-900">{money(o.totalAmount)}</p>
                      <p className={cn('tabular-nums', o.balanceAmount > 0 && o.status !== 'CANCELLED' ? 'text-amber-700' : 'text-slate-500')}>
                        {o.status === 'CANCELLED' ? '—' : o.balanceAmount > 0 ? `Baqi ${money(o.balanceAmount)}` : 'Poora mila'}
                      </p>
                    </div>
                    <span className="lg:justify-self-end"><StatusPill tone={st.tone}>{st.label}</StatusPill></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pager page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
      </section>

      {openId && <TeamOrderModal id={openId} onClose={closeModal} />}
    </PageShell>
  );
}
