import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, Search, X, RefreshCw, Calendar, AlertTriangle,
  CheckCircle2, XCircle, Clock, Save, Trash2, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cosmeticsBatchesApi, type CosmeticsBatch } from '../api/batches.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

type FilterMode = 'all' | 'active' | 'expiring30' | 'expiring90' | 'expired';

export default function CosmeticsBatchesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: batches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cosmetics-batches-list', filter],
    queryFn: () => {
      const params: any = {};
      if (filter === 'expired') params.expired = true;
      else if (filter === 'expiring30') params.expiringInDays = 30;
      else if (filter === 'expiring90') params.expiringInDays = 90;
      else if (filter === 'active') params.status = 'ACTIVE';
      return cosmeticsBatchesApi.list(params);
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ['cosmetics-batches-alerts'],
    queryFn: () => cosmeticsBatchesApi.expiryAlerts(),
    refetchInterval: 5 * 60_000,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-batches'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 } as any),
  });
  const products = (productsData as any)?.items ?? [];
  const productMap = useMemo(() => new Map(products.map((p: any) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return batches;
    return batches.filter((b) => {
      const p = productMap.get(b.productId);
      return b.batchNumber.toLowerCase().includes(q) ||
        ((p as any)?.name || '').toLowerCase().includes(q) ||
        (b.supplierRef || '').toLowerCase().includes(q);
    });
  }, [batches, search, productMap]);

  const markExpired = useMutation({
    mutationFn: () => cosmeticsBatchesApi.markExpired(),
    onSuccess: (r: any) => {
      toast.success(`${r?.count || 0} batches marked expired`);
      qc.invalidateQueries({ queryKey: ['cosmetics-batches-list'] });
      qc.invalidateQueries({ queryKey: ['cosmetics-batches-alerts'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => cosmeticsBatchesApi.remove(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      qc.invalidateQueries({ queryKey: ['cosmetics-batches-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <BatchFormModal products={products}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['cosmetics-batches-list'] });
            qc.invalidateQueries({ queryKey: ['cosmetics-batches-alerts'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Package className="h-3.5 w-3.5 text-amber-300" /> Batch & Expiry Tracking
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Batches</h1>
            <p className="mt-2 text-sm text-white/80">
              {alerts?.expired?.length ?? 0} expired • {alerts?.expiringSoon?.length ?? 0} expiring in 30 days
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => markExpired.mutate()} disabled={markExpired.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Zap className="h-4 w-4" /> Mark Expired
            </button>
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Batch
            </Button>
          </div>
        </div>
      </section>

      {alerts && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AlertKpi icon={XCircle} label="Expired" value={alerts.expired?.length ?? 0} tone="rose"
            onClick={() => setFilter('expired')} />
          <AlertKpi icon={AlertTriangle} label="Next 30 Days" value={alerts.expiringSoon?.length ?? 0} tone="amber"
            onClick={() => setFilter('expiring30')} />
          <AlertKpi icon={Clock} label="Next 90 Days" value={alerts.expiringLater?.length ?? 0} tone="orange"
            onClick={() => setFilter('expiring90')} />
          <AlertKpi icon={CheckCircle2} label="Active Batches" value={batches.filter((b) => b.status === 'ACTIVE').length} tone="emerald"
            onClick={() => setFilter('active')} />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Batch #, product, supplier ref..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {[
            { v: 'all' as FilterMode, l: 'All' },
            { v: 'active' as FilterMode, l: 'Active' },
            { v: 'expiring30' as FilterMode, l: '≤ 30 days' },
            { v: 'expiring90' as FilterMode, l: '≤ 90 days' },
            { v: 'expired' as FilterMode, l: 'Expired' },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                filter === f.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </section>

      {/* EXPIRY TIMELINE */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No batches found</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Add first batch to track expiry</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const product = productMap.get(b.productId);
            const now = new Date();
            const expDate = b.expiryDate ? new Date(b.expiryDate) : null;
            const isExpired = expDate && expDate < now;
            const days = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / 86400000) : null;
            const totalMonths = b.manufactureDate && expDate ?
              Math.ceil((expDate.getTime() - new Date(b.manufactureDate).getTime()) / (86400000 * 30)) : null;
            const remainingPct = expDate && b.manufactureDate ?
              Math.max(0, Math.min(100, ((expDate.getTime() - now.getTime()) / (expDate.getTime() - new Date(b.manufactureDate).getTime())) * 100))
              : null;

            return (
              <div key={b.id} className={`rounded-2xl bg-white border-2 shadow-sm p-4 ${
                isExpired ? 'border-rose-300' : days !== null && days <= 30 ? 'border-amber-300' : 'border-slate-200'}`}>
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isExpired ? 'bg-rose-100 text-rose-700' :
                    days !== null && days <= 30 ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'}`}>
                    <Package className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">{b.batchNumber}</span>
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
                          <XCircle className="h-2.5 w-2.5" /> EXPIRED
                        </span>
                      ) : days !== null && days <= 30 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                          {days} days left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">Active</span>
                      )}
                    </div>

                    <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{(product as any)?.name || 'Unknown product'}</div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
                      <span>Stock: <strong>{b.currentStock}/{b.quantity}</strong></span>
                      {b.manufactureDate && (
                        <span>Mfg: {new Date(b.manufactureDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                      {expDate && (
                        <span>Exp: <strong>{expDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      )}
                      {b.supplierRef && <span className="font-mono">Ref: {b.supplierRef}</span>}
                    </div>

                    {remainingPct !== null && !isExpired && totalMonths && (
                      <div className="mt-2">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            remainingPct > 50 ? 'bg-emerald-500' :
                            remainingPct > 25 ? 'bg-amber-500' :
                            'bg-rose-500'}`}
                            style={{ width: `${remainingPct}%` }} />
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                          {remainingPct.toFixed(0)}% of {totalMonths} month shelf life remaining
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    {b.costPrice ? (
                      <div>
                        <div className="text-[10px] uppercase font-extrabold text-slate-500">Cost/unit</div>
                        <div className="text-sm font-extrabold text-slate-900 tabular-nums">{formatPKR(b.costPrice)}</div>
                      </div>
                    ) : null}
                    <button onClick={() => { if (confirm(`Delete batch ${b.batchNumber}?`)) remove.mutate(b.id); }}
                      className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BatchFormModal({ products, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    productId: '',
    batchNumber: '',
    manufactureDate: '',
    expiryDate: '',
    quantity: 0,
    costPrice: '',
    supplierRef: '',
    notes: '',
  });

  const save = useMutation({
    mutationFn: () => cosmeticsBatchesApi.create({
      productId: form.productId,
      batchNumber: form.batchNumber,
      manufactureDate: form.manufactureDate || undefined,
      expiryDate: form.expiryDate || undefined,
      quantity: Number(form.quantity),
      costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
      supplierRef: form.supplierRef || undefined,
      notes: form.notes || undefined,
    } as any),
    onSuccess: () => {
      toast.success('Batch created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">📦 New Batch</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <Lbl>Product *</Lbl>
            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              <option value="">-- Select product --</option>
              {products.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Batch Number *</Lbl>
              <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                placeholder="B2026-001, LOT-A1234"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-extrabold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Quantity *</Lbl>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Manufacture Date</Lbl>
              <input type="date" value={form.manufactureDate}
                onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Expiry Date *</Lbl>
              <input type="date" value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Cost Price / Unit</Lbl>
              <input type="number" step="0.01" value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Supplier Ref</Lbl>
              <input value={form.supplierRef} onChange={(e) => setForm({ ...form, supplierRef: e.target.value })}
                placeholder="Invoice #"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.productId || !form.batchNumber.trim() || form.quantity <= 0}>
            <Save className="h-4 w-4" /> Save Batch
          </Button>
        </div>
      </div>
    </div>
  );
}

function AlertKpi({ icon: Icon, label, value, tone, onClick }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700',
    amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <button onClick={onClick}
      className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full hover:border-amber-300 hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
