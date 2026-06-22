import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Layers, AlertTriangle, Sliders, Trash2,
  Ruler, Package, MapPin, Eye, Scissors, MoreVertical, X,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import {
  carpetRollsApi,
  type CarpetRollsListParams,
  type CarpetRollStatus,
} from '../api/carpet-rolls.api';
import { productsApi } from '@/api/products.api';
import { AddRollModal } from '../components/AddRollModal';

const statusColors: Record<CarpetRollStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  FINISHED: 'bg-slate-100 text-slate-700 border-slate-300',
  DAMAGED: 'bg-rose-100 text-rose-700 border-rose-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  TRANSFERRED: 'bg-blue-100 text-blue-700 border-blue-300',
};

export default function CarpetRollsPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CarpetRollsListParams>({
    page: 1,
    limit: 24,
    inStockOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data } = useQuery({
    queryKey: ['carpet-rolls', params],
    queryFn: () => carpetRollsApi.list(params),
  });

  const { data: summary = [] } = useQuery({
    queryKey: ['carpet-rolls-summary'],
    queryFn: () => carpetRollsApi.summary(),
  });

  const { data: lowRemaining = [] } = useQuery({
    queryKey: ['carpet-rolls-low'],
    queryFn: () => carpetRollsApi.lowRemaining(10),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 200, isActive: true }],
    queryFn: () => productsApi.list({ limit: 200, isActive: true }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => carpetRollsApi.remove(id),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Removed');
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to delete'),
  });

  const items = data?.items ?? [];
  const totalActiveSqft = summary.reduce((acc, s) => acc + Number(s.totalSqft), 0);
  const totalRolls = summary.reduce((acc, s) => acc + s.rollCount, 0);

  return (
    <div className="space-y-6">
      {showAddModal && (
        <AddRollModal
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-emerald-800 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Layers className="h-3.5 w-3.5" /> Carpet Inventory
            </div>
            <h2 className="mt-3 text-3xl font-bold">Carpet Rolls</h2>
            <p className="mt-2 text-sm text-white/80">
              Roll-based stock management — har roll alag track hota hai
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/carpet-cut-pieces">
              <Button variant="secondary">
                <Scissors className="h-4 w-4" /> Cut Pieces
              </Button>
            </Link>
            <Link to="/carpet-bulk-import">
              <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Bulk Import
              </Button>
            </Link>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-slate-900 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" /> Add New Roll
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Active Rolls
            </div>
            <div className="text-2xl font-extrabold mt-1">{totalRolls}</div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Total Sqft
            </div>
            <div className="text-2xl font-extrabold mt-1">
              {totalActiveSqft.toFixed(0)}
            </div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
              Unique Designs
            </div>
            <div className="text-2xl font-extrabold mt-1">{summary.length}</div>
          </div>
          <div className="rounded-xl bg-amber-500/30 border border-amber-300/40 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-100 font-bold">
              Low Remaining
            </div>
            <div className="text-2xl font-extrabold mt-1">{lowRemaining.length}</div>
          </div>
        </div>
      </section>

      {/* Variant summary card */}
      {summary.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">
              Variant Summary <span className="text-slate-500 text-sm">({summary.length})</span>
            </h3>
            <div className="text-xs text-slate-500">
              Group by Product → Variant
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.slice(0, 12).map((s) => (
              <div
                key={`${s.productId}:${s.variantId ?? 'none'}`}
                className="rounded-xl border border-slate-200 p-3 hover:border-emerald-400 transition cursor-pointer"
                onClick={() =>
                  setParams({
                    ...params,
                    productId: s.productId,
                    variantId: s.variantId ?? undefined,
                    page: 1,
                  })
                }
              >
                <div className="text-xs font-bold text-slate-900 line-clamp-1">
                  {s.productName}
                </div>
                {s.variantName && (
                  <div className="text-[11px] text-violet-700 font-bold mt-0.5">
                    {s.variantName}
                    {s.variantColor ? ` • ${s.variantColor}` : ''}
                  </div>
                )}
                <div className="mt-2 flex items-baseline gap-1">
                  <div className="text-lg font-extrabold text-emerald-700">
                    {s.totalSqft.toFixed(0)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700">sqft</div>
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {s.rollCount} roll{s.rollCount !== 1 ? 's' : ''} •{' '}
                  {s.totalLengthFt.toFixed(0)}ft
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            placeholder="Search by roll number, design code, product name…"
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          <Sliders className="h-4 w-4" /> Filters
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Product</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={params.productId ?? ''}
                onChange={(e) =>
                  setParams({ ...params, productId: e.target.value || undefined, page: 1 })
                }
              >
                <option value="">All products</option>
                {(productsData?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={params.status ?? ''}
                onChange={(e) =>
                  setParams({ ...params, status: (e.target.value || undefined) as any, page: 1 })
                }
              >
                <option value="">All status</option>
                <option value="ACTIVE">Active (in stock)</option>
                <option value="FINISHED">Finished</option>
                <option value="DAMAGED">Damaged</option>
                <option value="RESERVED">Reserved</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.inStockOnly ?? false}
                  onChange={(e) =>
                    setParams({ ...params, inStockOnly: e.target.checked, page: 1 })
                  }
                  className="h-4 w-4 rounded"
                />
                Sirf available stock
              </label>
            </div>
          </div>
          <button
            onClick={() => setParams({ page: 1, limit: 24, inStockOnly: false })}
            className="text-sm text-rose-600 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Low remaining alert */}
      {lowRemaining.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <div className="font-bold text-amber-900 text-sm">
              {lowRemaining.length} roll{lowRemaining.length !== 1 ? 's' : ''} mein 10ft se kam bacha
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowRemaining.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                to={`/carpet-rolls/${r.id}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                {r.rollNumber}
                <span className="text-amber-600">• {r.remainingLengthFt.toFixed(1)}ft</span>
              </Link>
            ))}
            {lowRemaining.length > 6 && (
              <span className="text-xs font-bold text-amber-700">
                +{lowRemaining.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rolls grid */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
          <Layers className="h-16 w-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">Koi roll nahi mila</h3>
          <p className="text-sm text-slate-500 mt-1">
            Shop ka stock add karne ke liye "Add New Roll" button dabayein
          </p>
          <Button className="mt-5" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Pehla Roll
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((roll) => {
            const fullWidth =
              Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
            const percentRemaining =
              roll.originalLengthFt > 0
                ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
                : 0;

            return (
              <div
                key={roll.id}
                className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-xl transition-all"
              >
                {/* Top accent */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between">
                  <div className="font-mono text-white font-extrabold text-sm">
                    {roll.rollNumber}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${statusColors[roll.status]}`}
                  >
                    {roll.status}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <div className="font-bold text-slate-900 line-clamp-1">
                      {roll.product?.name ?? 'Unknown product'}
                    </div>
                    {roll.variant && (
                      <div className="text-xs font-bold text-violet-700 flex items-center gap-1">
                        {roll.variant.colorHex && (
                          <span
                            className="h-2.5 w-2.5 rounded-full inline-block"
                            style={{ backgroundColor: roll.variant.colorHex }}
                          />
                        )}
                        {roll.variant.name}
                      </div>
                    )}
                    {roll.designCode && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {roll.designCode}
                      </div>
                    )}
                  </div>

                  {/* Dimensions */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-700 flex items-center gap-1">
                        <Ruler className="h-3 w-3" /> Dimensions
                      </div>
                      <div className="font-extrabold text-slate-900">
                        {fullWidth.toFixed(2)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1">
                      <div className="text-xl font-extrabold text-emerald-700">
                        {Number(roll.remainingSqft).toFixed(1)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700">sqft remaining</div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          percentRemaining > 50
                            ? 'bg-emerald-500'
                            : percentRemaining > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(percentRemaining, 3)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">
                      Original: {Number(roll.originalLengthFt).toFixed(1)}ft •{' '}
                      {percentRemaining.toFixed(0)}% bacha
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Sale</div>
                      <div className="font-bold text-emerald-700">
                        {formatPKRFull(roll.salePricePerSqft)}/sqft
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500 font-bold">Cost</div>
                      <div className="font-bold text-slate-700">
                        {formatPKRFull(roll.costPerSqft)}/sqft
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {(roll.rackNumber || roll.shop) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 font-bold">
                      <MapPin className="h-3 w-3" />
                      {roll.shop?.name}
                      {roll.shop && roll.rackNumber && ' • '}
                      {roll.rackNumber}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <Link
                      to={`/carpet-rolls/${roll.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      <Eye className="h-3 w-3" /> View
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete roll ${roll.rollNumber}?`)) {
                          removeMutation.mutate(roll.id);
                        }
                      }}
                      className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
