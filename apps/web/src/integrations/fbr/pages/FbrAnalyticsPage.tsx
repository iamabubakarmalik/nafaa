import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, DollarSign, Percent, Calendar } from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

export default function FbrAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['fbr-analytics'],
    queryFn: fbrApi.getAnalytics,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return <div className="max-w-6xl mx-auto p-6 space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  }

  const todayVsYest = data.yesterday.gross > 0
    ? ((data.today.gross - data.yesterday.gross) / data.yesterday.gross) * 100
    : 0;

  const maxGross = Math.max(...data.monthlyTrend.map((m) => m.gross), 1);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-600" />
          FBR Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">12-month trends, rejection insights, top errors</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Total Submitted"
          value={data.totalSubmitted.toString()}
          color="emerald"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Rejection Rate"
          value={`${data.rejectionRate.toFixed(1)}%`}
          color={data.rejectionRate > 10 ? 'rose' : data.rejectionRate > 5 ? 'amber' : 'emerald'}
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Today's Tax"
          value={`Rs ${data.today.tax.toLocaleString()}`}
          color="blue"
          delta={todayVsYest !== 0 ? todayVsYest : undefined}
        />
        <KpiCard
          icon={<Calendar className="h-4 w-4" />}
          label="Pending Retry"
          value={data.totalPending.toString()}
          color={data.totalPending > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Monthly trend chart */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5">
        <h3 className="font-black text-slate-900 dark:text-white mb-4">12-Month Trend</h3>
        <div className="space-y-3">
          {data.monthlyTrend.map((m) => (
            <div key={m.period} className="flex items-center gap-3">
              <div className="w-16 text-xs font-black text-slate-500 shrink-0">{m.period}</div>
              <div className="flex-1 relative h-8 bg-slate-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center pl-2 rounded-lg"
                  style={{ width: `${(m.gross / maxGross) * 100}%` }}
                >
                  {m.gross > 0 && (
                    <span className="text-xs font-black text-white">{m.count} inv</span>
                  )}
                </div>
              </div>
              <div className="w-24 text-right text-xs font-black text-slate-900 dark:text-white shrink-0">
                Rs {m.gross.toLocaleString()}
              </div>
              <div className="w-24 text-right text-xs font-bold text-blue-600 shrink-0">
                +Rs {m.tax.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top errors */}
      {data.topErrors.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5">
          <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            Top Rejection Reasons
          </h3>
          <div className="space-y-2">
            {data.topErrors.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <div className="h-6 w-6 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {e.count}
                </div>
                <div className="flex-1 text-xs font-bold text-rose-800 dark:text-rose-400">{e.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5">
        <h3 className="font-black text-slate-900 dark:text-white mb-3">Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 text-center">
              <div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, delta }: any) {
  const colors: any = {
    emerald: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
    rose:    'from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400',
    amber:   'from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    blue:    'from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    slate:   'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400',
  };
  return (
    <div className={cn('p-4 rounded-2xl border bg-gradient-to-br', colors[color])}>
      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">{icon} {label}</div>
      <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</div>
      {delta !== undefined && (
        <div className={cn('text-[10px] font-black mt-1 flex items-center gap-1', delta >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% vs yesterday
        </div>
      )}
    </div>
  );
}
