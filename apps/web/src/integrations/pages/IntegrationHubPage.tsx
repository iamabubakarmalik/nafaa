import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe, ShoppingCart, Truck, CreditCard, Calculator,
  Plus, CheckCircle2, AlertCircle, XCircle, RefreshCw,
  Settings, Zap, TrendingUp, Package, Clock,
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

const CATEGORY_CONFIG = {
  SALES_CHANNEL: { label: 'Sales Channels', icon: ShoppingCart, color: '#10b981', emoji: '🛒' },
  COURIER:       { label: 'Courier Services', icon: Truck, color: '#f97316', emoji: '📦' },
  PAYMENT:       { label: 'Payment Gateways', icon: CreditCard, color: '#8b5cf6', emoji: '💳' },
  ACCOUNTING:    { label: 'Accounting', icon: Calculator, color: '#06b6d4', emoji: '📊' },
};

const STATUS_CONFIG = {
  CONNECTED:    { label: 'Connected',    color: 'success', icon: CheckCircle2 },
  DISCONNECTED: { label: 'Disconnected', color: 'default', icon: XCircle },
  ERROR:        { label: 'Error',        color: 'danger',  icon: AlertCircle },
  PENDING:      { label: 'Pending',      color: 'warning', icon: Clock },
  SUSPENDED:    { label: 'Suspended',    color: 'danger',  icon: AlertCircle },
};

type HubTab = 'overview' | 'orders' | 'logs' | 'shipments';

export default function IntegrationHubPage({ defaultTab = 'overview' }: { defaultTab?: HubTab }) {
  const queryClient = useQueryClient();
  useOrderNotifications();
  const [connectModal, setConnectModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>(defaultTab);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const { data: dashboard, isLoading, refetch } = useQuery({
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
  });

  const reconnectMutation = useMutation({
    mutationFn: integrationsApi.reconnect,
    onSuccess: () => {
      toast.success('Reconnected!');
      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const integrations = dashboard?.integrations ?? [];
  const summary = dashboard?.summary;
  const categories = Object.keys(CATEGORY_CONFIG);

  const filteredIntegrations = filterCategory
    ? integrations.filter((i: any) => i.category === filterCategory)
    : integrations;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-600" />
            Integrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Apne POS ko doosre platforms se connect karein
          </p>
        </div>
        <Button
          variant="gradient"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setConnectModal(true)}
        >
          Add Integration
        </Button>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Connected"
          value={summary?.connectedIntegrations ?? 0}
          total={summary?.totalIntegrations ?? 0}
          color="bg-gradient-to-br from-success-500 to-emerald-600"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Channel Orders"
          value={summary?.totalChannelOrders ?? 0}
          color="bg-gradient-to-br from-brand-500 to-teal-600"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Orders"
          value={summary?.pendingOrders ?? 0}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Synced"
          value={integrations.reduce((s: number, i: any) => s + (i.totalOrdersSynced ?? 0), 0)}
          color="bg-gradient-to-br from-purple-500 to-pink-600"
        />
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-800 rounded-2xl w-fit">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}>
          Channel Orders
          {summary?.pendingOrders > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
              {summary.pendingOrders}
            </span>
          )}
        </TabButton>
        <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
          Sync Logs
        </TabButton>
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory(null)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition',
                !filterCategory
                  ? 'bg-brand-600 text-white shadow-brand'
                  : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100',
              )}
            >
              All ({integrations.length})
            </button>
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];
              const count = integrations.filter((i: any) => i.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5',
                    filterCategory === cat
                      ? 'bg-brand-600 text-white shadow-brand'
                      : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100',
                  )}
                >
                  {cfg.emoji} {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Connected integrations grid */}
          {filteredIntegrations.length === 0 ? (
            <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800 border-2 border-dashed border-slate-300 dark:border-neutral-700 p-12 text-center">
              <div className="text-5xl mb-3">🔌</div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Koi integration connected nahi
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Foodpanda, Daraz, apni website, TCS courier — sab se connect karke
                orders automatically Nafaa POS mein laayein.
              </p>
              <Button
                variant="gradient"
                size="lg"
                className="mt-4"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setConnectModal(true)}
              >
                Pehla Integration Connect Karein
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((integration: any) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onOpen={() => setSelectedIntegration(integration.id)}
                  onDisconnect={() => disconnectMutation.mutate(integration.id)}
                  onReconnect={() => reconnectMutation.mutate(integration.id)}
                />
              ))}
            </div>
          )}

          {/* Available integrations (not yet connected) */}
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-brand-600" />
              Available Integrations
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(available ?? [])
                .filter((a) => !integrations.some((i: any) => i.type === a.type))
                .map((avail) => {
                  const cfg = CATEGORY_CONFIG[avail.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.SALES_CHANNEL;
                  return (
                    <button
                      key={avail.type}
                      onClick={() => {
                        setConnectModal(true);
                        // Could pre-select this integration type
                      }}
                      className="group p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all text-left"
                    >
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition"
                        style={{ backgroundColor: `${avail.color}20` }}
                      >
                        {avail.icon}
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {avail.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {avail.description}
                      </div>
                      {avail.popular && (
                        <div className="mt-2">
                          <Badge variant="brand" size="xs">⭐ Popular</Badge>
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CHANNEL ORDERS TAB ═══ */}
      {activeTab === 'orders' && (
        <ChannelOrdersPanel integrations={integrations} />
      )}

      {/* ═══ SYNC LOGS TAB ═══ */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {dashboard?.recentSync?.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-8 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="font-bold">Koi sync activity nahi abhi</div>
            </div>
          ) : (
            dashboard?.recentSync?.map((log: any) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft flex items-center gap-4"
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    log.status === 'SUCCESS' ? 'bg-success-100 text-success-600' :
                    log.status === 'FAILED' ? 'bg-rose-100 text-rose-600' :
                    'bg-amber-100 text-amber-600',
                  )}
                >
                  {log.status === 'SUCCESS' ? <CheckCircle2 className="h-5 w-5" /> :
                   log.status === 'FAILED' ? <AlertCircle className="h-5 w-5" /> :
                   <RefreshCw className="h-5 w-5 animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {log.integration?.displayName ?? 'Unknown'} — {log.operation}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {log.recordsProcessed} processed · {log.recordsSuccess} success · {log.recordsFailed} failed
                    {log.errorMessage && ` · ${log.errorMessage}`}
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-bold shrink-0">
                  {new Date(log.startedAt).toLocaleString('en-PK', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, total, color }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft p-4">
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white mb-3', color)}>
        {icon}
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white">
        {value}{total !== undefined && <span className="text-sm text-slate-400">/{total}</span>}
      </div>
      <div className="text-xs font-bold text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-xl text-sm font-extrabold transition',
        active
          ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
      )}
    >
      {children}
    </button>
  );
}

function IntegrationCard({ integration, onOpen, onDisconnect, onReconnect }: any) {
  const statusCfg = STATUS_CONFIG[integration.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="group p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-2xl">
            {getIntegrationEmoji(integration.type)}
          </div>
          <div>
            <div className="font-black text-sm text-slate-900 dark:text-white">
              {integration.displayName}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {integration.type.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
        <Badge variant={statusCfg.color as any} size="xs">
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="Orders" value={integration.totalOrdersSynced} icon={<Package className="h-3 w-3" />} />
        <MiniStat label="Errors" value={integration.totalErrors} icon={<AlertCircle className="h-3 w-3" />} />
        <MiniStat
          label="Last Sync"
          value={integration.lastSyncAt ? timeAgo(integration.lastSyncAt) : '—'}
          icon={<Clock className="h-3 w-3" />}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" fullWidth onClick={onOpen} leftIcon={<Settings className="h-3.5 w-3.5" />}>
          Manage
        </Button>
        {integration.status === 'CONNECTED' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            className="text-rose-600 hover:bg-rose-50"
          >
            Disconnect
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onReconnect}>
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: any) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">{icon}</div>
      <div className="font-black text-xs text-slate-900 dark:text-white truncate">{value}</div>
      <div className="text-[8px] font-bold text-slate-500 uppercase">{label}</div>
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
