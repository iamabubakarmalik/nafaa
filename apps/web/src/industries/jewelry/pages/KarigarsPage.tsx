import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, Sparkles,
  User, Phone, DollarSign, Scale, Star, Award, ArrowUp, ArrowDown,
} from 'lucide-react';
import { karigarsApi, type Karigar } from '../api/karigars.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

const SKILL_LEVELS = ['Apprentice', 'Junior', 'Skilled', 'Expert', 'Master'];
const SPECIALIZATIONS = ['Kundan', 'Polki', 'Meenakari', 'Jadau', 'Filigree', 'Diamond Setting', 'Stone Setting', 'Engraving', 'Polishing', 'Casting', 'Wax Modeling'];

export default function KarigarsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Karigar | null>(null);
  const [issuingMetal, setIssuingMetal] = useState<Karigar | null>(null);
  const [receivingMetal, setReceivingMetal] = useState<Karigar | null>(null);

  const { data: karigars = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-karigars', search],
    queryFn: () => karigarsApi.list({ isActive: true, search: search.trim() || undefined }),
  });

  const { data: summary } = useQuery({
    queryKey: ['karigars-summary'],
    queryFn: () => karigarsApi.summary(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => karigarsApi.remove(id),
    onSuccess: () => { toast.success('Karigar deactivated'); queryClient.invalidateQueries({ queryKey: ['jewelry-karigars'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Craftsmen
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧑‍🎨 Karigars</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Metal tracking, earnings, specializations</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Karigar
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Karigars" value={summary.total} icon={Users} color="blue" />
          <StatCard label="In-House" value={summary.inHouse} icon={User} color="cyan" />
          <StatCard label="Metal Outstanding" value={(summary.totalOutstanding?.outstandingGrams ?? 0).toFixed(2) + 'g'} icon={Scale} color="amber" />
          <StatCard label="Total Paid" value={formatPKR(summary.totalOutstanding?.totalEarnings ?? 0)} icon={DollarSign} color="emerald" />
        </section>
      )}

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search karigars..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
      </div>

      {showForm && (
        <KarigarForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['jewelry-karigars'] }); queryClient.invalidateQueries({ queryKey: ['karigars-summary'] }); }}
        />
      )}

      {issuingMetal && (
        <MetalTransferModal
          karigar={issuingMetal}
          direction="issue"
          onClose={() => setIssuingMetal(null)}
          onDone={() => { setIssuingMetal(null); queryClient.invalidateQueries({ queryKey: ['jewelry-karigars'] }); }}
        />
      )}
      {receivingMetal && (
        <MetalTransferModal
          karigar={receivingMetal}
          direction="receive"
          onClose={() => setReceivingMetal(null)}
          onDone={() => { setReceivingMetal(null); queryClient.invalidateQueries({ queryKey: ['jewelry-karigars'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : karigars.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No karigars yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {karigars.map((k) => (
            <div key={k.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-start gap-3">
                {k.photoUrl ? (
                  <img src={k.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-xl font-extrabold shrink-0">
                    {k.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold truncate">{k.fullName}</span>
                    {k.isInHouse && <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">IN-HOUSE</span>}
                    {k.skillLevel && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">{k.skillLevel}</span>}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500">{k.karigarNumber}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 font-bold"><Phone className="h-3 w-3" />{k.phone}</div>
                  {k.yearsExperience && <div className="text-[10px] font-bold text-slate-500">{k.yearsExperience} yrs experience</div>}
                </div>
              </div>

              {k.specializations?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {k.specializations.slice(0, 3).map((s: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase">{s}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1 text-xs">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                  <div className="text-[9px] uppercase font-extrabold text-amber-700">Issued</div>
                  <div className="font-extrabold text-amber-800 tabular-nums text-[10px]">{k.metalIssuedGrams.toFixed(1)}g</div>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700">Returned</div>
                  <div className="font-extrabold text-emerald-800 tabular-nums text-[10px]">{k.metalReturnedGrams.toFixed(1)}g</div>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2 text-center">
                  <div className="text-[9px] uppercase font-extrabold text-rose-700">Outstanding</div>
                  <div className="font-extrabold text-rose-800 tabular-nums text-[10px]">{k.outstandingGrams.toFixed(1)}g</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-neutral-800">
                <div><span className="text-slate-500 font-semibold">Orders:</span> <span className="font-extrabold">{k.completedOrders}/{k.totalOrders}</span></div>
                <div><span className="text-slate-500 font-semibold">Earnings:</span> <span className="font-extrabold text-emerald-700">{formatPKR(k.totalEarnings)}</span></div>
              </div>

              {k.qualityRating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={'h-3 w-3 ' + (n <= (k.qualityRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                  ))}
                  <span className="text-xs font-extrabold text-amber-700 ml-1">{k.qualityRating.toFixed(1)}</span>
                </div>
              )}

              <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <button onClick={() => setIssuingMetal(k)} className="flex-1 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 text-amber-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  Issue
                </button>
                <button onClick={() => setReceivingMetal(k)} className="flex-1 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  Receive
                </button>
                <button onClick={() => { setEditing(k); setShowForm(true); }} className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm('Deactivate ' + k.fullName + '?')) removeMutation.mutate(k.id); }} className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
    blue: 'from-blue-500 to-cyan-600', cyan: 'from-cyan-500 to-teal-600',
    amber: 'from-amber-500 to-yellow-600', emerald: 'from-emerald-500 to-green-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-10 w-10 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow'}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function KarigarForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    fullName: editing?.fullName ?? '',
    fatherName: editing?.fatherName ?? '',
    cnic: editing?.cnic ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    photoUrl: editing?.photoUrl ?? '',
    specializations: editing?.specializations ?? [],
    yearsExperience: editing?.yearsExperience ?? '',
    skillLevel: editing?.skillLevel ?? '',
    hourlyRate: editing?.hourlyRate ?? '',
    perGramRate: editing?.perGramRate ?? '',
    fixedRatePerPiece: editing?.fixedRatePerPiece ?? '',
    isInHouse: editing?.isInHouse ?? true,
    notes: editing?.notes ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        perGramRate: form.perGramRate ? Number(form.perGramRate) : undefined,
        fixedRatePerPiece: form.fixedRatePerPiece ? Number(form.fixedRatePerPiece) : undefined,
      };
      return editing ? karigarsApi.update(editing.id, payload) : karigarsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Karigar updated' : 'Karigar added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleSpec = (spec: string) => {
    setForm({
      ...form,
      specializations: form.specializations.includes(spec)
        ? form.specializations.filter((s: string) => s !== spec)
        : [...form.specializations, spec],
    });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-300 dark:border-blue-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Karigar' : 'Add New Karigar'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Photo</label>
          {form.photoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father's Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
        </div>

        <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.skillLevel} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">-- Skill Level --</option>
            {SKILL_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} placeholder="Years of experience" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Specializations</label>
          <div className="flex flex-wrap gap-1">
            {SPECIALIZATIONS.map((s) => (
              <button key={s} onClick={() => toggleSpec(s)} className={
                'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                (form.specializations.includes(s) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-blue-300')
              }>{s}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Rates
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Hourly Rate</label>
              <input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Per Gram (Rs)</label>
              <input type="number" value={form.perGramRate} onChange={(e) => setForm({ ...form, perGramRate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Per Piece</label>
              <input type="number" value={form.fixedRatePerPiece} onChange={(e) => setForm({ ...form, fixedRatePerPiece: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input type="checkbox" checked={form.isInHouse} onChange={(e) => setForm({ ...form, isInHouse: e.target.checked })} className="h-5 w-5 rounded" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900">In-House Karigar</div>
            <div className="text-xs text-emerald-700 font-semibold">Works at our shop (vs external contractor)</div>
          </div>
        </label>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.fullName || !form.phone}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Add Karigar'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function MetalTransferModal({ karigar, direction, onClose, onDone }: any) {
  const [grams, setGrams] = useState(0);
  const [wastage, setWastage] = useState(0);

  const mutation = useMutation({
    mutationFn: () => direction === 'issue'
      ? karigarsApi.issueMetal(karigar.id, grams)
      : karigarsApi.receiveMetal(karigar.id, grams, wastage),
    onSuccess: () => { toast.success(direction === 'issue' ? 'Metal issued' : 'Metal received'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className={'px-5 py-3 border-b flex items-center justify-between ' + (direction === 'issue' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30')}>
          <div>
            <h3 className="font-extrabold">{direction === 'issue' ? '📤 Issue Metal' : '📥 Receive Metal'}</h3>
            <p className="text-xs text-slate-500 font-semibold">{karigar.fullName} • Outstanding: {karigar.outstandingGrams.toFixed(1)}g</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={'text-[10px] uppercase font-extrabold mb-1 block ' + (direction === 'issue' ? 'text-amber-700' : 'text-emerald-700')}>Grams *</label>
            <input type="number" step="0.01" autoFocus value={grams} onChange={(e) => setGrams(Number(e.target.value))} className={
              'h-16 w-full rounded-xl border-2 px-4 text-2xl font-extrabold tabular-nums focus:outline-none ' +
              (direction === 'issue' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 focus:border-amber-500' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 focus:border-emerald-500')
            } />
          </div>
          {direction === 'receive' && (
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Wastage (g)</label>
              <input type="number" step="0.01" value={wastage} onChange={(e) => setWastage(Number(e.target.value))} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className={'flex-1 ' + (direction === 'issue' ? 'bg-gradient-to-r from-amber-600 to-yellow-700' : 'bg-gradient-to-r from-emerald-600 to-green-700')} onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={grams <= 0}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
