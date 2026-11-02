/**
 * Sync center: what this device saved while offline and whether it reached
 * the server. History of every change (sales, products, customers,
 * expenses), the data kept on the device, storage used, and the tools:
 * sync now, upload, retry failed, refresh products, backup and restore,
 * clear the device copy.
 *
 * Unsent changes are never removed from here: a failed item is retried,
 * not deleted, so no bill or payment is lost.
 *
 * Keys: / search · R refresh · A analytics · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity, BarChart3, Building2, CalendarRange, CheckCircle2, Clock, CloudOff, Database, Download, GraduationCap, HardDrive, History, Layers,
  ListChecks, Package, Receipt, RefreshCw, RotateCcw, ShoppingCart, Tag, Trash2, Upload, Users, Wallet, Wifi, Wrench, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Alert, Button, Card, EmptyState, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField,
  Table, TBody, THead, Td, Th, Tr, ViewTabs, heroButton, heroIconButton, type FilterOption,
} from '@/design-system/components';
import { PageGuide, type GuideStep } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { setToDayStart, useBusinessDayStart } from '@core/lib/business-day';
import { useOfflineStatus } from '@core/hooks/useOfflineStatus';
import { fullSync, uploadPendingChanges, resetFailedItems } from '@core/lib/offline/syncEngine';
import { clearAllOfflineData } from '@core/lib/offline/db';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { exportBackup, importBackup } from '@core/lib/offline/offlineBackup';
import { getDeviceId } from '@core/lib/offline/offlineDevice';
import { loadFullHistory, getDataSnapshot, type HistoryEvent } from '@core/lib/offline/offlineHistory';
import { useAuthStore } from '@core/stores/auth.store';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { t as tr } from '@core/i18n';

type Category = HistoryEvent['category'];
type Status = HistoryEvent['status'];
type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month';

const CATEGORY: Record<Category, { label: string; icon: LucideIcon; color: string }> = {
  sale: { label: tr('Sales'), icon: ShoppingCart, color: '#16a34a' },
  product: { label: tr('Products'), icon: Package, color: '#2563eb' },
  customer: { label: tr('Customers'), icon: Users, color: '#7c3aed' },
  expense: { label: tr('Expenses'), icon: Receipt, color: '#ea580c' },
  lookup: { label: tr('Categories / Brands'), icon: Tag, color: '#475569' },
  other: { label: tr('Doosri'), icon: Database, color: '#94a3b8' },
};
const STATUS: Record<Status, { label: string; tone: string }> = {
  pending: { label: tr('Bhejna baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  syncing: { label: tr('Ja raha hai'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  synced: { label: tr('Server par'), tone: 'bg-success-50 text-success-700 ring-success-200' },
  failed: { label: tr('Nahi gaya'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};
const CATEGORY_OPTIONS: Array<FilterOption<'all' | Category>> = [
  { value: 'all', label: tr('Sab kaam'), icon: ListChecks, color: '#475569' },
  ...(Object.keys(CATEGORY) as Category[]).map((k) => ({ value: k, label: CATEGORY[k].label, icon: CATEGORY[k].icon, color: CATEGORY[k].color })),
];
const STATUS_OPTIONS: Array<FilterOption<'all' | Status>> = [
  { value: 'all', label: tr('Har halat') },
  { value: 'pending', label: STATUS.pending.label, hint: tr('Internet aate hi jayega'), icon: Clock, color: '#d97706' },
  { value: 'failed', label: STATUS.failed.label, hint: tr('Dobara bhejna hoga'), icon: XCircle, color: '#e11d48' },
  { value: 'synced', label: STATUS.synced.label, icon: CheckCircle2, color: '#16a34a' },
];
const DATE_OPTIONS: Array<FilterOption<DateFilter>> = [
  { value: 'today', label: tr('Aaj') }, { value: 'yesterday', label: tr('Kal') }, { value: 'week', label: tr('Pichle 7 din') },
  { value: 'month', label: tr('Pichle 30 din') }, { value: 'all', label: tr('Sab') },
];
const PAGE = 100;

const when = (v: number) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

interface Snapshot {
  products: number; customers: number; expenses: number;
  categories: number; brands: number; tags: number; expCats: number; shops: number;
  pendingSales: number; queueItems: number; hasPending: boolean;
}

/** Start/end (ms) of a date filter, on the shop's business day. */
function rangeOf(f: DateFilter, startHour: number): [number, number] {
  const today = setToDayStart(new Date(), startHour).getTime();
  const day = 86_400_000;
  if (f === 'today') return [today, Infinity];
  if (f === 'yesterday') return [today - day, today - 1];
  if (f === 'week') return [today - 6 * day, Infinity];
  if (f === 'month') return [today - 29 * day, Infinity];
  return [0, Infinity];
}

export default function SyncCenterPage() {
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const startHour = useBusinessDayStart();
  const theme = useChartTheme();
  const status = useOfflineStatus();
  const deviceId = useMemo(() => getDeviceId(), []);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'history' | 'analytics' | 'device'>('history');
  const [guide, setGuide] = useState(false);
  const [confirm, setConfirm] = useState<'clear' | { restore: File } | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [state, setState] = useState<'all' | Status>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [shown, setShown] = useState(PAGE);

  const refreshAll = useCallback(async () => {
    const [h, snap] = await Promise.all([loadFullHistory(), getDataSnapshot()]);
    setHistory(h);
    setSnapshot(snap);
    setLoaded(true);
    try {
      const est = await navigator.storage?.estimate?.();
      if (est) setStorage({ usage: est.usage || 0, quota: est.quota || 0 });
    } catch { /* storage estimate is optional */ }
  }, []);

  useEffect(() => {
    void refreshAll();
    const t = window.setInterval(() => void refreshAll(), 3000);
    return () => window.clearInterval(t);
  }, [refreshAll]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const [from, to] = rangeOf(dateFilter, startHour);
    return history.filter((e) => e.createdAt >= from && e.createdAt <= to
      && (category === 'all' || e.category === category)
      && (state === 'all' || e.status === state)
      && (!q || e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || (e.error ?? '').toLowerCase().includes(q)));
  }, [history, search, category, state, dateFilter, startHour]);
  useEffect(() => setShown(PAGE), [search, category, state, dateFilter]);

  const stats = useMemo(() => {
    const [today] = rangeOf('today', startHour);
    const count = (s: Status) => history.filter((e) => e.status === s).length;
    return {
      today: history.filter((e) => e.createdAt >= today).length,
      pending: count('pending') + count('syncing'), failed: count('failed'), synced: count('synced'),
      amount: filtered.reduce((a, e) => a + (e.category === 'sale' ? e.amount ?? 0 : 0), 0),
    };
  }, [history, filtered, startHour]);

  const trend = useMemo(() => {
    const day = 86_400_000;
    const [today] = rangeOf('today', startHour);
    const rows = Array.from({ length: 14 }, (_, i) => {
      const at = today - (13 - i) * day;
      return { at, label: new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(at)), sales: 0, other: 0 };
    });
    for (const e of history) {
      const i = Math.floor((e.createdAt - rows[0].at) / day);
      if (i < 0 || i >= rows.length) continue;
      if (e.category === 'sale') rows[i].sales += 1; else rows[i].other += 1;
    }
    return rows;
  }, [history, startHour]);

  const byCategory = useMemo(() => (Object.keys(CATEGORY) as Category[])
    .map((k) => ({ id: k, ...CATEGORY[k], count: history.filter((e) => e.category === k).length, failed: history.filter((e) => e.category === k && e.status === 'failed').length }))
    .filter((c) => c.count > 0).sort((a, b) => b.count - a.count), [history]);

  const storagePct = storage && storage.quota > 0 ? Math.round((storage.usage / storage.quota) * 100) : 0;
  const unsent = snapshot ? snapshot.pendingSales + snapshot.queueItems : 0;
  const hasFilters = !!(search.trim() || category !== 'all' || state !== 'all' || dateFilter !== 'week');
  const clearFilters = () => { setSearch(''); setCategory('all'); setState('all'); setDateFilter('week'); };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error((e as Error)?.message || tr('Nahi hua')); } finally { setBusy(null); await refreshAll(); }
  };
  const syncNow = () => run('sync', () => fullSync(false, true));
  const uploadNow = () => run('upload', async () => {
    const r = await uploadPendingChanges();
    toast.success(tr('{{salesSynced}} sales aur {{queueSynced}} doosre kaam server par chale gaye', { salesSynced: r.salesSynced, queueSynced: r.queueSynced }));
  });
  const retryFailed = () => run('reset', async () => {
    const n = await resetFailedItems();
    if (!n) { toast.info(tr('Koi ruka hua kaam nahi')); return; }
    toast.success(tr('{{n}} kaam dobara bheje ja rahe hain', { n }));
    await uploadPendingChanges();
  });
  const refreshProducts = () => run('products', async () => { await forceRefreshProducts(); toast.success(tr('Products taaza ho gaye')); });
  const backup = () => run('backup', async () => { await exportBackup(); toast.success(tr('Backup download ho gaya')); });
  const restore = (file: File) => run('restore', async () => {
    const r = await importBackup(file);
    toast.success(tr('{{restored}} records wapas aa gaye', { restored: r.restored }));
  });
  const clearDevice = () => run('clear', async () => {
    await clearAllOfflineData();
    toast.success(tr('Computer ka data saaf — server se dobara aa raha hai'));
    await fullSync(true, true);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setTab('history'); setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'r') { e.preventDefault(); void refreshAll(); }
      else if (k === 'a') setTab((t) => (t === 'analytics' ? 'history' : 'analytics'));
      else if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refreshAll]);

  const exportCsv = () => {
    if (!filtered.length) return toast.error(tr('Koi kaam nahi'));
    downloadCsv(`sync-history-${new Date().toISOString().slice(0, 10)}.csv`, [
      [tr('Sync history — {{value}}', { value: tenantName || 'Nafaa' })], [tr('Branch: {{value}} · Device: {{deviceId}}', { value: shopName || 'Sab', deviceId })], [''],
      [tr('Waqt'), tr('Kaam'), tr('Title'), tr('Details'), tr('Amount'), tr('Halat'), tr('Ghalti')],
      ...filtered.map((e) => [when(e.createdAt), CATEGORY[e.category]?.label ?? e.category, e.title, e.description, e.amount ?? '', STATUS[e.status]?.label ?? e.status, e.error ?? '']),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: tr('Sync history'),
    subtitle: tr('{{label}} · Device {{deviceId}}', { label: DATE_OPTIONS.find((d) => d.value === dateFilter)?.label, deviceId }),
    meta: [[tr('Kaam'), String(filtered.length)], [tr('Bhejna baqi'), String(stats.pending)], [tr('Nahi gaye'), String(stats.failed)]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Waqt') }, { label: tr('Kaam') }, { label: tr('Details'), wideOnly: true }, { label: tr('Amount'), align: 'right' }, { label: tr('Halat') }],
      rows: filtered.slice(0, 2000).map((e) => [when(e.createdAt), e.title, e.description, e.amount ? formatPKR(e.amount) : '', STATUS[e.status]?.label ?? e.status]),
    }],
  });

  const spin = (key: string) => (busy === key ? 'animate-spin' : '');

  return (
    <PageShell>
      {guide && <SyncGuide onClose={() => setGuide(false)} />}
      {confirm === 'clear' && (
        <Modal open onClose={() => setConfirm(null)} size="sm" title={tr('Computer ka data saaf karein?')}
          description={tr('Sirf is computer ki copy mitegi; server par sab mehfooz hai aur dobara aa jayega.')}
          footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={busy === 'clear'} onClick={() => { setConfirm(null); void clearDevice(); }}>{tr('Saaf karein')}</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{tr('Pehle backup download kar lein to behtar hai.')}</p>
        </Modal>
      )}
      {confirm && typeof confirm === 'object' && (
        <Modal open onClose={() => setConfirm(null)} size="sm" title={tr('Backup wapas laayein?')}
          description={tr('{{name}} — is computer ke data mein mil jayega; jo pehle se hai woh nahi mitega.', { name: confirm.restore.name })}
          footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>{tr('Rehne dein')}</Button><Button loading={busy === 'restore'} onClick={() => { const f = confirm.restore; setConfirm(null); void restore(f); }}>{tr('Wapas laayein')}</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{tr('Wapas aaye bill internet aate hi server par jayenge.')}</p>
        </Modal>
      )}
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setConfirm({ restore: f }); e.target.value = ''; }} />

      <PageHero
        title={tr('Sync center')}
        chip={status.isOnline ? <><Wifi />{tr('Online')}</> : <><CloudOff />{tr('Offline')}</>}
        busy={status.isSyncing}
        meta={tr('Device {{deviceId}}{{value}}', { deviceId, value: shopName ? ` · ${shopName}` : '' })}
        loading={!loaded}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroIconButton} title={tr('CSV')}><Download className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} disabled={!filtered.length} /></span>
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => void syncNow()} disabled={busy !== null || !status.isOnline} className={heroButton}>
            <RefreshCw className={cn('h-4 w-4', (busy === 'sync' || status.isSyncing) && 'animate-spin')} />{tr('Abhi sync karein')}
          </button>
        </>}
        stats={[
          { label: tr('Bhejna baqi'), value: String(stats.pending), hint: unsent ? tr('{{value}} bill', { value: snapshot?.pendingSales ?? 0 }) : tr('sab server par') },
          { label: tr('Nahi gaye'), value: String(stats.failed), hint: stats.failed ? tr('dobara bhejein') : '' },
          { label: tr('Server par pohanch gaye'), value: String(stats.synced) },
          { label: tr('Aakhri sync'), value: status.lastSync ? new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(status.lastSync)) : '—', hint: status.lastSync ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(status.lastSync)) : '' },
        ]}
      />

      {status.progress && status.progress.total > 0 && (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-1.5 flex justify-between text-[0.8125rem] font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-600" />{tr('Sync ho raha hai…')}</span>
            <span className="tabular-nums">{status.progress.done} / {status.progress.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round((status.progress.done / status.progress.total) * 100)}%` }} />
          </div>
        </div>
      )}

      {stats.failed > 0 ? (
        <Alert tone="danger" title={tr('{{failed}} kaam server par nahi gaye', { failed: stats.failed })}
          action={<Button size="sm" variant="danger" loading={busy === 'reset'} disabled={busy !== null || !status.isOnline} leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => void retryFailed()}>{tr('Dobara bhejein')}</Button>}>
          {tr('Stock kam hona, mita hua record ya internet ka masla ho sakta hai. Neeche "Nahi gaya" wali lines mein wajah likhi hai.')}
        </Alert>
      ) : unsent > 0 && (
        <Alert tone="warning" title={tr('{{unsent}} kaam bhejna baqi', { unsent })}
          action={<Button size="sm" loading={busy === 'upload'} disabled={busy !== null || !status.isOnline} leftIcon={<Upload className="h-4 w-4" />} onClick={() => void uploadNow()}>{tr('Abhi bhejein')}</Button>}>
          {tr('{{value}}{{value2}}{{value3}} — internet aate hi khud chale jayenge.', { value: snapshot!.pendingSales > 0 ? tr('{{pendingSales}} bill', { pendingSales: snapshot!.pendingSales }) : '', value2: snapshot!.pendingSales > 0 && snapshot!.queueItems > 0 ? tr(' aur ') : '', value3: snapshot!.queueItems > 0 ? tr('{{queueItems}} doosre kaam', { queueItems: snapshot!.queueItems }) : '' })}
        </Alert>
      )}

      <KpiRow cols={4}>
        <KpiCard icon={Activity} color="#2563eb" label={tr('Aaj ke kaam')} value={stats.today} hint={tr('Is computer par')} onClick={() => { setDateFilter('today'); setTab('history'); }} active={dateFilter === 'today' && tab === 'history'} />
        <KpiCard icon={Clock} color="#d97706" label={tr('Bhejna baqi')} value={stats.pending} hint={stats.pending ? tr('Internet ka intezaar') : tr('Sab bhej diye')} onClick={() => { setState('pending'); setDateFilter('all'); setTab('history'); }} active={state === 'pending'} />
        <KpiCard icon={XCircle} color="#e11d48" label={tr('Nahi gaye')} value={stats.failed} hint={stats.failed ? tr('Wajah dekhein') : tr('Koi nahi')} onClick={() => { setState('failed'); setDateFilter('all'); setTab('history'); }} active={state === 'failed'} />
        <KpiCard icon={HardDrive} color="#475569" label={tr('Computer ki jagah')} value={storage ? mb(storage.usage) : '—'} hint={storage ? tr('{{storagePct}}% istemal', { storagePct }) : undefined} onClick={() => setTab('device')} />
      </KpiRow>

      <ViewTabs
        tabs={[
          { id: 'history', label: tr('History'), icon: History, count: filtered.length },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
          { id: 'device', label: tr('Computer ka data'), icon: Wrench },
        ]}
        value={tab} onChange={setTab}
        hint={<>{tr('Har 3 second mein khud taaza hota hai')}</>}
      />

      {tab === 'history' && (
        <>
          <FilterBar
            search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Bill number, naam ya ghalti…')} label={tr('History dhoondein')} />}
            chips={hasFilters ? <>
              {search.trim() && <FilterChip onRemove={() => setSearch('')}>“{search.trim()}”</FilterChip>}
              {category !== 'all' && <FilterChip onRemove={() => setCategory('all')}>{CATEGORY[category].label}</FilterChip>}
              {state !== 'all' && <FilterChip onRemove={() => setState('all')}>{STATUS[state].label}</FilterChip>}
              {dateFilter !== 'week' && <FilterChip onRemove={() => setDateFilter('week')}>{DATE_OPTIONS.find((d) => d.value === dateFilter)?.label}</FilterChip>}
            </> : undefined}
            onClear={clearFilters}
          >
            <FilterMenu icon={CalendarRange} label={DATE_OPTIONS.find((d) => d.value === dateFilter)?.label ?? tr('Period')} value={dateFilter} options={DATE_OPTIONS} onChange={setDateFilter} active={dateFilter !== 'week'} width="w-52" />
            <FilterMenu icon={Layers} label={category === 'all' ? tr('Kaam') : CATEGORY[category].label} value={category} options={CATEGORY_OPTIONS} onChange={setCategory} active={category !== 'all'} width="w-60" />
            <FilterMenu icon={ListChecks} label={state === 'all' ? tr('Halat') : STATUS[state].label} value={state} options={STATUS_OPTIONS} onChange={setState} active={state !== 'all'} align="right" width="w-60" />
          </FilterBar>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {!loaded ? <div className="h-48 animate-pulse bg-slate-50" /> : filtered.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={hasFilters ? tr('Is filter mein kuch nahi') : tr('Abhi koi kaam nahi')}
                description={hasFilters ? tr('Filter hata kar dekhein.') : tr('Offline bane bill aur badlav yahan dikhte hain.')}
                action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>{tr('Filter hatayein')}</Button> : undefined} />
            ) : (
              <>
                <Table minWidth="44rem">
                  <THead><Tr><Th>{tr('Waqt')}</Th><Th>{tr('Kaam')}</Th><Th>{tr('Details')}</Th><Th align="right">{tr('Amount')}</Th><Th>{tr('Halat')}</Th></Tr></THead>
                  <TBody>
                    {filtered.slice(0, shown).map((e) => {
                      const c = CATEGORY[e.category] ?? CATEGORY.other;
                      const st = STATUS[e.status] ?? STATUS.pending;
                      return (
                        <Tr key={e.id}>
                          <Td className="whitespace-nowrap text-[0.8125rem] text-slate-500">{when(e.createdAt)}</Td>
                          <Td>
                            <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}17`, color: c.color }}><c.icon className="h-3.5 w-3.5" /></span>
                              {e.title}
                            </span>
                          </Td>
                          <Td className="max-w-[28rem] text-[0.8125rem]">
                            <span className="block truncate">{e.description}</span>
                            {e.error && <span className="mt-0.5 block text-[0.75rem] font-medium text-rose-700">{e.error}</span>}
                          </Td>
                          <Td align="right" className="font-semibold text-slate-900">{e.amount ? formatPKR(e.amount) : '—'}</Td>
                          <Td>
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                            {!!e.retryCount && <span className="ms-1 text-[0.6875rem] text-slate-400">{e.retryCount}x</span>}
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
                {filtered.length > shown && (
                  <div className="border-t border-slate-100 p-2">
                    <Button variant="ghost" fullWidth onClick={() => setShown((n) => n + PAGE)}>{tr('Aur dikhayein ({{shown}} / {{count}})', { shown, count: filtered.length })}</Button>
                  </div>
                )}
              </>
            )}
          </div>
          {stats.amount > 0 && <p className="text-[0.8125rem] text-slate-500">{tr('Is list ke bills:')}{' '} <strong className="tabular-nums text-slate-800">{formatPKR(stats.amount)}</strong></p>}
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title={tr('Pichle 14 din')} description={tr('Is computer par roz kitne kaam hue')}>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="sales" name="Sales" stroke={theme.primary} fill={theme.primarySoft} strokeWidth={2} />
                  <Area type="monotone" dataKey="other" name="Doosre kaam" stroke={theme.highlight} fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="rounded-2xl" title={tr('Kaam ke hisaab se')}>
            {byCategory.length === 0 ? <p className="py-10 text-center text-[0.8125rem] text-slate-500">{tr('Abhi kuch nahi')}</p> : (
              <ul className="space-y-3">
                {byCategory.map((c) => {
                  const max = byCategory[0].count;
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => { setCategory(c.id); setDateFilter('all'); setTab('history'); }} className="w-full text-start">
                        <div className="flex justify-between text-[0.8125rem]">
                          <span className="inline-flex items-center gap-1.5 text-slate-700"><c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />{c.label}</span>
                          <span className="tabular-nums font-semibold">{c.count}{c.failed ? <span className="ms-1 text-rose-600">{tr('· {{failed}} nahi gaye', { failed: c.failed })}</span> : null}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: c.color }} /></div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'device' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title={tr('Is computer par rakha data')} description={tr('Internet ke bagair bhi yeh sab kaam karta hai')}>
            {!snapshot ? <div className="h-32 animate-pulse rounded-xl bg-slate-50" /> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  [Package, tr('Products'), snapshot.products, '#2563eb'], [Users, tr('Customers'), snapshot.customers, '#7c3aed'],
                  [Receipt, tr('Expenses'), snapshot.expenses, '#ea580c'], [Tag, tr('Categories'), snapshot.categories, '#16a34a'],
                  [Building2, tr('Brands'), snapshot.brands, '#0891b2'], [Layers, tr('Tags'), snapshot.tags, '#db2777'],
                  [Wallet, tr('Expense heads'), snapshot.expCats, '#d97706'], [Building2, tr('Branches'), snapshot.shops, '#475569'],
                ] as const).map(([Icon, label, value, color]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-3.5 w-3.5" /></span>
                    <p className="mt-2 text-[1.125rem] font-bold tabular-nums text-slate-900">{value.toLocaleString('en-PK')}</p>
                    <p className="text-[0.75rem] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            )}
            {storage && (
              <div className="mt-4">
                <div className="flex justify-between text-[0.8125rem] text-slate-600"><span className="inline-flex items-center gap-1.5"><HardDrive className="h-4 w-4" />{tr('Browser ki jagah')}</span><span className="tabular-nums">{tr('{{usage}} / {{value}} GB', { usage: mb(storage.usage), value: (storage.quota / 1024 / 1024 / 1024).toFixed(1) })}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', storagePct > 80 ? 'bg-rose-500' : 'bg-brand-600')} style={{ width: `${Math.max(1, storagePct)}%` }} /></div>
              </div>
            )}
          </Card>
          <Card className="rounded-2xl" title={tr('Auzaar')}>
            <div className="space-y-2">
              <Button fullWidth variant="secondary" leftIcon={<RefreshCw className={cn('h-4 w-4', spin('products'))} />} disabled={busy !== null || !status.isOnline} onClick={() => void refreshProducts()}>{tr('Products taaza karein')}</Button>
              <Button fullWidth variant="secondary" leftIcon={<RotateCcw className={cn('h-4 w-4', spin('reset'))} />} disabled={busy !== null || !status.isOnline || !stats.failed} onClick={() => void retryFailed()}>{tr('Ruke hue dobara bhejein')}</Button>
              <Button fullWidth variant="secondary" leftIcon={<Download className="h-4 w-4" />} loading={busy === 'backup'} disabled={busy !== null} onClick={() => void backup()}>{tr('Backup download')}</Button>
              <Button fullWidth variant="secondary" leftIcon={<Upload className="h-4 w-4" />} loading={busy === 'restore'} disabled={busy !== null} onClick={() => fileRef.current?.click()}>{tr('Backup wapas laayein')}</Button>
              <Button fullWidth variant="critical" leftIcon={<Trash2 className="h-4 w-4" />} loading={busy === 'clear'} disabled={busy !== null || !status.isOnline}
                onClick={() => (snapshot?.hasPending ? toast.error(tr('Pehle baqi kaam server par bhejein, phir saaf karein')) : setConfirm('clear'))}>
                {tr('Computer ka data saaf karein')}
              </Button>
            </div>
            <p className="mt-3 text-[0.75rem] text-slate-500">{tr('Saaf karne se sirf is computer ki copy mitti hai; jo kaam bhejna baqi ho us ke hote hue yeh band rehta hai.')}</p>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function SyncGuide({ onClose }: { onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: CloudOff, color: '#d97706', title: tr('Internet ke bagair'), text: tr('Internet chala jaye to bhi bill bante rehte hain — is computer par save hote hain.') },
    { icon: Upload, color: '#2563eb', title: tr('Khud server par'), text: tr('Internet aate hi sab "Bhejna baqi" kaam khud server par chale jate hain. Jaldi ho to "Abhi sync karein".') },
    { icon: XCircle, color: '#e11d48', title: tr('Nahi gaye'), text: tr('Kabhi stock ya mita hua record rok deta hai. Line mein wajah likhi hoti hai — theek kar ke "Dobara bhejein".') },
    { icon: Download, color: '#16a34a', title: tr('Backup'), text: tr('Lambi der internet na ho to "Backup download" kar lein — computer kharab ho to bhi bill bach jayenge.') },
    { icon: Package, color: '#7c3aed', title: tr('Products taaza'), text: tr('Kisi doosre computer par qeemat badli ho to "Products taaza karein".') },
    { icon: Trash2, color: '#475569', title: tr('Data saaf karna'), text: tr('Sirf is computer ki copy mitti hai, server ka data nahi. Baqi kaam ho to yeh band rehta hai.') },
  ];
  return <PageGuide title={tr('Sync center — aasaan tareeqa')} steps={steps} onClose={onClose} shortcuts={[['/', tr('dhoondein')], ['R', tr('taaza')], ['A', tr('analytics')], ['G', tr('guide')]]} />;
}
