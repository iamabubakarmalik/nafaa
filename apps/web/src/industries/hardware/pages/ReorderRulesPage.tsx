import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, RefreshCw, Sparkles, Package, TrendingDown, Phone,
  Clock, User, X, Save, Edit3,
} from 'lucide-react';
import { reorderRulesApi } from '../api/reorder-rules.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  OUT_OF_STOCK: { label: 'Out of Stock', color: 'bg-red-600' },
  CRITICAL: { label: 'Critical', color: 'bg-rose-500' },
  LOW: { label: 'Low', color: 'bg-amber-500' },
  OK: { label: 'OK', color: 'bg-emerald-500' },
};

export default function ReorderRulesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');

  const { data: alerts, isLoading: alertsLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: () => reorderRulesApi.lowStockAlerts(),
    refetchInterval: 60_000,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['reorder-rules'],
    queryFn: () => reorderRulesApi.list({ active: true, needsReorder: true }),
    enabled: tab === 'rules',
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              Stock Alerts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚠️ Reorder Alerts</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Low stock notifications & reorder rules</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      {alerts && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Alerts" value={alerts.total} icon={AlertTriangle} color="rose" />
          <StatCard label="Out of Stock" value={alerts.outOfStock} icon={X} color="red" />
          <StatCard label="Critical" value={alerts.critical} icon={TrendingDown} color="orange" />
          <StatCard label="Low" value={alerts.low} icon={AlertTriangle} color="amber" />
        </section>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('alerts')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'alerts' ? 'bg-red-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          🚨 Alerts ({alerts?.total || 0})
        </button>
        <button onClick={() => setTab('rules')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'rules' ? 'bg-red-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          Rules
        </button>
      </div>

      {tab === 'alerts' ? (
        alertsLoading ? (
          <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
        ) : !alerts?.alerts?.length ? (
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-emerald-300 p-12 text-center">
            <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
              <Package className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">All Stock OK!</h3>
            <p className="mt-1 text-sm text-slate-500 font-semibold">No products need reordering</p>
          </div>
        ) : (
          <section className="grid gap-3">
            {alerts.alerts.map((alert: any) => <AlertCard key={alert.id} alert={alert} />)}
          </section>
        )
      ) : (
        <section className="grid gap-3">
          {rules.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
              <AlertTriangle className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No reorder rules set</p>
            </div>
          ) : (
            rules.map((r) => <RuleCard key={r.id} rule={r} />)
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500 to-red-600', red: 'from-red-600 to-red-800',
    orange: 'from-orange-500 to-red-600', amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }: any) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const p = alert.product;

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 ' +
      (alert.severity === 'OUT_OF_STOCK' ? 'border-red-500 ring-2 ring-red-100' :
       alert.severity === 'CRITICAL' ? 'border-rose-400' :
       'border-amber-300')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {p?.images?.[0]?.url ? (
            <img src={p.images[0].url} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold">{p?.name || 'Product'}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + sev.color}>{sev.label}</span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[9px] uppercase font-extrabold text-slate-500">Current</div>
                <div className={
                  'font-extrabold tabular-nums ' +
                  (alert.currentStock <= 0 ? 'text-rose-700' : 'text-slate-900')
                }>{alert.currentStock}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold text-amber-700">Min Stock</div>
                <div className="font-extrabold text-amber-700 tabular-nums">{alert.minStock}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold text-blue-700">Reorder Qty</div>
                <div className="font-extrabold text-blue-700 tabular-nums">{alert.reorderQty}</div>
              </div>
            </div>
            {(alert.preferredSupplier || alert.emergencyContact) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {alert.preferredSupplier && (
                  <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                    <User className="h-3 w-3" />
                    {alert.preferredSupplier}
                  </span>
                )}
                {alert.emergencyContact && (
                  <a href={'tel:' + alert.emergencyContact} className="inline-flex items-center gap-1 font-extrabold text-blue-700 hover:underline">
                    <Phone className="h-3 w-3" />
                    {alert.emergencyContact}
                  </a>
                )}
                {alert.leadTimeDays && (
                  <span className="inline-flex items-center gap-1 font-bold text-slate-500">
                    <Clock className="h-3 w-3" />
                    Lead: {alert.leadTimeDays}d
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ rule }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-extrabold">{rule.product?.name || 'Product'}</div>
          <div className="mt-1 grid grid-cols-4 gap-2 text-xs">
            <div><span className="text-slate-500 font-semibold">Min: </span><span className="font-extrabold">{rule.minStock}</span></div>
            <div><span className="text-slate-500 font-semibold">Reorder: </span><span className="font-extrabold">{rule.reorderPoint}</span></div>
            <div><span className="text-slate-500 font-semibold">Qty: </span><span className="font-extrabold">{rule.reorderQty}</span></div>
            {rule.maxStock && <div><span className="text-slate-500 font-semibold">Max: </span><span className="font-extrabold">{rule.maxStock}</span></div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Stock</div>
          <div className="text-2xl font-extrabold tabular-nums">{rule.currentStock ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
