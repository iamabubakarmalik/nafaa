import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, RefreshCw, Sparkles, User, Phone, Calendar, MapPin,
  Play, Pause, X, CheckCircle2, Repeat, DollarSign,
} from 'lucide-react';
import { subscriptionsApi } from '../api/subscriptions.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-600', PAUSED: 'bg-amber-500',
  CANCELLED: 'bg-rose-500', EXPIRED: 'bg-slate-500', COMPLETED: 'bg-blue-600',
};

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily', emoji: '📅' },
  { value: 'ALTERNATE_DAY', label: 'Alt Day', emoji: '🔀' },
  { value: 'WEEKLY', label: 'Weekly', emoji: '📆' },
  { value: 'BIWEEKLY', label: 'Bi-weekly', emoji: '🗓️' },
  { value: 'MONTHLY', label: 'Monthly', emoji: '📊' },
];

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const { data: subs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['meat-subscriptions', statusFilter],
    queryFn: () => subscriptionsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 60_000,
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => subscriptionsApi.pause(id, reason),
    onSuccess: () => { toast.success('Paused'); queryClient.invalidateQueries({ queryKey: ['meat-subscriptions'] }); },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => subscriptionsApi.resume(id),
    onSuccess: () => { toast.success('Resumed'); queryClient.invalidateQueries({ queryKey: ['meat-subscriptions'] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => subscriptionsApi.cancel(id, reason),
    onSuccess: () => { toast.success('Cancelled'); queryClient.invalidateQueries({ queryKey: ['meat-subscriptions'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Repeat className="h-3.5 w-3.5 text-amber-300" />
              Recurring Delivery
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🚚 Meat Subscriptions</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Weekly/monthly recurring meat delivery</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['ACTIVE', 'all', 'PAUSED', 'CANCELLED', 'EXPIRED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : subs.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Truck className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No subscriptions yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {subs.map((sub) => {
            const freq = FREQUENCIES.find((f) => f.value === sub.frequency);
            const daysToNext = sub.nextDeliveryDate ? differenceInDays(new Date(sub.nextDeliveryDate), new Date()) : null;
            return (
              <div key={sub.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
                (daysToNext === 0 && sub.status === 'ACTIVE' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow shrink-0">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold">{sub.subscriptionNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[sub.status]}>{sub.status}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">
                          {freq?.emoji} {freq?.label}
                        </span>
                        {daysToNext === 0 && sub.status === 'ACTIVE' && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">TODAY</span>
                        )}
                      </div>
                      {sub.contactPerson && (
                        <div className="mt-1 text-sm font-bold inline-flex items-center gap-1">
                          <User className="h-3 w-3" />{sub.contactPerson}
                        </div>
                      )}
                      {sub.contactPhone && (
                        <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />{sub.contactPhone}
                        </div>
                      )}
                      {sub.deliveryAddress && (
                        <div className="text-xs text-slate-500 font-semibold inline-flex items-start gap-1 mt-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{sub.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {sub.nextDeliveryDate && (
                      <>
                        <div className="text-[10px] uppercase font-extrabold text-slate-500">Next Delivery</div>
                        <div className="text-sm font-extrabold">{format(new Date(sub.nextDeliveryDate), 'dd MMM')}</div>
                      </>
                    )}
                    <div className="text-[10px] font-extrabold text-emerald-700 mt-1">{sub.totalMonthlyKg}kg/mo</div>
                    <div className="text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(sub.monthlyEstimate)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                  <div><span className="text-slate-500 font-semibold">Deliveries:</span> <span className="font-extrabold">{sub.totalDeliveries}</span></div>
                  <div><span className="text-slate-500 font-semibold">Revenue:</span> <span className="font-extrabold text-emerald-700">{formatPKR(sub.totalRevenue)}</span></div>
                  <div><span className="text-slate-500 font-semibold">Auto-renew:</span> <span className="font-extrabold">{sub.autoRenew ? '✅' : '❌'}</span></div>
                </div>

                {sub.status === 'ACTIVE' && (
                  <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => {
                      const reason = prompt('Pause reason?');
                      if (reason !== null) pauseMutation.mutate({ id: sub.id, reason });
                    }} className="flex-1 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                    <button onClick={() => {
                      const reason = prompt('Cancellation reason?');
                      if (reason !== null) cancelMutation.mutate({ id: sub.id, reason });
                    }} className="flex-1 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                )}
                {sub.status === 'PAUSED' && (
                  <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <button onClick={() => resumeMutation.mutate(sub.id)} className="flex-1 h-9 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                      <Play className="h-3 w-3" />
                      Resume
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
