import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Repeat, Plus, Search, X, Calendar, Phone, DollarSign, MapPin,
  RefreshCw, Save, Edit3, Trash2, CheckCircle2, Play, Pause,
  XCircle, Truck, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { floristSubscriptionsApi, type FloristSubscription } from '../api/subscriptions.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<string, { l: string; cls: string; icon: any }> = {
  ACTIVE: { l: 'Active', cls: 'bg-emerald-100 text-emerald-700', icon: Play },
  PAUSED: { l: 'Paused', cls: 'bg-amber-100 text-amber-700', icon: Pause },
  CANCELLED: { l: 'Cancelled', cls: 'bg-rose-100 text-rose-700', icon: XCircle },
  COMPLETED: { l: 'Completed', cls: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
};

const FREQUENCIES = [
  { v: 'DAILY', l: 'Daily', desc: 'Every day' },
  { v: 'WEEKLY', l: 'Weekly', desc: 'Once per week' },
  { v: 'BIWEEKLY', l: 'Bi-weekly', desc: 'Every 2 weeks' },
  { v: 'MONTHLY', l: 'Monthly', desc: 'Once per month' },
];

const BOUQUET_TYPES = [
  'Small Fresh Bouquet', 'Medium Fresh Bouquet', 'Premium Bouquet',
  'Seasonal Special', 'Roses Only', 'Mixed Colours', 'Corporate Arrangement',
  'Table Centrepiece', 'Custom Selection',
];

export default function FloristSubscriptionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FloristSubscription | null>(null);

  const { data: subs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['florist-subs-list', statusFilter],
    queryFn: () => floristSubscriptionsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['florist-subs-summary'],
    queryFn: () => floristSubscriptionsApi.summary(),
    refetchInterval: 60_000,
  });

  const { data: dueToday = [] } = useQuery({
    queryKey: ['florist-subs-due-today'],
    queryFn: () => floristSubscriptionsApi.dueToday(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return subs;
    return subs.filter((s) =>
      s.subscriptionNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.customerPhone.includes(q) ||
      s.planName.toLowerCase().includes(q)
    );
  }, [subs, search]);

  const markDelivered = useMutation({
    mutationFn: (id: string) => floristSubscriptionsApi.markDelivered(id),
    onSuccess: () => {
      toast.success('Delivery recorded, next date scheduled');
      qc.invalidateQueries({ queryKey: ['florist-subs-list'] });
      qc.invalidateQueries({ queryKey: ['florist-subs-due-today'] });
    },
  });
  const pause = useMutation({
    mutationFn: (id: string) => floristSubscriptionsApi.pause(id),
    onSuccess: () => { toast.success('Paused'); qc.invalidateQueries({ queryKey: ['florist-subs-list'] }); },
  });
  const resume = useMutation({
    mutationFn: (id: string) => floristSubscriptionsApi.resume(id),
    onSuccess: () => { toast.success('Resumed'); qc.invalidateQueries({ queryKey: ['florist-subs-list'] }); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => floristSubscriptionsApi.cancel(id),
    onSuccess: () => { toast.success('Cancelled'); qc.invalidateQueries({ queryKey: ['florist-subs-list'] }); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => floristSubscriptionsApi.remove(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['florist-subs-list'] }); },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <SubForm editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false); setEditing(null);
            qc.invalidateQueries({ queryKey: ['florist-subs-list'] });
            qc.invalidateQueries({ queryKey: ['florist-subs-summary'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Repeat className="h-3.5 w-3.5 text-amber-300" /> Recurring Subscriptions
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔄 Subscriptions</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.active ?? 0} active • {dueToday.length} due today
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Subscription
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active" value={summary?.active ?? 0} icon={Play} tone="emerald" onClick={() => setStatusFilter('ACTIVE')} />
        <StatCard label="Paused" value={summary?.paused ?? 0} icon={Pause} tone="amber" onClick={() => setStatusFilter('PAUSED')} />
        <StatCard label="Cancelled" value={summary?.cancelled ?? 0} icon={XCircle} tone="rose" onClick={() => setStatusFilter('CANCELLED')} />
        <StatCard label="Due Today" value={dueToday.length} icon={Truck} tone="violet" />
      </section>

      {dueToday.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-violet-700" />
            <h3 className="font-extrabold text-violet-900">🔔 Due for delivery today</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dueToday.map((s) => (
              <div key={s.id} className="rounded-xl bg-white border-2 border-violet-200 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate">{s.customerName}</div>
                  <div className="text-[10px] font-bold text-slate-500 truncate">{s.bouquetType}</div>
                </div>
                <button onClick={() => markDelivered.mutate(s.id)}
                  className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shrink-0">
                  ✓ Deliver
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Subscription #, customer, plan..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', ...Object.keys(STATUS_META)].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v]?.l || v}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Repeat className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No subscriptions yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Set up weekly/monthly recurring bouquet deliveries</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Create First Subscription
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <SubCard key={s.id} sub={s}
              onEdit={() => { setEditing(s); setShowForm(true); }}
              onDelivered={() => markDelivered.mutate(s.id)}
              onPause={() => pause.mutate(s.id)}
              onResume={() => resume.mutate(s.id)}
              onCancel={() => { if (confirm('Cancel this subscription?')) cancel.mutate(s.id); }}
              onDelete={() => { if (confirm('Delete permanently?')) remove.mutate(s.id); }} />
          ))}
        </section>
      )}
    </div>
  );
}

function SubCard({ sub: s, onEdit, onDelivered, onPause, onResume, onCancel, onDelete }: any) {
  const meta = STATUS_META[s.status] || STATUS_META.ACTIVE;
  const StatusIcon = meta.icon;
  const daysToNext = Math.ceil((new Date(s.nextDeliveryDate).getTime() - Date.now()) / 86400000);

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-lg transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono font-extrabold text-slate-900 text-xs">{s.subscriptionNumber}</span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.cls}`}>
          <StatusIcon className="h-2.5 w-2.5" /> {meta.l}
        </span>
      </div>

      <h3 className="font-extrabold text-slate-900 text-sm">{s.customerName}</h3>
      <div className="text-xs font-bold text-slate-500 inline-flex items-center gap-1 mt-0.5">
        <Phone className="h-3 w-3" /> {s.customerPhone}
      </div>
      <div className="text-[11px] font-semibold text-slate-500 mt-1 truncate flex items-start gap-1">
        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="line-clamp-2">{s.deliveryAddress}</span>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100">
        <div className="text-[10px] uppercase font-extrabold text-violet-700">Plan</div>
        <div className="font-extrabold text-slate-900 text-sm">{s.planName}</div>
        <div className="text-[10px] font-bold text-slate-500">{s.bouquetType}</div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-violet-700">Frequency</div>
          <div className="text-sm font-extrabold text-violet-900">{s.frequency}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Per Delivery</div>
          <div className="text-sm font-extrabold text-emerald-900 tabular-nums">{formatPKR(s.pricePerDelivery)}</div>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Next Delivery</div>
          <div className="text-xs font-extrabold text-slate-900">
            {new Date(s.nextDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-extrabold ${
          daysToNext < 0 ? 'bg-rose-500 text-white'
            : daysToNext === 0 ? 'bg-amber-500 text-white animate-pulse'
              : daysToNext <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
          {daysToNext < 0 ? `Overdue ${Math.abs(daysToNext)}d` : daysToNext === 0 ? 'Today' : `${daysToNext}d`}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span><Clock className="h-2.5 w-2.5 inline mr-0.5" /> Started {new Date(s.startDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
        <span>{s.completedDeliveries} delivered</span>
      </div>

      <div className="mt-3 flex gap-1.5 pt-2 border-t border-slate-100">
        {s.status === 'ACTIVE' && (
          <>
            <button onClick={onDelivered}
              className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
            </button>
            <button onClick={onPause}
              className="h-9 w-9 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center">
              <Pause className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {s.status === 'PAUSED' && (
          <button onClick={onResume}
            className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
        )}
        {s.status !== 'CANCELLED' && (
          <button onClick={onCancel}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onEdit}
          className="h-9 w-9 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete}
          className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SubForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    customerName: editing?.customerName ?? '',
    customerPhone: editing?.customerPhone ?? '',
    deliveryAddress: editing?.deliveryAddress ?? '',
    planName: editing?.planName ?? '',
    frequency: editing?.frequency ?? 'WEEKLY',
    bouquetType: editing?.bouquetType ?? '',
    pricePerDelivery: editing?.pricePerDelivery ?? 1500,
    startDate: editing?.startDate ? editing.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    endDate: editing?.endDate ? editing.endDate.slice(0, 10) : '',
    notes: editing?.notes ?? '',
  });

  const save = useMutation({
    mutationFn: () => floristSubscriptionsApi.create(form as any),
    onSuccess: () => { toast.success('Subscription created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit' : '🔄 New Subscription'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <Lbl>Customer Name *</Lbl>
            <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Phone *</Lbl>
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="03XX XXXXXXX"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Delivery Address *</Lbl>
            <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
              placeholder="Full address..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <Lbl>Plan Name *</Lbl>
            <input value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })}
              placeholder="Corporate Weekly, Home Delivery..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>

          <div>
            <Lbl>Frequency</Lbl>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => {
                const a = form.frequency === f.v;
                return (
                  <button key={f.v} type="button" onClick={() => setForm({ ...form, frequency: f.v })}
                    className={`p-2.5 rounded-xl border-2 transition text-center ${
                      a ? 'border-violet-500 bg-violet-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'}`}>
                    <div className="font-extrabold text-sm">{f.l}</div>
                    <div className={`text-[10px] font-semibold ${a ? 'text-white/85' : 'text-slate-500'}`}>{f.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Bouquet Type *</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {BOUQUET_TYPES.map((b) => {
                const a = form.bouquetType === b;
                return (
                  <button key={b} type="button" onClick={() => setForm({ ...form, bouquetType: b })}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition ${
                      a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`}>
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Price per Delivery *</Lbl>
            <input type="number" value={form.pricePerDelivery}
              onChange={(e) => setForm({ ...form, pricePerDelivery: Number(e.target.value) })}
              className="h-12 w-full rounded-xl border-2 border-emerald-400 bg-emerald-50 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-600" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Start Date *</Lbl>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>End Date <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferences, allergies, special requests..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.customerName.trim() || !form.customerPhone.trim() || !form.deliveryAddress.trim() ||
              !form.planName.trim() || !form.bouquetType || form.pricePerDelivery <= 0 || !form.startDate}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700', amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-700', violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
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

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
