import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TestTube, RefreshCw, Sparkles, Calendar, AlertCircle, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import { labOrdersApi } from '../api/lab-orders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ORDERED: 'bg-blue-500', SAMPLE_COLLECTED: 'bg-cyan-500', IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-600', REPORTED: 'bg-green-700', CANCELLED: 'bg-rose-500',
};

export default function LabOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['lab-orders', statusFilter],
    queryFn: () => labOrdersApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => labOrdersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['lab-orders'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <TestTube className="h-3.5 w-3.5 text-amber-300" />
              Lab Management
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧪 Lab Orders</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Test ordering, sample tracking, results</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'REPORTED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <TestTube className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No lab orders</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {orders.map((order) => {
            const abnormal = order.tests?.filter((t: any) => t.isAbnormal).length ?? 0;
            const critical = order.tests?.filter((t: any) => t.isCritical).length ?? 0;
            return (
              <div key={order.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-3 ' +
                (critical > 0 ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow">
                      <TestTube className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm">{order.orderNumber}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[order.status]}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        {order.urgency === 'STAT' && <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase animate-pulse">STAT</span>}
                        {order.urgency === 'URGENT' && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">URGENT</span>}
                        {critical > 0 && <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><AlertCircle className="h-2 w-2" />{critical} CRITICAL</span>}
                        {abnormal > 0 && <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase">{abnormal} ABNORMAL</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(order.orderedAt), 'dd MMM yyyy, HH:mm')}
                        {order.labName && ' • ' + order.labName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.totalCost)}</div>
                    {order.paymentStatus === 'PAID' && <div className="text-[10px] font-extrabold text-emerald-600">PAID</div>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {order.tests?.map((t: any) => (
                    <div key={t.id} className={
                      'rounded-lg border-2 p-2 text-xs ' +
                      (t.isCritical ? 'border-red-300 bg-red-50 dark:bg-red-950/30' :
                       t.isAbnormal ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' :
                       'border-slate-200 bg-slate-50 dark:bg-neutral-800/50')
                    }>
                      <div className="font-extrabold text-slate-900 dark:text-white">{t.testName}</div>
                      {t.result && (
                        <div className="mt-1 text-xs font-bold">
                          Result: <span className={t.isCritical ? 'text-red-700' : t.isAbnormal ? 'text-amber-700' : 'text-slate-700'}>
                            {t.result} {t.unit}
                          </span>
                          {t.referenceRange && <span className="text-[10px] text-slate-500"> (Ref: {t.referenceRange})</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                  {order.status === 'ORDERED' && (
                    <button onClick={() => statusMutation.mutate({ id: order.id, status: 'SAMPLE_COLLECTED' })} className="px-3 py-2 rounded-lg bg-cyan-100 text-cyan-700 text-xs font-extrabold hover:bg-cyan-200">
                      Mark Sample Collected
                    </button>
                  )}
                  {order.status === 'SAMPLE_COLLECTED' && (
                    <button onClick={() => statusMutation.mutate({ id: order.id, status: 'IN_PROGRESS' })} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-extrabold hover:bg-amber-200">
                      Start Processing
                    </button>
                  )}
                  {(order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') && (
                    <button onClick={() => statusMutation.mutate({ id: order.id, status: 'REPORTED' })} className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-extrabold hover:bg-emerald-200">
                      Mark Reported
                    </button>
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
