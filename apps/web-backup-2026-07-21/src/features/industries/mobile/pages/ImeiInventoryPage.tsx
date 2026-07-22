import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Smartphone, Search, ShieldCheck, Trash2, Plus, ScanLine,
  CheckCircle2, AlertCircle, Package2, AlertOctagon, AlertTriangle, Clock, Shield,
  Download, ExternalLink,
} from 'lucide-react';
import {
  imeiApi,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '../api/imei.api';
import { BulkImeiAddModal } from '../components/BulkImeiAddModal';
import { PtaStatusBadge } from '../components/PtaStatusBadge';
import { Button } from '@/components/ui/Button';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { formatPKR } from '@/lib/format';

type PtaFilter = 'ALL' | PtaStatus;

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

export default function ImeiInventoryPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { has } = useBusinessFeatures();
  const [search, setSearch] = useState('');
  const [ptaFilter, setPtaFilter] = useState<PtaFilter>('ALL');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await apiClient.get(`/products/${id}`);
      return res?.data?.data ?? res?.data;
    },
    enabled: !!id,
  });

  const { data: imeis = [], isLoading } = useQuery({
    queryKey: ['imei-product-list', id],
    queryFn: () => imeiApi.listByProduct(id!),
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['imei-stats'],
    queryFn: imeiApi.stats,
    enabled: has('imei'),
  });

  const deleteMutation = useMutation({
    mutationFn: (imeiId: string) => imeiApi.remove(imeiId),
    onSuccess: () => {
      toast.success('IMEI deleted');
      queryClient.invalidateQueries({ queryKey: ['imei-product-list', id] });
      queryClient.invalidateQueries({ queryKey: ['imei-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  // PTA breakdown for this product
  const ptaBreakdown = useMemo(() => {
    const counts: Record<PtaStatus, number> = {
      APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0,
    };
    let totalTax = 0;
    imeis.forEach((i: any) => {
      const status = (i.ptaStatus || 'PENDING') as PtaStatus;
      counts[status] = (counts[status] || 0) + 1;
      totalTax += Number(i.ptaTaxPaid || 0);
    });
    return { counts, totalTax };
  }, [imeis]);

  const filtered = useMemo(() => {
    let list = imeis;

    // PTA filter
    if (ptaFilter !== 'ALL') {
      list = list.filter((i: any) => (i.ptaStatus || 'PENDING') === ptaFilter);
    }

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((i: any) =>
        i.imei1?.toLowerCase().includes(q) ||
        i.imei2?.toLowerCase().includes(q) ||
        i.serialNumber?.toLowerCase().includes(q) ||
        i.color?.toLowerCase().includes(q) ||
        i.status?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [imeis, search, ptaFilter]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['IMEI 1', 'IMEI 2', 'Serial', 'PTA Status', 'PTA Tax Paid', 'Status', 'Color', 'Cost', 'Warranty'];
    const rows = filtered.map((i: any) => [
      i.imei1,
      i.imei2 || '',
      i.serialNumber || '',
      i.ptaStatus || 'PENDING',
      Number(i.ptaTaxPaid || 0).toFixed(2),
      i.status,
      i.color || '',
      Number(i.costPrice || 0).toFixed(2),
      i.warrantyMonths ? `${i.warrantyMonths}m` : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imei-${product?.name || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  if (!has('imei')) {
    return (
      <div className="space-y-6">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">IMEI feature disabled</h2>
          <p className="mt-2 text-sm text-slate-500">
            Business settings me ja kar IMEI tracking enable karein.
          </p>
        </div>
      </div>
    );
  }

  if (productLoading || isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={id ? `/products/${id}/edit` : '/products'} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Product
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Smartphone className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">IMEI Inventory</div>
              <h1 className="text-3xl font-extrabold">{product?.name || 'Product'}</h1>
              <div className="text-sm text-white/80 mt-1">
                Track serials, PTA status, warranty, and sold devices
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
              onClick={() => setShowBulkAdd(true)}
              className="bg-white text-blue-900 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Add IMEIs
            </Button>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This Product" value={imeis.length} icon={Smartphone} color="blue" />
        <StatCard label="In Stock" value={imeis.filter((x: any) => x.status === 'IN_STOCK').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Sold" value={imeis.filter((x: any) => x.status === 'SOLD').length} icon={ShieldCheck} color="violet" />
        <StatCard label="All Store IMEIs" value={stats?.total || 0} icon={Package2} color="amber" />
      </section>

      {/* PTA Breakdown */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-2 border-emerald-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-700" />
            <h3 className="font-extrabold text-emerald-900">PTA Status Breakdown</h3>
          </div>
          {ptaBreakdown.totalTax > 0 && (
            <div className="text-xs">
              <span className="text-slate-600">Total Tax Paid:</span>{' '}
              <strong className="text-emerald-800">{formatPKR(ptaBreakdown.totalTax)}</strong>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
            const Icon = PTA_ICONS[status];
            const colors = PTA_STATUS_COLORS[status];
            const count = ptaBreakdown.counts[status] || 0;
            const active = ptaFilter === status;
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
                <div className="flex items-center justify-between">
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                  <span className={`text-2xl font-extrabold ${count > 0 ? colors.text : 'text-slate-300'}`}>
                    {count}
                  </span>
                </div>
                <div className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${colors.text}`}>
                  {PTA_STATUS_LABELS[status]}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Search + Filter bar */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <ScanLine className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IMEI / serial / color / status..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setPtaFilter('ALL')}
            className={`h-11 px-3 rounded-xl text-xs font-bold border-2 ${
              ptaFilter === 'ALL'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
            }`}
          >
            All ({imeis.length})
          </button>

          {filtered.length > 0 && (
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Search className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">No IMEIs found</div>
            <div className="text-xs text-slate-500 mt-1">
              {ptaFilter !== 'ALL'
                ? `No IMEIs with ${PTA_STATUS_LABELS[ptaFilter]} status`
                : 'Add stock serials to start tracking devices'}
            </div>
            {(ptaFilter !== 'ALL' || search) && (
              <button
                onClick={() => { setPtaFilter('ALL'); setSearch(''); }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((imei: any) => (
              <div key={imei.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-slate-900">{imei.imei1}</span>
                      <PtaStatusBadge
                        status={(imei.ptaStatus || 'PENDING') as PtaStatus}
                        taxPaid={imei.ptaTaxPaid}
                      />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        imei.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                        imei.status === 'SOLD' ? 'bg-blue-100 text-blue-700' :
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

                    {imei.imei2 && (
                      <div className="text-xs text-slate-500 font-mono mt-1">IMEI 2: {imei.imei2}</div>
                    )}
                    {imei.serialNumber && (
                      <div className="text-xs text-slate-500 font-mono">Serial: {imei.serialNumber}</div>
                    )}

                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span>Cost: {formatPKR(imei.costPrice || 0)}</span>
                      {imei.ptaTaxPaid > 0 && (
                        <span className="text-emerald-700 font-bold">
                          + PTA Tax: {formatPKR(imei.ptaTaxPaid)}
                        </span>
                      )}
                      {imei.warrantyMonths ? <span>Warranty: {imei.warrantyMonths}m</span> : null}
                      {imei.warrantyExpiry ? (
                        <span>Expires: {new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {imei.status !== 'SOLD' && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete IMEI ${imei.imei1}?`)) {
                            deleteMutation.mutate(imei.id);
                          }
                        }}
                        className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBulkAdd && product && (
        <BulkImeiAddModal
          productId={product.id}
          productName={product.name}
          defaultCostPrice={product.costPrice || 0}
          onClose={() => setShowBulkAdd(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['imei-product-list', id] });
            queryClient.invalidateQueries({ queryKey: ['imei-stats'] });
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const map = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-orange-600',
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${map[color]} text-white flex items-center justify-center shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}
