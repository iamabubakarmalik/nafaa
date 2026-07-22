import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Search, Download, ArrowLeft, RefreshCw, ShieldCheck,
  Package, AlertCircle, CheckCircle2, Filter, ExternalLink,
  Trash2, ScanLine, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { toast } from 'sonner';
import {
  imeiApi,
  type PtaStatus,
  type ImeiStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '../api/imei.api';
import { PtaStatusBadge } from '../components/PtaStatusBadge';

type StatusFilter = 'ALL' | ImeiStatus;
type PtaFilter = 'ALL' | PtaStatus;

export default function GlobalImeiInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('IN_STOCK');
  const [ptaFilter, setPtaFilter] = useState<PtaFilter>('ALL');

  const { data: stats } = useQuery({
    queryKey: ['imei-global-stats'],
    queryFn: imeiApi.stats,
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['imei-global-list', statusFilter, ptaFilter],
    queryFn: () =>
      imeiApi.listAll({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        ptaStatus: ptaFilter === 'ALL' ? undefined : ptaFilter,
        limit: 500,
      }),
  });

  const imeis = listData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return imeis;
    return imeis.filter((i: any) =>
      i.imei1?.includes(q) ||
      i.imei2?.includes(q) ||
      i.serialNumber?.toLowerCase().includes(q) ||
      i.color?.toLowerCase().includes(q) ||
      i.product?.name?.toLowerCase().includes(q) ||
      i.product?.brand?.name?.toLowerCase().includes(q),
    );
  }, [imeis, search]);

  const recalcMutation = useMutation({
    mutationFn: imeiApi.recalcStocks,
    onSuccess: (data) => {
      toast.success(`${data.message} — ${data.productsUpdated} products, ${data.variantsUpdated} variants`);
      queryClient.invalidateQueries({ queryKey: ['imei-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['imei-global-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Recalc failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => imeiApi.remove(id),
    onSuccess: () => {
      toast.success('IMEI deleted');
      queryClient.invalidateQueries({ queryKey: ['imei-global-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-global-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['IMEI 1', 'IMEI 2', 'Serial', 'Product', 'Brand', 'Variant', 'Color', 'Status', 'PTA', 'PTA Tax', 'Cost', 'Warranty', 'Date'];
    const rows = filtered.map((i: any) => [
      i.imei1, i.imei2 || '', i.serialNumber || '',
      i.product?.name || '', i.product?.brand?.name || '',
      i.variant?.name || '', i.color || '',
      i.status, i.ptaStatus || '', Number(i.ptaTaxPaid || 0).toFixed(2),
      Number(i.costPrice || 0).toFixed(2),
      i.warrantyMonths ? `${i.warrantyMonths}m` : '',
      new Date(i.createdAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imei-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  const ptaBreakdown = useMemo(() => {
    const map: Record<PtaStatus, number> = { APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0 };
    stats?.byPta?.forEach((p: any) => { map[p.ptaStatus as PtaStatus] = p.count; });
    return map;
  }, [stats]);

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Smartphone className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">Mobile Industry</div>
              <h1 className="text-3xl font-extrabold">IMEI Inventory</h1>
              <div className="text-sm text-white/80 mt-1">
                Saare products ki IMEIs ek hi jagah — search, filter, manage
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <a
              href="https://dirbs.pta.gov.pk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> DIRBS PTA
            </a>
            <Button
              onClick={() => {
                if (confirm('Recalculate all product stocks from IMEI counts? This fixes "Out of stock" issues.')) {
                  recalcMutation.mutate();
                }
              }}
              loading={recalcMutation.isPending}
              className="bg-white text-blue-900 hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" /> Recalc Stock
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total IMEIs" value={stats.total} icon={Smartphone} color="blue" />
          <StatCard label="In Stock" value={stats.inStock} icon={CheckCircle2} color="emerald" />
          <StatCard label="Sold" value={stats.sold} icon={Package} color="violet" />
          <StatCard label="Stock Value" value={formatPKR(stats.stockValue ?? 0)} icon={ShieldCheck} color="amber" isText />
        </section>
      )}

      {/* PTA Breakdown */}
      {stats && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-2 border-emerald-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h3 className="font-bold text-emerald-900">PTA Status (In-Stock IMEIs)</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
              const count = ptaBreakdown[status];
              const active = ptaFilter === status;
              const colors = PTA_STATUS_COLORS[status];
              return (
                <button
                  key={status}
                  onClick={() => setPtaFilter(active ? 'ALL' : status)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    active
                      ? `${colors.bg} ${colors.border} shadow-md ring-2 ring-offset-1 ring-emerald-400`
                      : `bg-white border-slate-200 hover:${colors.border}`
                  }`}
                >
                  <div className={`text-3xl font-extrabold ${count > 0 ? colors.text : 'text-slate-300'}`}>
                    {count}
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${colors.text}`}>
                    {PTA_STATUS_LABELS[status]}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['ALL', 'IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED', 'RESERVED'] as StatusFilter[]).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition ${
                active ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {s === 'ALL' ? `All (${stats?.total || 0})` : s.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Search + Export */}
      <div className="rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <ScanLine className="h-4 w-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan or search IMEI / product / brand / serial..."
            className="h-10 w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 pl-9 pr-3 text-sm font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        {filtered.length > 0 && (
          <button
            onClick={exportCSV}
            className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> CSV ({filtered.length})
          </button>
        )}
      </div>

      {/* IMEI List */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Smartphone className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">
              {search || statusFilter !== 'IN_STOCK' || ptaFilter !== 'ALL'
                ? 'No matching IMEIs'
                : 'No IMEIs yet'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {!search && statusFilter === 'IN_STOCK' && ptaFilter === 'ALL'
                ? 'Add IMEIs from a product page (Products → select mobile → IMEI Tracking tab)'
                : 'Try different filters'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((imei: any) => (
              <div key={imei.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        {imei.imei1}
                      </span>
                      <PtaStatusBadge
                        status={(imei.ptaStatus || 'PENDING') as PtaStatus}
                        size="sm"
                        taxPaid={imei.ptaTaxPaid}
                      />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        imei.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                        imei.status === 'SOLD' ? 'bg-violet-100 text-violet-700' :
                        imei.status === 'RETURNED' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {imei.status}
                      </span>
                      {imei.color && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                          {imei.color}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/products/${imei.productId}/edit`}
                      className="font-bold text-slate-900 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <Package className="h-3.5 w-3.5" />
                      {imei.product?.name || 'Unknown product'}
                      {imei.product?.brand?.name && (
                        <span className="text-xs text-violet-700 font-bold"> · {imei.product.brand.name}</span>
                      )}
                      {imei.variant?.name && (
                        <span className="text-xs text-slate-500"> — {imei.variant.name}</span>
                      )}
                    </Link>

                    {imei.imei2 && (
                      <div className="text-xs text-slate-500 font-mono mt-0.5">IMEI 2: {imei.imei2}</div>
                    )}
                    {imei.serialNumber && (
                      <div className="text-xs text-slate-500 font-mono">Serial: {imei.serialNumber}</div>
                    )}

                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span>Cost: <strong className="text-slate-700">{formatPKR(imei.costPrice || 0)}</strong></span>
                      {imei.ptaTaxPaid > 0 && (
                        <span className="text-emerald-700 font-bold">+ Tax: {formatPKR(imei.ptaTaxPaid)}</span>
                      )}
                      {imei.warrantyMonths > 0 && <span>Warranty: {imei.warrantyMonths}m</span>}
                      {imei.warrantyExpiry && (
                        <span>Till: {new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')}</span>
                      )}
                      {imei.soldAt && (
                        <span className="text-violet-700 font-bold">
                          Sold: {new Date(imei.soldAt).toLocaleDateString('en-PK')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/products/${imei.productId}/imei`}
                      className="h-9 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Product IMEIs
                    </Link>
                    {imei.status !== 'SOLD' && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete IMEI ${imei.imei1}?`)) deleteMutation.mutate(imei.id);
                        }}
                        className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, isText,
}: {
  label: string;
  value: any;
  icon: any;
  color: 'blue' | 'emerald' | 'violet' | 'amber';
  isText?: boolean;
}) {
  const map = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-fuchsia-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${map[color]} text-white flex items-center justify-center shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`font-extrabold text-slate-900 ${isText ? 'text-lg truncate' : 'text-2xl'}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
