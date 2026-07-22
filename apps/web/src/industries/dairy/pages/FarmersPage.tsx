import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  Phone, MapPin, DollarSign, Award, TrendingUp, Milk, Camera,
  Users, CreditCard, CheckCircle2,
} from 'lucide-react';
import { farmersApi, type DairyFarmer } from '../api/farmers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PAYMENT_CYCLES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'];

export default function FarmersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState<DairyFarmer | null>(null);
  const [editing, setEditing] = useState<DairyFarmer | null>(null);

  const { data: farmers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dairy-farmers', search, village],
    queryFn: () => farmersApi.list({
      search: search.trim() || undefined,
      village: village.trim() || undefined,
      active: true,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['dairy-farmers-summary'],
    queryFn: () => farmersApi.summary(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => farmersApi.remove(id),
    onSuccess: () => { toast.success('Farmer deactivated'); queryClient.invalidateQueries({ queryKey: ['dairy-farmers'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Milk Suppliers
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍🌾 Farmers</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Dodhi / gawala with rate + quality tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />New Farmer
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Farmers" value={summary.totalFarmers} icon={Users} color="emerald" sub={summary.activeFarmers + ' active'} />
          <StatCard label="Total Payable" value={formatPKR(summary.totalPayable)} icon={CreditCard} color="rose" />
          <StatCard label="Lifetime Supplied" value={(summary.lifetimeSupplied).toFixed(0) + 'L'} icon={Milk} color="cyan" />
          <StatCard label="Lifetime Paid" value={formatPKR(summary.lifetimePaid)} icon={CheckCircle2} color="amber" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 grid sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search farmer # / name / phone / CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
        <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village filter..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
      </section>

      {showForm && (
        <FarmerForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['dairy-farmers'] }); }}
        />
      )}

      {showPayment && (
        <PaymentModal
          farmer={showPayment}
          onClose={() => setShowPayment(null)}
          onDone={() => { setShowPayment(null); queryClient.invalidateQueries({ queryKey: ['dairy-farmers'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : farmers.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <User className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No farmers yet</p>
          <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" />Add First Farmer
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farmers.map((f) => (
            <FarmerCard
              key={f.id}
              farmer={f}
              onEdit={() => { setEditing(f); setShowForm(true); }}
              onPay={() => setShowPayment(f)}
              onDelete={() => { if (confirm('Deactivate ' + f.name + '?')) removeMutation.mutate(f.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
    cyan: 'from-cyan-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
          {sub && <div className="text-xs font-semibold text-slate-600 mt-1">{sub}</div>}
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function FarmerCard({ farmer, onEdit, onPay, onDelete }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3 hover:shadow-lg transition">
      <div className="flex items-start gap-3">
        {farmer.photoUrl ? (
          <img src={farmer.photoUrl} alt={farmer.name} className="h-14 w-14 rounded-2xl object-cover shrink-0 ring-2 ring-emerald-200" />
        ) : (
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center text-xl font-extrabold shadow shrink-0">
            {farmer.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white truncate">{farmer.name}</div>
          {farmer.fatherName && <div className="text-xs text-slate-500 font-bold">S/o {farmer.fatherName}</div>}
          <div className="mt-1 text-[10px] font-mono font-bold text-slate-500">{farmer.farmerNumber}</div>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        {farmer.phone && (
          <a href={'tel:' + farmer.phone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
            <Phone className="h-3 w-3" />{farmer.phone}
          </a>
        )}
        {farmer.village && (
          <div className="flex items-center gap-1 text-slate-600 font-bold">
            <MapPin className="h-3 w-3" />{farmer.village}{farmer.city ? ', ' + farmer.city : ''}
          </div>
        )}
      </div>

      {/* Cattle count */}
      <div className="flex gap-2 flex-wrap text-[10px] font-extrabold">
        {farmer.buffaloCount ? <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">🐃 {farmer.buffaloCount}</span> : null}
        {farmer.cowCount ? <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">🐄 {farmer.cowCount}</span> : null}
        {farmer.goatCount ? <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">🐐 {farmer.goatCount}</span> : null}
        {farmer.totalCapacityLiters ? <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">Cap: {farmer.totalCapacityLiters}L</span> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div>
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Rate/Liter</div>
          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(farmer.ratePerLiter)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase font-extrabold text-rose-700">Balance (Payable)</div>
          <div className="text-sm font-extrabold text-rose-700 tabular-nums">{formatPKR(farmer.currentBalance)}</div>
        </div>
      </div>

      {(farmer.avgFatContent || farmer.avgSnfContent) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {farmer.avgFatContent && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">
              <div className="text-[9px] uppercase font-extrabold text-amber-700">Avg Fat</div>
              <div className="font-extrabold text-amber-900">{farmer.avgFatContent.toFixed(2)}%</div>
            </div>
          )}
          {farmer.avgSnfContent && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
              <div className="text-[9px] uppercase font-extrabold text-blue-700">Avg SNF</div>
              <div className="font-extrabold text-blue-900">{farmer.avgSnfContent.toFixed(2)}%</div>
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] font-bold text-slate-500">
        Total supplied: <span className="text-slate-700">{farmer.totalSupplied.toFixed(0)}L</span> • Paid: <span className="text-emerald-700">{formatPKR(farmer.totalPaid)}</span>
      </div>

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
        {farmer.currentBalance > 0 && (
          <button onClick={onPay} className="flex-1 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
            <DollarSign className="h-3 w-3" />Pay
          </button>
        )}
        <button onClick={onEdit} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PaymentModal({ farmer, onClose, onDone }: any) {
  const [amount, setAmount] = useState(farmer.currentBalance);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => farmersApi.payment(farmer.id, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment recorded'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900">Pay Farmer</h3>
            <p className="text-xs text-slate-500 font-semibold">{farmer.name} • Balance: {formatPKR(farmer.currentBalance)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Number((farmer.currentBalance * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold hover:bg-slate-200">
                  {(f * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={
                  'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                  (method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white')
                }>{m}</button>
              ))}
            </div>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FarmerForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    fatherName: editing?.fatherName ?? '',
    cnic: editing?.cnic ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    village: editing?.village ?? '',
    city: editing?.city ?? '',
    cattleCount: editing?.cattleCount ?? '',
    buffaloCount: editing?.buffaloCount ?? '',
    cowCount: editing?.cowCount ?? '',
    goatCount: editing?.goatCount ?? '',
    totalCapacityLiters: editing?.totalCapacityLiters ?? '',
    ratePerLiter: editing?.ratePerLiter ?? 200,
    fatBonusRate: editing?.fatBonusRate ?? 0,
    paymentCycle: editing?.paymentCycle ?? 'WEEKLY',
    photoUrl: editing?.photoUrl ?? '',
    cnicFrontUrl: editing?.cnicFrontUrl ?? '',
    cnicBackUrl: editing?.cnicBackUrl ?? '',
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        cattleCount: form.cattleCount ? Number(form.cattleCount) : undefined,
        buffaloCount: form.buffaloCount ? Number(form.buffaloCount) : undefined,
        cowCount: form.cowCount ? Number(form.cowCount) : undefined,
        goatCount: form.goatCount ? Number(form.goatCount) : undefined,
        totalCapacityLiters: form.totalCapacityLiters ? Number(form.totalCapacityLiters) : undefined,
        ratePerLiter: Number(form.ratePerLiter),
        fatBonusRate: Number(form.fatBonusRate) || 0,
      };
      return editing ? farmersApi.update(editing.id, payload) : farmersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Farmer updated' : 'Farmer created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Farmer' : 'New Farmer'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Farmer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father's name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="Village" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        </div>
        <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">🐄 Cattle Info</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">🐃 Buffalo</label>
              <input type="number" value={form.buffaloCount} onChange={(e) => setForm({ ...form, buffaloCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5 block">🐄 Cows</label>
              <input type="number" value={form.cowCount} onChange={(e) => setForm({ ...form, cowCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-0.5 block">🐐 Goats</label>
              <input type="number" value={form.goatCount} onChange={(e) => setForm({ ...form, goatCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-0.5 block">Capacity/day</label>
              <input type="number" value={form.totalCapacityLiters} onChange={(e) => setForm({ ...form, totalCapacityLiters: e.target.value })} placeholder="Liters" className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">💰 Payment Terms</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Rate/Liter *</label>
              <input type="number" step="0.01" value={form.ratePerLiter} onChange={(e) => setForm({ ...form, ratePerLiter: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-0.5 block">Fat Bonus/L/%</label>
              <input type="number" step="0.01" value={form.fatBonusRate} onChange={(e) => setForm({ ...form, fatBonusRate: e.target.value })} placeholder="Rs per L per %" className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Cycle</label>
              <select value={form.paymentCycle} onChange={(e) => setForm({ ...form, paymentCycle: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                {PAYMENT_CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block items-center gap-1">
            <Camera className="h-3 w-3" />Photo
          </label>
          {form.photoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.ratePerLiter}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create Farmer'}
          </Button>
        </div>
      </div>
    </section>
  );
}
