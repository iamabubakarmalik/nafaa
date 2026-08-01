import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Search, X, RefreshCw, Package, DollarSign,
  TrendingUp, Upload, Copy, Eye, EyeOff, Trash2, CheckCircle2,
  Save, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { gamingTopupsApi, type GamingTopupProvider } from '../api/topups.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const PROVIDERS: Array<{ v: GamingTopupProvider; l: string; e: string }> = [
  { v: 'PSN', l: 'PSN', e: '🎮' },
  { v: 'XBOX_LIVE', l: 'Xbox Live', e: '🟩' },
  { v: 'NINTENDO', l: 'Nintendo', e: '🔴' },
  { v: 'STEAM', l: 'Steam', e: '💨' },
  { v: 'EPIC_GAMES', l: 'Epic Games', e: '🎮' },
  { v: 'PUBG_UC', l: 'PUBG UC', e: '🔫' },
  { v: 'ROBUX', l: 'Robux', e: '🎯' },
  { v: 'FORTNITE_VBUCKS', l: 'V-Bucks', e: '🎪' },
  { v: 'MOBILE_LEGENDS_DIAMONDS', l: 'ML Diamonds', e: '💎' },
  { v: 'FREE_FIRE_DIAMONDS', l: 'Free Fire', e: '🔥' },
  { v: 'GOOGLE_PLAY', l: 'Google Play', e: '▶️' },
  { v: 'APPLE_STORE', l: 'Apple', e: '🍎' },
  { v: 'ITUNES', l: 'iTunes', e: '🎵' },
  { v: 'NETFLIX', l: 'Netflix', e: '🎬' },
  { v: 'SPOTIFY', l: 'Spotify', e: '🎵' },
  { v: 'DISCORD_NITRO', l: 'Discord', e: '💬' },
  { v: 'OTHER', l: 'Other', e: '💳' },
];

export default function GamingTopupsPage() {
  const qc = useQueryClient();
  const [providerFilter, setProviderFilter] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const { data: inventory = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['topups-inventory-mgmt'],
    queryFn: () => gamingTopupsApi.inventory(),
  });

  const { data: allTopups = [] } = useQuery({
    queryKey: ['topups-all-list', providerFilter, availableOnly],
    queryFn: () => gamingTopupsApi.list({
      provider: providerFilter === 'all' ? undefined : providerFilter,
      available: availableOnly ? true : undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['topups-summary-mgmt'],
    queryFn: () => gamingTopupsApi.summary(),
    refetchInterval: 60_000,
  });

  const filteredInventory = useMemo(() => {
    if (providerFilter === 'all') return inventory;
    return inventory.filter((i) => i.provider === providerFilter);
  }, [inventory, providerFilter]);

  return (
    <div className="space-y-5">
      {showBulkAdd && (
        <BulkAddTopupModal onClose={() => setShowBulkAdd(false)}
          onAdded={() => {
            setShowBulkAdd(false);
            qc.invalidateQueries({ queryKey: ['topups-inventory-mgmt'] });
            qc.invalidateQueries({ queryKey: ['topups-all-list'] });
            qc.invalidateQueries({ queryKey: ['topups-summary-mgmt'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <CreditCard className="h-3.5 w-3.5 text-amber-300" /> Digital Top-ups & Gift Cards
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💳 Digital Top-ups</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.available ?? 0} cards in stock • {summary?.sold ?? 0} sold • Profit{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalProfit || 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBulkAdd(true)}>
              <Upload className="h-4 w-4" /> Bulk Add Cards
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Cards" value={summary.totalCards} icon={Package} tone="amber" />
          <StatCard label="Available" value={summary.available} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Revenue" value={formatPKR(summary.totalRevenue)} icon={DollarSign} tone="blue" />
          <StatCard label="Profit" value={formatPKR(summary.totalProfit)} icon={TrendingUp} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setAvailableOnly(!availableOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              availableOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Available Only
          </button>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{allTopups.length} cards</div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setProviderFilter('all')}
            className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border-2 transition ${
              providerFilter === 'all' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'}`}>
            All
          </button>
          {PROVIDERS.map((p) => (
            <button key={p.v} onClick={() => setProviderFilter(providerFilter === p.v ? 'all' : p.v)}
              className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                providerFilter === p.v ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'}`}>
              <span>{p.e}</span>{p.l}
            </button>
          ))}
        </div>
      </section>

      {/* Inventory Overview */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <h2 className="font-extrabold text-slate-900">Inventory Overview</h2>
          <span className="text-xs text-slate-500 font-bold">({filteredInventory.length} denominations)</span>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-12 text-center">
            <CreditCard className="h-14 w-14 text-slate-300 mx-auto mb-2" />
            <h3 className="font-extrabold text-slate-900">No cards in stock</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">Add cards to start selling</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredInventory.map((inv, i) => {
              const providerMeta = PROVIDERS.find((p) => p.v === inv.provider);
              return (
                <div key={i} className="rounded-2xl bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{providerMeta?.e || '💳'}</span>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{inv.provider.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] font-bold text-slate-500">{inv.topupType}</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] uppercase font-extrabold text-slate-500">Value</div>
                      <div className="text-lg font-extrabold text-slate-900 tabular-nums">${inv.denomination}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-extrabold text-slate-500">Stock</div>
                      <div className="text-lg font-extrabold text-amber-700 tabular-nums">{inv.count}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
                    <div className="text-[10px] font-extrabold text-slate-600">Sell for</div>
                    <div className="text-base font-extrabold text-emerald-700 tabular-nums">{formatPKR(inv.sellingPrice)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* All Cards List */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-600" />
          <h2 className="font-extrabold text-slate-900">All Cards</h2>
        </div>
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          {allTopups.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 font-semibold">No cards found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <Th>Number</Th>
                    <Th>Provider</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Value</Th>
                    <Th className="text-right">Cost</Th>
                    <Th className="text-right">Sell</Th>
                    <Th className="text-center">Status</Th>
                    <Th>Sold To</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allTopups.slice(0, 100).map((t) => (
                    <tr key={t.id} className="hover:bg-amber-50/40">
                      <td className="px-3 py-2.5 font-mono font-extrabold text-slate-900 text-xs">{t.topupNumber}</td>
                      <td className="px-3 py-2.5 text-xs font-bold">{t.provider.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{t.topupType}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold tabular-nums">${t.denominationValue}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 tabular-nums">{formatPKR(t.costPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.sellingPrice)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {t.isRedeemed ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">Redeemed</span>
                        ) : t.soldAt ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">Sold</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">Available</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{t.customerName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BulkAddTopupModal({ onClose, onAdded }: any) {
  const [form, setForm] = useState({
    provider: 'PSN' as GamingTopupProvider,
    topupType: '',
    denominationValue: 10,
    costPrice: 0,
    sellingPrice: 0,
    expiryDate: '',
    supplierRef: '',
  });
  const [cardsText, setCardsText] = useState('');

  const parsedCards = useMemo(() => {
    return cardsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[|,\t]/).map((p) => p.trim());
      return { cardCode: parts[0], cardPin: parts[1], cardSerial: parts[2] };
    });
  }, [cardsText]);

  const bulk = useMutation({
    mutationFn: () => gamingTopupsApi.bulkCreate({
      provider: form.provider,
      topupType: form.topupType,
      denominationValue: form.denominationValue,
      costPrice: form.costPrice,
      sellingPrice: form.sellingPrice,
      cards: parsedCards,
      expiryDate: form.expiryDate || undefined,
      supplierRef: form.supplierRef || undefined,
    }),
    onSuccess: (result) => {
      toast.success(`${result.created} cards added`);
      onAdded();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">💳 Bulk Add Cards</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Provider *</Lbl>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as any })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                {PROVIDERS.map((p) => (<option key={p.v} value={p.v}>{p.e} {p.l}</option>))}
              </select>
            </div>
            <div>
              <Lbl>Type / Region *</Lbl>
              <input value={form.topupType} onChange={(e) => setForm({ ...form, topupType: e.target.value })}
                placeholder="USA, UK, Asia..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Value ($) *</Lbl>
              <input type="number" value={form.denominationValue}
                onChange={(e) => setForm({ ...form, denominationValue: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Cost / Card</Lbl>
              <input type="number" value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Sell / Card *</Lbl>
              <input type="number" value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Expiry Date</Lbl>
              <input type="date" value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
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
            <Lbl>Card Codes ({parsedCards.length} detected)</Lbl>
            <textarea rows={8} value={cardsText} onChange={(e) => setCardsText(e.target.value)}
              placeholder="One per line — Format: CODE | PIN | SERIAL&#10;ABCD-1234-EFGH-5678&#10;WXYZ-9999-QRST-1111 | 0000&#10;GIFT-0001 | 1234 | SN123456"
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500" />
            <p className="mt-1 text-[10px] text-slate-500 font-bold">
              Separator: pipe (|), comma (,) or tab. PIN and serial are optional.
            </p>
          </div>

          {parsedCards.length > 0 && form.sellingPrice > 0 && form.costPrice > 0 && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3 text-sm">
              <div className="font-extrabold text-emerald-900">Preview</div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div><span className="font-bold text-emerald-700">Cards:</span> <strong>{parsedCards.length}</strong></div>
                <div><span className="font-bold text-emerald-700">Total cost:</span> <strong>{formatPKR(parsedCards.length * form.costPrice)}</strong></div>
                <div><span className="font-bold text-emerald-700">Total profit:</span> <strong>{formatPKR(parsedCards.length * (form.sellingPrice - form.costPrice))}</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => bulk.mutate()} loading={bulk.isPending}
            disabled={parsedCards.length === 0 || !form.topupType.trim() || form.sellingPrice <= 0}>
            <Save className="h-4 w-4" /> Add {parsedCards.length} Cards
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700', violet: 'from-violet-500 to-fuchsia-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 ${className}`}>{children}</th>;
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
