import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scale, Plus, X, Save, RefreshCw, Sparkles, ArrowUp, ArrowDown,
  Package, Calendar, TrendingUp, DollarSign,
} from 'lucide-react';
import { metalStockApi } from '../api/metal-stock.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ENTRY_TYPES = [
  { value: 'OPENING', label: 'Opening Balance', direction: 'in', emoji: '📥' },
  { value: 'PURCHASE', label: 'Purchase', direction: 'in', emoji: '🛒' },
  { value: 'RECEIVE', label: 'Receive from Karigar', direction: 'in', emoji: '✅' },
  { value: 'RETURN', label: 'Return', direction: 'in', emoji: '↩️' },
  { value: 'EXCHANGE_IN', label: 'Exchange Received', direction: 'in', emoji: '🔄' },
  { value: 'SALE', label: 'Sale', direction: 'out', emoji: '💰' },
  { value: 'ISSUE_TO_KARIGAR', label: 'Issue to Karigar', direction: 'out', emoji: '📤' },
  { value: 'WASTAGE', label: 'Wastage', direction: 'out', emoji: '🗑️' },
  { value: 'MELTING_LOSS', label: 'Melting Loss', direction: 'out', emoji: '🔥' },
  { value: 'ADJUSTMENT', label: 'Adjustment', direction: 'out', emoji: '⚙️' },
];

export default function MetalStockPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all');

  const { data: balances = [], isLoading: balLoading } = useQuery({
    queryKey: ['metal-stock-balance'],
    queryFn: () => metalStockApi.balance(),
    refetchInterval: 60_000,
  });

  const { data: entries = [], isLoading: entriesLoading, refetch, isRefetching } = useQuery({
    queryKey: ['metal-stock-entries', entryTypeFilter],
    queryFn: () => metalStockApi.list({
      entryType: entryTypeFilter === 'all' ? undefined : entryTypeFilter,
      limit: 100,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scale className="h-3.5 w-3.5 text-amber-300" />
              Bullion Register
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">⚖️ Metal Stock</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">In/Out tracking, running balance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>
      </section>

      {/* Current Balances */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-600" />
            Current Balances
          </h3>
        </div>
        <div className="p-4">
          {balLoading ? (
            <div className="grid sm:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No stock entries yet</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {balances.map((b: any) => (
                <div key={b.metalType + '_' + b.purity} className="rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white p-4 shadow">
                  <div className="text-xs uppercase font-extrabold text-white/80">{b.metalType.replace('_', ' ')}</div>
                  <div className="text-sm font-extrabold">{b.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K</div>
                  <div className="mt-2 text-3xl font-extrabold tabular-nums">{b.balanceGrams.toFixed(2)}g</div>
                  <div className="text-[10px] font-bold text-white/70 mt-1">
                    Updated: {format(new Date(b.lastEntryDate), 'dd MMM')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setEntryTypeFilter('all')} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (entryTypeFilter === 'all' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All</button>
          {ENTRY_TYPES.map((t) => (
            <button key={t.value} onClick={() => setEntryTypeFilter(t.value)} className={
              'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (entryTypeFilter === t.value ? 'bg-cyan-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.emoji} {t.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <StockEntryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['metal-stock-balance'] }); queryClient.invalidateQueries({ queryKey: ['metal-stock-entries'] }); }}
        />
      )}

      {entriesLoading ? (
        <div className="grid gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Scale className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No entries yet</p>
        </div>
      ) : (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 grid grid-cols-6 gap-2 text-[10px] uppercase font-extrabold text-slate-500">
            <div>Entry #</div>
            <div>Type</div>
            <div>Metal / Purity</div>
            <div className="text-right">Grams (± )</div>
            <div className="text-right">Balance</div>
            <div className="text-right">Date</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-[600px] overflow-y-auto">
            {entries.map((e) => {
              const type = ENTRY_TYPES.find((t) => t.value === e.entryType);
              const isIn = type?.direction === 'in';
              return (
                <div key={e.id} className="px-6 py-3 grid grid-cols-6 gap-2 items-center text-sm hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                  <div className="font-mono font-bold text-xs">{e.entryNumber}</div>
                  <div className="font-bold text-xs inline-flex items-center gap-1">
                    <span className="text-lg">{type?.emoji}</span>
                    <span>{type?.label || e.entryType}</span>
                  </div>
                  <div className="font-bold text-xs">{e.metalType.replace('_', ' ')} • {e.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K</div>
                  <div className={'text-right font-extrabold tabular-nums ' + (isIn ? 'text-emerald-700' : 'text-rose-700')}>
                    {isIn ? '+' : '-'}{e.grams.toFixed(2)}g
                  </div>
                  <div className="text-right font-extrabold text-slate-900 dark:text-white tabular-nums">{e.balanceGrams.toFixed(2)}g</div>
                  <div className="text-right text-[10px] font-bold text-slate-500">{format(new Date(e.entryDate), 'dd MMM, HH:mm')}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StockEntryForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    entryType: 'PURCHASE',
    metalType: 'GOLD',
    purity: 'KARAT_22',
    grams: 0,
    ratePerGram: '',
    source: '',
    reference: '',
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => metalStockApi.addEntry({
      ...form,
      grams: Number(form.grams),
      ratePerGram: form.ratePerGram ? Number(form.ratePerGram) : undefined,
    }),
    onSuccess: () => { toast.success('Stock entry added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-cyan-300 dark:border-cyan-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">⚖️ New Stock Entry</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Entry Type *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ENTRY_TYPES.map((t) => (
              <button key={t.value} onClick={() => setForm({ ...form, entryType: t.value })} className={
                'p-3 rounded-xl border-2 text-center transition ' +
                (form.entryType === t.value ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-cyan-300')
              }>
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="text-[9px] font-extrabold">{t.label}</div>
                <div className={'text-[9px] font-bold ' + (t.direction === 'in' ? 'text-emerald-700' : 'text-rose-700')}>{t.direction === 'in' ? '+ IN' : '- OUT'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.metalType} onChange={(e) => setForm({ ...form, metalType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="GOLD">🥇 Gold</option><option value="SILVER">🥈 Silver</option><option value="PLATINUM">💠 Platinum</option><option value="ROSE_GOLD">🌹 Rose Gold</option><option value="WHITE_GOLD">⚪ White Gold</option>
          </select>
          <select value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            {['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'SILVER_999', 'SILVER_925', 'PLATINUM_950'].map((p) => <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
          </select>
          <div>
            <input type="number" step="0.01" value={form.grams} onChange={(e) => setForm({ ...form, grams: e.target.value })} placeholder="Grams *" className="h-11 w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 px-3 text-lg font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input type="number" value={form.ratePerGram} onChange={(e) => setForm({ ...form, ratePerGram: e.target.value })} placeholder="Rate per gram (optional)" className="h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source (bank, vendor name)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
        </div>

        <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Reference # (invoice, receipt)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.grams}>
            <Save className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>
    </section>
  );
}
