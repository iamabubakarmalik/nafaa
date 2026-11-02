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
import { t as tr } from '@core/i18n';

type Tab = 'staff' | 'analytics' | 'counters' | 'branches';
const COMPARE_KEY = 'nafaa-staff-report-compare';

/** Needs both report access and staff access; says which one is missing otherwise. */
export default function StaffReportPage() {
  return (
    <RequireAllPermissions need={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.STAFF_VIEW]} title={tr('Staff aur counter report')}>
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
    { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
    ...(drawerHidden ? [] : [{ id: 'counters' as const, label: tr('Galla / counter'), icon: Vault, count: t?.shifts ?? null }]),
    ...(multi ? [{ id: 'branches' as const, label: tr('Branches'), icon: Building2 }] : []),
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
    if (!d) throw new Error(tr('Report abhi aa rahi hai'));
    return staffDoc(d, label, shopLabel, money);
  };
  const exportCsv = async () => {
    try {
      const header = [tr('Staff report — {{shopLabel}}', { shopLabel }), tr('Period: {{label}}', { label })];
      if (tab === 'counters') shiftsCsv(await staffReportApi.shifts(shiftQuery()), header, `galla-shifts-${period.from}-${period.to}.csv`); // i18n-ignore
      else if (d) staffCsv(d, header, !costHidden, `staff-report-${period.from}-${period.to}.csv`); // i18n-ignore
      else return;
      toast.success(tr('CSV ban gayi'));
    } catch { toast.error(tr('CSV nahi bani')); }
  };

  const hint = (now: number, before: number | undefined, fallback: string, up: 'good' | 'bad' = 'good') =>
    (prev && before != null ? <Delta now={now} before={before} up={up} /> : fallback);
  const filtered = !!role || !!search.trim() || sort !== 'net';

  return (
    <PageShell>
      <PageHero
        title={tr('Staff aur counter')}
        chip={<><CalendarRange />{label}</>}
        busy={q.isFetching && !q.isLoading}
        meta={`${config.label} · ${isAll ? 'Sab branches' : shopName ?? tenantName}`}
        loading={q.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={!d} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!d || tab === 'analytics'} /></span>
          <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: [STAFF_REPORT_KEY] })} title={tr('Taaza karein')} aria-label={tr('Taaza karein')} className={heroIconButton}>
            <RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} />
          </button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t && d ? [
          { label: tr('Staff ki sale'), value: money(t.net), hint: tr('return ke baad') },
          { label: tr('Bill'), value: String(t.bills), hint: tr('{{staff}} bande', { staff: t.staff }) },
          { label: tr('Ausat bill'), value: money(d.team.average) },
          { label: tr('Fi banda'), value: money(d.team.perStaff), hint: d.team.perHour ? tr('{{perHour}}/ghanta', { perHour: money(d.team.perHour) }) : undefined },
        ] : [{ label: tr('Staff ki sale'), value: '' }, { label: tr('Bill'), value: '' }, { label: tr('Ausat bill'), value: '' }, { label: tr('Fi banda'), value: '' }]}
      />

      <KpiRow>
        {!t || !d ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={BadgePercent} color="#db2777" label={tr('Haath se discount')} value={money(t.manualDiscount)}
            hint={hint(t.manualDiscount, prev?.manualDiscount, `${pct(d.team.discountPct)} · ${t.discountBills} bill`, 'bad')}
            onClick={() => { setTab('staff'); setSort('discountPct'); }} active={tab === 'staff' && sort === 'discountPct'} />
          <KpiCard icon={Ban} color="#e11d48" label={tr('Cancel bill')} value={String(t.voided)}
            hint={hint(t.voided, prev?.voided, t.voided ? money(t.voidedValue) : tr('Koi nahi'), 'bad')}
            onClick={() => { setTab('staff'); setSort('voided'); }} active={tab === 'staff' && sort === 'voided'} />
          <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Maal wapas')} value={money(t.refunds)} hint={tr('{{returnedBills}} bill · {{returnPct}}', { returnedBills: t.returnedBills, returnPct: pct(d.team.returnPct) })}
            onClick={() => { setTab('staff'); setSort('returnPct'); }} active={tab === 'staff' && sort === 'returnPct'} />
          <KpiCard icon={BookOpen} color="#d97706" label={tr('Udhaar par')} value={money(t.credit)} hint={tr('{{creditBills}} bill · {{creditPct}}', { creditBills: t.creditBills, creditPct: pct(d.team.creditPct) })} />
          {drawerHidden ? (
            <KpiCard icon={Vault} color="#64748b" label={tr('Galla')} value="Chhupa" hint={tr('Malik ne staff se chhupa rakha hai')} />
          ) : (
            <KpiCard icon={Vault} color={t.short > 0.5 ? '#e11d48' : '#16a34a'} label={tr('Galla')} value={t.short > 0.5 ? `−${money(t.short)}` : t.shifts ? tr('Theek') : '—'}
              hint={t.shifts ? tr('{{shifts}} shift · {{shortCount}} kam · {{overCount}} zyada', { shifts: t.shifts, shortCount: t.shortCount, overCount: t.overCount }) : tr('Koi shift nahi')}
              onClick={() => setTab('counters')} active={tab === 'counters'} />
          )}
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('{{person}} ka naam…', { person: config.person })} label={tr('Banda search')} />}
        chips={filtered ? <>
          {role && <FilterChip onRemove={() => setRole('')}>{ROLE_LABEL[role] ?? role}</FilterChip>}
          {sort !== 'net' && <FilterChip onRemove={() => setSort('net')}>{tr('Sort: {{value}}', { value: SORT_LABEL[sort] })}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setRole(''); setSort('net'); setSearch(''); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={GitCompareArrows} label={tr('Muqabla')} value={compare ? 'on' : 'off'} active={compare} width="w-72"
          options={[
            { value: 'on', label: tr('Pichli period se muqabla'), hint: tr('Itne hi din pehle ke saath — % aur rank ka badlao') },
            { value: 'off', label: tr('Muqabla band') },
          ]}
          onChange={(v) => { if ((v === 'on') !== compare) toggleCompare(); }} />
        {roles.length > 1 && (
          <FilterMenu icon={UserRound} label={tr('Role')} value={role} active={!!role} onChange={setRole}
            options={[{ value: '', label: tr('Sab') }, ...roles.map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r }))]} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={sort} active={sort !== 'net'} onChange={setSort} align="right" width="w-60"
          options={(Object.keys(SORT_LABEL) as StaffSort[]).filter((k) => (k !== 'profit' || !costHidden) && (k !== 'short' || !drawerHidden)).map((k) => ({ value: k, label: SORT_LABEL[k] }))} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs}
        hint={<><Kbd>1</Kbd>–<Kbd>{String(tabs.length)}</Kbd> {' '}{tr('tab ·')}{' '} <Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>C</Kbd> {' '}{tr('muqabla')}</>} />

      {q.error && !d ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{tr('Report nahi aa saki')}</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(q.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void q.refetch()}>{tr('Dobara koshish')}</Button></div>
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
        <PageGuide title={tr('Staff aur counter — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: tr('Period chunein'), text: tr('Aaj, 7 din, mahina ya apni date. "Muqabla" on ho to har number pichli itni hi period se milta hai aur rank ka upar neeche dikhta hai.') },
            { icon: Crown, color: '#d97706', title: tr('Kaun aage hai'), text: tr('Upar ke inaam: sab se zyada sale, bill, bara ausat bill, sab se tez (fi ghanta) aur kam discount. Neeche har banda rank ke saath.') },
            { icon: AlertTriangle, color: '#e11d48', title: tr('Nazar rakhein'), text: tr('Jis ki discount, cancel bill, return, udhaar ya galla ka farq team ki ausat se kaafi zyada ho, wo yahan aata hai. Pooch lein — har dafa ghalti nahi hoti.') },
            { icon: MousePointerClick, color: '#16a34a', title: tr('Bande par click'), text: tr('Us ke bill (discount, udhaar, return, cancel), galla shifts, ki hui return, PIN record, haziri aur commission ek jagah.') },
            { icon: Vault, color: '#7c3aed', title: tr('Galla / counter'), text: tr('Har shift: kis ne kholi aur band ki, kitni der chali, hisab kitna tha aur gina kitna — kam ya zyada. Din war aur banda war farq.') },
            { icon: Trophy, color: '#0891b2', title: tr('Print aur CSV'), text: tr('Staff ki list ya shifts A4, PDF ya thermal par print karein, ya CSV me accountant ko bhejein.') },
          ]}
          tips={[
            tr('Sale usi ke naam lagti hai jo POS par "kis ke naam" me chuna ho. Na chuna ho to jis ne bill banaya us ke naam.'),
            tr('Fi ghanta sale haziri ke ghanton se banti hai. Haziri na ho to galla shift ke ghante, warna sirf wo ghante jin me bill bana.'),
            tr('Discount sirf haath se di gayi ginti hai — discount code aur points ki discount is me nahi.'),
            tr('Galla ka farq 50 paise tak barabar mana jata hai.'),
            tr('Cancel bill us bande ke naam ginta hai jis ne cancel kiya. Purane cancel bill (jab ye record nahi hota tha) bill wale bande ke naam.'),
            tr('Ye report dekhne ke liye "View Reports" aur "View Staff" dono permissions chahiye.'),
            tr('Malik Settings → Reports se staff se profit ya galla chhupa sakta hai. Ye sirf dikhane ka usool hai, koi permission nahi deta.'),
            ...(config.tips ?? []),
          ]}
          shortcuts={[['1–4', tr('tab')], ['/', tr('dhoondein')], ['C', tr('muqabla')], ['G', tr('guide')], [tr('Esc'), tr('band')]]}
          footer={<Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Commission ka hisab →')}</Link>}
        />
      )}
    </PageShell>
  );
}

function Branches({ data, money, onOpen }: { data: StaffOverview; money: (n: number) => string; onOpen: (id: string) => void }) {
  const max = Math.max(1, ...data.byShop.map((b) => b.net));
  return (
    <Panel icon={Building2} title={tr('Branch war staff')} hint={tr('Har branch ki sale, kitne bande sale kar rahe hain aur wahan sab se aage kaun')}>
      {!data.byShop.length ? <Empty text={tr('Koi sale nahi')} /> : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.byShop.map((b) => (
            <li key={b.id ?? 'none'} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-slate-900">{b.name}</p>
                <p className="shrink-0 font-bold tabular-nums text-slate-900">{money(b.net)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(b.net / max) * 100}%` }} /></div>
              <p className="mt-2 text-[0.75rem] text-slate-500">{tr('{{bills}} bill · {{staff}} bande · fi banda {{value}}', { bills: b.bills, staff: b.staff, value: money(b.staff ? b.net / b.staff : 0) })}</p>
              {b.top && (
                <button type="button" onClick={() => onOpen(b.top!.id)} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-start ring-1 ring-slate-200 hover:ring-brand-300">
                  <Avatar name={b.top.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.6875rem] text-slate-500">{tr('Sab se aage')}</span>
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
