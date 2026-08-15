import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe, ShoppingCart, Truck, CreditCard, Calculator,
  Plus, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Settings, Zap, TrendingUp, Package, Clock, Search,
  GraduationCap, Printer, Download, X, Sparkles, Activity,
  Link2, ChevronRight, BookOpen, ExternalLink, Wifi, WifiOff,
} from 'lucide-react';
import { integrationsApi } from '../_core/api/integrations.api';
import { useOrderNotifications } from '../_core/hooks/useOrderNotifications';
import { Button } from '@core/ui/Button';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { ConnectIntegrationModal } from '../_core/components/ConnectIntegrationModal';
import { IntegrationDetailModal } from '../_core/components/IntegrationDetailModal';
import { ChannelOrdersPanel } from '../_core/components/ChannelOrdersPanel';
import { cn } from '@core/lib/cn';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA INTEGRATIONS HUB — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 Universal — Foodpanda, Daraz, TCS, JazzCash, custom sites
   🌙 Dark mode complete
   🎓 Teacher modal — kya kaise kaam karta hai
   ⌨️  / = search • N = new • 1-3 = tabs • R = refresh • G = guide
   🖨️ Print • 📊 CSV export
   📈 Health monitoring • sync success rate • error tracking
   ⚡ Hero with animated gradients + real-time badges
   ═════════════════════════════════════════════════════════════ */

const CATEGORY_CONFIG = {
  SALES_CHANNEL: { label: 'Sales Channels', icon: ShoppingCart, color: '#10b981', emoji: '🛒', gradient: 'from-emerald-500 to-green-600' },
  COURIER:       { label: 'Courier Services', icon: Truck, color: '#f97316', emoji: '📦', gradient: 'from-orange-500 to-red-600' },
  PAYMENT:       { label: 'Payment Gateways', icon: CreditCard, color: '#8b5cf6', emoji: '💳', gradient: 'from-violet-500 to-purple-600' },
  ACCOUNTING:    { label: 'Accounting', icon: Calculator, color: '#06b6d4', emoji: '📊', gradient: 'from-cyan-500 to-blue-600' },
};

const STATUS_CONFIG = {
  CONNECTED:    { label: 'Connected',    color: 'success', icon: CheckCircle2, ringClass: 'ring-emerald-400 dark:ring-emerald-500/50' },
  DISCONNECTED: { label: 'Disconnected', color: 'default', icon: XCircle, ringClass: 'ring-slate-300 dark:ring-slate-700' },
  ERROR:        { label: 'Error',        color: 'danger',  icon: AlertCircle, ringClass: 'ring-rose-400 dark:ring-rose-500/50' },
  PENDING:      { label: 'Pending',      color: 'warning', icon: Clock, ringClass: 'ring-amber-400 dark:ring-amber-500/50' },
  SUSPENDED:    { label: 'Suspended',    color: 'danger',  icon: AlertCircle, ringClass: 'ring-rose-400 dark:ring-rose-500/50' },
};

type HubTab = 'overview' | 'orders' | 'logs' | 'shipments';

const TABS: { value: HubTab; label: string; icon: any }[] = [
  { value: 'overview', label: 'Overview', icon: Globe },
  { value: 'orders', label: 'Channel Orders', icon: ShoppingCart },
  { value: 'logs', label: 'Sync Logs', icon: Activity },
];

export default function IntegrationHubPage({ defaultTab = 'overview' }: { defaultTab?: HubTab }) {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  useOrderNotifications();
  const [connectModal, setConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>(defaultTab);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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

  const disconnectMutation = useMutation({
    mutationFn: integrationsApi.disconnect,
    onSuccess: () => {
      toast.success('Integration disconnected');
      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const reconnectMutation = useMutation({
    mutationFn: integrationsApi.reconnect,
    onSuccess: () => {
      toast.success('🎉 Reconnected!');
      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const integrations = dashboard?.integrations ?? [];
  const summary = dashboard?.summary;
  const categories = Object.keys(CATEGORY_CONFIG);

  // Enhanced stats
  const stats = useMemo(() => {
    const totalSynced = integrations.reduce((s: number, i: any) => s + (i.totalOrdersSynced ?? 0), 0);
    const totalErrors = integrations.reduce((s: number, i: any) => s + (i.totalErrors ?? 0), 0);
    const successRate = totalSynced + totalErrors > 0
      ? (totalSynced / (totalSynced + totalErrors)) * 100
      : 100;

    const errorCount = integrations.filter((i: any) => i.status === 'ERROR').length;
    const connectedCount = integrations.filter((i: any) => i.status === 'CONNECTED').length;
    const health = integrations.length > 0 ? (connectedCount / integrations.length) * 100 : 100;

    return {
      totalSynced,
      totalErrors,
      successRate,
      errorCount,
      connectedCount,
      health,
    };
  }, [integrations]);

  const filteredIntegrations = useMemo(() => {
    let list = integrations;
    if (filterCategory) list = list.filter((i: any) => i.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i: any) =>
        i.displayName?.toLowerCase().includes(q) ||
        i.type?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [integrations, filterCategory, search]);

  // CSV export
  const exportCSV = () => {
    if (integrations.length === 0) return toast.error('Koi integrations nahi');
    const headers = ['Name', 'Type', 'Category', 'Status', 'Orders Synced', 'Errors', 'Last Sync'];
    const rows = integrations.map((i: any) => [
      i.displayName || '',
      i.type || '',
      i.category || '',
      i.status || '',
      i.totalOrdersSynced ?? 0,
      i.totalErrors ?? 0,
      i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString('en-PK') : 'Never',
    ]);
    const summaryRows = [
      [`Integrations Report — ${tenantName || 'My Store'}`],
      [`${shopName ? `${shopName}  •  ` : ''}Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${integrations.length}  •  Connected: ${stats.connectedCount}  •  Success rate: ${stats.successRate.toFixed(1)}%`],
      [''],
    ];
    const csv = [...summaryRows, headers, ...rows]
      .map((r) => r.map((c: unknown) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${integrations.length} integrations exported`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (showTeacher || connectModal || selectedIntegration) return;

      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setConnectModal(true); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); refetch(); toast.success('Refreshed'); }
      if (e.key.toLowerCase() === 'g') { e.preventDefault(); setShowTeacher(true); }
      const num = Number(e.key);
      if (num >= 1 && num <= TABS.length) {
        e.preventDefault();
        setActiveTab(TABS[num - 1].value);
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
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5 pb-10 print:space-y-3">
      {showTeacher && <IntegrationsTeacher onClose={() => setShowTeacher(false)} />}

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-brand-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🔌 {tenantName || 'My Store'} — Integrations Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName}  •  ` : ''}{integrations.length} integrations · {stats.connectedCount} connected · {stats.successRate.toFixed(1)}% success rate
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{new Date().toLocaleString('en-PK')}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-purple-800 dark:from-slate-950 dark:via-brand-950 dark:to-purple-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Link2 className="h-3.5 w-3.5 text-amber-300" /> Integration Hub
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
              {stats.errorCount > 0 && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-rose-200 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {stats.errorCount} issue{stats.errorCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight flex items-center gap-2">
              <Zap className="h-7 w-7 sm:h-9 sm:w-9 text-amber-300" />
              Integrations
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-2xl">
              Foodpanda, Daraz, TCS, JazzCash, aur apni website — sab connect karo aur orders
              seedhe Nafaa POS me lao. <strong className="text-amber-300">Auto sync every 30s.</strong>
            </p>

            {/* Health bar */}
            {integrations.length > 0 && (
              <div className="mt-3 max-w-md">
                <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" /> System Health
                  </span>
                  <span className={
                    stats.health >= 90 ? 'text-emerald-300' :
                    stats.health >= 60 ? 'text-amber-300' : 'text-rose-300'
                  }>
                    {stats.health.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-1000',
                      stats.health >= 90 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                      stats.health >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                      'bg-gradient-to-r from-rose-400 to-red-500',
                    )}
                    style={{ width: `${stats.health}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => setConnectModal(true)}
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <Plus className="h-4 w-4" /> Add Integration <Kbd>N</Kbd>
            </button>
          </div>
        </div>

        {/* Shortcuts hint */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">New</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>1</Kbd>–<Kbd>3</Kbd><span className="text-white/60">Tabs</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>R</Kbd><span className="text-white/60">Refresh</span>
        </div>
      </section>

      {/* Error banner */}
      {stats.errorCount > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3 flex items-center gap-2 flex-wrap print:hidden">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div className="flex-1 text-xs font-extrabold text-rose-800 dark:text-rose-200">
            ⚠️ {stats.errorCount} integration{stats.errorCount !== 1 ? 's' : ''} me error hai — reconnect karo warna orders miss ho jayenge
          </div>
          <button
            onClick={() => setFilterCategory(null)}
            className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold shrink-0 transition inline-flex items-center gap-1"
          >
            Dekho <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Connected"
          value={summary?.connectedIntegrations ?? 0}
          total={summary?.totalIntegrations ?? 0}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/40"
          sub={`${stats.health.toFixed(0)}% health`}
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Channel Orders"
          value={summary?.totalChannelOrders ?? 0}
          color="bg-gradient-to-br from-brand-500 to-teal-600 shadow-brand-500/40"
          sub="All platforms"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={summary?.pendingOrders ?? 0}
          color="bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40"
          sub={summary?.pendingOrders > 0 ? '⚡ Process karo' : 'Sab clear'}
          highlight={summary?.pendingOrders > 0}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          color="bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/40"
          sub={`${stats.totalSynced.toLocaleString()} synced`}
        />
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit overflow-x-auto print:hidden">
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          const badge = tab.value === 'orders' && summary?.pendingOrders > 0 ? summary.pendingOrders : null;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition inline-flex items-center gap-1.5 whitespace-nowrap',
                isActive
                  ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50',
              )}
              title={`Press ${idx + 1}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {badge && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black tabular-nums animate-pulse">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Search + Category filter */}
          <div className="space-y-3">
            {integrations.length > 0 && (
              <div className="relative">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search integrations... (/ shortcut)"
                  className="h-11 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
            )}

            {integrations.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-extrabold transition border-2 inline-flex items-center gap-1.5',
                    !filterCategory
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 border-brand-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700',
                  )}
                >
                  <Globe className="h-3.5 w-3.5" /> All ({integrations.length})
                </button>
                {categories.map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
                  const count = integrations.filter((i: any) => i.category === cat).length;
                  if (count === 0) return null;
                  const isActive = filterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-extrabold transition border-2 flex items-center gap-1.5',
                        isActive
                          ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-lg border-transparent`
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700',
                      )}
                    >
                      <span>{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                      <span className={cn(
                        'px-1.5 py-0 rounded text-[10px] tabular-nums',
                        isActive ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700',
                      )}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected integrations grid */}
          {filteredIntegrations.length === 0 ? (
            integrations.length === 0 ? (
              <EmptyState onConnect={() => setConnectModal(true)} onGuide={() => setShowTeacher(true)} />
            ) : (
              <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                <Search className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Kuch nahi mila</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Filter change karo</p>
                <button
                  onClick={() => { setSearch(''); setFilterCategory(null); }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold transition"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((integration: any) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onOpen={() => setSelectedIntegration(integration.id)}
                  onDisconnect={() => {
                    if (confirm(`Disconnect ${integration.displayName}?`)) {
                      disconnectMutation.mutate(integration.id);
                    }
                  }}
                  onReconnect={() => reconnectMutation.mutate(integration.id)}
                />
              ))}
            </div>
          )}

          {/* Available integrations */}
          {available && available.filter((a) => !integrations.some((i: any) => i.type === a.type)).length > 0 && (
            <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-600" />
                  Available Integrations
                </h2>
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  {available.filter((a) => !integrations.some((i: any) => i.type === a.type)).length} platforms
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {available
                  .filter((a) => !integrations.some((i: any) => i.type === a.type))
                  .map((avail) => {
                    const cfg = CATEGORY_CONFIG[avail.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.SALES_CHANNEL;
                    return (
                      <button
                        key={avail.type}
                        onClick={() => setConnectModal(true)}
                        className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-brand-300 dark:hover:border-brand-500/50 transition-all text-left overflow-hidden"
                      >
                        {avail.popular && (
                          <div className="absolute top-2 right-2">
                            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black shadow-sm">
                              ⭐ HOT
                            </span>
                          </div>
                        )}
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition"
                          style={{ backgroundColor: `${avail.color}20` }}
                        >
                          {avail.icon}
                        </div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {avail.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-semibold">
                          {avail.description}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition">
                          Connect <ChevronRight className="h-3 w-3" />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CHANNEL ORDERS TAB ═══ */}
      {activeTab === 'orders' && <ChannelOrdersPanel integrations={integrations} />}

      {/* ═══ SYNC LOGS TAB ═══ */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {dashboard?.recentSync?.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <div className="font-extrabold text-slate-700 dark:text-slate-300">Koi sync activity nahi</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Integration connect karo, activity yahan aa jayegi
              </p>
            </div>
          ) : (
            dashboard?.recentSync?.map((log: any) => (
              <SyncLogRow key={log.id} log={log} />
            ))
          )}
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <ConnectIntegrationModal
        open={connectModal}
        onClose={() => setConnectModal(false)}
        available={available ?? []}
      />

      {selectedIntegration && (
        <IntegrationDetailModal
          integrationId={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, total, color, sub, highlight }: any) {
  return (
    <div className={cn(
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm p-3 sm:p-4 hover:shadow-md hover:-translate-y-0.5 transition-all',
      highlight
        ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
        : 'border-slate-200 dark:border-slate-800',
    )}>
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg', color)}>
        {icon}
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
        {value}{total !== undefined && <span className="text-sm text-slate-400 dark:text-slate-500">/{total}</span>}
      </div>
      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider truncate">{label}</div>
      {sub && (
        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}

function EmptyState({ onConnect, onGuide }: { onConnect: () => void; onGuide: () => void }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center">
      <div className="text-5xl sm:text-6xl mb-3 animate-bounce">🔌</div>
      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
        Koi integration connected nahi
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto font-semibold">
        Foodpanda, Daraz, apni website, TCS courier — sab se connect karke
        orders automatically Nafaa POS mein laayein.
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        <button
          onClick={onGuide}
          className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition"
        >
          <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
        </button>
        <button
          onClick={onConnect}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-700 hover:from-brand-700 hover:to-purple-800 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-lg shadow-brand-500/40 transition"
        >
          <Plus className="h-4 w-4" /> Pehla Integration Connect Karein
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, onOpen, onDisconnect, onReconnect }: any) {
  const statusCfg = STATUS_CONFIG[integration.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;
  const isError = integration.status === 'ERROR';
  const isConnected = integration.status === 'CONNECTED';

  return (
    <div className={cn(
      'group relative p-5 rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-lg transition-all overflow-hidden',
      isError
        ? 'border-rose-300 dark:border-rose-500/40'
        : isConnected
          ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50'
          : 'border-slate-200 dark:border-slate-800',
    )}>
      {/* Live indicator */}
      {isConnected && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ring-2 transition',
            isConnected
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/20 dark:to-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30'
              : isError
                ? 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-500/20 dark:to-rose-500/10 ring-rose-200 dark:ring-rose-500/30'
                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 ring-slate-200 dark:ring-slate-700',
          )}>
            {getIntegrationEmoji(integration.type)}
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm text-slate-900 dark:text-white truncate">
              {integration.displayName}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {integration.type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <Badge variant={statusCfg.color as any} size="xs">
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Error banner inline */}
      {isError && (
        <div className="mb-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-2 text-[10px] font-extrabold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Connection issue — reconnect karo
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat
          label="Orders"
          value={integration.totalOrdersSynced ?? 0}
          icon={<Package className="h-3 w-3" />}
          color="emerald"
        />
        <MiniStat
          label="Errors"
          value={integration.totalErrors ?? 0}
          icon={<AlertCircle className="h-3 w-3" />}
          color={integration.totalErrors > 0 ? 'rose' : 'slate'}
        />
        <MiniStat
          label="Last Sync"
          value={integration.lastSyncAt ? timeAgo(integration.lastSyncAt) : '—'}
          icon={<Clock className="h-3 w-3" />}
          color="blue"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" fullWidth onClick={onOpen} leftIcon={<Settings className="h-3.5 w-3.5" />}>
          Manage
        </Button>
        {isConnected ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 dark:text-rose-400"
          >
            <WifiOff className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReconnect}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <Wifi className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, color = 'slate' }: any) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    blue: 'text-blue-600 dark:text-blue-400',
    slate: 'text-slate-400 dark:text-slate-500',
  };
  return (
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center border border-slate-100 dark:border-slate-700/50">
      <div className={cn('flex items-center justify-center gap-1 mb-0.5', colorMap[color])}>{icon}</div>
      <div className="font-black text-xs text-slate-900 dark:text-white truncate tabular-nums">{value}</div>
      <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</div>
    </div>
  );
}

function SyncLogRow({ log }: { log: any }) {
  return (
    <div className={cn(
      'p-4 rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm flex items-center gap-4 hover:shadow-md transition',
      log.status === 'SUCCESS' ? 'border-emerald-200 dark:border-emerald-500/30' :
      log.status === 'FAILED' ? 'border-rose-200 dark:border-rose-500/30' :
      'border-amber-200 dark:border-amber-500/30',
    )}>
      <div className={cn(
        'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
        log.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
        log.status === 'FAILED' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' :
        'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
      )}>
        {log.status === 'SUCCESS' ? <CheckCircle2 className="h-5 w-5" /> :
         log.status === 'FAILED' ? <AlertCircle className="h-5 w-5" /> :
         <RefreshCw className="h-5 w-5 animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
          {log.integration?.displayName ?? 'Unknown'} <span className="text-slate-400">·</span> {log.operation}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
          <span className="text-emerald-700 dark:text-emerald-400">{log.recordsSuccess} ✓</span>
          <span className="mx-1 opacity-50">·</span>
          <span className="text-rose-700 dark:text-rose-400">{log.recordsFailed} ✗</span>
          <span className="mx-1 opacity-50">·</span>
          <span>{log.recordsProcessed} total</span>
        </div>
        {log.errorMessage && (
          <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5 font-bold italic line-clamp-1">
            ⚠️ {log.errorMessage}
          </div>
        )}
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500 font-extrabold shrink-0 text-right">
        <div>{new Date(log.startedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-[10px] opacity-70">{new Date(log.startedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function IntegrationsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-brand-200 dark:border-brand-500/30 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Integrations — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Integrations = doosri platforms se apna POS jodo.</strong> Foodpanda pe order aaya?
            Seedha Nafaa me. Customer TCS se maal manga? Automatically tracking. Ek jagah sab manage.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300">
              🍔 Misal: Restaurant + Foodpanda
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>Setup:</strong> Foodpanda merchant portal se API keys → Nafaa me paste → Connect
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 font-extrabold text-emerald-800 dark:text-emerald-300">
                ✅ Customer order karta hai → 30 seconds me Nafaa POS me aa jata hai → Accept → Kitchen ticket print → Delivery
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400">
                → Stock auto-adjust • Sale record • Customer profile • Sab automatic
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="rounded-2xl border-2 border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-brand-700 dark:text-brand-300 mb-2">
              🎯 4 Categories
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>🛒 Sales Channels</strong> — Foodpanda, Daraz, Shopify, apni website — orders aate hain</Tip>
              <Tip><strong>📦 Courier Services</strong> — TCS, Leopards, CallCourier — shipment tracking</Tip>
              <Tip><strong>💳 Payment Gateways</strong> — JazzCash, EasyPaisa, NayaPay, Raast — online payments</Tip>
              <Tip><strong>📊 Accounting</strong> — QuickBooks, Xero — sales auto-sync to books</Tip>
            </div>
          </div>

          {/* Status meanings */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              📊 5 Statuses
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div>🟢 <strong>Connected</strong> — kaam kar raha</div>
              <div>🔴 <strong>Error</strong> — reconnect karo</div>
              <div>⏸️ <strong>Disconnected</strong> — off kar diya</div>
              <div>⏳ <strong>Pending</strong> — verify hona baaki</div>
              <div>🚫 <strong>Suspended</strong> — platform ne band kiya</div>
            </div>
          </div>

          {/* Health monitoring */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-2">
              📈 Health Monitoring
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Tip><strong>System Health %</strong> — connected ÷ total × 100. 90%+ acha, 60% se kam matlab issue</Tip>
              <Tip><strong>Success Rate</strong> — sync succeed / total. 95%+ ideal</Tip>
              <Tip><strong>Auto-refresh 30s</strong> — hero me live badge dikhta hai</Tip>
              <Tip><strong>Green ping dot</strong> — real-time connected indicator</Tip>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 mb-2">
              ⌨️ Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">/</kbd> — Search</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">N</kbd> — Naya integration</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">1-3</kbd> — Tabs switch</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">R</kbd> — Refresh</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">G</kbd> — Guide</div>
              <div><kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold text-[9px]">Esc</kbd> — Close</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Pro tip:</strong> Error status wali integration ko turant reconnect karo — orders miss ho
            sakte hain. Red banner top pe warn karta hai. Sync logs tab me error message dikhta hai — usse
            samajh aata hai kya galat hua.
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            🚀 <strong>Quick start:</strong> Neeche "Available Integrations" section me apni platform choose karo →
            "Connect" click → API keys dalo → Test → Done! Total 5 minute ka kaam hai.
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-600 to-purple-700 hover:from-brand-700 hover:to-purple-800 text-white font-extrabold shadow-lg shadow-brand-500/40 inline-flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </button>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Sparkles className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function getIntegrationEmoji(type: string): string {
  const map: Record<string, string> = {
    CUSTOM_WEBSITE: '🌐',
    FOODPANDA: '🍔',
    DARAZ: '🛒',
    SHOPIFY: '🛍️',
    WOOCOMMERCE: '🛒',
    TCS_COURIER: '📦',
    LEOPARDS_COURIER: '🚚',
    CALLCOURIER: '🚚',
    NAYAPAY: '💳',
    RAAST: '🏦',
    JAZZCASH: '📱',
    EASYPAISA: '💚',
  };
  return map[type] ?? '🔌';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
