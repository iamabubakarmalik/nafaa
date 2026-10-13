/**
 * Payroll: the month's salary for every staff member of the branch — base
 * pay, attendance, overtime, commission, advances, bonuses and deductions —
 * paid one by one or all together from the drawer or an account; advances
 * and loans; every salary on record with payslips; and analytics.
 *
 * Keys: 1 is mahine · 2 advance · 3 record · 4 analytics · [ ] mahina ·
 * / dhoondein · A advance · P chune hue ki tankhwah · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, CalendarClock, ChevronLeft, ChevronRight, Download, Filter, GraduationCap, HandCoins, History, Info, ListChecks, Percent,
  Printer, Store, UserRound, Users, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { payrollApi, type HistoryQuery, type RecordStatus, type RunEdit, type RunRow } from '../api/payroll.api';
import { AdvanceModal } from '../components/AdvanceModal';
import { AdvancesList } from '../components/AdvancesList';
import { HistoryList } from '../components/HistoryList';
import { CancelModal, PayBalanceModal, RunPayModal, type BalanceTarget, type CancelTarget, type PayLineView } from '../components/PayModals';
import { PayrollAnalytics } from '../components/PayrollAnalytics';
import { PayslipPrintModal } from '../components/PayslipPrintModal';
import { RecordModal } from '../components/RecordModal';
import { RowEditModal } from '../components/RowEditModal';
import { RunSheet } from '../components/RunSheet';
import { applyEdit, payNow } from '../components/calc';
import { PAYROLL_KEY, STATUS, currentMonth, monthName, shiftMonth } from '../components/meta';
import { historyCsv, historyDoc, runSheetCsv, runSheetDoc } from '../components/print';

type Tab = 'run' | 'advances' | 'history' | 'analytics';
type View = '' | 'open' | 'due' | 'paid';
const TABS: Tab[] = ['run', 'advances', 'history', 'analytics'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function PayrollPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const canWrite = usePermission(PERMISSIONS.STAFF_MANAGE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const thisMonth = currentMonth(startHour);

  const [tab, setTab] = useState<Tab>(() => (TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : params.get('staffId') ? 'history' : 'run'));
  const [month, setMonth] = useState(() => (MONTH.test(params.get('month') ?? '') ? params.get('month')! : thisMonth));
  const [shopId, setShopId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('');
  const [edits, setEdits] = useState<Record<string, RunEdit>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staffId, setStaffId] = useState(params.get('staffId') ?? '');
  const [kind, setKind] = useState<'' | 'salary' | 'advance'>('');
  const [status, setStatus] = useState<'' | RecordStatus>('');
  const [page, setPage] = useState(1);
  const [allAdvances, setAllAdvances] = useState(false);

  const [editRow, setEditRow] = useState<RunRow | null>(null);
  const [payLines, setPayLines] = useState<PayLineView[] | null>(null);
  const [balance, setBalance] = useState<BalanceTarget | null>(null);
  const [cancel, setCancel] = useState<CancelTarget | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setEdits({}); setSelected(new Set()); }, [month, shopId]);
  useEffect(() => { setPage(1); }, [staffId, kind, status, query, shopId]);
  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'run') next.set('tab', tab);
    if (month !== thisMonth) next.set('month', month);
    if (staffId) next.set('staffId', staffId);
    setParams(next, { replace: true });
  }, [tab, month, staffId, thisMonth, setParams]);

  const branch = shopId || undefined;
  const runQ = useQuery({ queryKey: [PAYROLL_KEY, 'run', month, branch], queryFn: () => payrollApi.run(month, branch), placeholderData: (p) => p });
  const advQ = useQuery({ queryKey: [PAYROLL_KEY, 'advances', branch], queryFn: () => payrollApi.advances(branch), enabled: tab === 'advances' });
  const hq: HistoryQuery = { shopId: branch, staffId: staffId || undefined, kind: kind || undefined, status: status || undefined, search: query || undefined, page, limit: 30 };
  const histQ = useQuery({ queryKey: [PAYROLL_KEY, 'history', hq], queryFn: () => payrollApi.history(hq), placeholderData: (p) => p, enabled: tab === 'history' });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops });

  const sheet = runQ.data;
  const t = sheet?.totals;
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const branchName = shopId ? shops.find((s) => s.id === shopId)?.name ?? 'Branch' : allShops ? 'Sab branches' : 'Ye branch';
  const staffOptions = useMemo(() => (sheet?.rows ?? []).map((r) => r.staff), [sheet]);
  const savedThisMonth = useMemo(() => new Set((sheet?.month === thisMonth ? sheet.rows : []).filter((r) => r.record).map((r) => r.staff.id)), [sheet, thisMonth]);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return (sheet?.rows ?? []).filter((r) => {
      if (q && !`${r.staff.fullName} ${r.staff.staffNumber} ${r.staff.designation}`.toLowerCase().includes(q)) return false;
      if (view === 'open') return !r.record;
      if (view === 'due') return !r.record || r.record.balanceAmount > 0.5;
      if (view === 'paid') return !!r.record && r.record.balanceAmount <= 0.5;
      return true;
    });
  }, [sheet, query, view]);

  const lineOf = (r: RunRow): PayLineView => {
    const p = applyEdit(r, edits[r.staff.id]);
    return { staffId: r.staff.id, name: r.staff.fullName, avatarUrl: r.staff.avatarUrl, designation: r.staff.designation, net: p.net, payNow: payNow(p.net, edits[r.staff.id]), edit: edits[r.staff.id] };
  };
  const paySelected = () => {
    const chosen = (sheet?.rows ?? []).filter((r) => selected.has(r.staff.id) && !r.record);
    if (chosen.length) setPayLines(chosen.map(lineOf));
  };
  const openPayable = (sheet?.rows ?? []).filter((r) => !r.record);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i >= 0) setTab(TABS[i]);
      if (e.key === '[') setMonth((m) => shiftMonth(m, -1));
      if (e.key === ']') setMonth((m) => (m < thisMonth ? shiftMonth(m, 1) : m));
      if ((e.key === 'a' || e.key === 'A') && canWrite && sheet) { e.preventDefault(); setAdvanceFor(''); }
      if ((e.key === 'p' || e.key === 'P') && canWrite) { e.preventDefault(); paySelected(); }
      if (e.key === '/') { e.preventDefault(); if (tab === 'analytics' || tab === 'advances') setTab('run'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const historyFilter = [staffId && staffOptions.find((s) => s.id === staffId)?.fullName, kind === 'advance' ? 'Advance' : kind === 'salary' ? 'Tankhwah' : '', status && STATUS[status].label, query && `"${query}"`, shopId && branchName].filter(Boolean).join(' · ');
  const printDoc = tab === 'history'
    ? async () => historyDoc(await payrollApi.history({ ...hq, page: 1, limit: 200 }), historyFilter)
    : async () => runSheetDoc(sheet!, edits, branchName);
  const exportCsv = async () => {
    if (tab === 'history') historyCsv(await payrollApi.history({ ...hq, page: 1, limit: 200 }), historyFilter);
    else if (sheet) runSheetCsv(sheet, edits, branchName);
  };

  const filteredRun = !!view || !!query;
  const filteredHistory = !!staffId || !!kind || !!status || !!query;
  const clear = () => { setSearch(''); setView(''); setStaffId(''); setKind(''); setStatus(''); };
  const recordToCancel = (r: { id: string; paymentNumber: string; kind: 'salary' | 'advance'; paidAmount: number; staff: { fullName: string } }) =>
    setCancel({ id: r.id, paymentNumber: r.paymentNumber, kind: r.kind, paidAmount: r.paidAmount, staffName: r.staff.fullName });

  return (
    <PageShell>
      <PageHero
        title="Tankhwah"
        chip={<><Wallet /> Payroll</>}
        meta="Hazri, overtime, commission, advance — har mahine ki tankhwah ek jagah"
        busy={runQ.isFetching && !runQ.isLoading}
        loading={runQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
            <PrintButton doc={printDoc} disabled={tab === 'history' ? !histQ.data?.items.length : !sheet?.rows.length || tab !== 'run'} />
          </span>
          <button type="button" onClick={exportCsv} disabled={tab === 'history' ? !histQ.data?.items.length : !sheet?.rows.length || tab !== 'run'} title="CSV" className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWrite && <button type="button" onClick={() => setAdvanceFor('')} disabled={!sheet} title="Advance dein (A)" className={heroButton}><HandCoins className="h-4 w-4" /> Advance</button>}
          {canWrite && (
            <button type="button" title="Sab baqi ki tankhwah (P)" className={heroPrimaryButton} disabled={!openPayable.length || !!sheet?.isFuture}
              onClick={() => { const list = selected.size ? openPayable.filter((r) => selected.has(r.staff.id)) : openPayable.filter((r) => !applyEdit(r, edits[r.staff.id]).advanceTooBig); if (list.length) setPayLines(list.map(lineOf)); }}>
              <Wallet className="h-4 w-4" /> {selected.size ? `${selected.size} ki tankhwah` : 'Sab ki tankhwah'}
            </button>
          )}
        </>}
        stats={t ? [
          { label: `${sheet!.label} — kul`, value: formatPKR(t.gross), hint: `${t.staff} staff` },
          { label: 'Ada ho gayi', value: formatPKR(t.paid), hint: `${t.saved} bani` },
          { label: 'Abhi deni hai', value: formatPKR(t.due), hint: t.open ? `${t.open} ki baqi` : undefined },
        ] : [{ label: 'Is mahine', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wallet} color="#7c3aed" label={`${sheet!.label} ki tankhwah`} value={formatPKR(t.gross)} hint={`${t.staff} staff · net ${formatPKR(t.net)}`}
            onClick={() => { setTab('run'); setView(''); }} active={tab === 'run' && !view} />
          <KpiCard icon={CalendarClock} color="#e11d48" label="Abhi deni hai" value={formatPKR(t.due)} hint={t.open ? `${t.open} ki tankhwah nahi bani` : 'Sab ki ban chuki'}
            onClick={() => { setTab('run'); setView('due'); }} active={tab === 'run' && view === 'due'} />
          <KpiCard icon={ListChecks} color="#16a34a" label="Ada ho gayi" value={formatPKR(t.paid)} hint={`${t.saved} tankhwah bani`}
            onClick={() => { setTab('run'); setView('paid'); }} active={tab === 'run' && view === 'paid'} />
          <KpiCard icon={HandCoins} color="#d97706" label="Advance baqi" value={formatPKR(t.advanceOutstanding.amount)} hint={t.advanceOutstanding.staff ? `${t.advanceOutstanding.staff} staff se katna hai` : 'Koi advance baqi nahi'}
            onClick={() => setTab('advances')} active={tab === 'advances'} />
          <KpiCard icon={Percent} color="#0891b2" label="Sale ka hissa" value={t.salesPct == null ? '—' : `${t.salesPct}%`} hint={`${sheet!.label} sale ${formatPKR(t.sales)}`}
            onClick={() => setTab('analytics')} active={tab === 'analytics'} />
        </>}
      </KpiRow>

      <FilterBar
        search={tab === 'run' || tab === 'history'
          ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tab === 'run' ? 'Staff ka naam, number ya ohda…' : 'Naam, staff number ya PAY- / ADV- number…'} label="Search" />
          : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'analytics' ? `${monthName(month)} tak pichle 12 mahine` : 'Diye gaye advance aur qarz — har qist kis mahine kategi'}</p>}
        chips={(tab === 'run' && filteredRun) || (tab === 'history' && filteredHistory) ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {tab === 'run' && view && <FilterChip onRemove={() => setView('')}>{VIEW_LABEL[view]}</FilterChip>}
          {tab === 'history' && staffId && <FilterChip onRemove={() => setStaffId('')}>{staffOptions.find((s) => s.id === staffId)?.fullName ?? 'Staff'}</FilterChip>}
          {tab === 'history' && kind && <FilterChip onRemove={() => setKind('')}>{kind === 'advance' ? 'Advance' : 'Tankhwah'}</FilterChip>}
          {tab === 'history' && status && <FilterChip onRemove={() => setStatus('')}>{STATUS[status].label}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        {(tab === 'run' || tab === 'analytics') && (
          <div className="inline-flex h-11 items-center gap-1 rounded-2xl bg-slate-100/80 px-1">
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Pichla mahina ([)" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-[6.5rem] text-center text-[0.875rem] font-semibold text-slate-800">{monthName(month)}</span>
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= thisMonth} aria-label="Agla mahina (])" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            {month !== thisMonth && <button type="button" onClick={() => setMonth(thisMonth)} className="rounded-xl px-2.5 py-1.5 text-[0.75rem] font-medium text-brand-700 hover:bg-white">Is mahine</button>}
          </div>
        )}
        {allShops && shops.length > 1 && (
          <FilterMenu icon={Store} label="Branch" value={shopId} active={!!shopId} onChange={setShopId}
            options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
        )}
        {tab === 'run' && (
          <FilterMenu icon={Filter} label={VIEW_LABEL[view]} value={view} active={!!view} onChange={setView} align="right"
            options={(['', 'open', 'due', 'paid'] as View[]).map((v) => ({ value: v, label: VIEW_LABEL[v] }))} />
        )}
        {tab === 'history' && <>
          {staffOptions.length > 0 && (
            <FilterMenu icon={UserRound} label="Staff" value={staffId} active={!!staffId} onChange={setStaffId} width="w-72"
              options={[{ value: '', label: 'Sab staff' }, ...staffOptions.map((s) => ({ value: s.id, label: s.fullName, hint: s.designation }))]} />
          )}
          <FilterMenu icon={History} label="Type" value={kind} active={!!kind} onChange={setKind}
            options={[{ value: '' as const, label: 'Sab' }, { value: 'salary' as const, label: 'Tankhwah' }, { value: 'advance' as const, label: 'Advance' }]} />
          <FilterMenu icon={Filter} label="Haal" value={status} active={!!status} onChange={setStatus} align="right"
            options={[{ value: '' as const, label: 'Sab' }, ...(Object.keys(STATUS) as RecordStatus[]).map((k) => ({ value: k as '' | RecordStatus, label: STATUS[k].label, icon: STATUS[k].icon }))]} />
        </>}
        {tab === 'advances' && (
          <FilterMenu icon={Filter} label={allAdvances ? 'Sab advance' : 'Sirf baqi'} value={allAdvances ? 'all' : 'open'} onChange={(v) => setAllAdvances(v === 'all')} align="right"
            options={[{ value: 'open', label: 'Sirf baqi' }, { value: 'all', label: 'Sab advance (purane bhi)' }]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>1</Kbd>-<Kbd>4</Kbd> tabs · <Kbd>[</Kbd> <Kbd>]</Kbd> mahina · <Kbd>/</Kbd> search{canWrite && <> · <Kbd>A</Kbd> advance</>}</>}
        tabs={[
          { id: 'run', label: 'Is mahine', icon: Users, count: t?.open || null },
          { id: 'advances', label: 'Advance', icon: HandCoins, count: advQ.data?.totals.open ?? null },
          { id: 'history', label: 'Record', icon: History, count: histQ.data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'run' && <>
        {sheet && sheet.commission !== 'ok' && (
          <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
            <Info className="h-4 w-4 shrink-0" />
            {sheet.commission === 'hidden' ? 'Commission dekhne ki permission nahi — tankhwah me commission shamil nahi hogi, woh Commission page se alag dein.' : 'Commission abhi load nahi hui — tankhwah bina commission ke ban rahi hai.'}
          </p>
        )}
        {sheet && sheet.commission === 'ok' && !sheet.canPayCommission && sheet.rows.some((r) => (r.commission?.earned ?? 0) > 0) && (
          <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
            <Info className="h-4 w-4 shrink-0" />Commission ada karne ki permission (Commission manage) nahi — commission tankhwah me nahi judegi.
          </p>
        )}
        {sheet?.isFuture && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Ye mahina abhi shuru nahi hua — sirf andaza dikh raha hai.</p>}
        {runQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : runQ.isError && !sheet ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Tankhwah load nahi hui</p>
            <Button className="mt-3" variant="secondary" onClick={() => runQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filteredRun ? 'Is filter me koi staff nahi' : 'Is branch me koi staff nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Staff page par bande ki tankhwah aur branch likhein — phir yahan har mahine nazar aayega.</p>
            {filteredRun && <Button className="mt-4" variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        ) : sheet && (
          <RunSheet sheet={sheet} rows={rows} edits={edits} selected={selected} showShop={allShops && !shopId}
            onToggle={(id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
            onToggleAll={(ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; })}
            onEdit={setEditRow}
            onPay={(r) => setPayLines([lineOf(r)])}
            onPaySelected={paySelected}
            onOpen={setRecordId}
            onPrint={setPrintId}
            onPayBalance={(r) => r.record && setBalance(r.record)} />
        )}
      </>}

      {tab === 'advances' && (
        <AdvancesList data={advQ.data} loading={advQ.isLoading} failed={advQ.isError} showAll={allAdvances} canWrite={canWrite}
          onGive={() => setAdvanceFor('')} onPrint={setPrintId} onRetry={() => advQ.refetch()}
          onCancel={(g) => setCancel({ id: g.id, paymentNumber: g.number, kind: 'advance', paidAmount: g.total, staffName: g.staff.fullName })} />
      )}

      {tab === 'history' && (
        <HistoryList data={histQ.data} loading={histQ.isLoading} failed={histQ.isError} filtered={filteredHistory} page={page} showShop={allShops && !shopId}
          onOpen={setRecordId} onPrint={setPrintId} onRetry={() => histQ.refetch()} onClear={clear} onPage={setPage} />
      )}

      {tab === 'analytics' && <PayrollAnalytics month={month} shopId={branch} />}

      {editRow && sheet && (
        <RowEditModal row={editRow} edit={edits[editRow.staff.id]} canPayCommission={sheet.canPayCommission} onClose={() => setEditRow(null)}
          onSave={(e) => setEdits((x) => { const n = { ...x }; if (e) n[editRow.staff.id] = e; else delete n[editRow.staff.id]; return n; })} />
      )}
      {payLines && sheet && (
        <RunPayModal month={month} monthLabel={sheet.label} shopId={branch} lines={payLines} sources={sheet.sources} onClose={() => setPayLines(null)}
          onDone={(r) => { const done = new Set(r.created.map((c) => c.staffId)); setSelected((s) => new Set([...s].filter((id) => !done.has(id)))); setEdits((x) => Object.fromEntries(Object.entries(x).filter(([id]) => !done.has(id)))); }} />
      )}
      {balance && sheet && <PayBalanceModal record={balance} sources={sheet.sources} shopId={branch} onClose={() => setBalance(null)} />}
      {cancel && <CancelModal record={cancel} shopId={branch} onClose={() => { setCancel(null); setRecordId(null); }} />}
      {recordId && (
        <RecordModal recordId={recordId} canWrite={canWrite} onClose={() => setRecordId(null)} onPrint={setPrintId}
          onPay={(r) => { if (sheet) { setBalance(r); setRecordId(null); } }}
          onCancel={recordToCancel} />
      )}
      {printId && <PayslipPrintModal recordId={printId} onClose={() => setPrintId(null)} />}
      {advanceFor !== null && sheet && (
        <AdvanceModal staff={staffOptions.filter((s) => s.status !== 'TERMINATED' && s.status !== 'RESIGNED')} thisMonth={thisMonth} savedThisMonth={savedThisMonth}
          sources={sheet.sources} shopId={branch} staffId={advanceFor || undefined} onClose={() => setAdvanceFor(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Tankhwah — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Users, color: '#7c3aed', title: 'Har mahine ki list', text: '"Is mahine" me branch ka har banda hai: tankhwah, hazri, overtime, commission aur advance ki qist khud jud kar net amount banti hai.' },
            { icon: ListChecks, color: '#2563eb', title: 'Badlein', text: 'Kisi line par "Badlein" — bonus ya katauti wajah ke saath, dihari ke din, overtime, ghair hazri ki katauti band, ya abhi kam amount dena.' },
            { icon: Wallet, color: '#16a34a', title: 'Ada karein', text: 'Ek bande ko "Dein", ya kai chun kar ek saath. Paisa galle se ya bank / wallet account se — ya "baad me dein" chun kar sirf tankhwah bana lein.' },
            { icon: HandCoins, color: '#d97706', title: 'Advance aur qarz', text: '"Advance" se mahine ke beech paise dein. Ek dafa ya kai qiston me — har mahine ki tankhwah se khud kat jata hai.' },
            { icon: Printer, color: '#0891b2', title: 'Payslip', text: 'Bani hui tankhwah par Payslip — A4, PDF ya thermal, dastkhat ki jagah ke saath. Upar Print se poori list.' },
            { icon: BarChart3, color: '#e11d48', title: 'Analytics', text: '12 mahine ki tankhwah, sale ka kitna hissa, branch, ohda aur sab se zyada tankhwah wale.' },
          ]}
          tips={[
            'Ek bande ki ek mahine ki tankhwah ek hi dafa banti hai — dobara dabane se dobara paisa nahi jata.',
            'Ghalti ho to record khol kar "Cancel" karein — diya hua paisa wapas usi galle / account me likha jata hai.',
            'Hazri na lagi ho to mahana tankhwah poori banti hai; ghair hazri sirf tab katti hai jab hazri lagi ho.',
            'Galle se dene ke liye "Cash register kholna" aur account se dene ke liye "Expenses likhna" ki permission chahiye.',
            'Tankhwah ko Expenses me alag se "Salary" likh kar dobara na daalein — profit do dafa kam dikhega.',
          ]}
          shortcuts={[['1', 'is mahine'], ['2', 'advance'], ['3', 'record'], ['4', 'analytics'], ['[ ]', 'mahina'], ['/', 'dhoondein'], ['A', 'advance'], ['P', 'chune hue ki tankhwah'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const VIEW_LABEL: Record<View, string> = { '': 'Sab staff', open: 'Tankhwah nahi bani', due: 'Abhi deni hai', paid: 'Ada ho gayi' };
