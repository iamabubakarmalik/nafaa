/**
 * Connected apps (/integrations): every connected platform with its health,
 * the platforms still open to connect, channel orders and sync logs.
 * Sales channels, couriers, payments and Foodpanda open their own pages in
 * the Online store area; the rest (NayaPay, Raast, accounting) open the
 * generic connect and detail dialogs.
 *
 * Keys: / search · N connect · 1-3 tabs · R refresh · G guide · P print.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, AlertCircle, BookOpen, Calculator, CheckCircle2, ChevronRight, Clock, CreditCard, Download, Globe, LayoutGrid, Link2,
  List, Loader2, Package, Plug, Plus, Printer, RefreshCw, Settings, ShoppingBag, ShoppingCart, Star, Truck, Wallet, Wifi, WifiOff,
  XCircle, type LucideIcon,
} from 'lucide-react';
import { integrationsApi } from '../_core/api/integrations.api';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented,
  Skeleton, ViewTabs, confirmDialog, heroButton, heroIconButton, heroPrimaryButton, type BadgeVariant,
} from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { ConnectIntegrationModal } from '../_core/components/ConnectIntegrationModal';
import { IntegrationDetailModal } from '../_core/components/IntegrationDetailModal';
import { ChannelOrdersPanel } from '../_core/components/ChannelOrdersPanel';
import { AppMark } from '../_core/components/AppMark';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { t as tr, Trans } from '@core/i18n';

const CATEGORY_CONFIG = {
  SALES_CHANNEL: { label: tr('Sales channels'), icon: ShoppingCart, color: '#0ea5e9', hint: tr('Orders yahan se aate hain') },
  COURIER: { label: tr('Couriers'), icon: Truck, color: '#f97316', hint: tr('Parcel booking aur tracking') },
  PAYMENT: { label: tr('Payments'), icon: CreditCard, color: '#8b5cf6', hint: tr('Online paisa lena') },
  ACCOUNTING: { label: tr('Accounting'), icon: Calculator, color: '#0891b2', hint: tr('Sale books me') },
} as const;
type CatKey = keyof typeof CATEGORY_CONFIG;
const CAT_KEYS = Object.keys(CATEGORY_CONFIG) as CatKey[];

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  CONNECTED: { label: tr('Chal raha'), variant: 'success', icon: CheckCircle2 },
  DISCONNECTED: { label: tr('Band'), variant: 'default', icon: XCircle },
  ERROR: { label: tr('Masla'), variant: 'danger', icon: AlertCircle },
  PENDING: { label: tr('Intezar'), variant: 'warning', icon: Clock },
  SUSPENDED: { label: tr('Rok diya'), variant: 'danger', icon: AlertCircle },
};
const statusOf = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.PENDING;

type HubTab = 'overview' | 'orders' | 'logs' | 'shipments';
type StatusFilter = 'all' | 'CONNECTED' | 'ERROR' | 'OFF';
type LogFilter = 'all' | 'SUCCESS' | 'FAILED' | 'RUNNING';

const rate = (ok: number, bad: number) => (ok + bad > 0 ? (ok / (ok + bad)) * 100 : 100);
const num = (n: unknown) => Number(n ?? 0).toLocaleString('en-PK');

/** Sales channels open their own page in Online store. */
const WEBSITE_TYPES = ['CUSTOM_WEBSITE', 'WOOCOMMERCE', 'SHOPIFY', 'DARAZ'];
/** Couriers are connected and managed on the Couriers page. */
const COURIER_PAGE: Record<string, string> = { TCS_COURIER: 'tcs', LEOPARDS_COURIER: 'leopards', POSTEX: 'postex', TRAX: 'trax', MNP_COURIER: 'mnp', CALLCOURIER: 'call_courier' };

/** Online store areas that have their own page, shown as quick links. */
const HOMES: Array<{ to: string; title: string; hint: string; brands: BrandName[] }> = [
  { to: '/online-store/channels', title: tr('Sales channels'), hint: tr('Shopify, WooCommerce, Daraz, apni website'), brands: ['shopify', 'woocommerce', 'daraz'] },
  { to: '/online-store/couriers', title: tr('Couriers'), hint: tr('Booking, label, tracking, COD'), brands: ['tcs', 'leopards', 'postex'] },
  { to: '/online-store/payments', title: tr('Online payments'), hint: tr('Advance ya poori amount ka link'), brands: ['safepay', 'jazzcash', 'easypaisa'] },
  { to: '/online-store/foodpanda', title: tr('Foodpanda'), hint: tr('Orders seedha counter par'), brands: ['foodpanda'] },
];

export default function IntegrationHubPage({ defaultTab = 'overview' }: { defaultTab?: HubTab }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [connectModal, setConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  // The old "shipments" tab now lives on the Couriers page; show the overview here.
  const [activeTab, setActiveTab] = useState<HubTab>(defaultTab === 'shipments' ? 'overview' : defaultTab);
  const [filterCategory, setFilterCategory] = useState<CatKey | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [showGuide, setShowGuide] = useState(false);

  const openIntegration = (it: any) =>
    WEBSITE_TYPES.includes(it.type) ? navigate(`/online-store/channels/${it.id}`)
      : it.type === 'FOODPANDA' ? navigate('/online-store/foodpanda')
        : COURIER_PAGE[it.type] ? navigate(`/online-store/couriers/${COURIER_PAGE[it.type]}`)
          : setSelectedIntegration(it.id);
  const startConnect = (a?: any) => (a?.connectPath ? navigate(a.connectPath) : setConnectModal(true));

  const { data: dashboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations-dashboard'],
    queryFn: integrationsApi.dashboard,
    refetchInterval: 30_000,
  });
  const { data: available } = useQuery({ queryKey: ['integrations-available'], queryFn: integrationsApi.available });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
  const disconnectMutation = useMutation({
    mutationFn: integrationsApi.disconnect,
    onSuccess: () => { toast.success(tr('Integration band kar di')); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Band nahi hui')),
  });
  const reconnectMutation = useMutation({
    mutationFn: integrationsApi.reconnect,
    onSuccess: () => { toast.success(tr('Dobara jur gayi')); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Dobara nahi juri')),
  });

  const integrations: any[] = dashboard?.integrations ?? [];
  const summary: any = dashboard?.summary ?? {};
  const logs: any[] = dashboard?.recentSync ?? [];
  const pending = Math.max(0, Number(summary.pendingOrders ?? 0));

  const notConnected = useMemo(
    // Websites can be connected many times, so they always stay in the directory.
    () => (available ?? []).filter((a: any) => a.multiple || !integrations.some((i) => i.type === a.type)),
    [available, integrations],
  );

  const stats = useMemo(() => {
    const totalSynced = integrations.reduce((s, i) => s + Math.max(0, i.totalOrdersSynced ?? 0), 0);
    const totalErrors = integrations.reduce((s, i) => s + Math.max(0, i.totalErrors ?? 0), 0);
    const errored = integrations.filter((i) => i.status === 'ERROR' || i.status === 'SUSPENDED');
    const connectedCount = integrations.filter((i) => i.status === 'CONNECTED').length;
    const lastSync = integrations.map((i) => i.lastSyncAt).filter(Boolean).sort().pop() as string | undefined;
    return { totalSynced, totalErrors, errored, connectedCount, lastSync, successRate: rate(totalSynced, totalErrors) };
  }, [integrations]);

  const q = search.trim().toLowerCase();
  const filteredIntegrations = useMemo(() => {
    let list = integrations;
    if (filterCategory) list = list.filter((i) => i.category === filterCategory);
    if (statusFilter === 'CONNECTED') list = list.filter((i) => i.status === 'CONNECTED');
    if (statusFilter === 'ERROR') list = list.filter((i) => i.status === 'ERROR' || i.status === 'SUSPENDED');
    if (statusFilter === 'OFF') list = list.filter((i) => i.status === 'DISCONNECTED' || i.status === 'PENDING');
    if (q) list = list.filter((i) => i.displayName?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q));
    // Problems first, so they are seen straight away.
    const order: Record<string, number> = { ERROR: 0, SUSPENDED: 0, PENDING: 1, CONNECTED: 2, DISCONNECTED: 3 };
    return [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [integrations, filterCategory, statusFilter, q]);

  const directory = useMemo(() => {
    let list = notConnected;
    if (filterCategory) list = list.filter((a: any) => a.category === filterCategory);
    if (q) list = list.filter((a: any) => a.name?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q));
    return CAT_KEYS
      .map((k) => ({ key: k, cfg: CATEGORY_CONFIG[k], items: list.filter((a: any) => a.category === k).sort((a: any, b: any) => Number(!!b.popular) - Number(!!a.popular)) }))
      .filter((g) => g.items.length > 0);
  }, [notConnected, filterCategory, q]);

  const logStats = useMemo(() => ({
    ok: logs.filter((l) => l.status === 'SUCCESS').length,
    bad: logs.filter((l) => l.status === 'FAILED').length,
    run: logs.filter((l) => l.status !== 'SUCCESS' && l.status !== 'FAILED').length,
    records: logs.reduce((a, l) => a + Math.max(0, Number(l.recordsProcessed ?? 0)), 0),
  }), [logs]);
  const shownLogs = useMemo(() => logs.filter((l) => {
    if (logFilter === 'SUCCESS' && l.status !== 'SUCCESS') return false;
    if (logFilter === 'FAILED' && l.status !== 'FAILED') return false;
    if (logFilter === 'RUNNING' && (l.status === 'SUCCESS' || l.status === 'FAILED')) return false;
    if (q && !`${l.integration?.displayName ?? ''} ${l.operation ?? ''} ${l.errorMessage ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  }), [logs, logFilter, q]);

  const hasFilters = !!q || !!filterCategory || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setFilterCategory(''); setStatusFilter('all'); setLogFilter('all'); };

  const exportCSV = () => {
    if (integrations.length === 0) return toast.error(tr('Koi integration nahi'));
    const headers = [tr('Naam'), tr('Type'), tr('Kism'), tr('Halat'), tr('Orders sync'), tr('Ghaltiyan'), tr('Kamyabi %'), tr('Aakhri sync')];
    const rows = integrations.map((i) => [
      i.displayName || '', i.type || '', CATEGORY_CONFIG[i.category as CatKey]?.label ?? i.category ?? '',
      statusOf(i.status).label, i.totalOrdersSynced ?? 0, i.totalErrors ?? 0,
      rate(i.totalOrdersSynced ?? 0, i.totalErrors ?? 0).toFixed(1),
      i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString('en-PK') : tr('Kabhi nahi'),
    ]);
    const head = [
      [tr('Integrations — {{value}}', { value: tenantName || 'Meri dukaan' })],
      [tr('{{value}}Nikala gaya: {{value2}}', { value: shopName ? `${shopName}  •  ` : '', value2: new Date().toLocaleString('en-PK') })],
      [tr('Kul: {{count}}  •  Chal rahi: {{connectedCount}}  •  Kamyabi: {{value}}%', { count: integrations.length, connectedCount: stats.connectedCount, value: stats.successRate.toFixed(1) })],
      [''],
    ];
    const csv = [...head, headers, ...rows].map((r) => r.map((c: unknown) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `integrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(tr('{{count}} integrations CSV me', { count: integrations.length }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (showGuide || connectModal || selectedIntegration) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); if (activeTab === 'orders') setActiveTab('overview'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'n') { e.preventDefault(); setConnectModal(true); }
      else if (k === 'r') { e.preventDefault(); refetch(); toast.success(tr('Taaza kar diya')); }
      else if (k === 'g') { e.preventDefault(); setShowGuide(true); }
      else if (k === 'p') window.print();
      else if (e.key === '1') setActiveTab('overview');
      else if (e.key === '2') setActiveTab('orders');
      else if (e.key === '3') setActiveTab('logs');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide, connectModal, selectedIntegration, refetch, activeTab]);

  const askDisconnect = async (it: any) => {
    if (await confirmDialog({ title: tr('{{displayName}} band karein?', { displayName: it.displayName }), text: tr('Naye orders aana ruk jayenge. Purana data mehfooz rahega.'), danger: true })) disconnectMutation.mutate(it.id);
  };

  const catOptions = [
    { value: '' as const, label: tr('Sab kism') },
    ...CAT_KEYS.map((k) => ({ value: k, label: CATEGORY_CONFIG[k].label, icon: CATEGORY_CONFIG[k].icon, color: CATEGORY_CONFIG[k].color })),
  ];
  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: tr('Sab halat') }, { value: 'CONNECTED', label: tr('Chal rahi') }, { value: 'ERROR', label: tr('Masla') }, { value: 'OFF', label: tr('Band / intezar') },
  ];
  const logOptions: Array<{ value: LogFilter; label: string }> = [
    { value: 'all', label: tr('Sab ({{count}})', { count: logs.length }) }, { value: 'SUCCESS', label: tr('Theek ({{ok}})', { ok: logStats.ok }) },
    { value: 'FAILED', label: tr('Ghalti ({{bad}})', { bad: logStats.bad }) }, { value: 'RUNNING', label: tr('Chal raha ({{run}})', { run: logStats.run }) },
  ];

  return (
    <PageShell>
      {showGuide && <HubGuide onClose={() => setShowGuide(false)} />}

      <div className="mb-4 hidden print:block">
        <h1 className="text-xl font-extrabold">{tr('{{value}} — Connected apps', { value: tenantName || 'Meri dukaan' })}</h1>
        <p className="text-xs text-slate-600">
          {tr('{{value}}{{count}} integrations · {{connectedCount}} chal rahi · {{value2}}% kamyabi · {{value3}}', { value: shopName ? `${shopName} • ` : '', count: integrations.length, connectedCount: stats.connectedCount, value2: stats.successRate.toFixed(1), value3: new Date().toLocaleString('en-PK') })}
        </p>
      </div>

      <div className="print:hidden">
        <PageHero
          title={tr('Connected apps')}
          chip={<><Plug /> {' '}{tr('{{connectedCount}}/{{count}} chal rahi', { connectedCount: stats.connectedCount, count: integrations.length })}</>}
          meta={tr('Sales channels, couriers, payments aur accounting ek jagah{{value}}', { value: stats.lastSync ? tr(' · aakhri sync {{lastSync}}', { lastSync: timeAgo(stats.lastSync) }) : '' })}
          busy={isFetching && !isLoading}
          loading={isLoading}
          actions={<>
            <button type="button" onClick={() => setShowGuide(true)} title={tr('Guide (G)')} className={heroButton}><BookOpen className="h-4 w-4" /> {' '}{tr('Guide')}</button>
            <button type="button" onClick={() => refetch()} disabled={isFetching} title={tr('Taaza (R)')} aria-label={tr('Taaza')} className={heroIconButton}><RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} /></button>
            <button type="button" onClick={exportCSV} title={tr('CSV')} aria-label={tr('CSV')} className={heroIconButton}><Download className="h-4 w-4" /></button>
            <button type="button" onClick={() => window.print()} title={tr('Print (P)')} aria-label={tr('Print')} className={heroIconButton}><Printer className="h-4 w-4" /></button>
            <button type="button" onClick={() => setConnectModal(true)} title={tr('Nayi integration (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('App jorein')}</button>
          </>}
          stats={[
            { label: tr('Channel orders'), value: num(summary.totalChannelOrders), hint: tr('har platform se') },
            { label: tr('Sync kamyabi'), value: `${stats.successRate.toFixed(0)}%` },
            { label: tr('Aur jor sakte'), value: num(notConnected.length), hint: 'platforms' },
          ]}
        />
      </div>

      <div className="print:hidden">
        <KpiRow cols={4}>
          {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Chal rahi')} value={`${stats.connectedCount}/${integrations.length}`}
              hint={integrations.length ? tr('{{value}}% theek', { value: Math.round((stats.connectedCount / integrations.length) * 100) }) : tr('Abhi koi nahi')}
              onClick={() => { setActiveTab('overview'); setStatusFilter(statusFilter === 'CONNECTED' ? 'all' : 'CONNECTED'); }} active={activeTab === 'overview' && statusFilter === 'CONNECTED'} />
            <KpiCard icon={ShoppingBag} color="#d97706" label={tr('Naye orders')} value={num(pending)} hint={pending > 0 ? tr('Accept karna baqi') : tr('Sab saaf')}
              onClick={() => setActiveTab('orders')} active={activeTab === 'orders'} />
            <KpiCard icon={AlertCircle} color={stats.errored.length ? '#e11d48' : '#64748b'} label={tr('Masle wali')} value={stats.errored.length}
              hint={stats.errored.length ? tr('Dobara jorein') : tr('Koi masla nahi')}
              onClick={() => { setActiveTab('overview'); setStatusFilter(statusFilter === 'ERROR' ? 'all' : 'ERROR'); }} active={activeTab === 'overview' && statusFilter === 'ERROR'} />
            <KpiCard icon={XCircle} color={stats.totalErrors ? '#e11d48' : '#64748b'} label={tr('Sync ghaltiyan')} value={num(stats.totalErrors)} hint={tr('Wajah logs me')}
              onClick={() => { setActiveTab('logs'); setLogFilter('FAILED'); }} active={activeTab === 'logs' && logFilter === 'FAILED'} />
          </>}
        </KpiRow>
      </div>

      {stats.errored.length > 0 && (
        <section className="rounded-3xl bg-rose-50 p-3 ring-1 ring-rose-200 sm:p-4 print:hidden">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-rose-900">
            <AlertCircle className="h-4 w-4" /> {' '}{tr('{{count}} integration me masla hai — dobara jorein, warna naye orders ruk sakte hain', { count: stats.errored.length })}
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {stats.errored.map((i) => (
              <li key={i.id} className="flex items-center gap-2.5 rounded-2xl bg-white p-2 ring-1 ring-rose-200">
                <AppMark type={i.type} category={i.category} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] font-semibold text-slate-900">{i.displayName}</p>
                  <p className="text-[0.75rem] text-rose-700">{statusOf(i.status).label}{i.lastSyncAt ? ` · ${timeAgo(i.lastSyncAt)}` : ''}</p>
                </div>
                <Button size="xs" variant="danger" loading={reconnectMutation.isPending && reconnectMutation.variables === i.id}
                  onClick={() => reconnectMutation.mutate(i.id)} leftIcon={<Wifi className="h-3.5 w-3.5" />}>{tr('Jorein')}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab !== 'orders' && (
        <div className="print:hidden">
          <FilterBar
            search={<SearchField ref={searchRef} value={search} onChange={setSearch} label={tr('Search')}
              placeholder={activeTab === 'logs' ? tr('Integration, kaam ya ghalti…') : tr('Shopify, Daraz, TCS, JazzCash…')} />}
            chips={hasFilters || logFilter !== 'all' ? <>
              {filterCategory && activeTab === 'overview' && <FilterChip onRemove={() => setFilterCategory('')}>{CATEGORY_CONFIG[filterCategory].label}</FilterChip>}
              {statusFilter !== 'all' && activeTab === 'overview' && <FilterChip onRemove={() => setStatusFilter('all')}>{statusOptions.find((o) => o.value === statusFilter)?.label}</FilterChip>}
              {logFilter !== 'all' && activeTab === 'logs' && <FilterChip onRemove={() => setLogFilter('all')}>{logOptions.find((o) => o.value === logFilter)?.label}</FilterChip>}
              {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
            </> : undefined}
            onClear={clearFilters}>
            {activeTab === 'overview' ? <>
              <FilterMenu icon={LayoutGrid} label={tr('Kism')} value={filterCategory} active={!!filterCategory} onChange={setFilterCategory} options={catOptions} />
              <FilterMenu icon={Activity} label={tr('Halat')} value={statusFilter} active={statusFilter !== 'all'} onChange={setStatusFilter} options={statusOptions} align="right" />
              <Segmented label={tr('Dikhawa')} value={layout} onChange={setLayout} items={[
                { value: 'grid', label: <><LayoutGrid className="h-4 w-4" /><span className="sr-only">{tr('Cards')}</span></> },
                { value: 'list', label: <><List className="h-4 w-4" /><span className="sr-only">{tr('List')}</span></> },
              ]} />
            </> : (
              <FilterMenu icon={Activity} label={tr('Halat')} value={logFilter} active={logFilter !== 'all'} onChange={setLogFilter} options={logOptions} align="right" />
            )}
          </FilterBar>
        </div>
      )}

      <div className="print:hidden">
        <ViewTabs value={activeTab} onChange={setActiveTab}
          hint={<><Kbd>N</Kbd> {' '}{tr('jorein ·')}{' '} <Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>3</Kbd> {' '}{tr('tabs')}</>}
          tabs={[
            { id: 'overview', label: tr('Apps'), icon: Plug, count: integrations.length },
            { id: 'orders', label: tr('Channel orders'), icon: ShoppingCart, count: pending || null },
            { id: 'logs', label: tr('Sync logs'), icon: Activity, count: logStats.bad || null },
          ]} />
      </div>

      {activeTab === 'overview' && (
        isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
        ) : (
          <div className="space-y-5">
            {filteredIntegrations.length === 0 ? (
              integrations.length === 0 ? (
                <FirstRun onConnect={() => setConnectModal(true)} onGuide={() => setShowGuide(true)} />
              ) : (
                <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/80">
                  <Plug className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-900">{tr('Is filter me koi jori hui app nahi')}</p>
                  <p className="mt-1 text-sm text-slate-500">{tr('Filter badlein — ya neeche naya platform jorein.')}</p>
                  <Button className="mt-4" variant="secondary" onClick={clearFilters}>{tr('Filter saaf karein')}</Button>
                </div>
              )
            ) : (
              <section>
                <SectionHead title={tr('Jori hui apps')} sub={tr('{{count}} dikh rahi · masle wali pehle', { count: filteredIntegrations.length })} />
                {layout === 'grid' ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredIntegrations.map((it) => (
                      <IntegrationCard key={it.id} integration={it} onOpen={() => openIntegration(it)} onDisconnect={() => askDisconnect(it)}
                        onReconnect={() => reconnectMutation.mutate(it.id)} reconnecting={reconnectMutation.isPending && reconnectMutation.variables === it.id} />
                    ))}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    {filteredIntegrations.map((it) => (
                      <IntegrationRow key={it.id} integration={it} onOpen={() => openIntegration(it)} onDisconnect={() => askDisconnect(it)}
                        onReconnect={() => reconnectMutation.mutate(it.id)} reconnecting={reconnectMutation.isPending && reconnectMutation.variables === it.id} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!q && !filterCategory && (
              <section className="print:hidden">
                <SectionHead title={tr('Online store')} sub={tr('In ke apne safhe hain — jorna, settings aur guide wahin')} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {HOMES.map((h) => (
                    <Link key={h.to} to={h.to} className="group flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex items-center gap-1.5">
                        {h.brands.map((b) => <BrandLogo key={b} name={b} size={30} />)}
                        <ChevronRight className="ms-auto h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl-flip" />
                      </span>
                      <span className="mt-3 block text-[0.875rem] font-semibold text-slate-900">{h.title}</span>
                      <span className="block text-[0.75rem] text-slate-500">{h.hint}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {directory.length > 0 && (
              <section id="directory" className="scroll-mt-4 print:hidden">
                <SectionHead title={tr('Aur platforms jorein')} sub={tr('{{count}} tayyar hain', { count: notConnected.length })} />
                <div className="space-y-5">
                  {directory.map((g) => (
                    <div key={g.key}>
                      <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700">
                        <g.cfg.icon className="h-4 w-4" style={{ color: g.cfg.color }} /> {g.cfg.label}
                        <span className="font-normal text-slate-400">· {g.cfg.hint}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                        {g.items.map((a: any) => (
                          <button key={a.type} type="button" onClick={() => startConnect(a)}
                            className="group relative flex flex-col rounded-3xl bg-white p-4 text-start shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
                            {a.popular && (
                              <span className="absolute end-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-800 ring-1 ring-amber-200">
                                <Star className="h-2.5 w-2.5 fill-current" /> {' '}{tr('Mashhoor')}
                              </span>
                            )}
                            <AppMark type={a.type} category={a.category} size={40} />
                            <span className="mt-3 text-[0.875rem] font-semibold text-slate-900">{a.name}</span>
                            <span className="mt-0.5 line-clamp-2 flex-1 text-[0.75rem] text-slate-500">{a.description ?? a.docs}</span>
                            <span className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700">
                              {a.connectPath ? <>{tr('Kholein')} <ChevronRight className="h-3.5 w-3.5 rtl-flip" /></> : <><Plus className="h-3.5 w-3.5" /> {tr('Jorein')}</>}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <Link to="/online-orders" className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><ShoppingBag className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-semibold text-slate-900">{tr('Online orders ka poora safha')}</span>
              <span className="block text-[0.75rem] text-slate-500">{tr('Accept → bill → stock, delivery, COD aur reports — sab ek jagah')}</span>
            </span>
            {pending > 0 && <Badge variant="warning">{tr('{{pending}} naye', { pending })}</Badge>}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 rtl-flip" />
          </Link>
          <ChannelOrdersPanel integrations={integrations} />
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-3">
          {logs.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
              <span className="font-semibold text-success-700">{tr('{{ok}} kamyab', { ok: logStats.ok })}</span>
              <span className={cn('font-semibold', logStats.bad ? 'text-rose-700' : 'text-slate-500')}>{tr('{{bad}} nakaam', { bad: logStats.bad })}</span>
              <span className="text-slate-600">{tr('{{run}} chal rahe', { run: logStats.run })}</span>
              <span className="text-slate-600">{tr('{{records}} records guzre', { records: num(logStats.records) })}</span>
            </div>
          )}
          {logs.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/80">
              <Activity className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-900">{tr('Abhi koi sync nahi hua')}</p>
              <p className="mt-1 text-sm text-slate-500">{tr('App jorein — har sync yahan nazar aayega.')}</p>
            </div>
          ) : shownLogs.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/80">
              <p className="font-semibold text-slate-900">{tr('Is filter me koi log nahi')}</p>
              <Button className="mt-3" variant="ghost" onClick={clearFilters}>{tr('Filter saaf karein')}</Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {shownLogs.map((log) => <SyncLogRow key={log.id} log={log} />)}
            </ul>
          )}
        </div>
      )}

      <ConnectIntegrationModal open={connectModal} onClose={() => setConnectModal(false)} available={available ?? []} />
      {selectedIntegration && <IntegrationDetailModal integrationId={selectedIntegration} onClose={() => setSelectedIntegration(null)} />}

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"], [class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </PageShell>
  );
}

/* ─── Parts ─── */

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2.5">
      <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
      {sub && <p className="text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function FirstRun({ onConnect, onGuide }: { onConnect: () => void; onGuide: () => void }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200/80">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Plug className="h-7 w-7" /></span>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{tr('Abhi koi app nahi juri')}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{tr('Apni website, Daraz, Foodpanda ya courier jorein — orders khud Nafaa me aayenge aur stock ek rahega.')}</p>
      <ol className="mx-auto mt-5 grid max-w-2xl gap-2 text-start sm:grid-cols-3">
        {[[tr('Platform chunein'), tr('Neeche ki list se')], [tr('Jorein'), tr('Login ya keys — har safhe par guide')], [tr('Orders aayen'), tr('Ghanti bajegi, bill khud')]].map(([t, d], i) => (
          <li key={t} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-[0.75rem] font-bold text-brand-700 ring-1 ring-brand-100">{i + 1}</span>
            <p className="mt-1.5 text-[0.8125rem] font-semibold text-slate-900">{t}</p>
            <p className="text-[0.75rem] text-slate-500">{d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onGuide} leftIcon={<BookOpen className="h-4 w-4" />}>{tr('Pehle samjhein')}</Button>
        <Button onClick={onConnect} leftIcon={<Plus className="h-4 w-4" />}>{tr('Pehli app jorein')}</Button>
      </div>
    </div>
  );
}

function SuccessBar({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[0.75rem] text-slate-500">
        <span>{tr('Sync kamyabi')}</span>
        <span className={cn('font-semibold tabular-nums', value >= 95 ? 'text-success-700' : value >= 80 ? 'text-amber-700' : 'text-rose-700')}>{value.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', value >= 95 ? 'bg-success-500' : value >= 80 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface ItemProps { integration: any; onOpen: () => void; onDisconnect: () => void; onReconnect: () => void; reconnecting: boolean }

function IntegrationCard({ integration: it, onOpen, onDisconnect, onReconnect, reconnecting }: ItemProps) {
  const st = statusOf(it.status);
  const cat = CATEGORY_CONFIG[it.category as CatKey] ?? CATEGORY_CONFIG.SALES_CHANNEL;
  const isError = it.status === 'ERROR' || it.status === 'SUSPENDED';
  const isConnected = it.status === 'CONNECTED';
  const errors = Math.max(0, it.totalErrors ?? 0);
  const sr = rate(Math.max(0, it.totalOrdersSynced ?? 0), errors);

  return (
    <article className={cn('flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 transition hover:shadow-md', isError ? 'ring-rose-300' : 'ring-slate-200/80')}>
      <div className="flex items-start gap-3">
        <AppMark type={it.type} category={it.category} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{it.displayName}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{cat.label}</p>
        </div>
        <Badge size="xs" variant={st.variant} dot>{st.label}</Badge>
      </div>

      {isError && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[0.75rem] font-medium text-rose-700 ring-1 ring-rose-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {' '}{tr('Rabta toot gaya — dobara jorein')}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label={tr('Orders')} value={num(Math.max(0, it.totalOrdersSynced ?? 0))} icon={Package} />
        <Mini label={tr('Ghaltiyan')} value={num(errors)} icon={AlertCircle} warn={errors > 0} />
        <Mini label={tr('Aakhri sync')} value={it.lastSyncAt ? timeAgo(it.lastSyncAt) : '—'} icon={Clock} />
      </div>

      <div className="mt-3"><SuccessBar value={sr} /></div>

      <div className="min-h-3 flex-1" />
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant="secondary" fullWidth onClick={onOpen} leftIcon={<Settings className="h-4 w-4" />}>{tr('Kholein')}</Button>
        {isConnected ? (
          <Button size="sm" variant="ghost" onClick={onDisconnect} title={tr('Band karein')} aria-label={tr('Band karein')} className="text-rose-700"><WifiOff className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" variant="ghost" loading={reconnecting} onClick={onReconnect} title={tr('Dobara jorein')} aria-label={tr('Dobara jorein')} className="text-success-700"><Wifi className="h-4 w-4" /></Button>
        )}
      </div>
    </article>
  );
}

function IntegrationRow({ integration: it, onOpen, onDisconnect, onReconnect, reconnecting }: ItemProps) {
  const st = statusOf(it.status);
  const cat = CATEGORY_CONFIG[it.category as CatKey] ?? CATEGORY_CONFIG.SALES_CHANNEL;
  const isConnected = it.status === 'CONNECTED';
  const sr = rate(Math.max(0, it.totalOrdersSynced ?? 0), Math.max(0, it.totalErrors ?? 0));
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <AppMark type={it.type} category={it.category} size={40} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-start">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{it.displayName}</span>
          <Badge size="xs" variant={st.variant} dot>{st.label}</Badge>
        </span>
        <span className="block truncate text-[0.75rem] text-slate-500">{cat.label}</span>
      </button>
      <div className="hidden shrink-0 grid-cols-3 gap-6 text-end md:grid">
        <div><p className="text-sm font-semibold tabular-nums text-slate-900">{num(Math.max(0, it.totalOrdersSynced ?? 0))}</p><p className="text-[0.6875rem] text-slate-400">{tr('orders')}</p></div>
        <div><p className={cn('text-sm font-semibold tabular-nums', sr >= 95 ? 'text-success-700' : sr >= 80 ? 'text-amber-700' : 'text-rose-700')}>{sr.toFixed(0)}%</p><p className="text-[0.6875rem] text-slate-400">{tr('kamyabi')}</p></div>
        <div><p className="text-sm font-semibold tabular-nums text-slate-900">{it.lastSyncAt ? timeAgo(it.lastSyncAt) : '—'}</p><p className="text-[0.6875rem] text-slate-400">{tr('aakhri sync')}</p></div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="secondary" onClick={onOpen} leftIcon={<Settings className="h-4 w-4" />}><span className="hidden sm:inline">{tr('Kholein')}</span></Button>
        {isConnected
          ? <Button size="sm" variant="ghost" onClick={onDisconnect} title={tr('Band karein')} aria-label={tr('Band karein')} className="text-rose-700"><WifiOff className="h-4 w-4" /></Button>
          : <Button size="sm" variant="ghost" loading={reconnecting} onClick={onReconnect} title={tr('Dobara jorein')} aria-label={tr('Dobara jorein')} className="text-success-700"><Wifi className="h-4 w-4" /></Button>}
      </div>
    </li>
  );
}

function Mini({ label, value, icon: Icon, warn }: { label: string; value: ReactNode; icon: LucideIcon; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-1.5 py-2">
      <Icon className={cn('mx-auto h-3.5 w-3.5', warn ? 'text-rose-500' : 'text-slate-400')} />
      <p className={cn('mt-0.5 truncate text-[0.8125rem] font-semibold tabular-nums', warn ? 'text-rose-700' : 'text-slate-900')}>{value}</p>
      <p className="text-[0.6875rem] text-slate-500">{label}</p>
    </div>
  );
}

const OPERATION_LABEL: Record<string, string> = {
  STOCK_SYNC: tr('Stock bheja'), PRICE_PUSH: tr('Price bheji'), ORDER_SYNC: tr('Orders laye'), ORDER_IMPORT: tr('Orders laye'), PRODUCT_SYNC: tr('Products sync'),
  PRODUCT_IMPORT: tr('Products laye'), PRODUCT_EXPORT: tr('Products bheje'),
};

function SyncLogRow({ log }: { log: any }) {
  const ok = log.status === 'SUCCESS';
  const bad = log.status === 'FAILED';
  const op = OPERATION_LABEL[log.operation] ?? String(log.operation ?? '').replace(/_/g, ' ').toLowerCase();
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5 sm:px-4', bad && 'bg-rose-50/60')}>
      <AppMark type={log.integration?.type} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{log.integration?.displayName ?? tr('Integration')}</span>
          <span className="text-[0.8125rem] text-slate-500">· {op}</span>
          {ok ? <Badge size="xs" variant="success">{tr('Theek')}</Badge> : bad ? <Badge size="xs" variant="danger">{tr('Ghalti')}</Badge>
            : <Badge size="xs" variant="warning"><Loader2 className="h-3 w-3 animate-spin" /> {' '}{tr('Chal raha')}</Badge>}
        </p>
        <p className="mt-0.5 text-[0.75rem] text-slate-500">
          {tr('{{value}} theek · {{value2}} ghalat · {{value3}} kul', { value: Math.max(0, log.recordsSuccess ?? 0), value2: Math.max(0, log.recordsFailed ?? 0), value3: Math.max(0, log.recordsProcessed ?? 0) })}
        </p>
        {log.errorMessage && <p className="mt-0.5 line-clamp-2 text-[0.75rem] text-rose-700">{log.errorMessage}</p>}
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[0.8125rem] font-semibold tabular-nums text-slate-700">{new Date(log.startedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[0.6875rem] text-slate-400">{new Date(log.startedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
      </div>
    </li>
  );
}

function HubGuide({ onClose }: { onClose: () => void }) {
  const parts: Array<{ icon: LucideIcon; color: string; title: string; text: ReactNode; brands: BrandName[]; to?: string }> = [
    { icon: ShoppingCart, color: '#0ea5e9', title: tr('Sales channels'), text: tr('Shopify, WooCommerce, Daraz, Foodpanda, apni website — orders yahan se Nafaa me aate hain.'), brands: ['shopify', 'woocommerce', 'daraz', 'foodpanda'], to: '/online-store/channels' },
    { icon: Truck, color: '#f97316', title: tr('Couriers'), text: tr('TCS, Leopards, PostEx, Trax — order se seedha booking, label aur tracking.'), brands: ['tcs', 'leopards', 'postex'], to: '/online-store/couriers' },
    { icon: Wallet, color: '#8b5cf6', title: tr('Online payments'), text: tr('Safepay, JazzCash, Easypaisa — customer ko payment link, paisa seedha aap ke account me.'), brands: ['safepay', 'jazzcash', 'easypaisa'], to: '/online-store/payments' },
    { icon: Calculator, color: '#0891b2', title: tr('Accounting'), text: tr('Sale khud books me.'), brands: [] },
  ];
  return (
    <Modal open onClose={onClose} size="md" title={tr('Connected apps kaise kaam karti hain')} description={tr('Doosre platforms ko Nafaa se jorne ka khulasa')}
      footer={<Button onClick={onClose}>{tr('Samajh gaya')}</Button>}>
      <div className="space-y-4 text-[0.8125rem] text-slate-600">
        <p>{tr('Platform jorne ka matlab: wahan order aaye to seedha Nafaa me — ghanti, bill aur stock khud. Har platform ke safhe par us ki apni step-by-step guide hai.')}</p>
        <ul className="space-y-3">
          {parts.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${p.color}17`, color: p.color }}><p.icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                  {p.title}
                  {p.brands.length > 0 && <span className="flex -space-x-1.5">{p.brands.map((b) => <BrandLogo key={b} name={b} size={20} className="ring-2 ring-white" />)}</span>}
                </p>
                <p>{p.text} {p.to && <Link to={p.to} onClick={onClose} className="font-semibold text-brand-700 hover:underline">{tr('Kholein')}</Link>}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
          <p className="mb-2 text-[0.75rem] font-semibold text-slate-500">{tr('Halat ka matlab')}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_CONFIG).map(([k, s]) => <Badge key={k} size="xs" variant={s.variant} dot>{s.label}</Badge>)}
          </div>
          <p className="mt-2 text-[0.75rem]"><Trans text="{{label}} = kitne records theek guzre. 95% se upar achha hai. Masle wali app hamesha upar dikhti hai." values={{ label: <b className="text-slate-700">{tr('Sync kamyabi')}</b> }} /></p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-slate-500">
          <span><Kbd>/</Kbd> {' '}{tr('search')}</span><span><Kbd>N</Kbd> {' '}{tr('nayi app')}</span><span><Kbd>1</Kbd>-<Kbd>3</Kbd> {' '}{tr('tabs')}</span>
          <span><Kbd>R</Kbd> {' '}{tr('taaza')}</span><span><Kbd>P</Kbd> {' '}{tr('print')}</span><span><Kbd>G</Kbd> {' '}{tr('ye guide')}</span>
        </div>
        <p className="flex items-center gap-1.5 text-[0.75rem]"><Globe className="h-3.5 w-3.5" /> <Trans text="Apni website: {{link}}" values={{ link: <Link to="/online-store/connect" onClick={onClose} className="font-semibold text-brand-700 hover:underline">{tr('Website jorein')}</Link> }} /> <Link2 className="h-3 w-3" /></p>
      </div>
    </Modal>
  );
}

function timeAgo(dateStr: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (min < 1) return 'abhi';
  if (min < 60) return tr('{{min}} min pehle', { min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return tr('{{hr}} ghante pehle', { hr });
  const d = Math.floor(hr / 24);
  return d === 1 ? tr('kal') : tr('{{d}} din pehle', { d });
}
