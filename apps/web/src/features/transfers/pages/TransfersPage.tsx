import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight, Plus, Search, X, Filter, Building2,
  Package, Clock, Truck, CheckCircle2, XCircle, Calendar,
  Download, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

const statusConfig: Record<TransferStatus, { label: string; tone: string; icon: any }> = {
  PENDING: { label: 'Pending', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  RECEIVED: { label: 'Received', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

export default function TransfersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');

  // Note: Adjust API endpoint as per your transfers.api.ts
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: async () => {
      try {
        const { apiClient } = await import('@/api/client');
        const res = await apiClient.get('/transfers');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const filtered = useMemo(() => {
    let result = [...transfers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((t: any) =>
        t.transferNumber?.toLowerCase().includes(q) ||
        t.fromShop?.name?.toLowerCase().includes(q) ||
        t.toShop?.name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t: any) => t.status === statusFilter);
    }
    return result;
  }, [transfers, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: transfers.length,
      pending: transfers.filter((t: any) => t.status === 'PENDING').length,
      inTransit: transfers.filter((t: any) => t.status === 'IN_TRANSIT').length,
      received: transfers.filter((t: any) => t.status === 'RECEIVED').length,
    };
  }, [transfers]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Transfer #', 'From Shop', 'To Shop', 'Items', 'Status', 'Created', 'Received'];
    const rows = filtered.map((t: any) => [
      t.transferNumber,
      t.fromShop?.name || '',
      t.toShop?.name || '',
      t.items?.length || 0,
      t.status,
      new Date(t.createdAt).toLocaleString('en-PK'),
      t.receivedAt ? new Date(t.receivedAt).toLocaleString('en-PK') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ArrowLeftRight className="h-3.5 w-3.5 text-amber-300" /> Multi-Shop Inventory
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Stock Transfers</h2>
            <p className="mt-2 text-sm text-white/80">
              Ek shop se doosri shop me stock transfer karein — track every movement.
            </p>
          </div>
          <Button className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Transfer
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Transfers" value={stats.total} icon={ArrowLeftRight} color="cyan" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
        <StatCard label="In Transit" value={stats.inTransit} icon={Truck} color="blue" />
        <StatCard label="Received" value={stats.received} icon={CheckCircle2} color="emerald" />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
              placeholder="Search transfer #, shop name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {(Object.entries(statusConfig) as [TransferStatus, any][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                statusFilter === key ? cfg.tone + ' border shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <cfg.icon className="h-3 w-3" />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">All Transfers</h3>
          <p className="text-sm text-slate-500">{filtered.length} of {transfers.length} transfers</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
              <ArrowLeftRight className="h-9 w-9 text-cyan-600" />
            </div>
            <h4 className="mt-5 text-xl font-bold text-slate-900">
              {search || statusFilter !== 'all' ? 'No matches' : 'No transfers yet'}
            </h4>
            <p className="text-sm text-slate-500 mt-2">
              {search || statusFilter !== 'all' ? 'Try different filter' : 'Multi-shop setup ke liye transfers create karein'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t: any) => {
              const cfg = statusConfig[t.status as TransferStatus];
              const StatusIcon = cfg?.icon || Clock;
              return (
                <div key={t.id} className="px-6 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center shadow shrink-0">
                        <ArrowLeftRight className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 font-mono">{t.transferNumber}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg?.tone}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {cfg?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Building2 className="h-3 w-3" />
                            {t.fromShop?.name || '—'}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Building2 className="h-3 w-3" />
                            {t.toShop?.name || '—'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-0.5">
                            <Package className="h-2.5 w-2.5" />
                            {t.items?.length || 0} items
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(t.createdAt)}
                          </span>
                          {t.createdBy && (
                            <>
                              <span>•</span>
                              <span>by {t.createdBy.fullName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-cyan-100 hover:text-cyan-700 flex items-center justify-center transition" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
          <Truck className="h-4 w-4" />
        </div>
        <div className="text-sm text-slate-700">
          <strong className="font-bold text-cyan-900">Multi-Shop Tip:</strong> Stock transfer ka use multiple shops me inventory move karne ke liye hota hai. PENDING → IN_TRANSIT → RECEIVED ke flow se status track karein.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
