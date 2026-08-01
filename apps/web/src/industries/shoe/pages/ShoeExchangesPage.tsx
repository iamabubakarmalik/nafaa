import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, Plus, Search, X, Phone, Package, ArrowRight,
  Clock, CheckCircle2, XCircle, Save, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { shoeExchangesApi } from '../api/exchanges.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  REQUESTED: { label: 'Requested', bg: 'bg-amber-100', color: 'text-amber-700' },
  APPROVED: { label: 'Approved', bg: 'bg-blue-100', color: 'text-blue-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-100', color: 'text-rose-700' },
};

const REASON_CATEGORIES = ['Size Too Small', 'Size Too Large', 'Wrong Colour', 'Damaged', 'Not as Described', 'Other'];

export default function ShoeExchangesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const { data: exchanges = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shoe-exchanges', statusFilter],
    queryFn: () => shoeExchangesApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: summary } = useQuery({
    queryKey: ['shoe-exchanges-summary'],
    queryFn: () => shoeExchangesApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return exchanges;
    return exchanges.filter((e) => e.customerName.toLowerCase().includes(q) || e.productName.toLowerCase().includes(q) || e.customerPhone.includes(q));
  }, [exchanges, search]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => shoeExchangesApi.updateStatus(id, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['shoe-exchanges'] }); qc.invalidateQueries({ queryKey: ['shoe-exchanges-summary'] }); },
  });

  return (
    <div className="space-y-5">
      {showForm && <ExchangeFormModal onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['shoe-exchanges'] }); qc.invalidateQueries({ queryKey: ['shoe-exchanges-summary'] }); }} />}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <RefreshCw className="h-3.5 w-3.5 text-amber-300" /> Size / Colour Exchanges
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">🔄 Exchanges</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.requested ?? 0} pending • {summary?.completed ?? 0} completed
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Exchange
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Requested" value={summary.requested} icon={Clock} tone="amber" onClick={() => setStatusFilter('REQUESTED')} />
          <StatCard label="Approved" value={summary.approved} icon={CheckCircle2} tone="blue" onClick={() => setStatusFilter('APPROVED')} />
          <StatCard label="Completed" value={summary.completed} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('COMPLETED')} />
          <StatCard label="Rejected" value={summary.rejected} icon={XCircle} tone="rose" onClick={() => setStatusFilter('REJECTED')} />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer, product, phone..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${statusFilter === v ? 'bg-rose-600 text-white' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v]?.label || v}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <RefreshCw className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No exchanges</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Customer size/colour swaps appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const meta = STATUS_META[e.status] || STATUS_META.REQUESTED;
            return (
              <div key={e.id} className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  <div className={`h-12 w-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <RefreshCw className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm">{e.exchangeNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {e.reasonCategory && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold">{e.reasonCategory}</span>}
                    </div>
                    <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{e.productName}</div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-800 font-extrabold">
                        {e.originalSize}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold">
                        {e.newSize}
                      </span>
                      {e.colorChanged && (
                        <span className="text-xs font-bold text-slate-600">
                          Color: {e.originalColor} → {e.newColor}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-600 font-bold flex items-center gap-3 flex-wrap">
                      <span>👤 {e.customerName}</span>
                      <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" /> {e.customerPhone}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-semibold italic line-clamp-1">"{e.reason}"</div>
                  </div>
                  <div className="text-right shrink-0">
                    {(e.priceDifference !== 0 || e.refundIssued > 0 || e.additionalCharged > 0) && (
                      <div>
                        <div className="text-[10px] uppercase font-extrabold text-slate-500">Difference</div>
                        <div className={`text-sm font-extrabold tabular-nums ${e.priceDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatPKR(Math.abs(e.priceDifference))}
                        </div>
                      </div>
                    )}
                    {e.status === 'REQUESTED' && (
                      <div className="mt-2 flex gap-1">
                        <button onClick={() => updateStatus.mutate({ id: e.id, status: 'APPROVED' })}
                          className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold">
                          Approve
                        </button>
                        <button onClick={() => updateStatus.mutate({ id: e.id, status: 'REJECTED' })}
                          className="h-8 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold">
                          Reject
                        </button>
                      </div>
                    )}
                    {e.status === 'APPROVED' && (
                      <button onClick={() => updateStatus.mutate({ id: e.id, status: 'COMPLETED' })}
                        className="mt-2 h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold">
                        Complete
                      </button>
                    )}
                  </div>
                </div>
                {e.photoUrls?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-slate-400" />
                    <div className="flex gap-1">
                      {e.photoUrls.slice(0, 4).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                          <img src={url} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExchangeFormModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', productName: '',
    originalSize: '', newSize: '', reason: '', reasonCategory: '',
    priceDifference: 0, photoUrls: [] as string[],
  });

  const save = useMutation({
    mutationFn: () => shoeExchangesApi.create(form),
    onSuccess: () => { toast.success('Exchange created'); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🔄 New Exchange</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold" />
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold" />
          </div>
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Product name *"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase mb-1">Original Size *</label>
              <input value={form.originalSize} onChange={(e) => setForm({ ...form, originalSize: e.target.value })} placeholder="e.g. 9"
                className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 px-3 text-sm font-extrabold" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase mb-1">New Size *</label>
              <input value={form.newSize} onChange={(e) => setForm({ ...form, newSize: e.target.value })} placeholder="e.g. 10"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase mb-1">Reason Category</label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_CATEGORIES.map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, reasonCategory: r })}
                  className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${form.reasonCategory === r ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason details *"
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold" />
          <div>
            <label className="block text-xs font-extrabold uppercase mb-1">Photos (evidence)</label>
            <UploadDropzone purpose="exchange-photo" maxFiles={4}
              onUploaded={(recs: any[]) => setForm({ ...form, photoUrls: [...form.photoUrls, ...recs.map((r) => r.url)] })} />
          </div>
        </div>
        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.customerName.trim() || !form.originalSize.trim() || !form.newSize.trim() || !form.reason.trim()}>
            <Save className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-teal-700', rose: 'from-rose-500 to-red-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-rose-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}
