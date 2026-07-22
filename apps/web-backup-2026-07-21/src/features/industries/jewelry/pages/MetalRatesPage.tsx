import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Coins, Plus, X, Save, RefreshCw, Sparkles, TrendingUp, TrendingDown,
  Calendar, DollarSign, Edit3, Trash2,
} from 'lucide-react';
import { metalRatesApi, type MetalType, type Purity } from '../api/metal-rates.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const METAL_TYPES: { value: MetalType; label: string; emoji: string; color: string }[] = [
  { value: 'GOLD', label: 'Gold', emoji: '🥇', color: 'from-amber-500 to-yellow-600' },
  { value: 'SILVER', label: 'Silver', emoji: '🥈', color: 'from-slate-400 to-slate-600' },
  { value: 'PLATINUM', label: 'Platinum', emoji: '💠', color: 'from-cyan-500 to-blue-600' },
  { value: 'PALLADIUM', label: 'Palladium', emoji: '⚪', color: 'from-slate-500 to-gray-700' },
  { value: 'ROSE_GOLD', label: 'Rose Gold', emoji: '🌹', color: 'from-rose-400 to-pink-500' },
  { value: 'WHITE_GOLD', label: 'White Gold', emoji: '⚪', color: 'from-slate-300 to-slate-500' },
];

const PURITIES: { value: Purity; label: string; group: string }[] = [
  { value: 'KARAT_24', label: '24K (99.9%)', group: 'gold' },
  { value: 'KARAT_22', label: '22K (91.6%)', group: 'gold' },
  { value: 'KARAT_21', label: '21K (87.5%)', group: 'gold' },
  { value: 'KARAT_18', label: '18K (75%)', group: 'gold' },
  { value: 'KARAT_14', label: '14K (58.3%)', group: 'gold' },
  { value: 'KARAT_10', label: '10K (41.7%)', group: 'gold' },
  { value: 'SILVER_999', label: 'Silver 999 (99.9%)', group: 'silver' },
  { value: 'SILVER_925', label: 'Silver 925 (Sterling)', group: 'silver' },
  { value: 'SILVER_800', label: 'Silver 800', group: 'silver' },
  { value: 'PLATINUM_950', label: 'Platinum 950', group: 'platinum' },
  { value: 'PLATINUM_900', label: 'Platinum 900', group: 'platinum' },
];

export default function MetalRatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: rates = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current(),
    refetchInterval: 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['metal-rates-history'],
    queryFn: () => metalRatesApi.history({ limit: 20 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => metalRatesApi.remove(id),
    onSuccess: () => { toast.success('Rate removed'); queryClient.invalidateQueries({ queryKey: ['metal-rates-current'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Coins className="h-3.5 w-3.5 text-amber-300" />
              Live Rates
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💰 Metal Rates</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Gold, silver & platinum daily prices</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Update Rate
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <RateForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['metal-rates-current'] }); queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : rates.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Coins className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No rates set yet</p>
          <Button className="mt-4 bg-gradient-to-r from-amber-600 to-yellow-700" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Set First Rate
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((rate) => {
            const metal = METAL_TYPES.find((m) => m.value === rate.metalType);
            const purity = PURITIES.find((p) => p.value === rate.purity);
            return (
              <div key={rate.id} className={'rounded-3xl text-white p-5 shadow-xl bg-gradient-to-br ' + (metal?.color ?? 'from-slate-500 to-slate-700')}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-5xl mb-1">{metal?.emoji}</div>
                    <div className="text-xs uppercase font-extrabold text-white/80">{metal?.label}</div>
                    <div className="text-lg font-extrabold">{purity?.label ?? rate.purity}</div>
                  </div>
                  <button onClick={() => { if (confirm('Remove this rate?')) removeMutation.mutate(rate.id); }} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-rose-500 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-4">
                  <div className="text-4xl font-extrabold tabular-nums">Rs {rate.ratePerGram.toLocaleString()}</div>
                  <div className="text-xs font-bold text-white/70">per gram</div>
                </div>
                {rate.ratePerTola && (
                  <div className="mt-2 rounded-lg bg-white/15 backdrop-blur border border-white/20 p-2 text-center">
                    <div className="text-[10px] uppercase font-extrabold text-white/70">Per Tola</div>
                    <div className="text-lg font-extrabold tabular-nums">Rs {rate.ratePerTola.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                )}
                {(rate.buyRate || rate.sellRate) && (
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    {rate.buyRate && (
                      <div className="rounded-lg bg-white/10 backdrop-blur p-2 text-center">
                        <div className="text-[9px] uppercase font-extrabold text-white/70">Buy</div>
                        <div className="font-extrabold tabular-nums">{rate.buyRate.toLocaleString()}</div>
                      </div>
                    )}
                    {rate.sellRate && (
                      <div className="rounded-lg bg-white/10 backdrop-blur p-2 text-center">
                        <div className="text-[9px] uppercase font-extrabold text-white/70">Sell</div>
                        <div className="font-extrabold tabular-nums">{rate.sellRate.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 text-[10px] font-bold text-white/70 inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(rate.effectiveDate), 'dd MMM yyyy, HH:mm')}
                </div>
                {rate.source && <div className="text-[10px] font-bold text-white/70">Source: {rate.source}</div>}
              </div>
            );
          })}
        </section>
      )}

      {/* Rate History */}
      {history.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Rate History
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {history.map((rate) => {
              const metal = METAL_TYPES.find((m) => m.value === rate.metalType);
              const purity = PURITIES.find((p) => p.value === rate.purity);
              return (
                <div key={rate.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="text-2xl">{metal?.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm">{metal?.label} - {purity?.label}</div>
                    <div className="text-[10px] font-bold text-slate-500">{format(new Date(rate.effectiveDate), 'dd MMM yyyy, HH:mm')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">Rs {rate.ratePerGram.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-slate-500">per gram</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function RateForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    metalType: 'GOLD',
    purity: 'KARAT_22',
    ratePerGram: 0,
    ratePerTola: 0,
    buyRate: '',
    sellRate: '',
    source: '',
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => metalRatesApi.create({
      ...form,
      ratePerGram: Number(form.ratePerGram),
      ratePerTola: form.ratePerTola ? Number(form.ratePerTola) : undefined,
      buyRate: form.buyRate ? Number(form.buyRate) : undefined,
      sellRate: form.sellRate ? Number(form.sellRate) : undefined,
    }),
    onSuccess: () => { toast.success('Rate updated'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  // Auto-calculate tola when ratePerGram changes
  const handleRateChange = (val: string) => {
    const rate = Number(val) || 0;
    setForm({ ...form, ratePerGram: val, ratePerTola: (rate * 11.664).toFixed(0) });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">💰 Update Metal Rate</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Metal Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {METAL_TYPES.map((m) => (
                <button key={m.value} onClick={() => setForm({ ...form, metalType: m.value })} className={
                  'p-3 rounded-xl border-2 text-center transition ' +
                  (form.metalType === m.value ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300')
                }>
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-[10px] font-extrabold">{m.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Purity *</label>
            <select value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              {PURITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Rate per Gram (Rs) *</label>
          <input type="number" step="0.01" value={form.ratePerGram} onChange={(e) => handleRateChange(e.target.value)} className="h-16 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-3xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
        </div>

        <div>
          <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Rate per Tola (Rs) — Auto</label>
          <input type="number" value={form.ratePerTola} onChange={(e) => setForm({ ...form, ratePerTola: e.target.value })} className="h-12 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          <div className="text-[10px] font-bold text-slate-500 mt-1">1 tola = 11.664 grams</div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-cyan-700 mb-1 block">Buy Rate (optional)</label>
            <input type="number" value={form.buyRate} onChange={(e) => setForm({ ...form, buyRate: e.target.value })} placeholder="For old gold" className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Sell Rate (optional)</label>
            <input type="number" value={form.sellRate} onChange={(e) => setForm({ ...form, sellRate: e.target.value })} placeholder="For new jewelry" className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source (e.g. Karachi Jewellers, MCX)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.ratePerGram}>
            <Save className="h-4 w-4" />
            Save Rate
          </Button>
        </div>
      </div>
    </section>
  );
}
