/**
 * Staff attendance for every industry. "Aaj" is the live board: who is in,
 * out, late, on leave or not yet in, with check-in / check-out and the
 * manager's fix. "Mahina" is the month grid with the totals payroll needs,
 * printable on A4 and as CSV. "Chhutiyan" lists leave requests with their
 * decision, and "Analytics" shows attendance rate, late minutes and overtime.
 * Days are the shop's business days; late counts from the opening time.
 *
 * Keys: T aaj · M mahina · C chhutiyan · A analytics · L nayi chhutti · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlarmClock, BarChart3, CalendarDays, CalendarRange, Clock, Download, Filter, GraduationCap, LogIn, Palmtree, PencilLine,
  Printer, Settings2, Store, Sun, UserRound, UserX, Users,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useCanSwitchShops, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { attendanceApi, type AttStaff, type DayCell, type LeaveStatus, type Sheet } from '../api/attendance.api';
import { AttendanceAnalytics } from '../components/AttendanceAnalytics';
import { CorrectModal } from '../components/CorrectModal';
import { LeaveModal } from '../components/LeaveModal';
import { LeavesList } from '../components/LeavesList';
import { MonthSheet } from '../components/MonthSheet';
import { StaffCalendar } from '../components/StaffCalendar';
import { TodayBoard } from '../components/TodayBoard';
import { ATT_KEY, LEAVE_STATUS, LIVE, absentDays, dayLabel, downloadCsv, liveState, mins, monthLabel, monthRange, recentMonths, type LiveState } from '../components/meta';
import { boardDoc, sheetCsv, sheetDoc } from '../components/print';
import { t as tr } from '@core/i18n';

type Tab = 'today' | 'month' | 'leaves' | 'analytics';
type MonthFilter = 'late' | 'absent' | 'leave' | 'overtime' | 'perfect';

const TODAY_FILTERS: Array<FilterOption<LiveState | 'late'>> = [
  ...(Object.keys(LIVE) as LiveState[]).map((k) => ({ value: k, label: LIVE[k].label, hint: LIVE[k].hint, icon: LIVE[k].icon, color: LIVE[k].color })),
  { value: 'late', label: tr('Aaj late aaye'), hint: tr('Khulne ke waqt ke baad'), icon: AlarmClock, color: '#d97706' },
];
const MONTH_FILTERS: Array<FilterOption<MonthFilter>> = [
  { value: 'late', label: tr('Late aane wale'), hint: tr('Mahine me kam az kam ek dafa'), icon: AlarmClock, color: '#d97706' },
  { value: 'absent', label: tr('Ghair hazir rahe'), hint: tr('Absent ya hazri nahi lagi'), icon: UserX, color: '#e11d48' },
  { value: 'leave', label: tr('Chhutti li'), icon: Palmtree, color: '#7c3aed' },
  { value: 'overtime', label: tr('Overtime kiya'), icon: Clock, color: '#0284c7' },
  { value: 'perfect', label: tr('Poori hazri'), hint: tr('Na late, na ghair hazir'), icon: Sun, color: '#16a34a' },
];
const LEAVE_FILTERS: Array<FilterOption<LeaveStatus>> = (Object.keys(LEAVE_STATUS) as LeaveStatus[]).map((k) => ({ value: k, label: LEAVE_STATUS[k].label, icon: LEAVE_STATUS[k].icon }));

const MANAGER_ROLES = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

export default function AttendancePage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const canPunch = usePermission(PERMISSIONS.STAFF_MANAGE);
  const role = useAuthStore((s) => s.user?.role);
  const canCorrect = canPunch && !!role && MANAGER_ROLES.includes(role);
  const shopId = useShopParam();
  const allShops = useIsAllShops();
  const isOwner = useCanSwitchShops();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const localToday = businessDayKey(new Date(), startHour);
  const [tab, setTab] = useState<Tab>('today');
  const [month, setMonth] = useState(localToday.slice(0, 7));
  const [branch, setBranch] = useState('');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [fixing, setFixing] = useState<{ staff: AttStaff; date: string; cell?: DayCell } | null>(null);
  const [leaveFor, setLeaveFor] = useState<string | null>(null);

  useEffect(() => { setBranch(''); setStaffId(''); }, [shopId]);

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: isOwner, staleTime: 5 * 60_000 });
  const branches = (shopsQ.data ?? []).filter((s) => s.isActive);
  const shopFilter = allShops ? branch || undefined : undefined;
  // The board always loads everyone (it also feeds the staff picker); the sheet narrows on the server.
  const filters = { shopId: shopFilter, staffId: staffId || undefined };

  const boardQ = useQuery({
    queryKey: [ATT_KEY, 'today', shopId ?? 'all', shopFilter],
    queryFn: () => attendanceApi.today({ shopId: shopFilter }),
    refetchInterval: 60_000,
    placeholderData: (p) => p,
  });
  const board = boardQ.data;
  const today = board?.day ?? localToday;

  const range = monthRange(month);
  const sheetQ = useQuery({
    queryKey: [ATT_KEY, 'sheet', shopId ?? 'all', filters, range],
    queryFn: () => attendanceApi.sheet({ ...filters, from: range.from, to: range.to }),
    enabled: tab === 'month' || tab === 'analytics',
    placeholderData: (p) => p,
  });
  const sheet = sheetQ.data;

  const leavesQ = useQuery({
    queryKey: [ATT_KEY, 'leaves', shopId ?? 'all', shopFilter, month, status],
    queryFn: () => attendanceApi.leaves({ shopId: shopFilter, from: range.from, to: range.to, status: (status || undefined) as LeaveStatus | undefined }),
    enabled: tab === 'leaves',
    placeholderData: (p) => p,
  });

  const q = search.trim().toLowerCase();
  const matches = (s: AttStaff) => !q || s.fullName.toLowerCase().includes(q) || s.staffNumber.toLowerCase().includes(q) || s.designation.toLowerCase().includes(q);

  const boardRows = (board?.rows ?? []).filter((r) => (!staffId || r.staff.id === staffId) && matches(r.staff)
    && (!status || (status === 'late' ? r.day.late > 0 : liveState(r.day) === status)));
  const sheetRows = (sheet?.rows ?? []).filter((r) => {
    if (!matches(r.staff)) return false;
    const t = r.totals;
    switch (status as MonthFilter | '') {
      case 'late': return t.late > 0;
      case 'absent': return absentDays(t) > 0;
      case 'leave': return t.leave + t.unpaidLeave > 0;
      case 'overtime': return t.overtimeHours > 0;
      case 'perfect': return !t.late && !absentDays(t) && t.daysWorked > 0;
      default: return true;
    }
  });
  const leaveRows = (leavesQ.data ?? []).filter((l) => !q || l.staff.fullName.toLowerCase().includes(q) || l.staff.staffNumber.toLowerCase().includes(q));

  const staffOptions = (board?.rows ?? []).map((r) => r.staff);
  const activeStaff = staffOptions.filter((s) => s.status === 'ACTIVE' || s.status === 'ON_LEAVE');
  const c = board?.counts;
  const clock = board?.clock ?? sheet?.clock;

  const statusOptions: Array<FilterOption<string>> = tab === 'today' ? TODAY_FILTERS : tab === 'leaves' ? LEAVE_FILTERS : MONTH_FILTERS;
  const statusLabel = statusOptions.find((o) => o.value === status)?.label;
  const branchLabel = branches.find((s) => s.id === branch)?.name;
  const staffLabel = staffOptions.find((s) => s.id === staffId)?.fullName;
  const filtered = !!branch || !!staffId || !!status || !!q;
  const filterText = [branchLabel, staffLabel, statusLabel, q && `"${search.trim()}"`].filter(Boolean).join(' · ');
  const clear = () => { setBranch(''); setStaffId(''); setStatus(''); setSearch(''); };
  /** Status options differ per tab, so switching tabs drops the status filter. */
  const show = (t: Tab, s = '') => { setTab(t); setStatus(s); };

  const fetchSheet = () => qc.fetchQuery({
    queryKey: [ATT_KEY, 'sheet', shopId ?? 'all', filters, range],
    queryFn: () => attendanceApi.sheet({ ...filters, from: range.from, to: range.to }),
  });
  const visible = (s: Sheet): Sheet => {
    const ids = new Set((tab === 'month' ? sheetRows : s.rows.filter((r) => matches(r.staff))).map((r) => r.staff.id));
    return { ...s, rows: s.rows.filter((r) => ids.has(r.staff.id)) };
  };
  const printDoc = async () => (tab === 'today' && board
    ? boardDoc({ ...board, rows: boardRows })
    : sheetDoc(visible(sheet ?? await fetchSheet()), monthLabel(month), filterText));
  const exportCsv = async () => {
    try {
      const s = visible(sheet ?? await fetchSheet());
      downloadCsv(`hazri-${month}.csv`, sheetCsv(s));
    } catch {
      toast.error(tr('CSV nahi bani — dobara koshish karein'));
    }
  };

  // Shortcuts.
  const keyRef = useRef({ canPunch });
  keyRef.current = { canPunch };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      const tabs: Record<string, Tab> = { t: 'today', m: 'month', c: 'leaves', a: 'analytics' };
      if (tabs[k]) { e.preventDefault(); setTab(tabs[k]); setStatus(''); return; }
      if (k === 'l' && keyRef.current.canPunch) { e.preventDefault(); setLeaveFor(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const months = recentMonths(today);
  const empty = (title: string, text: string) => (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <Users className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
      {filtered
        ? <Button className="mt-4" variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>
        : !board?.rows.length && <Link to="/staff" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">{tr('Staff page par jayein')}</Link>}
    </div>
  );
  const listSkeleton = <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  return (
    <PageShell>
      <PageHero
        title={tr('Hazri (attendance)')}
        chip={<><CalendarDays /> {dayLabel(today, { weekday: 'long', day: 'numeric', month: 'long' })}</>}
        meta={clock ? tr('Dukaan {{openTime}} par khulti hai · {{graceMinutes}} min tak late nahi', { openTime: clock.openTime, graceMinutes: clock.graceMinutes }) : tr('Aaj kaun aaya, kaun late, kaun chhutti par')}
        busy={boardQ.isFetching && !boardQ.isLoading}
        loading={boardQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
            <PrintButton doc={printDoc} disabled={!board?.rows.length} label={tab === 'today' ? tr('Aaj') : tr('Sheet')} />
          </span>
          <button type="button" onClick={() => void exportCsv()} disabled={!board?.rows.length} title={tr('Mahine ki sheet CSV (payroll ke liye)')} className={heroButton}>
            <Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span>
          </button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canPunch && (
            <button type="button" onClick={() => setLeaveFor('')} title={tr('Nayi chhutti (L)')} className={heroPrimaryButton}><Palmtree className="h-4 w-4" /> {' '}{tr('Chhutti likhein')}</button>
          )}
        </>}
        stats={[
          { label: tr('Aaj aaye'), value: c ? `${c.present} / ${c.staff - c.off - c.leave}` : '—', hint: c ? tr('{{inside}} abhi andar', { inside: c.inside }) : undefined },
          { label: tr('Late'), value: c ? String(c.late) : '—', hint: c?.lateMinutes ? mins(c.lateMinutes) : undefined },
          { label: tr('Abhi nahi aaye'), value: c ? String(c.notIn) : '—' },
          { label: tr('Chhutti par'), value: c ? String(c.leave) : '—', hint: c?.pendingLeaves ? tr('{{pendingLeaves}} darkhwast baqi', { pendingLeaves: c.pendingLeaves }) : undefined },
        ]}
      />

      {clock && !clock.openTimeSet && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <Settings2 className="h-4 w-4 shrink-0" />
          {tr('Dukaan khulne ka waqt Settings me nahi likha, is liye late 09:00 se gina ja raha hai.')}
          <Link to="/settings/language" className="font-semibold underline">{tr('Waqt likhein')}</Link>
        </div>
      )}

      <KpiRow cols={5}>
        {!c ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={LogIn} color="#16a34a" label={tr('Abhi andar')} value={c.inside} hint={tr('{{out}} ja chuke', { out: c.out })}
            onClick={() => show('today', 'inside')} active={tab === 'today' && status === 'inside'} />
          <KpiCard icon={AlarmClock} color="#d97706" label={tr('Aaj late')} value={c.late} hint={c.lateMinutes ? tr('{{lateMinutes}} kul', { lateMinutes: mins(c.lateMinutes) }) : tr('Sab waqt par')}
            onClick={() => show('today', 'late')} active={tab === 'today' && status === 'late'} />
          <KpiCard icon={Clock} color="#e11d48" label={tr('Abhi nahi aaye')} value={c.notIn + c.absent} hint={c.absent ? tr('{{absent}} absent lage', { absent: c.absent }) : board?.workingDay ? tr('Check-in baqi') : tr('Aaj chhutti ka din')}
            onClick={() => show('today', 'notIn')} active={tab === 'today' && status === 'notIn'} />
          <KpiCard icon={Palmtree} color="#7c3aed" label={tr('Chhutti par')} value={c.leave} hint={tr('{{off}} off', { off: c.off })}
            onClick={() => show('today', 'leave')} active={tab === 'today' && status === 'leave'} />
          <KpiCard icon={CalendarRange} color="#475569" label={tr('Chhutti darkhwast')} value={c.pendingLeaves} hint={tr('Faisla baqi')}
            onClick={() => show('leaves', 'PENDING')} active={tab === 'leaves' && status === 'PENDING'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, staff number ya ohda…')} label={tr('Staff search')} />}
        chips={filtered ? <>
          {branch && <FilterChip onRemove={() => setBranch('')}>{branchLabel}</FilterChip>}
          {staffId && <FilterChip onRemove={() => setStaffId('')}>{staffLabel ?? tr('Staff')}</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{statusLabel}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        {tab !== 'today' && (
          <FilterMenu icon={CalendarRange} label={monthLabel(month)} value={month} active={month !== today.slice(0, 7)} onChange={setMonth}
            options={months.map((m) => ({ value: m.value, label: m.label }))} />
        )}
        {allShops && branches.length > 1 && (
          <FilterMenu icon={Store} label={branchLabel ?? tr('Branch')} value={branch} active={!!branch} onChange={setBranch}
            options={[{ value: '', label: tr('Sab branches') }, ...branches.map((s) => ({ value: s.id, label: s.name }))]} />
        )}
        {tab !== 'leaves' && (
          <FilterMenu icon={UserRound} label={staffLabel ?? tr('Staff')} value={staffId} active={!!staffId} onChange={setStaffId}
            options={[{ value: '', label: tr('Sab staff') }, ...staffOptions.map((s) => ({ value: s.id, label: s.fullName, hint: s.designation }))]} />
        )}
        <FilterMenu icon={Filter} label={statusLabel ?? tr('Haal')} value={status} active={!!status} align="right" onChange={setStatus}
          options={[{ value: '', label: tr('Sab') }, ...statusOptions]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => show(t)}
        hint={<><Kbd>T</Kbd> {' '}{tr('aaj ·')}{' '} <Kbd>M</Kbd> {' '}{tr('mahina ·')}{' '} <Kbd>C</Kbd> {' '}{tr('chhutiyan ·')}{' '} <Kbd>A</Kbd> {' '}{tr('analytics ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</>}
        tabs={[
          { id: 'today', label: tr('Aaj'), icon: Sun, count: c ? c.present : null },
          { id: 'month', label: tr('Mahina'), icon: CalendarDays },
          { id: 'leaves', label: tr('Chhutiyan'), icon: Palmtree, count: c?.pendingLeaves || null },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'today' && (
        boardQ.isLoading ? listSkeleton : !board || !boardRows.length
          ? empty(filtered ? tr('Is filter me koi nahi') : tr('Abhi koi staff nahi'), tr('Staff page par staff add karein; phir yahan roz check-in aur check-out lagta hai.'))
          : <TodayBoard rows={boardRows} board={board} showShop={allShops} canPunch={canPunch} canCorrect={canCorrect}
              onCorrect={(staff, cell) => setFixing({ staff, date: board.day, cell })} />
      )}

      {tab === 'month' && (
        sheetQ.isLoading || !sheet ? <Skeleton className="h-80 rounded-3xl" /> : !sheetRows.length
          ? empty(filtered ? tr('Is filter me koi nahi') : tr('Is mahine koi hazri nahi'), tr('Har din ki hazri yahan ek khane me dikhti hai — hazir, late, chhutti ya ghair hazir.'))
          : staffId && sheetRows.length === 1
            ? <StaffCalendar sheet={sheet} row={sheetRows[0]} canCorrect={canCorrect}
                onCell={(staff, date, cell) => setFixing({ staff, date, cell })} />
            : <MonthSheet sheet={sheet} rows={sheetRows} showShop={allShops} canCorrect={canCorrect}
                onCell={(staff, date, cell) => setFixing({ staff, date, cell })} />
      )}

      {tab === 'leaves' && (
        leavesQ.isLoading ? listSkeleton
          : <LeavesList leaves={leaveRows} showShop={allShops} canDecide={canPunch}
              empty={empty(filtered ? tr('Is filter me koi chhutti nahi') : tr('{{month}} me koi chhutti nahi', { month: monthLabel(month) }), tr('Chhutti likhne ke liye upar "Chhutti likhein" dabayein. Approve chhutti sheet par khud lagti hai.'))} />
      )}

      {tab === 'analytics' && (
        sheetQ.isLoading || !sheet
          ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          : <AttendanceAnalytics sheet={sheet} rows={sheetRows} />
      )}

      {fixing && clock && (
        <CorrectModal staff={fixing.staff} date={fixing.date} cell={fixing.cell} clock={clock} today={today} onClose={() => setFixing(null)} />
      )}
      {leaveFor !== null && (
        <LeaveModal staff={activeStaff} today={today} staffId={leaveFor || undefined} canApprove={canPunch} onClose={() => setLeaveFor(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Hazri — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: LogIn, color: '#16a34a', title: tr('Check-in / check-out'), text: tr('Staff aaye to "Check-in", jaye to "Check-out" dabayein. Waqt dukaan ki ghari se lagta hai; do dafa dabane se waqt nahi badalta.') },
            { icon: AlarmClock, color: '#d97706', title: tr('Late khud ginta hai'), text: tr('Dukaan khulne ke waqt (Settings → Zubaan aur waqt) ke baad check-in late ginta hai. Thori der ki discount hai; us ke baad poore minute gine jate hain.') },
            { icon: PencilLine, color: '#2563eb', title: tr('Hazri theek karein'), text: tr('Malik ya manager kisi bhi din ka haal aur waqt badal sakta hai. Wajah likhna zaroori hai aur badli hui cheez activity log me jati hai.') },
            { icon: CalendarDays, color: '#7c3aed', title: tr('Mahina'), text: tr('Har banda ek line, har din ek khana. Daayein taraf kaam ke din, late, ghair hazir, chhutti aur overtime — tankhwah banane ke liye. Staff filter me ek banda chunein to us ka poora calendar dikhta hai.') },
            { icon: Palmtree, color: '#db2777', title: tr('Chhutiyan'), text: tr('Chhutti likhein, phir manzoor ya na-manzoor karein. Manzoor chhutti ke din sheet par khud "C" dikhta hai; bina tankhwah wali alag gini jati hai.') },
            { icon: Printer, color: '#475569', title: tr('Print aur CSV'), text: tr('Mahine ki sheet A4 ya PDF me print karein, ya CSV nikal kar payroll me istemal karein. Aaj wale tab par aaj ki list print hoti hai.') },
          ]}
          tips={[
            tr('Jin kaam ke dinon hazri nahi lagi wo laal "—" dikhte hain aur ghair hazir me gine jate hain. Aaj ka din raat tak khula rehta hai.'),
            tr('Hafta war chhutti ke din Settings ke "kaam ke din" se aate hain.'),
            tr('Check-in aur check-out ke liye "Staff manage" ki ijazat chahiye; theek karna sirf malik aur manager ka kaam hai.'),
          ]}
          shortcuts={[['T', tr('aaj')], ['M', tr('mahina')], ['C', tr('chhutiyan')], ['A', tr('analytics')], ['L', tr('nayi chhutti')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}
