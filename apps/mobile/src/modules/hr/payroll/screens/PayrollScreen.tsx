/**
 * Payroll: the month's run sheet (attendance, overtime, commission, advance
 * cuts and the net pay per person), advances, history and analytics. Money
 * moves need internet; everything else shows the last saved data offline.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Banknote, Check, ChevronRight, HandCoins, Pencil, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore, useIsOwner } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Avatar, Button, Checkbox, EmptyState, IconButton, ListRow, ListTemplate, Screen, Segmented, Select, StatTile, StatusPill, Text, toast, useTheme,
} from '@/design';
import { MonthStepper } from '../../attendance/components/MonthStepper';
import { payrollApi, type AdvanceGroup, type HistoryQuery, type RecordStatus, type RunEdit, type RunRow, type SalaryRecord } from '../api/payroll';
import { AdvanceSheet } from '../components/AdvanceSheet';
import { PayrollAnalytics } from '../components/PayrollAnalytics';
import { CancelSheet, PayBalanceSheet, RunPaySheet, type BalanceTarget, type CancelTarget, type PayLineView } from '../components/PaySheets';
import { RecordSheet } from '../components/RecordSheet';
import { RowEditSheet } from '../components/RowEditSheet';
import { applyEdit, payNow } from '../lib/calc';
import { METHOD_LABEL, PAYROLL_KEY, SALARY_TYPE, STATUS, currentMonth, day, days } from '../lib/meta';

type Tab = 'run' | 'advances' | 'history' | 'analytics';
type View_ = '' | 'open' | 'due' | 'paid';

export function PayrollScreen() {
  const th = useTheme();
  const online = useOnlineStatus();
  const canWrite = usePermission()(P.STAFF_MANAGE);
  const isOwner = useIsOwner();
  const allShops = isAllShops(useAuthStore((s) => s.currentShopId));
  const business = useAuthStore((s) => s.tenant?.name);
  const shopsQ = useShops();
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const thisMonth = currentMonth();

  const [tab, setTab] = useState<Tab>('run');
  const [month, setMonth] = useState(thisMonth);
  const [shopId, setShopId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View_>('');
  const [edits, setEdits] = useState<Record<string, RunEdit>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<'' | 'salary' | 'advance'>('');
  const [status, setStatus] = useState<'' | RecordStatus>('');
  const [allAdvances, setAllAdvances] = useState(false);

  const [editRow, setEditRow] = useState<RunRow | null>(null);
  const [payLines, setPayLines] = useState<PayLineView[] | null>(null);
  const [balance, setBalance] = useState<BalanceTarget | null>(null);
  const [cancel, setCancel] = useState<CancelTarget | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);

  const branch = isOwner && allShops ? shopId || undefined : undefined;
  const changeMonth = (m: string) => { setMonth(m); setEdits({}); setSelected(new Set()); };

  const runQ = useQuery({ queryKey: [PAYROLL_KEY, 'run', month, branch ?? ''], queryFn: () => payrollApi.run(month, branch), placeholderData: (p) => p });
  const advQ = useQuery({ queryKey: [PAYROLL_KEY, 'advances', branch ?? ''], queryFn: () => payrollApi.advances(branch), enabled: tab === 'advances' });
  const hq: HistoryQuery = { shopId: branch, kind: kind || undefined, status: status || undefined, search: search.trim() || undefined, limit: 30 };
  const histQ = useInfiniteQuery({
    queryKey: [PAYROLL_KEY, 'history', hq], initialPageParam: 1, enabled: tab === 'history',
    queryFn: ({ pageParam }) => payrollApi.history({ ...hq, page: pageParam }),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });

  const sheet = runQ.data;
  const tot = sheet?.totals;
  const staffOptions = useMemo(() => (sheet?.rows ?? []).map((r) => r.staff), [sheet]);
  const savedThisMonth = useMemo(() => new Set((sheet?.month === thisMonth ? sheet.rows : []).filter((r) => r.record).map((r) => r.staff.id)), [sheet, thisMonth]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheet?.rows ?? []).filter((r) => {
      if (q && !`${r.staff.fullName} ${r.staff.staffNumber} ${r.staff.designation}`.toLowerCase().includes(q)) return false;
      if (view === 'open') return !r.record;
      if (view === 'due') return !r.record || r.record.balanceAmount > 0.5;
      if (view === 'paid') return !!r.record && r.record.balanceAmount <= 0.5;
      return true;
    });
  }, [sheet, search, view]);
  const openPayable = (sheet?.rows ?? []).filter((r) => !r.record);
  const canPay = canWrite && online && !!sheet?.canPay && !sheet.isFuture;

  const lineOf = (r: RunRow): PayLineView => {
    const p = applyEdit(r, edits[r.staff.id]);
    return { staffId: r.staff.id, name: r.staff.fullName, avatarUrl: r.staff.avatarUrl, designation: r.staff.designation, net: p.net, payNow: payNow(p.net, edits[r.staff.id]), edit: edits[r.staff.id] };
  };
  const payList = (list: RunRow[]) => {
    const ok = list.filter((r) => !applyEdit(r, edits[r.staff.id]).advanceTooBig);
    if (ok.length < list.length) toast.warning(t('Kuch ki advance qist tankhwah se zyada hai — pehle un ki tankhwah badlein'));
    if (ok.length) setPayLines(ok.map(lineOf));
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = openPayable.length > 0 && openPayable.every((r) => selected.has(r.staff.id));

  const tabs = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'run', label: t('Salary') }, { value: 'advances', label: t('Advance') }, { value: 'history', label: t('History') }, { value: 'analytics', label: t('Analytics') },
      ]} />
      {(tab === 'run' || tab === 'analytics') && <MonthStepper month={month} onChange={changeMonth} max={thisMonth} />}
      {isOwner && allShops && shops.length > 1 && (
        <Select value={shopId} onChange={setShopId} title={t('Branch')} placeholder={t('Sab branches')} options={[{ value: '', label: t('Sab branches') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
      )}
      {!online && <Text size="sm" tone="warning">{t('Tankhwah ka paisa dene ke liye internet chahiye. Abhi aakhri dekha hua hisaab dikh raha hai.')}</Text>}
    </View>
  );
  const actions = canWrite ? <IconButton icon={HandCoins} label={t('Advance dein')} disabled={!sheet || !online} onPress={() => setAdvanceFor('')} /> : undefined;

  const sheets = sheet ? (
    <>
      <RowEditSheet row={editRow} edit={editRow ? edits[editRow.staff.id] : undefined} canPayCommission={sheet.canPayCommission}
        onSave={(e) => { if (!editRow) return; setEdits((m) => { const n = { ...m }; if (e) n[editRow.staff.id] = e; else delete n[editRow.staff.id]; return n; }); }} onClose={() => setEditRow(null)} />
      <RunPaySheet lines={payLines} month={month} monthLabel={sheet.label} shopId={branch} sources={sheet.sources}
        onDone={() => { setEdits({}); setSelected(new Set()); }} onClose={() => setPayLines(null)} />
      <PayBalanceSheet record={balance} sources={sheet.sources} shopId={branch} onClose={() => setBalance(null)} />
      <AdvanceSheet open={advanceFor !== null} staff={staffOptions} thisMonth={thisMonth} savedThisMonth={savedThisMonth} sources={sheet.sources} shopId={branch} staffId={advanceFor || undefined} onClose={() => setAdvanceFor(null)} />
    </>
  ) : null;
  const common = (
    <>
      <CancelSheet record={cancel} shopId={branch} onClose={() => setCancel(null)} />
      <RecordSheet recordId={recordId} canWrite={canWrite} online={online} business={business}
        onPay={(r) => { setRecordId(null); setTimeout(() => setBalance({ id: r.id, paymentNumber: r.paymentNumber, monthLabel: r.monthLabel, balanceAmount: r.balanceAmount, staff: r.staff }), 350); }}
        onCancel={(r) => { setRecordId(null); setTimeout(() => setCancel({ id: r.id, paymentNumber: r.paymentNumber, kind: r.kind, paidAmount: r.paidAmount, staffName: r.staff.fullName }), 350); }}
        onClose={() => setRecordId(null)} />
    </>
  );

  if (tab === 'analytics') {
    return (
      <Screen title={t('Payroll')} actions={actions}>
        {tabs}
        <PayrollAnalytics month={month} shopId={branch} />
        {sheets}{common}
      </Screen>
    );
  }

  if (tab === 'advances') {
    const groups = (advQ.data?.groups ?? []).filter((g) => allAdvances || g.remaining > 0);
    return (
      <>
        <ListTemplate<AdvanceGroup>
          title={t('Payroll')} actions={actions}
          summary={<View style={{ gap: th.space(3) }}>{tabs}
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HandCoins} tone="warning" label={t('Advance baqi')} loading={!advQ.data} value={<Amount value={advQ.data?.totals.remaining ?? 0} weight="bold" size="xl" compact />} hint={t('{{staff}} staff se katna hai', { staff: advQ.data?.totals.staff ?? 0 })} />
            </View>
            <Segmented value={allAdvances ? 'all' : 'open'} onChange={(v) => setAllAdvances(v === 'all')} options={[{ value: 'open', label: t('Baqi') }, { value: 'all', label: t('Sab') }]} />
          </View>}
          data={groups} loading={advQ.isLoading} error={advQ.error} onRetry={advQ.refetch} refreshing={advQ.isRefetching} onRefresh={() => void advQ.refetch()}
          keyExtractor={(g) => g.id}
          renderItem={({ item: g }) => (
            <ListRow avatar={<Avatar name={g.staff.fullName} url={g.staff.avatarUrl} size={40} />}
              title={g.staff.fullName} subtitle={[g.number, g.reason, day(g.givenAt), t(METHOD_LABEL[g.method] ?? g.method)].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={g.total} weight="bold" /><Text size="2xs" tone={g.status === 'CANCELLED' ? 'subtle' : g.remaining > 0 ? 'warning' : 'success'}>{g.status === 'CANCELLED' ? t('Cancel') : g.remaining > 0 ? t('{{remaining}} katna baqi', { remaining: formatPKR(g.remaining) }) : t('Poora kat gaya')}</Text></View>}
              chevron onPress={() => setRecordId(g.id)} onLongPress={canWrite && g.canCancel && online ? () => setCancel({ id: g.id, paymentNumber: g.number, kind: 'advance', paidAmount: g.total, staffName: g.staff.fullName }) : undefined} />
          )}
          empty={<EmptyState icon={HandCoins} title={allAdvances ? t('Abhi tak koi advance nahi diya') : t('Koi advance baqi nahi')} message={t('Staff ko mahine ke beech paise dene hon to yahan se dein — tankhwah se khud kat jayenge.')} />}
          fab={canWrite && online && sheet ? { icon: HandCoins, label: t('Advance'), onPress: () => setAdvanceFor('') } : undefined}
        />
        {sheets}{common}
      </>
    );
  }

  if (tab === 'history') {
    const items = histQ.data?.pages.flatMap((p) => p.items) ?? [];
    const hist = histQ.data?.pages[0]?.totals;
    return (
      <>
        <ListTemplate<SalaryRecord>
          title={t('Payroll')} actions={actions}
          summary={<View style={{ gap: th.space(2) }}>{tabs}{hist && <Text size="sm" tone="muted">{t('{{count}} records · kul {{gross}} · ada {{paid}} · baqi {{due}}', { count: hist.count, gross: formatPKR(hist.gross), paid: formatPKR(hist.paid), due: formatPKR(hist.due) })}</Text>}</View>}
          search={{ value: search, onChange: setSearch, placeholder: t('Naam ya number…') }}
          filters={{ value: kind || status || '', onChange: (v) => { if (v === 'salary' || v === 'advance') { setKind(v); setStatus(''); } else if (v) { setStatus(v as RecordStatus); setKind(''); } else { setKind(''); setStatus(''); } },
            options: [{ value: '', label: t('Sab') }, { value: 'salary', label: t('Tankhwah') }, { value: 'advance', label: t('Advance') }, ...(Object.keys(STATUS) as RecordStatus[]).map((s) => ({ value: s as string, label: t(STATUS[s].label) }))] }}
          data={items} loading={histQ.isLoading} error={histQ.error} onRetry={histQ.refetch} refreshing={histQ.isRefetching} onRefresh={() => void histQ.refetch()}
          onEndReached={() => { if (histQ.hasNextPage && !histQ.isFetchingNextPage) void histQ.fetchNextPage(); }}
          keyExtractor={(r) => r.id}
          renderItem={({ item: r }) => {
            const st = STATUS[r.status];
            return (
              <ListRow avatar={<Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={40} />}
                title={r.staff.fullName} subtitle={`${r.paymentNumber} · ${r.monthLabel}${r.kind === 'advance' ? ` · ${t('Advance')}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={r.netAmount} weight="bold" /><StatusPill tone={st.tone}>{t(st.label)}</StatusPill></View>}
                chevron onPress={() => setRecordId(r.id)} />
            );
          }}
          empty={<EmptyState icon={Wallet} title={t('Abhi koi tankhwah record nahi')} />}
        />
        {sheets}{common}
      </>
    );
  }

  const chosen = rows.filter((r) => selected.has(r.staff.id) && !r.record);
  const chosenTotal = chosen.reduce((a, r) => a + payNow(applyEdit(r, edits[r.staff.id]).net, edits[r.staff.id]), 0);
  return (
    <>
      <ListTemplate<RunRow>
        title={t('Payroll')} subtitle={sheet?.label} actions={actions}
        summary={<View style={{ gap: th.space(3) }}>
          {tabs}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Wallet} label={sheet ? t('{{label}} ki tankhwah', { label: sheet.label }) : t('Tankhwah')} loading={!tot} value={<Amount value={tot?.gross ?? 0} weight="bold" size="xl" compact />} hint={t('{{staff}} staff', { staff: tot?.staff ?? 0 })} onPress={() => setView('')} />
            <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Banknote} tone="danger" label={t('Abhi deni hai')} loading={!tot} value={<Amount value={tot?.due ?? 0} weight="bold" size="xl" compact />} hint={tot?.open ? t('{{open}} ki tankhwah nahi bani', { open: tot.open }) : t('Sab ki ban chuki')} onPress={() => setView(view === 'due' ? '' : 'due')} />
            <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={Check} tone="success" label={t('Ada ho gayi')} loading={!tot} value={<Amount value={tot?.paid ?? 0} weight="bold" size="xl" compact />} hint={t('{{saved}} tankhwah bani', { saved: tot?.saved ?? 0 })} onPress={() => setView(view === 'paid' ? '' : 'paid')} />
            <StatTile style={{ flexBasis: '47%', flexGrow: 1 }} icon={HandCoins} tone="warning" label={t('Advance baqi')} loading={!tot} value={<Amount value={tot?.advanceOutstanding.amount ?? 0} weight="bold" size="xl" compact />} hint={tot?.advanceOutstanding.staff ? t('{{staff}} staff se katna hai', { staff: tot.advanceOutstanding.staff }) : undefined} onPress={() => setTab('advances')} />
          </View>
          {canPay && openPayable.length > 0 && (
            <>
              <Checkbox value={allOn} onChange={(on) => setSelected(on ? new Set(openPayable.map((r) => r.staff.id)) : new Set())}
                label={t('Sab chunein ({{count}} baqi)', { count: openPayable.length })}
                description={chosen.length ? t('{{count}} chune · {{chosenTotal}}', { count: chosen.length, chosenTotal: formatPKR(chosenTotal) }) : t('Jin ki tankhwah ek saath deni hai un par tick lagayein')} />
              {/* In the header, not a floating button: a floating one covered the last row's Pay button. */}
              <Button icon={HandCoins} fullWidth onPress={() => payList(chosen.length ? chosen : openPayable)}>
                {chosen.length ? t('{{size}} ki tankhwah', { size: chosen.length }) : t('Sab ki tankhwah')}
              </Button>
            </>
          )}
        </View>}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, staff number ya ohda…') }}
        filters={{ value: view, onChange: (v) => setView(v as View_), options: [{ value: '', label: t('Sab') }, { value: 'open', label: t('Nahi bani') }, { value: 'due', label: t('Baqi') }, { value: 'paid', label: t('Ada') }] }}
        data={rows} loading={runQ.isLoading && !sheet} error={runQ.error} onRetry={runQ.refetch} refreshing={runQ.isRefetching} onRefresh={() => void runQ.refetch()}
        keyExtractor={(r) => r.staff.id} grouped={false}
        renderItem={({ item }) => (
          <RunLine r={item} edit={edits[item.staff.id]} on={selected.has(item.staff.id)} selectable={canPay} showShop={allShops}
            canPay={canPay} onToggle={() => toggle(item.staff.id)} onEdit={() => setEditRow(item)}
            onPay={() => payList([item])} onOpen={() => item.record && setRecordId(item.record.id)}
            onPayBalance={() => item.record && setBalance({ id: item.record.id, paymentNumber: item.record.paymentNumber, monthLabel: item.record.monthLabel, balanceAmount: item.record.balanceAmount, staff: { fullName: item.staff.fullName } })} />
        )}
        empty={<EmptyState icon={Wallet} title={search || view ? t('Is filter me koi nahi') : t('Abhi koi staff nahi')} message={t('Staff page par staff add karein; phir yahan har mahine ki tankhwah banti hai.')} />}
      />
      {sheets}{common}
    </>
  );
}

function RunLine({ r, edit, on, selectable, showShop, canPay, onToggle, onEdit, onPay, onOpen, onPayBalance }: {
  r: RunRow; edit?: RunEdit; on: boolean; selectable: boolean; showShop: boolean; canPay: boolean;
  onToggle: () => void; onEdit: () => void; onPay: () => void; onOpen: () => void; onPayBalance: () => void;
}) {
  const th = useTheme();
  const rec = r.record;
  const p = applyEdit(r, edit);
  const a = r.attendance;
  const editable = !rec && canPay;
  const st = rec ? STATUS[rec.status] : null;
  const net = rec ? rec.netAmount : p.net;
  const att = a.marked
    ? [`${days(a.present + a.late + a.half * 0.5)} ${t('hazir')}`, a.absent ? `${a.absent} ${t('ghair hazir')}` : '', a.leave ? `${a.leave} ${t('chhutti')}` : '', a.unpaidLeave ? `${a.unpaidLeave} ${t('bina tankhwah')}` : ''].filter(Boolean).join(' · ')
    : t('Hazri nahi lagi');
  const parts: Array<[string, number, boolean]> = rec
    ? [[t('Overtime'), rec.overtimePay, false], [t('Commission'), rec.commissionEarned, false], [t('Bonus'), rec.bonuses, false], [t('Ghair hazri'), rec.leaveDeduction, true], [t('Advance'), rec.advances, true], [t('Katauti'), rec.otherDeductions, true]]
    : [[t('Overtime'), p.overtimePay, false], [t('Commission'), p.commission, false], [t('Bonus'), p.bonuses, false], [t('Ghair hazri'), p.absentCut, true], [t('Advance'), p.advance, true], [t('Katauti'), p.otherCuts, true]];
  const shown = parts.filter(([, v]) => v > 0);

  return (
    <View style={{ backgroundColor: on ? th.colors.brand.soft : th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 1, borderColor: on ? th.colors.brand.border : th.colors.border, padding: th.space(3), marginBottom: th.space(2), gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        {selectable && !rec && <Checkbox value={on} onChange={onToggle} />}
        <Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>{r.staff.fullName}</Text>
          <Text size="xs" tone="muted" numberOfLines={1}>{`${r.staff.designation} · ${t(SALARY_TYPE[r.staff.salaryType].label)}${showShop && r.staff.shop ? ` · ${r.staff.shop.name}` : ''}`}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Amount value={net} weight="bold" size="md" />
          {st && rec ? <StatusPill tone={st.tone}>{t(st.label)}</StatusPill> : edit ? <StatusPill tone="brand">{t('Badla hua')}</StatusPill> : null}
        </View>
      </View>
      <Text size="xs" tone="muted">{att}</Text>
      {shown.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: th.space(3), rowGap: 2 }}>
          {shown.map(([k, v, minus]) => <Text key={k} size="xs" tone={minus ? 'danger' : 'secondary'} ltr>{`${minus ? '−' : '+'}${k} ${formatPKR(v)}`}</Text>)}
        </View>
      )}
      {r.warnings.length > 0 && <Text size="xs" tone="warning">{r.warnings.join(' · ')}</Text>}
      <View style={{ flexDirection: 'row', gap: th.space(2), justifyContent: 'flex-end', alignItems: 'center' }}>
        {rec && <Button size="sm" variant="ghost" iconEnd={ChevronRight} iconEndFlip onPress={onOpen}>{rec.balanceAmount > 0.5 ? t('Baqi {{balanceAmount}}', { balanceAmount: formatPKR(rec.balanceAmount) }) : rec.paymentNumber}</Button>}
        {rec && canPay && rec.status !== 'CANCELLED' && rec.balanceAmount > 0.5 && <Button size="sm" icon={Banknote} onPress={onPayBalance}>{t('Baqi dein')}</Button>}
        {editable && <Button size="sm" variant="secondary" icon={Pencil} onPress={onEdit}>{t('Badlein')}</Button>}
        {editable && <Button size="sm" icon={HandCoins} disabled={p.advanceTooBig} onPress={onPay}>{t('Dein')}</Button>}
      </View>
    </View>
  );
}
