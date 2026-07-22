import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, X, Save, RefreshCw, Sparkles, User, Milk, Sunrise, Sunset,
  CheckCircle2, Beaker, Award,
} from 'lucide-react';
import { farmerSuppliesApi } from '../api/farmer-supplies.api';
import { farmersApi } from '../api/farmers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const QUALITIES = ['A_GRADE', 'B_GRADE', 'C_GRADE', 'REJECTED'];

export default function FarmerSuppliesPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [farmerFilter, setFarmerFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['dairy-supplies-summary', dateFilter],
    queryFn: () => farmerSuppliesApi.dailySummary(dateFilter),
    refetchInterval: 30_000,
  });

  const { data: supplies = [], isLoading, refetch } = useQuery({
    queryKey: ['dairy-supplies', dateFilter, farmerFilter],
    queryFn: () => farmerSuppliesApi.list({
      from: dateFilter, to: dateFilter,
      farmerId: farmerFilter === 'all' ? undefined : farmerFilter,
    }),
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ['dairy-farmers-for-supply'],
    queryFn: () => farmersApi.list({ active: true }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => farmerSuppliesApi.markPaid(id),
    onSuccess: () => { toast.success('Marked as paid'); queryClient.invalidateQueries({ queryKey: ['dairy-supplies'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Farmer Supplies
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📦 Farmer Supplies</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Daily milk collection from farmers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className="h-4 w-4" />Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />Record Supply
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Supplies" value={summary.totalSupplies} icon={Package} color="amber" />
          <StatCard label="Total Liters" value={summary.totalLiters.toFixed(1) + 'L'} icon={Milk} color="cyan" />
          <StatCard label="Morning" value={summary.morningLiters.toFixed(1) + 'L'} icon={Sunrise} color="orange" />
          <StatCard label="Evening" value={summary.eveningLiters.toFixed(1) + 'L'} icon={Sunset} color="indigo" />
          <StatCard label="Amount" value={formatPKR(summary.totalAmount)} icon={CheckCircle2} color="emerald" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex gap-3 flex-wrap">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
          <option value="all">All Farmers</option>
          {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </section>

      {showForm && (
        <SupplyForm
          farmers={farmers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['dairy-supplies'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : supplies.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No supplies recorded</p>
        </div>
      ) : (
        <section className="grid gap-2">
          {supplies.map((s) => (
            <div key={s.id} className="rounded-xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold shrink-0">
                    {s.farmer?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">{s.farmer?.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{s.slot}</span>
                      {s.quality && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">{s.quality.replace('_', ' ')}</span>}
                      {s.isPaid && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">PAID</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 font-semibold">
                      {format(new Date(s.supplyDate), 'dd MMM HH:mm')}
                      {s.fatContent && ' • Fat: ' + s.fatContent + '%'}
                      {s.snfContent && ' • SNF: ' + s.snfContent + '%'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Qty</div>
                    <div className="text-lg font-extrabold text-cyan-700 tabular-nums">{s.quantity}L</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Rate</div>
                    <div className="text-sm font-extrabold tabular-nums">{formatPKR(s.ratePerLiter)}</div>
                  </div>
                  {s.fatBonus > 0 && (
                    <div className="text-center">
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Bonus</div>
                      <div className="text-sm font-extrabold text-amber-700 tabular-nums">{formatPKR(s.fatBonus)}</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Total</div>
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(s.totalAmount)}</div>
                  </div>
                  {!s.isPaid && (
                    <button onClick={() => markPaidMutation.mutate(s.id)} className="h-9 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', cyan: 'from-cyan-500 to-blue-600',
    orange: 'from-orange-500 to-red-600', indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow shrink-0'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SupplyForm({ farmers, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    farmerId: '',
    supplyDate: new Date().toISOString().slice(0, 16),
    slot: 'MORNING',
    quantity: 0,
    fatContent: '',
    snfContent: '',
    quality: '',
    ratePerLiter: '',
    otherAdjustment: 0,
    notes: '',
  });

  const selectedFarmer = farmers.find((f: any) => f.id === form.farmerId);

  const saveMutation = useMutation({
    mutationFn: () => farmerSuppliesApi.create({
      ...form,
      quantity: Number(form.quantity),
      fatContent: form.fatContent ? Number(form.fatContent) : undefined,
      snfContent: form.snfContent ? Number(form.snfContent) : undefined,
      quality: form.quality || undefined,
      ratePerLiter: form.ratePerLiter ? Number(form.ratePerLiter) : undefined,
      otherAdjustment: Number(form.otherAdjustment) || 0,
    }),
    onSuccess: () => { toast.success('Supply recorded'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
        <h3 className="font-extrabold">Record Farmer Supply</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Farmer *</label>
          <select autoFocus value={form.farmerId} onChange={(e) => {
            const f = farmers.find((x: any) => x.id === e.target.value);
            setForm({ ...form, farmerId: e.target.value, ratePerLiter: f?.ratePerLiter || '' });
          }} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            <option value="">-- Select farmer --</option>
            {farmers.map((f: any) => <option key={f.id} value={f.id}>{f.name} (Rate: {formatPKR(f.ratePerLiter)})</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date/Time *</label>
            <input type="datetime-local" value={form.supplyDate} onChange={(e) => setForm({ ...form, supplyDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Slot</label>
            <select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-1 block">Quantity (Liters) *</label>
          <input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="h-14 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Fat %</label>
            <input type="number" step="0.1" value={form.fatContent} onChange={(e) => setForm({ ...form, fatContent: e.target.value })} placeholder="6.0" className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">SNF %</label>
            <input type="number" step="0.1" value={form.snfContent} onChange={(e) => setForm({ ...form, snfContent: e.target.value })} placeholder="8.5" className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Quality</label>
            <select value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="">-- Auto --</option>
              {QUALITIES.map((q) => <option key={q} value={q}>{q.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Rate/Liter (override)</label>
            <input type="number" step="0.01" value={form.ratePerLiter} onChange={(e) => setForm({ ...form, ratePerLiter: e.target.value })} placeholder={selectedFarmer?.ratePerLiter} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Adjustment</label>
            <input type="number" step="0.01" value={form.otherAdjustment} onChange={(e) => setForm({ ...form, otherAdjustment: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.farmerId || !form.quantity}>
            <Save className="h-4 w-4" />Record Supply
          </Button>
        </div>
      </div>
    </section>
  );
}
