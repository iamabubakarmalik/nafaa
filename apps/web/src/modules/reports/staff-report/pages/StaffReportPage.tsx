/**
 * Staff & counters report for every industry: each person's sales, bills,
 * bill size, items, speed per hour, discounts, voids, returns, credit, PIN
 * use and drawer results for any business-day period, with awards, alerts
 * against the team average, charts, counter shifts and a branch view. A
 * person opens in a side panel with their bills, shifts and attendance.
 *
 * URL: ?staff=<userId> opens a person, ?tab=counters opens the shifts.
 * Keys: 1–4 tab · / search · C compare · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BadgePercent, Ban, BarChart3, BookOpen, Building2, CalendarRange, Crown, Download, GitCompareArrows,
  GraduationCap, MousePointerClick, RefreshCw, RotateCcw, Trophy, UserRound, Users, Vault,
} from 'lucide-react';
import {
  Avatar, Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type ViewTab,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { PERMISSIONS } from '@core/lib/permissions';
import { RequireAllPermissions, useReportCompare, useReportMasked, useReportPrefs, useReportRange } from '../../prefs';
import { STAFF_REPORT_KEY, staffReportApi, type Period, type ShiftStatusFilter, type StaffOverview } from '../api';
import { useStaffReportConfig } from '../config';
import { CountersView } from '../components/CountersView';
import { Leaderboard, SORT_LABEL, sortRows, type StaffSort } from '../components/Leaderboard';
import { ROLE_LABEL, pct } from '../components/meta';
import { Delta, Empty, Panel } from '../components/parts';
import { shiftsCsv, shiftsDoc, staffCsv, staffDoc } from '../components/print';
import { StaffAnalytics } from '../components/StaffAnalytics';
import { StaffDrawer } from '../components/StaffDrawer';

type Tab = 'staff' | 'analytics' | 'counters' | 'branches';
const COMPARE_KEY = 'nafaa-staff-report-compare';

/** Needs both report access and staff access; says which one is missing otherwise. */
export default function StaffReportPage() {
  return (
    <RequireAllPermissions need={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.STAFF_VIEW]} title="Staff aur counter report">
      <StaffReport />
    </RequireAllPermissions>
  );
}

function StaffReport() {
  const config = useStaffReportConfig();
  const qc = useQueryClient();
  const { sales: money, cost, costHidden } = useReportMasked();
  const prefs = useReportPrefs();
  const startHour = useBusinessDayStart();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useReportRange('month');
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'counters' ? 'counters' : 'staff');
  const [compare, toggleCompare] = useReportCompare(COMPARE_KEY);
  const [sort, setSort] = useState<StaffSort>('net');
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('staff'));
  const [shiftStaff, setShiftStaff] = useState('');
  const [shiftStatus, setShiftStatus] = useState<ShiftStatusFilter>('');

  const period: Period = useMemo(() => resolveRange(range, startHour) ?? { from: 'all', to: businessDayKey(new Date(), startHour) }, [range, startHour]);
  const label = rangeLabel(period.from, period.to);
  const shopLabel = `${tenantName}${isAll ? ' · Sab branches' : shopName ? ` · ${shopName}` : ''}`;

  const q = useQuery({
    queryKey: [STAFF_REPORT_KEY, 'overview', shopParam ?? null, period.from, period.to],
    queryFn: () => staffReportApi.overview(period),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const d = q.data;
  const t = d?.totals;
  const prev = compare ? d?.previous : null;
  const multi = isAll && (d?.byShop.length ?? 0) > 1;
  // Settings → Reports can hide drawer money from staff; the server leaves it out too.
  const drawerHidden = prefs.hidden.includes('drawer') || !!d?.drawerHidden;
  useEffect(() => { if (drawerHidden && tab === 'counters') setTab('staff'); }, [drawerHidden, tab]);

  // Keep ?staff= in step with the open drawer so the link can be shared.
  const openPerson = (id: string | null) => {
    setOpenId(id);
    setParams((p) => { if (id) p.set('staff', id); else p.delete('staff'); return p; }, { replace: true });
  };

  const rows = useMemo(() => {
    if (!d) return [];
    const s = search.trim().toLowerCase();
    const list = d.staff.filter((r) => (r.bills > 0 || r.shifts > 0 || r.returnsDone > 0 || r.voided > 0)
      && (!role || r.role === role) && (!s || r.name.toLowerCase().includes(s)));
    return sortRows(list, sort === 'profit' && costHidden ? 'net' : sort);
  }, [d, search, role, sort, costHidden]);
  const roles = useMemo(() => [...new Set((d?.staff ?? []).map((r) => r.role).filter((x): x is string => !!x))], [d]);
  const openRow = d?.staff.find((r) => r.id === openId);

  const tabs: Array<ViewTab<Tab>> = [
    { id: 'staff', label: config.person, icon: Users, count: d ? d.staff.filter((r) => r.id && r.bills > 0).length : null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(drawerHidden ? [] : [{ id: 'counters' as const, label: 'Galla / counter', icon: Vault, count: t?.shifts ?? null }]),
    ...(multi ? [{ id: 'branches' as const, label: 'Branches', icon: Building2 }] : []),
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= tabs.length) setTab(tabs[n - 1].id);
      else if (e.key === '/') { e.preventDefault(); setTab('staff'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (e.key.toLowerCase() === 'c') toggleCompare();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftQuery = () => ({ ...period, staffId: shiftStaff || undefined, status: shiftStatus || undefined, page: 1, limit: 200 });
  const printDoc = async () => {
    if (tab === 'counters') return shiftsDoc(await staffReportApi.shifts(shiftQuery()), label, money);
    if (!d) throw new Error('Report abhi aa rahi hai');
    return staffDoc(d, label, shopLabel, money);
  };
  const exportCsv = async () => {
    try {
      const header = [`Staff report — ${shopLabel}`, `Muddat: ${label}`];
      if (tab === 'counters') shiftsCsv(await staffReportApi.shifts(shiftQuery()), header, `galla-shifts-${period.from}-${period.to}.csv`);
      else if (d) staffCsv(d, header, !costHidden, `staff-report-${period.from}-${period.to}.csv`);
      else return;
      toast.success('CSV ban gayi');
    } catch { toast.error('CSV nahi bani'); }
  };

  const hint = (now: number, before: number | undefined, fallback: string, up: 'good' | 'bad' = 'good') =>
    (prev && before != null ? <Delta now={now} before={before} up={up} /> : fallback);
  const filtered = !!role || !!search.trim() || sort !== 'net';

  return (
    <PageShell>
      <PageHero
        title="Staff aur counter"
        chip={<><CalendarRange />{label}</>}
        busy={q.isFetching && !q.isLoading}
        meta={`${config.label} · ${isAll ? 'Sab branches' : shopName ?? tenantName}`}
        loading={q.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={!d} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!d || tab === 'analytics'} /></span>
          <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: [STAFF_REPORT_KEY] })} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}>
            <RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} />
          </button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t && d ? [
          { label: 'Staff ki bikri', value: money(t.net), hint: 'wapsi ke baad' },
          { label: 'Bill', value: String(t.bills), hint: `${t.staff} bande` },
          { label: 'Ausat bill', value: money(d.team.average) },
          { label: 'Fi banda', value: money(d.team.perStaff), hint: d.team.perHour ? `${money(d.team.perHour)}/ghanta` : undefined },
        ] : [{ label: 'Staff ki bikri', value: '' }, { label: 'Bill', value: '' }, { label: 'Ausat bill', value: '' }, { label: 'Fi banda', value: '' }]}
      />

      <KpiRow>
        {!t || !d ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={BadgePercent} color="#db2777" label="Haath se chhoot" value={money(t.manualDiscount)}
            hint={hint(t.manualDiscount, prev?.manualDiscount, `${pct(d.team.discountPct)} · ${t.discountBills} bill`, 'bad')}
            onClick={() => { setTab('staff'); setSort('discountPct'); }} active={tab === 'staff' && sort === 'discountPct'} />
          <KpiCard icon={Ban} color="#e11d48" label="Cancel bill" value={String(t.voided)}
            hint={hint(t.voided, prev?.voided, t.voided ? money(t.voidedValue) : 'Koi nahi', 'bad')}
            onClick={() => { setTab('staff'); setSort('voided'); }} active={tab === 'staff' && sort === 'voided'} />
          <KpiCard icon={RotateCcw} color="#ea580c" label="Maal wapas" value={money(t.refunds)} hint={`${t.returnedBills} bill · ${pct(d.team.returnPct)}`}
            onClick={() => { setTab('staff'); setSort('returnPct'); }} active={tab === 'staff' && sort === 'returnPct'} />
          <KpiCard icon={BookOpen} color="#d97706" label="Udhaar par" value={money(t.credit)} hint={`${t.creditBills} bill · ${pct(d.team.creditPct)}`} />
          {drawerHidden ? (
            <KpiCard icon={Vault} color="#64748b" label="Galla" value="Chhupa" hint="Malik ne staff se chhupa rakha hai" />
          ) : (
            <KpiCard icon={Vault} color={t.short > 0.5 ? '#e11d48' : '#16a34a'} label="Galla" value={t.short > 0.5 ? `−${money(t.short)}` : t.shifts ? 'Theek' : '—'}
              hint={t.shifts ? `${t.shifts} shift · ${t.shortCount} kam · ${t.overCount} zyada` : 'Koi shift nahi'}
              onClick={() => setTab('counters')} active={tab === 'counters'} />
          )}
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={`${config.person} ka naam…`} label="Banda dhoondein" />}
        chips={filtered ? <>
          {role && <FilterChip onRemove={() => setRole('')}>{ROLE_LABEL[role] ?? role}</FilterChip>}
          {sort !== 'net' && <FilterChip onRemove={() => setSort('net')}>Tarteeb: {SORT_LABEL[sort]}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setRole(''); setSort('net'); setSearch(''); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={GitCompareArrows} label="Muqabla" value={compare ? 'on' : 'off'} active={compare} width="w-72"
          options={[
            { value: 'on', label: 'Pichli muddat se muqabla', hint: 'Itne hi din pehle ke saath — % aur rank ka badlao' },
            { value: 'off', label: 'Muqabla band' },
          ]}
          onChange={(v) => { if ((v === 'on') !== compare) toggleCompare(); }} />
        {roles.length > 1 && (
          <FilterMenu icon={UserRound} label="Role" value={role} active={!!role} onChange={setRole}
            options={[{ value: '', label: 'Sab' }, ...roles.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))]} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label="Tarteeb" value={sort} active={sort !== 'net'} onChange={setSort} align="right" width="w-60"
          options={(Object.keys(SORT_LABEL) as StaffSort[]).filter((k) => (k !== 'profit' || !costHidden) && (k !== 'short' || !drawerHidden)).map((k) => ({ value: k, label: SORT_LABEL[k] }))} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs}
        hint={<><Kbd>1</Kbd>–<Kbd>{String(tabs.length)}</Kbd> tab · <Kbd>/</Kbd> dhoondein · <Kbd>C</Kbd> muqabla</>} />

      {q.error && !d ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(q.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void q.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : tab === 'counters' && !drawerHidden ? (
        <CountersView period={period} staff={d?.staff ?? []} money={money} multiBranch={isAll}
          staffId={shiftStaff} setStaffId={setShiftStaff} status={shiftStatus} setStatus={setShiftStatus} />
      ) : !d ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : tab === 'analytics' ? (
        <StaffAnalytics data={d} money={money} onOpen={openPerson} />
      ) : tab === 'branches' ? (
        <Branches data={d} money={money} onOpen={openPerson} />
      ) : (
        <Leaderboard data={d} rows={rows} money={money} cost={cost} costHidden={costHidden} person={config.person} onOpen={openPerson} />
      )}

      {openRow && openRow.id && d && (
        <StaffDrawer row={openRow} team={d.team} period={period} money={money} cost={cost} costHidden={costHidden} drawerHidden={drawerHidden} onClose={() => openPerson(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Staff aur counter — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Muddat chunein', text: 'Aaj, 7 din, mahina ya apni tareekh. "Muqabla" on ho to har number pichli itni hi muddat se milta hai aur rank ka upar neeche dikhta hai.' },
            { icon: Crown, color: '#d97706', title: 'Kaun aage hai', text: 'Upar ke inaam: sab se zyada bikri, bill, bara ausat bill, sab se tez (fi ghanta) aur kam chhoot. Neeche har banda rank ke saath.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Nazar rakhein', text: 'Jis ki chhoot, cancel bill, wapsi, udhaar ya galla ka farq team ki ausat se kaafi zyada ho, wo yahan aata hai. Pooch lein — har dafa ghalti nahi hoti.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Bande par click', text: 'Us ke bill (chhoot, udhaar, wapsi, cancel), galla shifts, ki hui wapsi, PIN record, haziri aur commission ek jagah.' },
            { icon: Vault, color: '#7c3aed', title: 'Galla / counter', text: 'Har shift: kis ne kholi aur band ki, kitni der chali, hisab kitna tha aur gina kitna — kam ya zyada. Din war aur banda war farq.' },
            { icon: Trophy, color: '#0891b2', title: 'Print aur CSV', text: 'Staff ki list ya shifts A4, PDF ya thermal par print karein, ya CSV me accountant ko bhejein.' },
          ]}
          tips={[
            'Bikri usi ke naam lagti hai jo POS par "kis ke naam" me chuna ho. Na chuna ho to jis ne bill banaya us ke naam.',
            'Fi ghanta bikri haziri ke ghanton se banti hai. Haziri na ho to galla shift ke ghante, warna sirf wo ghante jin me bill bana.',
            'Chhoot sirf haath se di gayi ginti hai — discount code aur points ki chhoot is me nahi.',
            'Galla ka farq 50 paise tak barabar mana jata hai.',
            'Cancel bill us bande ke naam ginta hai jis ne cancel kiya. Purane cancel bill (jab ye record nahi hota tha) bill wale bande ke naam.',
            'Ye report dekhne ke liye "View Reports" aur "View Staff" dono ijazatein chahiye.',
            'Malik Settings → Reports se staff se munafa ya galla chhupa sakta hai. Ye sirf dikhane ka usool hai, koi ijazat nahi deta.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['1–4', 'tab'], ['/', 'dhoondein'], ['C', 'muqabla'], ['G', 'guide'], ['Esc', 'band']]}
          footer={<Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Commission ka hisab →</Link>}
        />
      )}
    </PageShell>
  );
}

function Branches({ data, money, onOpen }: { data: StaffOverview; money: (n: number) => string; onOpen: (id: string) => void }) {
  const max = Math.max(1, ...data.byShop.map((b) => b.net));
  return (
    <Panel icon={Building2} title="Branch war staff" hint="Har branch ki bikri, kitne bande bikri kar rahe hain aur wahan sab se aage kaun">
      {!data.byShop.length ? <Empty text="Koi bikri nahi" /> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.byShop.map((b) => (
            <li key={b.id ?? 'none'} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-slate-900">{b.name}</p>
                <p className="shrink-0 font-bold tabular-nums text-slate-900">{money(b.net)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(b.net / max) * 100}%` }} /></div>
              <p className="mt-2 text-[0.75rem] text-slate-500">{b.bills} bill · {b.staff} bande · fi banda {money(b.staff ? b.net / b.staff : 0)}</p>
              {b.top && (
                <button type="button" onClick={() => onOpen(b.top!.id)} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-slate-200 hover:ring-brand-300">
                  <Avatar name={b.top.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.6875rem] text-slate-500">Sab se aage</span>
                    <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{b.top.name}</span>
                  </span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-900">{money(b.top.net)}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
