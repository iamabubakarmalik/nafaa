import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, Package, Sparkles, RefreshCw, AlertTriangle, Pill } from 'lucide-react';
import { pharmacyDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { format, differenceInDays } from 'date-fns';

export default function ExpiringPage() {
  const [days, setDays] = useState(90);

  const { data: batches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pharmacy-expiring', days],
    queryFn: () => pharmacyDashboardApi.expiring(days),
    refetchInterval: 5 * 60_000,
  });

  const grouped = batches.reduce((acc: any, b: any) => {
    const dLeft = differenceInDays(new Date(b.expiryDate), new Date());
    const bucket = dLeft <= 0 ? 'EXPIRED' : dLeft <= 7 ? 'CRITICAL' : dLeft <= 30 ? 'SOON' : 'WATCH';
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push({ ...b, dLeft });
    return acc;
  }, {} as any);

  const buckets = [
    { key: 'EXPIRED', label: '❌ Expired', color: 'bg-slate-900 text-white' },
    { key: 'CRITICAL', label: '🚨 Critical (7 days)', color: 'bg-rose-600 text-white' },
    { key: 'SOON', label: '⏳ Expiring Soon (30 days)', color: 'bg-amber-500 text-white' },
    { key: 'WATCH', label: '👀 Watch List', color: 'bg-yellow-500 text-white' },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Expiry Manager
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⏳ Expiring Stock</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Batches close to expiry — take action before loss</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-11 rounded-xl bg-white/15 backdrop-blur border border-white/20 px-3 text-sm font-bold text-white">
              <option value="30" className="text-slate-900">Next 30 days</option>
              <option value="60" className="text-slate-900">Next 60 days</option>
              <option value="90" className="text-slate-900">Next 90 days</option>
              <option value="180" className="text-slate-900">Next 6 months</option>
              <option value="365" className="text-slate-900">Next year</option>
            </select>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-emerald-300 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 mx-auto flex items-center justify-center">
            <Clock className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">All good!</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">No batches expiring in {days} days</p>
        </div>
      ) : (
        <section className="space-y-6">
          {buckets.map((bkt) => {
            const items = grouped[bkt.key] || [];
            if (items.length === 0) return null;
            return (
              <div key={bkt.key} className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className={'px-5 py-3 font-extrabold text-sm ' + bkt.color + ' flex items-center justify-between'}>
                  <span>{bkt.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{items.length}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {items.map((b: any) => (
                    <Link key={b.id} to={'/products/' + b.productId + '/edit'} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                        {b.product?.images?.[0]?.url ? <img src={b.product.images[0].url} alt="" className="w-full h-full object-cover" /> : <Pill className="h-5 w-5 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{b.product?.name}</div>
                        <div className="text-xs text-slate-500 font-mono font-bold">Batch: {b.batchNumber}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-500">Qty: <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{b.quantity}</span></div>
                        <div className="text-xs font-bold text-amber-700 tabular-nums">
                          {format(new Date(b.expiryDate), 'dd MMM yyyy')}
                        </div>
                        <div className={
                          'text-xs font-extrabold ' +
                          (b.dLeft <= 0 ? 'text-rose-700' : b.dLeft <= 7 ? 'text-rose-600' : b.dLeft <= 30 ? 'text-amber-600' : 'text-yellow-600')
                        }>
                          {b.dLeft <= 0 ? 'EXPIRED ' + Math.abs(b.dLeft) + 'd ago' : b.dLeft + ' days'}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
