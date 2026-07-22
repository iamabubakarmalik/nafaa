import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert, RefreshCw, Sparkles, Calendar, User, FileText,
  ArrowDownRight, ArrowUpRight, Package,
} from 'lucide-react';
import { controlledLogApi } from '../api/controlled-log.api';
import { formatPKR } from '@/lib/format';
import { format } from 'date-fns';

export default function ControlledLogPage() {
  const [logType, setLogType] = useState<string>('all');

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['controlled-log', logType],
    queryFn: () => controlledLogApi.list({ logType: logType === 'all' ? undefined : logType }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" />
              Regulatory Compliance
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ Narcotic Register</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Controlled substances log — Govt compliance (DRAP)</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <div className="flex gap-1.5">
        {['all', 'SALE', 'PURCHASE', 'ADJUSTMENT', 'DAMAGE'].map((t) => (
          <button key={t} onClick={() => setLogType(t)} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
            (logType === t ? 'bg-red-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No narcotic transactions logged yet</p>
        </div>
      ) : (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={
                      'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white ' +
                      (log.logType === 'SALE' || log.logType === 'DAMAGE' ? 'bg-rose-500' : 'bg-emerald-500')
                    }>
                      {log.logType === 'SALE' || log.logType === 'DAMAGE' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{log.logNumber}</span>
                        <span className={
                          'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                          (log.logType === 'SALE' ? 'bg-rose-500' : log.logType === 'PURCHASE' ? 'bg-emerald-500' : 'bg-amber-500')
                        }>
                          {log.logType}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 font-semibold flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.logDate), 'dd MMM yyyy, HH:mm')}
                        </span>
                        {log.patientName && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.patientName}
                          </span>
                        )}
                        {log.patientCnic && (
                          <span className="font-mono text-[10px]">CNIC: {log.patientCnic}</span>
                        )}
                      </div>
                      {log.doctorName && (
                        <div className="mt-1 text-xs text-slate-600 font-bold">
                          Dr. {log.doctorName} • {log.doctorRegNumber} {log.prescriptionNumber && '• Rx: ' + log.prescriptionNumber}
                        </div>
                      )}
                      {log.notes && <div className="mt-1 text-xs italic text-amber-700">{log.notes}</div>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {log.logType === 'SALE' || log.logType === 'DAMAGE' ? '−' : '+'}{log.quantity} {log.unit}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {log.openingBalance} → {log.closingBalance}
                    </div>
                    {log.dispensedBy && (
                      <div className="text-[10px] font-bold text-blue-700">By: {log.dispensedBy}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
