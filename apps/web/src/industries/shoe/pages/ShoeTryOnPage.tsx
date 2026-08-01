import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HandMetal, Plus, Search, X, RefreshCw, Phone, Package,
  Clock, CheckCircle2, XCircle, Calendar, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { shoeTryOnApi } from '../api/try-on.api';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-100', color: 'text-amber-700' },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-100', color: 'text-blue-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', color: 'text-slate-700' },
};

export default function ShoeTryOnPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState<any>(null);

  const { data: requests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['shoe-try-on', statusFilter],
    queryFn: () => shoeTryOnApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: summary } = useQuery({
    queryKey: ['shoe-try-on-summary'],
    queryFn: () => shoeTryOnApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter((r) => r.customerName.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.customerPhone.includes(q));
  }, [requests, search]);

  const cancel = useMutation({
    mutationFn: (id: string) => shoeTryOnApi.cancel(id),
    onSuccess: () => { toast.success('Request cancelled'); qc.invalidateQueries({ queryKey: ['shoe-try-on'] }); },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <RequestFormModal onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['shoe-try-on'] }); qc.invalidateQueries({ queryKey: ['shoe-try-on-summary'] }); }} />
      )}
      {completing && (
        <CompleteModal request={completing} onClose={() => setCompleting(null)}
          onCompleted={() => { setCompleting(null); qc.invalidateQueries({ queryKey: ['shoe-try-on'] }); qc.invalidateQueries({ queryKey: ['shoe-try-on-summary'] }); }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <HandMetal className="h-3.5 w-3.5 text-amber-300" /> Try-On Requests
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">🖐️ Try-On Requests</h1>
            <p className="mt-2 text-sm text-white/80">
              Customer bring size X in color Y — {summary?.pending ?? 0} pending • {summary?.conversion ?? 0} converted
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pending" value={summary.pending} icon={Clock} tone="amber" onClick={() => setStatusFilter('PENDING')} />
          <StatCard label="Scheduled" value={summary.scheduled} icon={Calendar} tone="blue" onClick={() => setStatusFilter('SCHEDULED')} />
          <StatCard label="Completed" value={summary.completed} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('COMPLETED')} />
          <StatCard label="Conversion" value={summary.conversion} icon={Package} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer, product, phone..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${statusFilter === v ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v]?.label || v}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <HandMetal className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No try-on requests</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Customer requests appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.PENDING;
            return (
              <div key={r.id} className="rounded-2xl bg-white border-2 border-slate-200 p-4 hover:shadow-md transition">
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                  <div className={`h-12 w-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <HandMetal className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm">{r.requestNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{r.productName}</div>
                    <div className="mt-1 text-xs text-slate-600 font-bold flex items-center gap-3 flex-wrap">
                      <span>👤 {r.customerName}</span>
                      <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" /> {r.customerPhone}</span>
                      {r.requestedSizes?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          Sizes: {r.requestedSizes.map((s: string) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">{s}</span>
                          ))}
                        </span>
                      )}
                      {r.colorPreference && <span>🎨 {r.colorPreference}</span>}
                    </div>
                  </div>
                  {r.status === 'PENDING' || r.status === 'SCHEDULED' ? (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setCompleting(r)}
                        className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </button>
                      <button onClick={() => cancel.mutate(r.id)}
                        className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestFormModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', productName: '',
    requestedSizes: '', colorPreference: '', notes: '',
  });

  const save = useMutation({
    mutationFn: () => shoeTryOnApi.create({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      productName: form.productName,
      requestedSizes: form.requestedSizes.split(',').map((s) => s.trim()).filter(Boolean),
      colorPreference: form.colorPreference || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Request created'); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🖐️ New Try-On Request</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="03XX XXXXXXX *"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Product name / description *"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.requestedSizes} onChange={(e) => setForm({ ...form, requestedSizes: e.target.value })} placeholder="Sizes: 8, 9, 10"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.colorPreference} onChange={(e) => setForm({ ...form, colorPreference: e.target.value })} placeholder="Colour"
              className="h-11 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.customerName.trim() || !form.customerPhone.trim() || !form.productName.trim()}>
            <Save className="h-4 w-4" /> Create Request
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompleteModal({ request, onClose, onCompleted }: any) {
  const [purchased, setPurchased] = useState(true);
  const [purchasedSize, setPurchasedSize] = useState('');

  const complete = useMutation({
    mutationFn: () => shoeTryOnApi.complete(request.id, { purchased, purchasedSize: purchasedSize || undefined }),
    onSuccess: () => { toast.success('Request completed'); onCompleted(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-green-700 text-white">
          <h3 className="font-extrabold text-xl">Complete Try-On</h3>
          <p className="text-sm font-bold text-white/85 mt-1">{request.productName}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase mb-2">Did customer purchase?</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPurchased(true)}
                className={`h-14 rounded-2xl border-2 font-extrabold ${purchased ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200'}`}>
                ✓ Yes, purchased
              </button>
              <button onClick={() => setPurchased(false)}
                className={`h-14 rounded-2xl border-2 font-extrabold ${!purchased ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200'}`}>
                ✗ No, didn't buy
              </button>
            </div>
          </div>
          {purchased && (
            <div>
              <label className="block text-xs font-extrabold uppercase mb-1.5">Which size was purchased?</label>
              <input value={purchasedSize} onChange={(e) => setPurchasedSize(e.target.value)} placeholder="e.g. 9"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => complete.mutate()} loading={complete.isPending}>
            <CheckCircle2 className="h-4 w-4" /> Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700', violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick} className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-emerald-300 hover:shadow-md transition' : ''}`}>
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
