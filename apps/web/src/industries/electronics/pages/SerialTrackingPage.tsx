import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Search, X, RefreshCw, Package, CheckCircle2, XCircle,
  Shield, AlertTriangle, Download, Filter, Eye, Trash2, Sparkles,
  Clock, TrendingUp, RotateCcw, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { serialTrackingApi, type SerialStatus } from '../api/serial-tracking.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<SerialStatus, { label: string; color: string; bg: string; icon: any }> = {
  IN_STOCK: { label: 'In Stock', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Package },
  RESERVED: { label: 'Reserved', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  SOLD: { label: 'Sold', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle2 },
  RETURNED: { label: 'Returned', color: 'text-violet-700', bg: 'bg-violet-100', icon: RotateCcw },
  DEFECTIVE: { label: 'Defective', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  RMA: { label: 'RMA', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertTriangle },
  DAMAGED: { label: 'Damaged', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export default function SerialTrackingPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);

  const { data: serials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['serial-tracking-list', statusFilter],
    queryFn: () => serialTrackingApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return serials;
    return serials.filter((s) =>
      s.serialNumber.toLowerCase().includes(q) ||
      (s.imei || '').toLowerCase().includes(q) ||
      (s.imei2 || '').toLowerCase().includes(q) ||
      (s.macAddress || '').toLowerCase().includes(q) ||
      (s.product?.name || '').toLowerCase().includes(q)
    );
  }, [serials, search]);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    serials.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
    const warrantyActive = serials.filter((s) => s.warrantyStatus === 'ACTIVE').length;
    return {
      total: serials.length,
      inStock: byStatus.IN_STOCK || 0,
      sold: byStatus.SOLD || 0,
      defective: (byStatus.DEFECTIVE || 0) + (byStatus.RMA || 0),
      warrantyActive,
    };
  }, [serials]);

  const lookup = async () => {
    const code = lookupCode.trim();
    if (!code) return toast.error('Enter serial or IMEI');
    try {
      const result = await serialTrackingApi.lookup(code);
      if (result) {
        setLookupResult(result);
        toast.success('Found!');
      } else {
        setLookupResult(null);
        toast.error('Not found in database');
      }
    } catch {
      toast.error('Lookup failed');
    }
  };

  const remove = useMutation({
    mutationFn: (id: string) => serialTrackingApi.remove(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['serial-tracking-list'] });
    },
  });

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const head = ['Serial #', 'IMEI', 'IMEI 2', 'MAC', 'Product', 'Status', 'Warranty End', 'Sold Date', 'Sold Price'];
    const rows = filtered.map((s) => [
      s.serialNumber, s.imei || '', s.imei2 || '', s.macAddress || '',
      s.product?.name || '', s.status,
      s.warrantyEndDate || '', s.soldAt || '', s.soldPrice || 0,
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `serials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Barcode className="h-3.5 w-3.5 text-amber-300" /> Serial / IMEI Tracking
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📱 Serial Tracking</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} serials • {stats.inStock} in stock • {stats.sold} sold • {stats.warrantyActive} warranty active
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </section>

      {/* QUICK LOOKUP */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">⚡ Quick Serial Lookup</h3>
            <p className="text-xs text-slate-600 font-bold">Scan/type IMEI or serial to find product</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="h-5 w-5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={lookupCode} onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              placeholder="Enter IMEI or serial number..."
              className="h-14 w-full rounded-2xl border-2 border-blue-400 bg-white pl-11 pr-3 text-lg font-mono font-extrabold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-200" />
          </div>
          <button onClick={lookup} disabled={!lookupCode.trim()}
            className="h-14 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white font-extrabold shadow-md disabled:opacity-50">
            <Search className="h-5 w-5" />
          </button>
        </div>

        {lookupResult && (
          <div className="rounded-2xl bg-white border-2 border-emerald-300 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Found</div>
                  <div className="font-mono font-extrabold text-slate-900">{lookupResult.serialNumber}</div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase ${(STATUS_META as any)[lookupResult.status]?.bg} ${(STATUS_META as any)[lookupResult.status]?.color}`}>
                {(STATUS_META as any)[lookupResult.status]?.label}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <MiniField label="Product" value={lookupResult.product?.name || '—'} />
              {lookupResult.imei && <MiniField label="IMEI" value={lookupResult.imei} mono />}
              {lookupResult.imei2 && <MiniField label="IMEI 2" value={lookupResult.imei2} mono />}
              {lookupResult.macAddress && <MiniField label="MAC" value={lookupResult.macAddress} mono />}
              {lookupResult.warrantyEndDate && (
                <MiniField label="Warranty Until"
                  value={new Date(lookupResult.warrantyEndDate).toLocaleDateString('en-PK')}
                  tone={new Date(lookupResult.warrantyEndDate) > new Date() ? 'emerald' : 'rose'} />
              )}
              {lookupResult.soldAt && <MiniField label="Sold Date" value={new Date(lookupResult.soldAt).toLocaleDateString('en-PK')} />}
            </div>
          </div>
        )}
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={Barcode} tone="slate" />
        <StatCard label="In Stock" value={stats.inStock} icon={Package} tone="emerald" onClick={() => setStatusFilter('IN_STOCK')} />
        <StatCard label="Sold" value={stats.sold} icon={CheckCircle2} tone="blue" onClick={() => setStatusFilter('SOLD')} />
        <StatCard label="Defective" value={stats.defective} icon={XCircle} tone="rose" onClick={() => setStatusFilter('DEFECTIVE')} />
        <StatCard label="Warranty Active" value={stats.warrantyActive} icon={Shield} tone="violet" />
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Serial, IMEI, MAC, product name..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all', l: 'All' },
            { v: 'IN_STOCK', l: 'In Stock' },
            { v: 'SOLD', l: 'Sold' },
            { v: 'RESERVED', l: 'Reserved' },
            { v: 'RETURNED', l: 'Returned' },
            { v: 'DEFECTIVE', l: 'Defective' },
            { v: 'RMA', l: 'RMA' },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={['shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                statusFilter === o.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'].join(' ')}>
              {o.l}
            </button>
          ))}
        </div>
      </section>

      {/* LIST */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Barcode className="h-16 w-16 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-extrabold text-slate-900">No serials found</h3>
            <p className="text-sm text-slate-500 font-semibold mt-1">Add serials from product wizard</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th>Serial / IMEI</Th>
                  <Th>Product</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-center">Warranty</Th>
                  <Th className="text-right">Purchase</Th>
                  <Th className="text-right">Sold</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const meta = STATUS_META[s.status];
                  const StatusIcon = meta.icon;
                  const warrantyActive = s.warrantyEndDate && new Date(s.warrantyEndDate) > new Date();
                  return (
                    <tr key={s.id} className="hover:bg-amber-50/40 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-extrabold text-slate-900 text-sm">{s.serialNumber}</div>
                        {s.imei && <div className="text-[10px] font-mono text-slate-600 mt-0.5">IMEI: {s.imei}</div>}
                        {s.imei2 && <div className="text-[10px] font-mono text-slate-500">IMEI2: {s.imei2}</div>}
                        {s.macAddress && <div className="text-[10px] font-mono text-slate-500">MAC: {s.macAddress}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                            {s.product?.images?.[0]?.url ? (
                              <img src={s.product.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="font-extrabold text-sm text-slate-900 truncate max-w-[180px]">
                            {s.product?.name || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${meta.bg} ${meta.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {s.warrantyEndDate ? (
                          <span className={['text-[10px] font-extrabold inline-flex items-center gap-1',
                            warrantyActive ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                            <Shield className="h-2.5 w-2.5" />
                            {new Date(s.warrantyEndDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        ) : <span className="text-[10px] text-slate-400 font-bold">No warranty</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                        {s.purchasePrice ? formatPKR(s.purchasePrice) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700 tabular-nums">
                        {s.soldPrice ? formatPKR(s.soldPrice) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === 'IN_STOCK' && (
                            <button onClick={() => { if (confirm(`Delete serial ${s.serialNumber}?`)) remove.mutate(s.id); }}
                              className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    rose: 'from-rose-500 to-rose-700',
    violet: 'from-violet-500 to-violet-700',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={['rounded-2xl bg-white border-2 border-slate-200 p-4 text-left w-full',
        onClick ? 'hover:border-amber-300 hover:shadow-md transition' : ''].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Comp>
  );
}

function MiniField({ label, value, mono, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
  };
  return (
    <div>
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={['text-sm font-bold text-slate-900', mono ? 'font-mono' : '', tone ? tones[tone] : ''].join(' ')}>{value}</div>
    </div>
  );
}
