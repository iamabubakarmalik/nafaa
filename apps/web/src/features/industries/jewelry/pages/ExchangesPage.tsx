import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Repeat, Plus, Search, X, Save, RefreshCw, Sparkles, User, Phone,
  Scale, DollarSign, Camera, FlaskConical, TrendingUp,
} from 'lucide-react';
import { exchangesApi, type ExchangeType } from '../api/exchanges.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EXCHANGE_TYPES: { value: ExchangeType; label: string; emoji: string }[] = [
  { value: 'OLD_GOLD_EXCHANGE', label: 'Old Gold', emoji: '🥇' },
  { value: 'OLD_SILVER_EXCHANGE', label: 'Old Silver', emoji: '🥈' },
  { value: 'BROKEN_JEWELRY', label: 'Broken', emoji: '💔' },
  { value: 'PURE_METAL_DEPOSIT', label: 'Deposit', emoji: '📥' },
  { value: 'COIN_EXCHANGE', label: 'Coin', emoji: '🪙' },
  { value: 'RESIZING', label: 'Resizing', emoji: '📏' },
  { value: 'REPAIR', label: 'Repair', emoji: '🔧' },
  { value: 'RENOVATION', label: 'Renovation', emoji: '✨' },
  { value: 'MELT_AND_REMAKE', label: 'Melt & Remake', emoji: '🔥' },
];

export default function ExchangesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: exchanges = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['jewelry-exchanges', typeFilter, search],
    queryFn: () => exchangesApi.list({
      exchangeType: typeFilter === 'all' ? undefined : typeFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['exchanges-summary'],
    queryFn: () => exchangesApi.summary(),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Repeat className="h-3.5 w-3.5 text-amber-300" />
              Metal Exchanges
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔄 Exchanges</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Old gold, silver, broken jewelry — purity testing</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Exchange
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Exchanges" value={summary.total} icon={Repeat} color="violet" />
          <StatCard label="Fine Gold Received" value={(summary.totals?.fineGoldEquivalent ?? 0).toFixed(2) + 'g'} icon={Scale} color="amber" />
          <StatCard label="Gross Weight" value={(summary.totals?.grossWeight ?? 0).toFixed(2) + 'g'} icon={TrendingUp} color="cyan" />
          <StatCard label="Total Value" value={formatPKR(summary.totals?.netValue ?? 0)} icon={DollarSign} color="emerald" />
        </section>
      )}

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exchange #, customer, CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (typeFilter === 'all' ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {EXCHANGE_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (typeFilter === t.value ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.emoji} {t.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <ExchangeForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['jewelry-exchanges'] }); queryClient.invalidateQueries({ queryKey: ['exchanges-summary'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : exchanges.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Repeat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No exchanges yet</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {exchanges.map((ex) => {
            const type = EXCHANGE_TYPES.find((t) => t.value === ex.exchangeType);
            return (
              <div key={ex.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow shrink-0 text-2xl">
                      {type?.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold">{ex.exchangeNumber}</span>
                        <span className="px-2 py-0.5 rounded-full bg-violet-500 text-white text-[9px] font-extrabold uppercase">{type?.label}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">{ex.metalType}</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{ex.customerName}</div>
                      <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1"><Phone className="h-3 w-3" />{ex.customerPhone}</div>
                      {ex.customerCnic && <div className="text-[10px] font-mono font-bold text-slate-500">CNIC: {ex.customerCnic}</div>}
                      <div className="mt-1 text-xs italic text-slate-600 line-clamp-1">{ex.itemDescription}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(ex.netValue)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{format(new Date(ex.exchangeDate), 'dd MMM yyyy')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-slate-500">Gross</div>
                    <div className="font-extrabold tabular-nums">{ex.grossWeight}g</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-emerald-700">Net</div>
                    <div className="font-extrabold text-emerald-800 tabular-nums">{ex.netWeight ?? '—'}g</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-amber-700">Fine</div>
                    <div className="font-extrabold text-amber-800 tabular-nums">{ex.fineGoldEquivalent?.toFixed(2) ?? '—'}g</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
                    <div className="text-[9px] uppercase font-extrabold text-blue-700">Rate</div>
                    <div className="font-extrabold text-blue-800 tabular-nums text-[10px]">Rs {ex.ratePerGram.toLocaleString()}</div>
                  </div>
                </div>
                {ex.testedPurity && (
                  <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-2 text-xs">
                    <span className="font-extrabold text-cyan-800 inline-flex items-center gap-1">
                      <FlaskConical className="h-3 w-3" />
                      Tested: {ex.testedPurity.replace('KARAT_', '').replace('SILVER_', 'S')}K
                    </span>
                    {ex.testedBy && <span className="ml-2 text-slate-600 font-bold">by {ex.testedBy}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600', amber: 'from-amber-500 to-yellow-600',
    cyan: 'from-cyan-500 to-blue-600', emerald: 'from-emerald-500 to-green-600',
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

function ExchangeForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    exchangeType: 'OLD_GOLD_EXCHANGE',
    customerName: '', customerPhone: '', customerCnic: '',
    itemDescription: '',
    metalType: 'GOLD', claimedPurity: 'KARAT_22',
    testedPurity: '',
    grossWeight: 0, netWeight: 0, stoneWeight: 0,
    ratePerGram: 0, deductions: 0, meltingCharges: 0, testingCharges: 0,
    testingMethod: '', testedBy: '', witnessedBy: '',
    photoUrls: [] as string[], cnicPhotoUrl: '',
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => exchangesApi.create({
      ...form,
      grossWeight: Number(form.grossWeight) || 0,
      netWeight: form.netWeight ? Number(form.netWeight) : undefined,
      stoneWeight: Number(form.stoneWeight) || 0,
      ratePerGram: Number(form.ratePerGram) || 0,
      deductions: Number(form.deductions) || 0,
      meltingCharges: Number(form.meltingCharges) || 0,
      testingCharges: Number(form.testingCharges) || 0,
      testedPurity: form.testedPurity || undefined,
    }),
    onSuccess: () => { toast.success('Exchange recorded'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-300 dark:border-violet-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🔄 New Exchange Entry</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Exchange Type *</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {EXCHANGE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setForm({ ...form, exchangeType: t.value })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.exchangeType === t.value ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
              }>
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="text-[10px] font-extrabold">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
        </div>

        <textarea rows={2} value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} placeholder="Item description (e.g. Gold chain 22K, broken bracelet)..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="grid sm:grid-cols-2 gap-3">
          <select value={form.metalType} onChange={(e) => setForm({ ...form, metalType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="GOLD">🥇 Gold</option><option value="SILVER">🥈 Silver</option><option value="PLATINUM">💠 Platinum</option>
          </select>
          <select value={form.claimedPurity} onChange={(e) => setForm({ ...form, claimedPurity: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            {['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'SILVER_999', 'SILVER_925'].map((p) => <option key={p} value={p}>Claimed: {p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
          </select>
        </div>

        <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-cyan-900 flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Purity Testing
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={form.testedPurity} onChange={(e) => setForm({ ...form, testedPurity: e.target.value })} className="h-10 rounded-lg border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="">Tested Purity (optional)</option>
              {['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'SILVER_999', 'SILVER_925'].map((p) => <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
            </select>
            <input value={form.testingMethod} onChange={(e) => setForm({ ...form, testingMethod: e.target.value })} placeholder="Testing method (Acid, XRF, etc.)" className="h-10 rounded-lg border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
            <input value={form.testedBy} onChange={(e) => setForm({ ...form, testedBy: e.target.value })} placeholder="Tested by" className="h-10 rounded-lg border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
            <input value={form.witnessedBy} onChange={(e) => setForm({ ...form, witnessedBy: e.target.value })} placeholder="Witnessed by" className="h-10 rounded-lg border-2 border-cyan-300 bg-white dark:bg-cyan-950/40 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Gross Weight (g) *</label>
            <input type="number" step="0.01" value={form.grossWeight} onChange={(e) => setForm({ ...form, grossWeight: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Stone Weight (g)</label>
            <input type="number" step="0.01" value={form.stoneWeight} onChange={(e) => setForm({ ...form, stoneWeight: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Rate/gram *</label>
            <input type="number" value={form.ratePerGram} onChange={(e) => setForm({ ...form, ratePerGram: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} placeholder="Deductions (Rs)" className="h-11 rounded-xl border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
          <input type="number" value={form.meltingCharges} onChange={(e) => setForm({ ...form, meltingCharges: e.target.value })} placeholder="Melting charges" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          <input type="number" value={form.testingCharges} onChange={(e) => setForm({ ...form, testingCharges: e.target.value })} placeholder="Testing charges" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block flex items-center gap-1"><Camera className="h-3 w-3" />Item Photos</label>
          {form.photoUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              {form.photoUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, photoUrls: form.photoUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                </div>
              ))}
            </div>
          )}
          <UploadDropzone onUploaded={(records) => {
            const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
            setForm({ ...form, photoUrls: [...form.photoUrls, ...urls] });
          }} />
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.customerName || !form.customerPhone || !form.grossWeight || !form.ratePerGram}>
            <Save className="h-4 w-4" />
            Record Exchange
          </Button>
        </div>
      </div>
    </section>
  );
}
