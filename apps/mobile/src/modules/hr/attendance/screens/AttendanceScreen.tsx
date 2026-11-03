/**
 * Staff attendance for every industry. Today is the live board (check-in and
 * check-out work offline and are sent later), Month the grid with the totals
 * payroll needs, Leaves the requests with their decision, Analytics the rates.
 * Days are the shop's business days; late counts from the opening time.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Check, LogIn, LogOut, Palmtree, PencilLine, Share2, UserX, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore, useIsOwner } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import {
  Avatar, Button, Card, EmptyState, IconButton, ListRow, ListTemplate, Screen, Segmented, Select, StatTile, StatusPill, Text, toast, useLayout, useTheme,
} from '@/design';
import { attendanceApi, type AttStaff, type Board, type DayCell, type LeaveRow, type LeaveStatus, type Sheet } from '../api/attendance';
import { AttendanceAnalytics } from '../components/AttendanceAnalytics';
import { CorrectSheet, type FixTarget } from '../components/CorrectSheet';
import { LeaveDecisionSheet, type DecisionTarget } from '../components/LeaveDecisionSheet';
import { LeaveSheet } from '../components/LeaveSheet';
import { MonthGrid } from '../components/MonthGrid';
import { MonthStepper } from '../components/MonthStepper';
import { StaffCalendarSheet } from '../components/StaffCalendarSheet';
import { ATT_KEY, LEAVE_STATUS, LEAVE_TYPE, LIVE, absentDays, clockOf, dayLabel, hours, liveState, mins, monthLabel, monthRange, type LiveState } from '../lib/meta';
import { overlayBoard, useLocalPunches, usePunch } from '../lib/punch';
import { boardText, sheetText, shareText } from '../lib/share';

type Tab = 'today' | 'month' | 'leaves' | 'analytics';
type MonthFilter = 'late' | 'absent' | 'leave' | 'overtime' | 'perfect';
const MANAGER_ROLES = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

export function AttendanceScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const online = useOnlineStatus();
  const can = usePermission();
  const canPunch = can(P.STAFF_MANAGE);
  const role = useAuthStore((s) => s.user?.role);
  const canCorrect = canPunch && !!role && MANAGER_ROLES.includes(role);
  const isOwner = useIsOwner();
  const allShops = isAllShops(useAuthStore((s) => s.currentShopId));
  const shopsQ = useShops();
  const branches = (shopsQ.data ?? []).filter((s) => s.isActive);

  const localToday = businessDayKey(new Date());
  const [tab, setTab] = useState<Tab>('today');
  const [month, setMonth] = useState(localToday.slice(0, 7));
  const [branch, setBranch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fixing, setFixing] = useState<FixTarget | null>(null);
  const [leaveFor, setLeaveFor] = useState<string | null>(null);
  const [calendarOf, setCalendarOf] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<DecisionTarget | null>(null);
  const shopFilter = allShops && isOwner ? branch || undefined : undefined;

  const boardQ = useQuery({
    queryKey: [ATT_KEY, 'today', shopFilter ?? 'all'],
    queryFn: () => attendanceApi.today({ shopId: shopFilter }),
    refetchInterval: 60_000,
    placeholderData: (p) => p,
  });
  const local = useLocalPunches();
  const board = useMemo(() => overlayBoard(boardQ.data, local.data), [boardQ.data, local.data]);
  const today = board?.day ?? localToday;
  const range = monthRange(month);
  const sheetQ = useQuery({
    queryKey: [ATT_KEY, 'sheet', shopFilter ?? 'all', range.from],
    queryFn: () => attendanceApi.sheet({ shopId: shopFilter, from: range.from, to: range.to }),
    enabled: tab === 'month' || tab === 'analytics',
    placeholderData: (p) => p,
  });
  const sheet = sheetQ.data;
  const leavesQ = useQuery({
    queryKey: [ATT_KEY, 'leaves', shopFilter ?? 'all', range.from, status],
    queryFn: () => attendanceApi.leaves({ shopId: shopFilter, from: range.from, to: range.to, status: (status || undefined) as LeaveStatus | undefined }),
    enabled: tab === 'leaves',
    placeholderData: (p) => p,
  });

  const q = search.trim().toLowerCase();
  const matches = (s: AttStaff) => !q || s.fullName.toLowerCase().includes(q) || s.staffNumber.toLowerCase().includes(q) || s.designation.toLowerCase().includes(q);
  const boardRows = (board?.rows ?? []).filter((r) => matches(r.staff) && (!status || (status === 'late' ? r.day.late > 0 : liveState(r.day) === status)));
  const sheetRows = (sheet?.rows ?? []).filter((r) => {
    if (!matches(r.staff)) return false;
    const x = r.totals;
    switch (status as MonthFilter | '') {
      case 'late': return x.late > 0;
      case 'absent': return absentDays(x) > 0;
      case 'leave': return x.leave + x.unpaidLeave > 0;
      case 'overtime': return x.overtimeHours > 0;
      case 'perfect': return !x.late && !absentDays(x) && x.daysWorked > 0;
      default: return true;
    }
  });
  const leaveRows = (leavesQ.data ?? []).filter((l) => !q || l.staff.fullName.toLowerCase().includes(q) || l.staff.staffNumber.toLowerCase().includes(q));
  const activeStaff = (board?.rows ?? []).map((r) => r.staff).filter((s) => s.status === 'ACTIVE' || s.status === 'ON_LEAVE');
  const clock = board?.clock ?? sheet?.clock;
  const c = board?.counts;

  const show = (next: Tab) => { setTab(next); setStatus(''); };
  const statusOptions = tab === 'today'
    ? [...(Object.keys(LIVE) as LiveState[]).map((k) => ({ value: k as string, label: t(LIVE[k].label) })), { value: 'late', label: t('Aaj late aaye') }]
    : tab === 'leaves'
      ? (Object.keys(LEAVE_STATUS) as LeaveStatus[]).map((k) => ({ value: k as string, label: t(LEAVE_STATUS[k].label) }))
      : [
        { value: 'late', label: t('Late aane wale') }, { value: 'absent', label: t('Ghair hazir rahe') }, { value: 'leave', label: t('Chhutti li') },
        { value: 'overtime', label: t('Overtime kiya') }, { value: 'perfect', label: t('Poori hazri') },
      ];

  const tabs = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={show} options={[
        { value: 'today', label: t('Aaj') }, { value: 'month', label: t('Mahina') },
        { value: 'leaves', label: t('Chhutiyan') }, { value: 'analytics', label: t('Analytics') },
      ]} />
      {tab === 'today' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={LogIn} tone="success" label={t('Abhi andar')} loading={!c} value={<Text size="xl" weight="bold" ltr>{String(c?.inside ?? 0)}</Text>} hint={t('{{out}} ja chuke', { out: c?.out ?? 0 })} onPress={() => setStatus(status === 'inside' ? '' : 'inside')} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={AlarmClock} tone="warning" label={t('Aaj late')} loading={!c} value={<Text size="xl" weight="bold" ltr>{String(c?.late ?? 0)}</Text>} hint={c?.lateMinutes ? t('{{lateMinutes}} kul', { lateMinutes: mins(c.lateMinutes) }) : t('Sab waqt par')} onPress={() => setStatus(status === 'late' ? '' : 'late')} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={UserX} tone="danger" label={t('Abhi nahi aaye')} loading={!c} value={<Text size="xl" weight="bold" ltr>{String((c?.notIn ?? 0) + (c?.absent ?? 0))}</Text>} hint={board?.workingDay === false ? t('Aaj chhutti ka din') : t('Check-in baqi')} onPress={() => setStatus(status === 'notIn' ? '' : 'notIn')} />
          <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Palmtree} tone="accent" label={t('Chhutti par')} loading={!c} value={<Text size="xl" weight="bold" ltr>{String(c?.leave ?? 0)}</Text>} hint={c?.pendingLeaves ? t('{{pendingLeaves}} darkhwast baqi', { pendingLeaves: c.pendingLeaves }) : undefined} onPress={() => show('leaves')} />
        </View>
      )}
      {tab !== 'today' && <MonthStepper month={month} onChange={setMonth} max={localToday.slice(0, 7)} />}
      {allShops && isOwner && branches.length > 1 && (
        <Select value={branch} onChange={setBranch} title={t('Branch')} placeholder={t('Sab branches')}
          options={[{ value: '', label: t('Sab branches') }, ...branches.map((s) => ({ value: s.id, label: s.name }))]} />
      )}
      {clock && !clock.openTimeSet && tab === 'today' && (
        <Card tone="warning"><Text size="sm">{t('Dukaan khulne ka waqt Settings me nahi likha, is liye late 09:00 se gina ja raha hai.')}</Text></Card>
      )}
    </View>
  );

  const share = () => {
    if (tab === 'today' && board) void shareText(boardText({ ...board, rows: boardRows }));
    else if (sheet) void shareText(sheetText({ ...sheet, rows: sheetRows }, month));
    else toast.info(t('Pehle sheet khulne dein'));
  };
  const actions = (
    <>
      <IconButton icon={Share2} label={t('Share')} onPress={share} disabled={tab === 'leaves' || tab === 'analytics'} />
      {canPunch && <IconButton icon={Palmtree} label={t('Chhutti likhein')} onPress={() => setLeaveFor('')} />}
    </>
  );

  const sheets = (
    <>
      {clock && <CorrectSheet target={fixing} clock={clock} today={today} online={online} onClose={() => setFixing(null)} />}
      <LeaveSheet open={leaveFor !== null} staff={activeStaff} today={today} staffId={leaveFor || undefined} canApprove={canPunch} online={online} onClose={() => setLeaveFor(null)} />
      <LeaveDecisionSheet target={deciding} onClose={() => setDeciding(null)} />
      {sheet && <StaffCalendarSheet sheet={sheet} row={sheet.rows.find((r) => r.staff.id === calendarOf) ?? null} canCorrect={canCorrect}
        onCell={(staff, date, cell) => { setCalendarOf(null); setTimeout(() => setFixing({ staff, date, cell }), 350); }} onClose={() => setCalendarOf(null)} />}
    </>
  );

  if (tab === 'analytics') {
    return (
      <Screen title={t('Attendance')} actions={actions} onRefresh={() => void sheetQ.refetch()} refreshing={sheetQ.isRefetching}>
        {tabs}
        {sheet ? <AttendanceAnalytics sheet={sheet} rows={sheet.rows} /> : <EmptyState compact title={t('Is mahine abhi koi din nahi guzra')} />}
        {sheets}
      </Screen>
    );
  }

  const filters = { value: status, onChange: setStatus, options: [{ value: '', label: t('Sab') }, ...statusOptions] };
  const search_ = { value: search, onChange: setSearch, placeholder: t('Naam, staff number ya ohda…') };
  const noStaff = <EmptyState icon={UserX} title={status || q ? t('Is filter me koi nahi') : t('Abhi koi staff nahi')} message={t('Staff page par staff add karein; phir yahan roz check-in aur check-out lagta hai.')} />;

  if (tab === 'today') {
    return (
      <>
        <ListTemplate<Board['rows'][number]>
          title={t('Attendance')} subtitle={`${dayLabel(today)}${clock ? ` · ${t('Dukaan {{openTime}} par khulti hai', { openTime: clock.openTime })}` : ''}`}
          actions={actions} summary={tabs} search={search_} filters={filters}
          data={boardRows} loading={boardQ.isLoading && !board} error={boardQ.error} onRetry={boardQ.refetch}
          refreshing={boardQ.isRefetching} onRefresh={() => { void boardQ.refetch(); void local.refetch(); }}
          keyExtractor={(r) => r.staff.id} grouped={false}
          renderItem={({ item }) => <BoardRow row={item} showShop={allShops} canPunch={canPunch} canCorrect={canCorrect} onFix={(staff, cell) => setFixing({ staff, date: today, cell })} />}
          empty={noStaff}
        />
        {sheets}
      </>
    );
  }

  if (tab === 'month') {
    return (
      <>
        <ListTemplate<Sheet['rows'][number]>
          title={t('Attendance')} subtitle={monthLabel(month)} actions={actions}
          summary={<View style={{ gap: th.space(3) }}>{tabs}{isTablet && sheet && sheetRows.length > 0 && <MonthGrid sheet={sheet} rows={sheetRows} onOpen={setCalendarOf} />}</View>}
          search={search_} filters={filters}
          data={isTablet ? [] : sheetRows} loading={sheetQ.isLoading && !sheet} error={sheetQ.error} onRetry={sheetQ.refetch}
          refreshing={sheetQ.isRefetching} onRefresh={() => void sheetQ.refetch()} keyExtractor={(r) => r.staff.id}
          renderItem={({ item }) => <MonthRow row={item} onPress={() => setCalendarOf(item.staff.id)} />}
          empty={isTablet && sheetRows.length ? undefined : <EmptyState icon={UserX} title={status || q ? t('Is filter me koi nahi') : t('Is mahine koi hazri nahi')} message={t('Har din ki hazri yahan ek khane me dikhti hai — hazir, late, chhutti ya ghair hazir.')} />}
        />
        {sheets}
      </>
    );
  }

  return (
    <>
      <ListTemplate<LeaveRow>
        title={t('Attendance')} subtitle={monthLabel(month)} actions={actions} summary={tabs} search={search_} filters={filters}
        data={leaveRows} loading={leavesQ.isLoading && !leavesQ.data} error={leavesQ.error} onRetry={leavesQ.refetch}
        refreshing={leavesQ.isRefetching} onRefresh={() => void leavesQ.refetch()} keyExtractor={(l) => l.id} grouped={false}
        renderItem={({ item }) => <LeaveItem leave={item} showShop={allShops} canDecide={canPunch} online={online} onDecide={setDeciding} />}
        empty={<EmptyState icon={Palmtree} title={t('{{month}} me koi chhutti nahi', { month: monthLabel(month) })} message={t('Chhutti likhne ke liye upar "Chhutti likhein" dabayein. Approve chhutti sheet par khud lagti hai.')} />}
      />
      {sheets}
    </>
  );
}

function BoardRow({ row, showShop, canPunch, canCorrect, onFix }: {
  row: Board['rows'][number]; showShop: boolean; canPunch: boolean; canCorrect: boolean; onFix: (staff: AttStaff, cell: DayCell) => void;
}) {
  const th = useTheme();
  const punch = usePunch();
  const { staff, day } = row;
  const st = LIVE[liveState(day)];
  const sinceIn = day.in && !day.out ? Math.max(0, Math.round((Date.now() - new Date(day.in).getTime()) / 60_000)) : 0;
  const sub = [staff.designation, showShop && staff.shop ? staff.shop.name : '', day.note].filter(Boolean).join(' · ');
  return (
    <View style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, padding: th.space(3), marginBottom: th.space(2), marginHorizontal: th.space(4), gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <Avatar name={staff.fullName} url={staff.avatarUrl} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>{staff.fullName}</Text>
          {!!sub && <Text size="xs" tone="muted" numberOfLines={1}>{sub}</Text>}
        </View>
        <StatusPill tone={st.tone} dot>{t(st.label)}</StatusPill>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 120 }}>
          <Text size="2xs" tone="subtle">{t('Aaye · gaye')}</Text>
          <Text size="sm" tabular ltr>{`${clockOf(day.in)} · ${clockOf(day.out)}`}</Text>
          {(day.out || sinceIn > 0) && (
            <Text size="xs" tone="muted">{day.out ? `${t('Kaam kiya')} ${hours(day.worked)}${day.ot > 0 ? ` · ${t('+{{hours}} OT', { hours: hours(day.ot) })}` : ''}` : `${t('Andar')} ${mins(sinceIn)}`}</Text>
          )}
          {day.late > 0 && <Text size="xs" tone="warning">{t('{{late}} late', { late: mins(day.late) })}</Text>}
          {day.pending && <Text size="xs" tone="info">{t('Bhejna baqi')}</Text>}
        </View>
        {canPunch && !day.in && <Button size="sm" icon={LogIn} variant="success" onPress={() => void punch.checkIn(staff)}>{t('Check-in')}</Button>}
        {canPunch && day.in && !day.out && <Button size="sm" icon={LogOut} variant="inverse" onPress={() => void punch.checkOut(staff)}>{t('Check-out')}</Button>}
        {canCorrect && <IconButton icon={PencilLine} label={t('Hazri theek karein')} variant="secondary" onPress={() => onFix(staff, day)} />}
      </View>
    </View>
  );
}

function MonthRow({ row, onPress }: { row: Sheet['rows'][number]; onPress: () => void }) {
  const x = row.totals;
  return (
    <ListRow
      avatar={<Avatar name={row.staff.fullName} url={row.staff.avatarUrl} size={40} />}
      title={row.staff.fullName}
      subtitle={t('{{late}} late · {{absent}} ghair hazir · {{leave}} chhutti', { late: x.late, absent: absentDays(x), leave: x.leave + x.unpaidLeave })}
      trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" tabular ltr>{`${x.daysWorked - x.halfDay / 2}/${x.workingDays}`}</Text><Text size="2xs" tone="subtle">{t('Kaam')}</Text></View>}
      chevron onPress={onPress}
    />
  );
}

function LeaveItem({ leave: l, showShop, canDecide, online, onDecide }: {
  leave: LeaveRow; showShop: boolean; canDecide: boolean; online: boolean; onDecide: (d: DecisionTarget) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const st = LEAVE_STATUS[l.status];
  const a = l.startDate.slice(0, 10);
  const b = l.endDate.slice(0, 10);
  const [busy, setBusy] = useState(false);
  const approve = async () => {
    if (!online) return toast.info(t('Ye kaam internet se hota hai'));
    setBusy(true);
    try {
      await attendanceApi.decideLeave(l.id, 'APPROVE');
      toast.success(t('Chhutti approve'));
      void qc.invalidateQueries({ queryKey: [ATT_KEY] });
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const sub = [l.staff.designation, showShop && l.staff.shop ? l.staff.shop.name : '', l.reason, l.rejectedReason ? t(' · Wajah: {{rejectedReason}}', { rejectedReason: l.rejectedReason }) : ''].filter(Boolean).join(' · ');
  return (
    <View style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, padding: th.space(3), marginBottom: th.space(2), gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <Avatar name={l.staff.fullName} url={l.staff.avatarUrl} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>{l.staff.fullName}</Text>
          {!!sub && <Text size="xs" tone="muted" numberOfLines={2}>{sub}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
          <StatusPill tone={l.type === 'UNPAID' ? 'danger' : 'accent'}>{t(LEAVE_TYPE[l.type])}</StatusPill>
        </View>
      </View>
      <Text size="sm" ltr>{`${dayLabel(a)}${b !== a ? ` — ${dayLabel(b)}` : ''} · ${t('{{days}} din', { days: l.days })}`}</Text>
      {canDecide && l.status === 'PENDING' && (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button size="sm" variant="success" icon={Check} loading={busy} style={{ flex: 1 }} onPress={() => void approve()}>{t('Approve')}</Button>
          <Button size="sm" variant="secondary" icon={X} style={{ flex: 1 }} onPress={() => onDecide({ leave: l, decision: 'REJECT' })}>{t('Na')}</Button>
        </View>
      )}
      {canDecide && l.status === 'APPROVED' && <Button size="sm" variant="ghost" onPress={() => onDecide({ leave: l, decision: 'CANCEL' })}>{t('Cancel')}</Button>}
    </View>
  );
}
