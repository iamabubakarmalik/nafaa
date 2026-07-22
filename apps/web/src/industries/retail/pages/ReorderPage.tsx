import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Package, TrendingDown, ShoppingCart, Sparkles,
  Truck, AlertTriangle, Check, X, Clock, Zap,
  ArrowRight, DollarSign, BarChart3, ChevronRight,
} from 'lucide-react';
import { reorderApi, type ReorderSuggestion } from '../api/reorder.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

export default function ReorderPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data: suggestions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reorder-suggestions', statusFilter],
    queryFn: () => reorderApi.list(statusFilter),
  });

  const generateMutation = useMutation({
    mutationFn: () => reorderApi.generate(),
    onSuccess: (result) => {
      toast.success(result.generated + ' suggestions generated');
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reorderApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => reorderApi.remove(id),
    onSuccess: () => {
      toast.success('Suggestion removed');
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
  });

  const totalValue = suggestions.reduce((sum, s) => sum + s.suggestedQuantity * s.lastPurchasePrice, 0);
  const critical = suggestions.filter((s) => s.daysOfStockLeft < 3).length;
  const bySupplier = suggestions.reduce((acc, s) => {
    const key = s.preferredSupplierId || 'none';
    if (!acc[key]) acc[key] = { supplier: s.supplier, items: [] };
    acc[key].items.push(s);
    return acc;
  }, {} as Record<string, { supplier: any; items: ReorderSuggestion[] }>);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              AI Reorder Suggestions
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🔄 Smart Reorder
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Sales history se auto-detect — kaunsi cheez khatam hone wali hai
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Zap className="h-4 w-4" />
              Analyze & Suggest
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Suggestions" value={suggestions.length} icon={ShoppingCart} color="blue" />
        <StatCard label="Critical" value={critical} sub="< 3 days stock" icon={AlertTriangle} color="rose" />
        <StatCard label="Est. Order Value" value={formatPKR(totalValue)} icon={DollarSign} color="emerald" />
        <StatCard label="Suppliers" value={Object.keys(bySupplier).length} icon={Truck} color="violet" />
      </section>

      {/* FILTER */}
      <section className="flex gap-2 flex-wrap">
        {['PENDING', 'ORDERED', 'IGNORED', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={
              'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
              (statusFilter === s
                ? 'bg-blue-600 text-white shadow'
                : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 hover:border-blue-300')
            }
          >
            {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </section>

      {/* LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            All good! Nothing to reorder yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            "Analyze & Suggest" button dabao — hum aap ke liye check karen ge
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {Object.entries(bySupplier).map(([supKey, group]) => (
            <div key={supKey} className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-500" />
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {group.supplier?.name || 'No preferred supplier'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
                    {group.items.length}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                  {formatPKR(group.items.reduce((sum, i) => sum + i.suggestedQuantity * i.lastPurchasePrice, 0))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                {group.items.map((sug) => (
                  <SuggestionRow
                    key={sug.id}
                    suggestion={sug}
                    onMarkOrdered={() => updateStatusMutation.mutate({ id: sug.id, status: 'ORDERED' })}
                    onIgnore={() => updateStatusMutation.mutate({ id: sug.id, status: 'IGNORED' })}
                    onRemove={() => removeMutation.mutate(sug.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-green-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function SuggestionRow({ suggestion, onMarkOrdered, onIgnore, onRemove }: {
  suggestion: ReorderSuggestion;
  onMarkOrdered: () => void;
  onIgnore: () => void;
  onRemove: () => void;
}) {
  const isCritical = suggestion.daysOfStockLeft < 3;
  const isLow = suggestion.daysOfStockLeft < 7;
  const orderValue = suggestion.suggestedQuantity * suggestion.lastPurchasePrice;

  return (
    <div className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
          {suggestion.product?.images?.[0]?.url ? (
            <img src={suggestion.product.images[0].url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={'/products/' + suggestion.productId + '/edit'}
              className="font-extrabold text-slate-900 dark:text-white text-sm hover:text-blue-600"
            >
              {suggestion.product?.name || 'Unknown'}
            </Link>
            {isCritical && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                CRITICAL
              </span>
            )}
            {!isCritical && isLow && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                LOW
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Current Stock</div>
              <div className={'font-extrabold tabular-nums ' + (isCritical ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900 dark:text-white')}>
                {suggestion.currentStock} {suggestion.product?.unit || ''}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Days Left</div>
              <div className={'font-extrabold tabular-nums ' + (isCritical ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-700')}>
                {suggestion.daysOfStockLeft.toFixed(1)} days
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Daily Sales</div>
              <div className="font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
                {suggestion.avgDailySales.toFixed(1)}/day
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-blue-700">Suggested Order</div>
              <div className="font-extrabold text-blue-700 tabular-nums">
                {suggestion.suggestedQuantity} × {formatPKR(suggestion.lastPurchasePrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[120px]">
          <div className="text-xs font-bold text-slate-500 uppercase">Order Value</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
            {formatPKR(orderValue)}
          </div>

          <div className="mt-2 flex gap-1 justify-end">
            {suggestion.status === 'PENDING' && (
              <>
                <button
                  onClick={onMarkOrdered}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1"
                  title="Mark as ordered"
                >
                  <Check className="h-3 w-3" />
                  Ordered
                </button>
                <button
                  onClick={onIgnore}
                  className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                  title="Ignore"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {suggestion.status !== 'PENDING' && (
              <button
                onClick={onRemove}
                className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
