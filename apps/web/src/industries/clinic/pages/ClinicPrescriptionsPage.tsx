import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Pill, Search, RefreshCw, Sparkles, User, Calendar, FileText } from 'lucide-react';
import { prescriptionsApi } from '../api/prescriptions.api';
import { Button } from '@core/ui/Button';
import { format } from 'date-fns';

export default function PrescriptionsPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: prescriptions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prescriptions', statusFilter],
    queryFn: () => prescriptionsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Digital Rx
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💊 Prescriptions</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All prescription history</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', 'ACTIVE', 'DISPENSED', 'EXPIRED', 'CANCELLED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Pill className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No prescriptions yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm">{rx.prescriptionNumber}</span>
                      <span className={
                        'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                        (rx.status === 'ACTIVE' ? 'bg-emerald-600' : rx.status === 'DISPENSED' ? 'bg-blue-600' : 'bg-slate-500')
                      }>{rx.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold inline-flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(rx.issuedAt), 'dd MMM yyyy, HH:mm')}
                    </div>
                    <div className="text-xs font-extrabold text-cyan-700 mt-1">{rx.totalItems} drug(s)</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                {rx.items?.slice(0, 4).map((it) => (
                  <div key={it.id} className="text-xs font-bold text-slate-700">
                    • <span className="text-slate-900 dark:text-white">{it.drugName}</span> {it.strength} — {it.dose} • {it.frequency} • {it.durationDays}d
                  </div>
                ))}
                {(rx.items?.length || 0) > 4 && (
                  <div className="text-xs font-extrabold text-slate-500">+ {rx.items.length - 4} more...</div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
