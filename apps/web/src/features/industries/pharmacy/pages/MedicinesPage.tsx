import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Pill, Search, Snowflake, ShieldAlert, Sparkles, RefreshCw,
  Package, ThermometerSnowflake, Award, FileText, Eye,
} from 'lucide-react';
import { medicinesApi } from '../api/medicines.api';
import { formatPKR } from '@/lib/format';

export default function MedicinesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const { data: medicines = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pharmacy-medicines', search, filter],
    queryFn: () => medicinesApi.list({
      search: search || undefined,
      requiresColdChain: filter === 'coldchain' ? true : undefined,
      requiresPrescription: filter === 'rx' ? true : undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Medicines
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💊 Medicines</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Products with pharmacy extension — DRAP registered</p>
          </div>
          <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
            <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-teal-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', l: 'All' },
            { v: 'rx', l: 'Prescription Only' },
            { v: 'coldchain', l: '❄️ Cold Chain' },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold transition ' +
              (filter === f.v ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>
              {f.l}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {medicines.map((m) => (
            <Link key={m.id} to={'/products/' + m.productId + '/edit'} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                  {m.product?.images?.[0]?.url ? <img src={m.product.images[0].url} alt="" className="w-full h-full object-cover" /> : <Pill className="h-7 w-7 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 dark:text-white truncate">{m.product?.name}</h3>
                  {m.product?.productSalts?.[0] && (
                    <div className="text-[10px] font-bold text-cyan-600">{m.product.productSalts[0].salt?.name} {m.product.productSalts[0].strength}</div>
                  )}
                  {m.manufacturer && <div className="text-[10px] text-slate-500 font-semibold truncate">{m.manufacturer}</div>}
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {m.requiresPrescription && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold uppercase">Rx</span>}
                {m.isNarcotic && <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><ShieldAlert className="h-2 w-2" />Narcotic</span>}
                {m.requiresColdChain && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5"><Snowflake className="h-2 w-2" />Cold</span>}
                {m.isGeneric && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[9px] font-extrabold uppercase">Generic</span>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {m.dosageForm && <div><span className="text-slate-500 font-semibold">Form:</span> <span className="font-extrabold">{m.dosageForm}</span></div>}
                {m.packSize && <div><span className="text-slate-500 font-semibold">Pack:</span> <span className="font-extrabold">{m.packSize}</span></div>}
              </div>

              {m.registrationNumber && (
                <div className="text-[10px] font-mono text-slate-500">DRAP: {m.registrationNumber}</div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-end justify-between">
                <div>
                  <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(m.product?.price ?? 0)}</div>
                  <div className="text-[10px] font-extrabold text-slate-500">Stock: {m.product?.stock ?? 0}</div>
                </div>
                <Eye className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
