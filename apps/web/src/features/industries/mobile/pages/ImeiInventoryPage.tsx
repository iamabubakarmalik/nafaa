import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Smartphone, Search, ShieldCheck, Trash2, Plus, ScanLine,
  CheckCircle2, AlertCircle, Package2,
} from 'lucide-react';
import { imeiApi } from '../api/imei.api';
import { BulkImeiAddModal } from '../components/BulkImeiAddModal';
import { Button } from '@/components/ui/Button';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { formatPKR } from '@/lib/format';

export default function ImeiInventoryPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { has } = useBusinessFeatures();
  const [search, setSearch] = useState('');
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
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Delete failed');
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return imeis;
    return imeis.filter((i: any) =>
      i.imei1?.toLowerCase().includes(q) ||
      i.imei2?.toLowerCase().includes(q) ||
      i.serialNumber?.toLowerCase().includes(q) ||
      i.color?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q)
    );
  }, [imeis, search]);

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
                Track serials, warranty, and sold devices
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowBulkAdd(true)}
            className="bg-white text-blue-900 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            Add IMEIs
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This Product" value={imeis.length} icon={Smartphone} color="blue" />
        <StatCard label="In Stock" value={imeis.filter((x: any) => x.status === 'IN_STOCK').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Sold" value={imeis.filter((x: any) => x.status === 'SOLD').length} icon={ShieldCheck} color="violet" />
        <StatCard label="All Store IMEIs" value={stats?.total || 0} icon={Package2} color="amber" />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <ScanLine className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IMEI / serial / color / status..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Search className="h-10 w-10 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">No IMEIs found</div>
            <div className="text-xs text-slate-500 mt-1">Add stock serials to start tracking devices</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((imei: any) => (
              <div key={imei.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-slate-900">{imei.imei1}</span>
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
                      {imei.warrantyMonths ? <span>Warranty: {imei.warrantyMonths} months</span> : null}
                      {imei.warrantyExpiry ? (
                        <span>Expiry: {new Date(imei.warrantyExpiry).toLocaleDateString('en-PK')}</span>
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
