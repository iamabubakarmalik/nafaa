import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe, ShoppingCart, Truck, CreditCard, Calculator,
  Plus, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Settings, Zap, TrendingUp, Package, Clock, Search,
  GraduationCap, Printer, Download, X, Sparkles, Activity,
  Link2, ChevronRight, Wifi, WifiOff, LayoutGrid, List, Star, Store, Loader2,
} from 'lucide-react';
import { integrationsApi } from '../_core/api/integrations.api';
import { Button } from '@core/ui/Button';
import { SkeletonCard } from '@core/ui/Skeleton';
import { ConnectIntegrationModal } from '../_core/components/ConnectIntegrationModal';
import { IntegrationDetailModal } from '../_core/components/IntegrationDetailModal';
import { ChannelOrdersPanel } from '../_core/components/ChannelOrdersPanel';
import { cn } from '@core/lib/cn';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA INTEGRATIONS HUB — POORA  (Orders / Website page jaisa)
   ─────────────────────────────────────────────────────────────
   🌍 Foodpanda, Daraz, Shopify, TCS, JazzCash, apni website
   🩺 Health ring • kamyabi % • ghalti wali integration upar
   🧭 Overview (chaant, grid/list, kis kism me kya jora)
      App directory (kism ke hisab se, popular pehle)
   🛒 Channel orders • 📜 Sync logs (chaant + khulasa)
   ⌨️ / search • N naya • 1-3 tabs • R taaza • G guide • P print
   ═════════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG = {
  SALES_CHANNEL: { label: 'Bechne ki jagah', en: 'Sales channels', icon: ShoppingCart, color: '#10b981', emoji: '🛒', gradient: 'from-emerald-500 to-green-600', hint: 'Orders aate hain' },
  COURIER:       { label: 'Courier', en: 'Courier services', icon: Truck, color: '#f97316', emoji: '📦', gradient: 'from-orange-500 to-red-600', hint: 'Parcel aur tracking' },
  PAYMENT:       { label: 'Payment', en: 'Payment gateways', icon: CreditCard, color: '#8b5cf6', emoji: '💳', gradient: 'from-violet-500 to-purple-600', hint: 'Online paisa' },
  ACCOUNTING:    { label: 'Hisaab kitaab', en: 'Accounting', icon: Calculator, color: '#06b6d4', emoji: '📊', gradient: 'from-cyan-500 to-blue-600', hint: 'Books me sync' },
} as const;
type CatKey = keyof typeof CATEGORY_CONFIG;

const STATUS_CONFIG: Record<string, { label: string; icon: any; chip: string; dot: string }> = {
  CONNECTED:    { label: 'Chal raha', icon: CheckCircle2, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  DISCONNECTED: { label: 'Band', icon: XCircle, chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  ERROR:        { label: 'Ghalti', icon: AlertCircle, chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  PENDING:      { label: 'Intezar', icon: Clock, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  SUSPENDED:    { label: 'Rok diya', icon: AlertCircle, chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
};

type HubTab = 'overview' | 'orders' | 'logs' | 'shipments';
type StatusFilter = 'all' | 'CONNECTED' | 'ERROR' | 'OFF';
type LogFilter = 'all' | 'SUCCESS' | 'FAILED' | 'RUNNING';

const TABS: { value: HubTab; label: string; hint: string; icon: any }[] = [
  { value: 'overview', label: 'Overview', hint: 'Kya jora, kya baqi', icon: Globe },
  { value: 'orders', label: 'Channel orders', hint: 'Har platform ke orders', icon: ShoppingCart },
  { value: 'logs', label: 'Sync logs', hint: 'Kya chala, kya ruka', icon: Activity },
];

const rate = (ok: number, bad: number) => (ok + bad > 0 ? (ok / (ok + bad)) * 100 : 100);

/** Website jaise channels apne safhe par khulte hain (Online store → channel) */
const WEBSITE_TYPES = ['CUSTOM_WEBSITE', 'WOOCOMMERCE', 'SHOPIFY', 'DARAZ'];
/** Couriers ka asli connect Couriers safhe par hai */
const COURIER_PAGE: Record<string, string> = { TCS_COURIER: 'tcs', LEOPARDS_COURIER: 'leopards', POSTEX: 'postex', TRAX: 'trax', MNP_COURIER: 'mnp', CALLCOURIER: 'call_courier' };

export default function IntegrationHubPage({ defaultTab = 'overview' }: { defaultTab?: HubTab }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const openIntegration = (it: any) =>
    WEBSITE_TYPES.includes(it.type) ? navigate(`/online-store/channels/${it.id}`)
      : COURIER_PAGE[it.type] ? navigate(`/online-store/couriers/${COURIER_PAGE[it.type]}`)
        : setSelectedIntegration(it.id);
  const startConnect = (a?: any) => (a?.connectPath ? navigate(a.connectPath) : setConnectModal(true));
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [connectModal, setConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>(defaultTab);
  const [filterCategory, setFilterCategory] = useState<CatKey | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [logFilter, setLogFilter] = useState<LogFilter>('all');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: dashboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations-dashboard'],
    queryFn: integrationsApi.dashboard,
    refetchInterval: 30_000,
  });

  const { data: available } = useQuery({
    queryKey: ['integrations-available'],
    queryFn: integrationsApi.available,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });

  const disconnectMutation = useMutation({
    mutationFn: integrationsApi.disconnect,
    onSuccess: () => { toast.success('Integration band kar di'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Band nahi hui'),
  });

  const reconnectMutation = useMutation({
    mutationFn: integrationsApi.reconnect,
    onSuccess: () => { toast.success('🎉 Dobara jur gayi!'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Dobara nahi juri'),
  });

  const integrations: any[] = dashboard?.integrations ?? [];
  const summary: any = dashboard?.summary ?? {};
  const logs: any[] = dashboard?.recentSync ?? [];
  const pending = Number(summary.pendingOrders ?? 0);

  const notConnected = useMemo(
    // Website kai jur sakti hain — wo hamesha directory me rahe
    () => (available ?? []).filter((a: any) => a.multiple || !integrations.some((i) => i.type === a.type)),
    [available, integrations],
  );

  /* ── Ginti ── */
  const stats = useMemo(() => {
    const totalSynced = integrations.reduce((s, i) => s + (i.totalOrdersSynced ?? 0), 0);
    const totalErrors = integrations.reduce((s, i) => s + (i.totalErrors ?? 0), 0);
    const errored = integrations.filter((i) => i.status === 'ERROR' || i.status === 'SUSPENDED');
    const connectedCount = integrations.filter((i) => i.status === 'CONNECTED').length;
    const lastSync = integrations.map((i) => i.lastSyncAt).filter(Boolean).sort().pop() as string | undefined;
    const cats = new Set(integrations.filter((i) => i.status === 'CONNECTED').map((i) => i.category));
    return {
      totalSynced, totalErrors, errored, connectedCount, lastSync,
      successRate: rate(totalSynced, totalErrors),
      health: integrations.length ? (connectedCount / integrations.length) * 100 : 100,
      catsCovered: cats.size,
    };
  }, [integrations]);

  const byCategory = useMemo(() => (Object.keys(CATEGORY_CONFIG) as CatKey[]).map((k) => ({
    key: k, ...CATEGORY_CONFIG[k],
    mine: integrations.filter((i) => i.category === k),
    open: notConnected.filter((a: any) => a.category === k),
  })), [integrations, notConnected]);

  const q = search.trim().toLowerCase();
  const filteredIntegrations = useMemo(() => {
    let list = integrations;
    if (filterCategory) list = list.filter((i) => i.category === filterCategory);
    if (statusFilter === 'CONNECTED') list = list.filter((i) => i.status === 'CONNECTED');
    if (statusFilter === 'ERROR') list = list.filter((i) => i.status === 'ERROR' || i.status === 'SUSPENDED');
    if (statusFilter === 'OFF') list = list.filter((i) => i.status === 'DISCONNECTED' || i.status === 'PENDING');
    if (q) list = list.filter((i) => i.displayName?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q));
    // Ghalti wali pehle — foran nazar aaye
    const order: Record<string, number> = { ERROR: 0, SUSPENDED: 0, PENDING: 1, CONNECTED: 2, DISCONNECTED: 3 };
    return [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [integrations, filterCategory, statusFilter, q]);

  const directory = useMemo(() => {
    let list = notConnected;
    if (filterCategory) list = list.filter((a: any) => a.category === filterCategory);
    if (q) list = list.filter((a: any) => a.name?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q));
    return (Object.keys(CATEGORY_CONFIG) as CatKey[])
      .map((k) => ({ key: k, cfg: CATEGORY_CONFIG[k], items: list.filter((a: any) => a.category === k).sort((a: any, b: any) => Number(!!b.popular) - Number(!!a.popular)) }))
      .filter((g) => g.items.length > 0);
  }, [notConnected, filterCategory, q]);

  const logStats = useMemo(() => ({
    ok: logs.filter((l) => l.status === 'SUCCESS').length,
    bad: logs.filter((l) => l.status === 'FAILED').length,
    run: logs.filter((l) => l.status !== 'SUCCESS' && l.status !== 'FAILED').length,
    records: logs.reduce((a, l) => a + Number(l.recordsProcessed ?? 0), 0),
  }), [logs]);
  const shownLogs = useMemo(() => logs.filter((l) => {
    if (logFilter === 'SUCCESS' && l.status !== 'SUCCESS') return false;
    if (logFilter === 'FAILED' && l.status !== 'FAILED') return false;
    if (logFilter === 'RUNNING' && (l.status === 'SUCCESS' || l.status === 'FAILED')) return false;
    if (q && !`${l.integration?.displayName ?? ''} ${l.operation ?? ''} ${l.errorMessage ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  }), [logs, logFilter, q]);

  const hasFilters = !!q || !!filterCategory || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setFilterCategory(null); setStatusFilter('all'); };

  /* ── CSV ── */
  const exportCSV = () => {
    if (integrations.length === 0) return toast.error('Koi integration nahi');
    const headers = ['Naam', 'Type', 'Kism', 'Halat', 'Orders sync', 'Ghaltiyan', 'Kamyabi %', 'Aakhri sync'];
    const rows = integrations.map((i) => [
      i.displayName || '', i.type || '', CATEGORY_CONFIG[i.category as CatKey]?.en ?? i.category ?? '',
      STATUS_CONFIG[i.status]?.label ?? i.status ?? '', i.totalOrdersSynced ?? 0, i.totalErrors ?? 0,
      rate(i.totalOrdersSynced ?? 0, i.totalErrors ?? 0).toFixed(1),
      i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString('en-PK') : 'Kabhi nahi',
    ]);
    const head = [
      [`Integrations — ${tenantName || 'Meri dukaan'}`],
      [`${shopName ? `${shopName}  •  ` : ''}Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Kul: ${integrations.length}  •  Chal rahi: ${stats.connectedCount}  •  Kamyabi: ${stats.successRate.toFixed(1)}%`],
      [''],
    ];
    const csv = [...head, headers, ...rows].map((r) => r.map((c: unknown) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `integrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${integrations.length} integrations CSV me`);
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey || showTeacher || connectModal || selectedIntegration) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'n') { e.preventDefault(); setConnectModal(true); }
      else if (k === 'r') { e.preventDefault(); refetch(); toast.success('Taaza kar diya'); }
      else if (k === 'g') { e.preventDefault(); setShowTeacher(true); }
      else if (k === 'p') window.print();
      else {
        const num = Number(e.key);
        if (num >= 1 && num <= TABS.length) { e.preventDefault(); setActiveTab(TABS[num - 1].value); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, connectModal, selectedIntegration, refetch]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-52 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
        <SkeletonCard />
      </div>
    );
  }

  const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition';
  const healthColor = stats.health >= 90 ? '#34d399' : stats.health >= 60 ? '#fbbf24' : '#fb7185';

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <IntegrationsTeacher onClose={() => setShowTeacher(false)} />}

      {/* PRINT HEADER */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">🔌 {tenantName || 'Meri dukaan'} — Integrations</h1>
        <p className="text-xs text-slate-600">
          {shopName ? `${shopName} • ` : ''}{integrations.length} integrations · {stats.connectedCount} chal rahi · {stats.successRate.toFixed(1)}% kamyabi · {new Date().toLocaleString('en-PK')}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-800 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-5 min-w-0">
            {/* Health ring */}
            {integrations.length > 0 && (
              <div className="relative h-24 w-24 shrink-0 hidden sm:block" title="Kitni integrations chal rahi hain">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={healthColor} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(stats.health / 100) * 97.4} 97.4`} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black tabular-nums">{stats.health.toFixed(0)}%</span>
                  <span className="text-[9px] font-black text-white/70">sehat</span>
                </div>
              </div>
            )}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
                <Link2 className="h-3.5 w-3.5 text-amber-300" /> Integration hub
                {shopName && <span className="normal-case tracking-normal text-emerald-200">· 🏪 {shopName}</span>}
                {stats.errored.length > 0 && (
                  <span className="normal-case tracking-normal inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 text-white">
                    <AlertCircle className="h-3 w-3" /> {stats.errored.length} masla
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🔌 Integrations</h1>
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/85 max-w-2xl">
                Foodpanda, Daraz, apni website, TCS aur JazzCash — sab ek jagah se jorein. Orders seedhe Nafaa POS me,
                har 30 second me khud taaza.
              </p>
              {stats.lastSync && (
                <p className="mt-1 text-[11px] font-bold text-white/60 inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Aakhri sync {timeAgo(stats.lastSync)} pehle
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Guide (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => refetch()} disabled={isFetching} title="Taaza (R)" className={heroBtn}>
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </button>
            <button onClick={exportCSV} title="CSV" className={heroBtn}><Download className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="Print (P)" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <button onClick={() => setConnectModal(true)} title="Nayi integration (N)"
              className="h-11 px-4 rounded-xl bg-white text-violet-800 hover:bg-violet-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition">
              <Plus className="h-4 w-4" /> Integration jorein
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI — do qatar ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={CheckCircle2} tone="emerald" label="Chal rahi"
          value={<>{summary.connectedIntegrations ?? stats.connectedCount}<span className="text-sm text-slate-400">/{summary.totalIntegrations ?? integrations.length}</span></>}
          sub={`${stats.health.toFixed(0)}% sehat`} onClick={() => { setActiveTab('overview'); setStatusFilter('CONNECTED'); }} active={statusFilter === 'CONNECTED'} />
        <Kpi icon={ShoppingCart} tone="violet" label="Channel orders" value={Number(summary.totalChannelOrders ?? 0).toLocaleString('en-PK')} sub="Har platform se" onClick={() => setActiveTab('orders')} />
        <Kpi icon={Zap} tone="amber" label="Pending orders" value={pending} pulse={pending > 0}
          sub={pending > 0 ? 'Abhi process karein' : 'Sab saaf'} onClick={() => setActiveTab('orders')} highlight={pending > 0} />
        <Kpi icon={TrendingUp} tone="sky" label="Sync kamyabi" value={`${stats.successRate.toFixed(1)}%`}
          sub={`${stats.totalSynced.toLocaleString('en-PK')} sync hue`} />
      </section>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={AlertCircle} tone="rose" label="Masle wali" value={stats.errored.length}
          sub={stats.errored.length ? 'Dobara jorein' : 'Koi masla nahi'} onClick={() => { setActiveTab('overview'); setStatusFilter('ERROR'); }} active={statusFilter === 'ERROR'} />
        <Kpi icon={XCircle} tone="rose" label="Sync ghaltiyan" value={stats.totalErrors.toLocaleString('en-PK')} sub="Logs me wajah dekhein" onClick={() => { setActiveTab('logs'); setLogFilter('FAILED'); }} />
        <Kpi icon={LayoutGrid} tone="emerald" label="Kism jori hui" value={`${stats.catsCovered}/4`} sub="Channel, courier, payment, hisaab" />
        <Kpi icon={Sparkles} tone="violet" label="Aur jor sakte" value={notConnected.length} sub="Platforms tayyar hain"
          onClick={() => { setActiveTab('overview'); setTimeout(() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }), 50); }} />
      </section>

      {/* ═══ MASLE ═══ */}
      {stats.errored.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 print:hidden">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                {stats.errored.length} integration me masla hai — dobara jorein warna orders chhoot sakte hain
              </h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {stats.errored.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-500/30 p-2">
                    <span className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-lg shrink-0">{getIntegrationEmoji(i.type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">{i.displayName}</div>
                      <div className="text-[10px] font-bold text-rose-600">{STATUS_CONFIG[i.status]?.label}{i.lastSyncAt ? ` · ${timeAgo(i.lastSyncAt)} pehle` : ''}</div>
                    </div>
                    <button onClick={() => reconnectMutation.mutate(i.id)} disabled={reconnectMutation.isPending}
                      className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black inline-flex items-center gap-1 disabled:opacity-60 transition">
                      {reconnectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />} Jorein
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {TABS.map((t, idx) => {
          const on = activeTab === t.value;
          const n = t.value === 'orders' ? pending : t.value === 'logs' ? logStats.bad : t.value === 'overview' ? integrations.length : 0;
          return (
            <button key={t.value} onClick={() => setActiveTab(t.value)} title={`${idx + 1} dabayein`}
              className={cn('rounded-3xl border-2 px-3 sm:px-5 py-3 sm:py-4 text-left transition active:scale-[0.99]',
                on ? 'bg-gradient-to-br from-violet-600 to-indigo-700 border-transparent text-white shadow-xl shadow-violet-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:shadow-lg')}>
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0',
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-violet-500 to-indigo-700 text-white')}>
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black truncate">{t.label}</span>
                    {n > 0 && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums',
                        t.value === 'overview' ? (on ? 'bg-black/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-500') : 'bg-rose-500 text-white')}>{n}</span>
                    )}
                  </div>
                  <div className={cn('text-[11px] font-bold truncate', on ? 'text-white/80' : 'text-slate-400')}>{t.hint}</div>
                </div>
                <span className="sm:hidden text-xs font-black truncate">{t.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TOOLBAR ═══ */}
      {activeTab !== 'orders' && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'logs' ? 'Integration, kaam ya ghalti… (/ dabao)' : 'Foodpanda, Daraz, TCS… (/ dabao)'}
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {activeTab === 'overview' ? (
              <>
                <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1">
                  {([['all', 'Sab'], ['CONNECTED', 'Chal rahi'], ['ERROR', 'Masla'], ['OFF', 'Band']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setStatusFilter(k)}
                      className={cn('h-10 rounded-xl px-3 text-xs font-black transition',
                        statusFilter === k ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>{l}</button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1">
                  {([['grid', LayoutGrid], ['list', List]] as const).map(([k, Icon]) => (
                    <button key={k} onClick={() => setLayout(k)} title={k === 'grid' ? 'Cards' : 'List'}
                      className={cn('h-10 w-10 rounded-xl flex items-center justify-center transition',
                        layout === k ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow' : 'text-slate-500')}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1">
                {([['all', `Sab ${logs.length}`], ['SUCCESS', `Theek ${logStats.ok}`], ['FAILED', `Ghalti ${logStats.bad}`], ['RUNNING', `Chal raha ${logStats.run}`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setLogFilter(k)}
                    className={cn('h-10 rounded-xl px-3 text-xs font-black transition',
                      logFilter === k ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>{l}</button>
                ))}
              </div>
            )}

            {hasFilters && activeTab === 'overview' && (
              <button onClick={clearFilters} title="Chaant hatao"
                className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <button onClick={() => setFilterCategory(null)}
                className={cn('shrink-0 px-3 py-2 rounded-xl text-xs font-black transition border-2 inline-flex items-center gap-1.5',
                  !filterCategory ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700')}>
                <Globe className="h-3.5 w-3.5" /> Har kism
              </button>
              {byCategory.map((c) => {
                const on = filterCategory === c.key;
                return (
                  <button key={c.key} onClick={() => setFilterCategory(on ? null : c.key)}
                    className={cn('shrink-0 px-3 py-2 rounded-xl text-xs font-black transition border-2 inline-flex items-center gap-1.5',
                      on ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-lg` : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300')}>
                    <span>{c.emoji}</span> {c.label}
                    <span className={cn('px-1.5 rounded text-[10px] tabular-nums', on ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700')}>{c.mine.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Kis kism me kya jora */}
          {integrations.length > 0 && !filterCategory && !q && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
              {byCategory.map((c) => {
                const live = c.mine.filter((i) => i.status === 'CONNECTED').length;
                return (
                  <button key={c.key} onClick={() => setFilterCategory(c.key)}
                    className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition">
                    <div className="flex items-center justify-between">
                      <span className={cn('h-10 w-10 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg', c.gradient)}><c.icon className="h-5 w-5" /></span>
                      {live > 0 ? <span className="text-[10px] font-black text-emerald-600">● {live} chal rahi</span>
                        : <span className="text-[10px] font-black text-slate-400">Abhi koi nahi</span>}
                    </div>
                    <div className="mt-3 font-black text-slate-900 dark:text-white">{c.label}</div>
                    <div className="text-[11px] font-bold text-slate-500">{c.hint}</div>
                    <div className="mt-2 flex -space-x-1.5">
                      {c.mine.slice(0, 5).map((i) => (
                        <span key={i.id} className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-sm">{getIntegrationEmoji(i.type)}</span>
                      ))}
                      {c.open.length > 0 && (
                        <span className="h-7 px-2 rounded-full bg-violet-100 dark:bg-violet-500/20 ring-2 ring-white dark:ring-slate-900 flex items-center text-[10px] font-black text-violet-700 dark:text-violet-300">+{c.open.length} aur</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {/* Jori hui */}
          {filteredIntegrations.length === 0 ? (
            integrations.length === 0 ? (
              <EmptyState onConnect={() => setConnectModal(true)} onGuide={() => setShowTeacher(true)} />
            ) : (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                <Search className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-base font-black text-slate-800 dark:text-slate-100">Jori hui integrations me kuch nahi mila</p>
                <p className="text-xs font-bold text-slate-500 mt-1">Chaant badlein — ya neeche directory me naya platform dhoondein.</p>
                <Button className="mt-3" variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Chaant hatao</Button>
              </div>
            )
          ) : (
            <section>
              <SectionHead title="Aap ki integrations" sub={`${filteredIntegrations.length} dikh rahi · ghalti wali pehle`} />
              {layout === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredIntegrations.map((it) => (
                    <IntegrationCard key={it.id} integration={it}
                      onOpen={() => openIntegration(it)}
                      onDisconnect={() => { if (confirm(`${it.displayName} band karein? Naye orders aana ruk jayenge.`)) disconnectMutation.mutate(it.id); }}
                      onReconnect={() => reconnectMutation.mutate(it.id)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden divide-y-2 divide-slate-100 dark:divide-slate-800">
                  {filteredIntegrations.map((it) => (
                    <IntegrationRow key={it.id} integration={it}
                      onOpen={() => openIntegration(it)}
                      onDisconnect={() => { if (confirm(`${it.displayName} band karein?`)) disconnectMutation.mutate(it.id); }}
                      onReconnect={() => reconnectMutation.mutate(it.id)} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Apni website — seedha raasta */}
          <Link to="/online-store/website"
            className="flex items-center gap-4 rounded-3xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 p-4 hover:shadow-md transition print:hidden">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shrink-0"><Store className="h-6 w-6" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-black text-slate-900 dark:text-white">Apni website jorein — WooCommerce, Shopify ya custom</div>
              <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Setup checklist, test order, products sync aur keys — sab ek safhe par</div>
            </div>
            <ChevronRight className="h-5 w-5 text-emerald-600 shrink-0" />
          </Link>

          {/* Directory */}
          {directory.length > 0 && (
            <section id="directory" className="scroll-mt-4 print:hidden">
              <SectionHead title="Aur platforms jorein" sub={`${notConnected.length} tayyar — ek click, keys daalein, bas`} icon={Sparkles} />
              <div className="space-y-5">
                {directory.map((g) => (
                  <div key={g.key}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                      <span>{g.cfg.emoji}</span> {g.cfg.label}
                      <span className="text-[11px] font-bold text-slate-400">· {g.cfg.hint}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                      {g.items.map((a: any) => (
                        <button key={a.type} onClick={() => startConnect(a)}
                          className="group relative flex flex-col p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-lg transition text-left">
                          {a.popular && (
                            <span className="absolute top-3 right-3 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                              <Star className="h-2.5 w-2.5 fill-current" /> Mashhoor
                            </span>
                          )}
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${a.color ?? '#8b5cf6'}20` }}>{a.icon}</div>
                          <div className="mt-3 font-black text-sm text-slate-900 dark:text-white">{a.name}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">{a.description}</div>
                          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-violet-700 dark:text-violet-300">
                            <Plus className="h-3 w-3" /> Jorein
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ CHANNEL ORDERS ═══ */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <Link to="/online-orders"
            className="flex items-center gap-4 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 hover:shadow-md dark:border-emerald-500/40 dark:from-emerald-500/10 dark:to-teal-500/5 transition">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-2xl shadow-lg shrink-0">🛍️</span>
            <div className="flex-1 min-w-0">
              <div className="font-black text-slate-900 dark:text-white">Online Orders ka poora safha</div>
              <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                Accept → bill → receipt → stock, delivery aur COD ka hisaab, analytics — sab ek jagah
              </div>
            </div>
            {pending > 0 && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white">{pending} naye</span>}
            <ChevronRight className="h-5 w-5 text-emerald-600 shrink-0" />
          </Link>
          <ChannelOrdersPanel integrations={integrations} />
        </div>
      )}

      {/* ═══ SYNC LOGS ═══ */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {logs.length > 0 && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniKpi label="Kamyab" value={logStats.ok} tone="emerald" />
              <MiniKpi label="Nakaam" value={logStats.bad} tone="rose" />
              <MiniKpi label="Chal rahe" value={logStats.run} tone="amber" />
              <MiniKpi label="Records guzre" value={logStats.records.toLocaleString('en-PK')} tone="slate" />
            </section>
          )}
          {logs.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <div className="font-black text-slate-800 dark:text-slate-100">Abhi koi sync activity nahi</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">Integration jorein — har sync yahan nazar aayega.</p>
            </div>
          ) : shownLogs.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-8 text-center text-sm font-bold text-slate-400">Is chaant me kuch nahi</div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden divide-y-2 divide-slate-100 dark:divide-slate-800">
              {shownLogs.map((log) => <SyncLogRow key={log.id} log={log} />)}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <ConnectIntegrationModal open={connectModal} onClose={() => setConnectModal(false)} available={available ?? []} />
      {selectedIntegration && (
        <IntegrationDetailModal integrationId={selectedIntegration} onClose={() => setSelectedIntegration(null)} />
      )}

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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHHOTE HISSE
// ═══════════════════════════════════════════════════════════════

const KPI_TONES: Record<string, string> = {
  emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  sky: 'from-sky-500 to-blue-700 shadow-sky-500/40',
  violet: 'from-violet-500 to-indigo-600 shadow-violet-500/40',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
  rose: 'from-rose-500 to-pink-600 shadow-rose-500/40',
};

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active, highlight, pulse }: any) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={cn('rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all',
        onClick && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        active ? 'border-violet-500 ring-2 ring-violet-200 dark:ring-violet-500/20 bg-violet-50 dark:bg-violet-500/10'
          : highlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/40'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight">{value}</div>
          {sub && <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{sub}</div>}
        </div>
        <div className={cn('h-11 w-11 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg shrink-0', KPI_TONES[tone], pulse && 'animate-pulse')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: React.ReactNode; tone: 'emerald' | 'rose' | 'amber' | 'slate' }) {
  const t = {
    emerald: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    rose: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    amber: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    slate: 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
  }[tone];
  return (
    <div className={cn('rounded-2xl border-2 p-3', t)}>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-[11px] font-black opacity-80">{label}</div>
    </div>
  );
}

function SectionHead({ title, sub, icon: Icon }: { title: string; sub?: string; icon?: any }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-violet-600" />}{title}
        </h2>
        {sub && <p className="text-[12px] font-bold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ onConnect, onGuide }: { onConnect: () => void; onGuide: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-violet-300 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/5 dark:to-indigo-500/5 p-8 sm:p-12 text-center">
      <div className="text-5xl sm:text-6xl">🔌</div>
      <h3 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Abhi koi integration nahi juri</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto font-semibold">
        Foodpanda, Daraz, apni website, TCS courier — jor dein aur orders khud Nafaa POS me aayenge.
      </p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-3 text-left">
        {[['1', 'Platform chunein', 'Neeche ki list se'], ['2', 'Keys daalein', 'Platform ke portal se'], ['3', 'Orders aayen', 'Har 30 second me']].map(([n, t, d]) => (
          <div key={n} className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border-2 border-violet-200 dark:border-violet-500/30 p-3">
            <div className="h-6 w-6 rounded-lg bg-violet-600 text-white text-xs font-black flex items-center justify-center">{n}</div>
            <div className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">{t}</div>
            <div className="text-[11px] font-bold text-slate-500">{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        <button onClick={onGuide}
          className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-xs font-black inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
          <GraduationCap className="h-4 w-4" /> Pehle samjhein
        </button>
        <button onClick={onConnect}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white text-sm font-black inline-flex items-center gap-2 shadow-lg shadow-violet-500/40 transition">
          <Plus className="h-4 w-4" /> Pehli integration jorein
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ integration: it, onOpen, onDisconnect, onReconnect }: any) {
  const st = STATUS_CONFIG[it.status] ?? STATUS_CONFIG.PENDING;
  const cat = CATEGORY_CONFIG[it.category as CatKey] ?? CATEGORY_CONFIG.SALES_CHANNEL;
  const isError = it.status === 'ERROR' || it.status === 'SUSPENDED';
  const isConnected = it.status === 'CONNECTED';
  const sr = rate(it.totalOrdersSynced ?? 0, it.totalErrors ?? 0);

  return (
    <div className={cn('group relative flex flex-col rounded-3xl bg-white dark:bg-slate-900 border-2 shadow-sm hover:shadow-lg transition overflow-hidden',
      isError ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-500/40')}>
      <div className={cn('h-1.5 bg-gradient-to-r', cat.gradient)} />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="relative h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
            {getIntegrationEmoji(it.type)}
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900', st.dot, isConnected && 'animate-pulse')} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-sm text-slate-900 dark:text-white truncate">{it.displayName}</div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{cat.emoji} {String(it.type ?? '').replace(/_/g, ' ')}</div>
          </div>
          <span className={cn('shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black', st.chip)}>
            <st.icon className="h-3 w-3" /> {st.label}
          </span>
        </div>

        {isError && (
          <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-2 text-[11px] font-black text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Connection me masla — dobara jorein
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="Orders" value={Number(it.totalOrdersSynced ?? 0).toLocaleString('en-PK')} icon={Package} />
          <Mini label="Ghalti" value={it.totalErrors ?? 0} icon={AlertCircle} warn={(it.totalErrors ?? 0) > 0} />
          <Mini label="Aakhri" value={it.lastSyncAt ? timeAgo(it.lastSyncAt) : '—'} icon={Clock} />
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
            <span>Sync kamyabi</span>
            <span className={sr >= 95 ? 'text-emerald-600' : sr >= 80 ? 'text-amber-600' : 'text-rose-600'}>{sr.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={cn('h-full rounded-full', sr >= 95 ? 'bg-emerald-500' : sr >= 80 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${sr}%` }} />
          </div>
        </div>

        <div className="mt-auto pt-3 border-t-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Button size="sm" variant="outline" fullWidth onClick={onOpen} leftIcon={<Settings className="h-3.5 w-3.5" />}>Sambhalein</Button>
          {isConnected ? (
            <Button size="sm" variant="ghost" onClick={onDisconnect} title="Band karein" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 dark:text-rose-400">
              <WifiOff className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onReconnect} title="Dobara jorein" className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 dark:text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({ integration: it, onOpen, onDisconnect, onReconnect }: any) {
  const st = STATUS_CONFIG[it.status] ?? STATUS_CONFIG.PENDING;
  const cat = CATEGORY_CONFIG[it.category as CatKey] ?? CATEGORY_CONFIG.SALES_CHANNEL;
  const isConnected = it.status === 'CONNECTED';
  const sr = rate(it.totalOrdersSynced ?? 0, it.totalErrors ?? 0);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
      <span className="relative h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
        {getIntegrationEmoji(it.type)}
        <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900', st.dot)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-slate-900 dark:text-white truncate">{it.displayName}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black', st.chip)}>{st.label}</span>
        </div>
        <div className="text-[11px] font-bold text-slate-500 truncate">{cat.emoji} {cat.label} · {String(it.type ?? '').replace(/_/g, ' ')}</div>
      </div>
      <div className="hidden md:grid grid-cols-3 gap-6 text-right shrink-0">
        <div><div className="text-sm font-black tabular-nums text-slate-900 dark:text-white">{Number(it.totalOrdersSynced ?? 0).toLocaleString('en-PK')}</div><div className="text-[10px] font-bold text-slate-400">orders</div></div>
        <div><div className={cn('text-sm font-black tabular-nums', sr >= 95 ? 'text-emerald-600' : sr >= 80 ? 'text-amber-600' : 'text-rose-600')}>{sr.toFixed(0)}%</div><div className="text-[10px] font-bold text-slate-400">kamyabi</div></div>
        <div><div className="text-sm font-black tabular-nums text-slate-900 dark:text-white">{it.lastSyncAt ? timeAgo(it.lastSyncAt) : '—'}</div><div className="text-[10px] font-bold text-slate-400">aakhri sync</div></div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" variant="outline" onClick={onOpen} leftIcon={<Settings className="h-3.5 w-3.5" />}>Sambhalein</Button>
        {isConnected
          ? <Button size="sm" variant="ghost" onClick={onDisconnect} title="Band karein" className="text-rose-600"><WifiOff className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" variant="ghost" onClick={onReconnect} title="Dobara jorein" className="text-emerald-600"><Wifi className="h-3.5 w-3.5" /></Button>}
      </div>
    </div>
  );
}

function Mini({ label, value, icon: Icon, warn }: { label: string; value: React.ReactNode; icon: any; warn?: boolean }) {
  return (
    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
      <Icon className={cn('h-3 w-3 mx-auto', warn ? 'text-rose-500' : 'text-slate-400')} />
      <div className={cn('mt-0.5 font-black text-xs truncate tabular-nums', warn ? 'text-rose-600' : 'text-slate-900 dark:text-white')}>{value}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function SyncLogRow({ log }: { log: any }) {
  const ok = log.status === 'SUCCESS';
  const bad = log.status === 'FAILED';
  return (
    <div className={cn('px-4 py-3 flex items-center gap-4', bad && 'bg-rose-50/50 dark:bg-rose-500/5')}>
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
        ok ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          : bad ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400')}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : bad ? <AlertCircle className="h-5 w-5" /> : <RefreshCw className="h-5 w-5 animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm text-slate-900 dark:text-white truncate">
          {getIntegrationEmoji(log.integration?.type)} {log.integration?.displayName ?? 'Nameloom'} <span className="text-slate-400">·</span> <span className="font-bold text-slate-600 dark:text-slate-300">{log.operation}</span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold flex items-center gap-2 flex-wrap">
          <span className="text-emerald-700 dark:text-emerald-400">{log.recordsSuccess ?? 0} theek</span>
          <span className="text-rose-700 dark:text-rose-400">{log.recordsFailed ?? 0} ghalat</span>
          <span>{log.recordsProcessed ?? 0} kul</span>
        </div>
        {log.errorMessage && <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 font-bold line-clamp-2">⚠️ {log.errorMessage}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-black text-slate-700 dark:text-slate-200">{new Date(log.startedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-[10px] font-bold text-slate-400">{new Date(log.startedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · {timeAgo(log.startedAt)}</div>
      </div>
    </div>
  );
}

function IntegrationsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Integrations ka safha</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Integration matlab doosre platform ko apne POS se jorna. Foodpanda par order aaya — seedha Nafaa me.
            Parcel TCS se gaya — tracking khud.
          </p>
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-[12px] font-bold text-emerald-900 dark:text-emerald-200">
            🍔 Misal: restaurant + Foodpanda — portal se keys lein → Nafaa me daalein → Jorein. Customer order kare to 30 second me POS me,
            accept karein, kitchen ticket, stock aur sale khud.
          </div>
          <Tip icon={ShoppingCart} title="🛒 Bechne ki jagah">Foodpanda, Daraz, Shopify, apni website — yahan se orders aate hain.</Tip>
          <Tip icon={Truck} title="📦 Courier">TCS, Leopards, CallCourier — parcel book aur tracking.</Tip>
          <Tip icon={CreditCard} title="💳 Payment">JazzCash, EasyPaisa, NayaPay, Raast — online paisa lena.</Tip>
          <Tip icon={Calculator} title="📊 Hisaab kitaab">QuickBooks, Xero — bikri khud books me.</Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Halat ka matlab</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <div>🟢 <strong>Chal raha</strong> — sab theek</div>
              <div>🔴 <strong>Ghalti</strong> — dobara jorein</div>
              <div>⚪ <strong>Band</strong> — aap ne band ki</div>
              <div>🟡 <strong>Intezar</strong> — tasdeeq baqi</div>
              <div>⛔ <strong>Rok diya</strong> — platform ne roka</div>
            </div>
          </div>
          <Tip icon={Activity} title="Sehat aur kamyabi">
            <strong>Sehat</strong> = kitni integrations chal rahi hain. <strong>Kamyabi</strong> = sync me kitne record theek guzre — 95% se upar achha.
            Masle wali integration hamesha upar laal patti me dikhti hai.
          </Tip>
          <Tip icon={Globe} title="Apni website">WooCommerce, Shopify ya custom website ke liye alag safha hai — checklist, test order aur keys ke saath.</Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><Kbd>/</Kbd> dhoondo</div>
              <div><Kbd>N</Kbd> nayi integration</div>
              <div><Kbd>1</Kbd>–<Kbd>3</Kbd> tabs</div>
              <div><Kbd>R</Kbd> taaza</div>
              <div><Kbd>P</Kbd> print</div>
              <div><Kbd>G</Kbd> ye guide</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border font-mono">{children}</kbd>;
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}

function getIntegrationEmoji(type?: string): string {
  const map: Record<string, string> = {
    CUSTOM_WEBSITE: '🌐', FOODPANDA: '🍔', DARAZ: '🛒', SHOPIFY: '🛍️', WOOCOMMERCE: '🛒',
    TCS_COURIER: '📦', LEOPARDS_COURIER: '🚚', CALLCOURIER: '🚚',
    NAYAPAY: '💳', RAAST: '🏦', JAZZCASH: '📱', EASYPAISA: '💚',
  };
  return (type && map[type]) || '🔌';
}

function timeAgo(dateStr: string): string {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (min < 1) return 'abhi';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
