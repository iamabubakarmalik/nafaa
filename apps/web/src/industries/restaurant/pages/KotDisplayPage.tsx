import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Timer, ChefHat, Clock, Utensils, Bike, ShoppingBag, Home, Car,
  Coffee, Check, X, RefreshCw, Sparkles, Printer, AlertTriangle,
  ArrowRight, Package, Flame,
} from 'lucide-react';
import { kotApi, type Kot, type KotStatus } from '../api/kot.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<KotStatus, { label: string; bg: string; border: string; text: string; next?: KotStatus }> = {
  PENDING: { label: 'Pending', bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-700', next: 'ACKNOWLEDGED' },
  PRINTED: { label: 'Printed', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-700', next: 'ACKNOWLEDGED' },
  ACKNOWLEDGED: { label: 'Acknowledged', bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-700', next: 'COOKING' },
  COOKING: { label: 'Cooking', bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-700', next: 'READY' },
  READY: { label: 'Ready', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-700', next: 'SERVED' },
  SERVED: { label: 'Served', bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-teal-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-700' },
};

const MODE_ICON: Record<string, any> = {
  DINE_IN: Utensils,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Bike,
  DRIVE_THRU: Car,
  ROOM_SERVICE: Home,
  PICKUP: Package,
};

export default function KotDisplayPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | KotStatus>('active');
  const [stationFilter, setStationFilter] = useState<string>('all');

  const { data: kots = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['kot-list', statusFilter, stationFilter],
    queryFn: () => kotApi.list({
      status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
      station: stationFilter === 'all' ? undefined : stationFilter,
    }),
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: KotStatus }) => kotApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kot-list'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
  });

  // Filter active by default
  const filteredKots = statusFilter === 'active'
    ? kots.filter((k) => !['SERVED', 'CANCELLED'].includes(k.status))
    : kots;

  // Group by status
  const grouped = filteredKots.reduce((acc, kot) => {
    if (!acc[kot.status]) acc[kot.status] = [];
    acc[kot.status].push(kot);
    return acc;
  }, {} as Record<KotStatus, Kot[]>);

  const stations = Array.from(new Set(kots.map((k) => k.station).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" />
              Kitchen Display System
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🍳 KOT Kitchen
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Live kitchen orders — auto-refresh every 15 seconds
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
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { v: 'active' as const, label: 'Active' },
            { v: 'PENDING' as const, label: 'Pending' },
            { v: 'ACKNOWLEDGED' as const, label: 'Acknowledged' },
            { v: 'COOKING' as const, label: 'Cooking' },
            { v: 'READY' as const, label: 'Ready' },
            { v: 'SERVED' as const, label: 'Served' },
            { v: 'all' as const, label: 'All' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setStatusFilter(opt.v)}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (statusFilter === opt.v
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {stations.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setStationFilter('all')}
              className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                (stationFilter === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }
            >
              All Stations
            </button>
            {stations.map((s) => (
              <button
                key={s}
                onClick={() => setStationFilter(s!)}
                className={
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
                  (stationFilter === s ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
                }
              >
                🍳 {s}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* KANBAN VIEW */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filteredKots.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Kitchen is clear!</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">No pending orders</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['PENDING', 'ACKNOWLEDGED', 'COOKING', 'READY'] as KotStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const items = grouped[status] || [];
            return (
              <div key={status} className={
                'rounded-2xl border-2 shadow-sm overflow-hidden bg-white dark:bg-neutral-900 ' +
                cfg.border
              }>
                <div className={'px-4 py-3 ' + cfg.bg + ' text-white'}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold uppercase tracking-wider text-sm">{cfg.label}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-extrabold">{items.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 font-semibold">Nothing here</div>
                  ) : (
                    items.map((kot) => (
                      <KotCard
                        key={kot.id}
                        kot={kot}
                        onAdvance={() => {
                          if (cfg.next) updateMutation.mutate({ id: kot.id, status: cfg.next });
                        }}
                        onCancel={() => {
                          if (confirm('Cancel KOT ' + kot.kotNumber + '?')) {
                            updateMutation.mutate({ id: kot.id, status: 'CANCELLED' });
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function KotCard({ kot, onAdvance, onCancel }: {
  kot: Kot;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const created = new Date(kot.createdAt);
  const elapsed = Math.floor((Date.now() - created.getTime()) / 60000);
  const items = kot.itemsSnapshot as any[];
  const order = kot.order;
  const modeIcon = order?.mode ? MODE_ICON[order.mode] : Utensils;
  const ModeIcon = modeIcon;

  const urgencyBg = elapsed > 20 ? 'ring-2 ring-red-500 animate-pulse' : elapsed > 10 ? 'ring-2 ring-amber-400' : '';

  return (
    <div className={
      'rounded-xl bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 shadow-sm p-3 space-y-2 ' + urgencyBg
    }>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{kot.kotNumber}</div>
            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
              <ModeIcon className="h-2.5 w-2.5" />
              {order?.table ? 'Table ' + order.table.tableNumber : order?.mode || '—'}
            </div>
          </div>
        </div>

        <div className={
          'text-[10px] font-extrabold px-1.5 py-0.5 rounded ' +
          (elapsed > 20 ? 'bg-red-100 text-red-700' : elapsed > 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')
        }>
          {elapsed}m
        </div>
      </div>

      {/* Station */}
      {kot.station && (
        <div className="text-[10px] font-extrabold text-slate-600 uppercase inline-flex items-center gap-1">
          <Flame className="h-2.5 w-2.5 text-orange-500" />
          {kot.station}
        </div>
      )}

      {/* Priority */}
      {kot.priority && kot.priority !== 'NORMAL' && (
        <span className={
          'inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ' +
          (kot.priority === 'HIGH' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white')
        }>
          {kot.priority}
        </span>
      )}

      {/* Items */}
      <div className="rounded-lg bg-slate-50 dark:bg-neutral-900 p-2 space-y-1">
        {items.slice(0, 8).map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-1 text-xs">
            <span className="font-extrabold text-amber-700 tabular-nums shrink-0">{item.quantity}×</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 dark:text-white leading-tight">{item.product?.name || 'Item'}</div>
              {item.specialInstructions && (
                <div className="text-[10px] italic text-amber-700 mt-0.5">📝 {item.specialInstructions}</div>
              )}
              {item.cookingNote && (
                <div className="text-[10px] italic text-blue-700 mt-0.5">🍳 {item.cookingNote}</div>
              )}
              {item.spiceLevel && item.spiceLevel !== 'NONE' && (
                <div className="text-[10px] font-bold text-red-600 mt-0.5">🌶️ {item.spiceLevel}</div>
              )}
            </div>
          </div>
        ))}
        {items.length > 8 && (
          <div className="text-[10px] font-extrabold text-slate-500">+{items.length - 8} more</div>
        )}
      </div>

      {/* Notes */}
      {kot.notes && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 italic">
          📌 {kot.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-700">
        {STATUS_CONFIG[kot.status].next && (
          <button
            onClick={onAdvance}
            className={
              'flex-1 h-9 rounded-lg text-xs font-extrabold text-white inline-flex items-center justify-center gap-1 shadow ' +
              STATUS_CONFIG[STATUS_CONFIG[kot.status].next!].bg
            }
          >
            <ArrowRight className="h-3 w-3" />
            {STATUS_CONFIG[STATUS_CONFIG[kot.status].next!].label}
          </button>
        )}
        {!['SERVED', 'CANCELLED'].includes(kot.status) && (
          <button
            onClick={onCancel}
            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
