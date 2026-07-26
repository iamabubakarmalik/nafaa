import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Package, ShoppingCart, Sparkles, Truck,
  AlertTriangle, Check, X, Zap, DollarSign, Search, Filter,
  Clock, TrendingDown, Copy, MessageCircle, Phone,
} from 'lucide-react';
import { reorderApi, type ReorderSuggestion } from '../api/reorder.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

export default function ReorderPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reorder-suggestions', statusFilter],
    queryFn: () => reorderApi.list(statusFilter === 'all' ? undefined : statusFilter),
  });

  const generateMutation = useMutation({
    mutationFn: () => reorderApi.generate(),
    onSuccess: (result) => {
      toast.success(`${result.generated} nayi suggestions ban gayi`);
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reorderApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => reorderApi.remove(id),
    onSuccess: () => {
      toast.success('Hata diya');
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
  });

  const bulkMarkOrdered = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.allSettled(ids.map((id) => reorderApi.updateStatus(id, 'ORDERED')));
    },
    onSuccess: () => {
      toast.success(`${selected.size} suggestions ordered mark ho gaye`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return suggestions;
    const q = search.toLowerCase();
    return suggestions.filter((s) =>
      s.product?.name?.toLowerCase().includes(q) ||
      s.supplier?.name?.toLowerCase().includes(q)
    );
  }, [suggestions, search]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((sum, s) => sum + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const critical = filtered.filter((s) => s.daysOfStockLeft < 3).length;
    const low = filtered.filter((s) => s.daysOfStockLeft >= 3 && s.daysOfStockLeft < 7).length;
    return { totalValue, critical, low };
  }, [filtered]);

  const bySupplier = useMemo(() => {
    return filtered.reduce((acc, s) => {
      const key = s.preferredSupplierId || 'none';
      if (!acc[key]) acc[key] = { supplier: s.supplier, items: [] as ReorderSuggestion[] };
      acc[key].items.push(s);
      return acc;
    }, {} as Record<string, { supplier: any; items: ReorderSuggestion[] }>);
  }, [filtered]);

  const copyOrderList = (items: ReorderSuggestion[]) => {
    const text = items.map((s) =>
      `${s.product?.name || 'Product'} — ${s.suggestedQuantity} ${s.product?.unit || 'pcs'} @ ${formatPKR(s.lastPurchasePrice)}`
    ).join('\n');
    const total = items.reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const full = `Order List:\n\n${text}\n\nTotal: ${formatPKR(total)}`;
    navigator.clipboard.writeText(full);
    toast.success('Order list copy ho gaya — supplier ko bhejo');
  };

  const whatsappOrder = (supplier: any, items: ReorderSuggestion[]) => {
    if (!supplier?.phone) return toast.error('Supplier ka phone number nahi hai');
    const phone = String(supplier.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const lines = items.map((s, i) =>
      `${i + 1}. ${s.product?.name || 'Product'} — ${s.suggestedQuantity} ${s.product?.unit || 'pcs'}`
    ).join('\n');
    const total = items.reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const msg = `Assalam-o-Alaikum ${supplier.name},\n\nMujhe yeh items chahiye:\n\n${lines}\n\nEstimated: ${formatPKR(total)}\n\nDelivery kab ho sakti hai?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Smart Reorder
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔄 Reorder Suggestions</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.critical > 0 ? (
                <><strong className="text-rose-300">{stats.critical} products</strong> foran order karne wale hain</>
              ) : (
                <>Sales history se auto-detect — kaunsi cheez khatam hone wali hai</>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <PrivacyToggle />
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Zap className="h-4 w-4" /> Analyze & Suggest
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total Items" value={filtered.length} sub="reorder chahiye" icon={ShoppingCart} tone="blue" />
        <Kpi label="Foran" value={stats.critical} sub="< 3 din bacha" icon={AlertTriangle} tone="rose" />
        <Kpi label="Kam" value={stats.low} sub="3-7 din bacha" icon={Clock} tone="amber" />
        <Kpi
          label="Order Value"
          value={hideCost ? '••••' : formatPKR(stats.totalValue)}
          sub={`${Object.keys(bySupplier).length} suppliers`}
          icon={DollarSign}
          tone="emerald"
        />
      </section>

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product ya supplier..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { v: 'PENDING', l: 'Pending' },
              { v: 'ORDERED', l: 'Ordered' },
              { v: 'IGNORED', l: 'Ignored' },
              { v: 'all', l: 'Sab' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs font-extrabold text-slate-500">
            {filtered.length} suggestions
          </div>
        </div>
      </section>

      {/* BULK BAR */}
      {selected.size > 0 && (
        <section className="sticky top-2 z-20 rounded-2xl bg-slate-900 text-white shadow-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="font-extrabold text-sm px-2">{selected.size} selected</div>
          <button
            onClick={() => bulkMarkOrdered.mutate(Array.from(selected))}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" /> Mark Ordered
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold"
          >
            Clear
          </button>
        </section>
      )}

      {/* CONTENT */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-200 mx-auto flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">Sab kuch stock me hai!</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            "Analyze & Suggest" dabao — hum sales history check karenge
          </p>
          <Button
            className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-700"
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
          >
            <Zap className="h-4 w-4" /> Ab Analyze Karo
          </Button>
        </div>
      ) : (
        <section className="space-y-4">
          {Object.entries(bySupplier).map(([supKey, group]) => {
            const groupValue = group.items.reduce((a, i) => a + i.suggestedQuantity * i.lastPurchasePrice, 0);
            return (
              <div key={supKey} className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 truncate">
                        {group.supplier?.name || 'Koi supplier nahi'}
                      </h3>
                      <div className="text-xs text-slate-500 font-bold">
                        {group.items.length} items
                        {group.supplier?.phone && ` • ${group.supplier.phone}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!hideCost && (
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(groupValue)}
                      </div>
                    )}
                    <button
                      onClick={() => copyOrderList(group.items)}
                      className="h-9 px-3 rounded-lg bg-white border-2 border-slate-200 hover:border-blue-300 text-xs font-extrabold inline-flex items-center gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy List
                    </button>
                    {group.supplier?.phone && (
                      <button
                        onClick={() => whatsappOrder(group.supplier, group.items)}
                        className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((sug) => (
                    <SuggestionRow
                      key={sug.id}
                      suggestion={sug}
                      hideCost={hideCost}
                      selected={selected.has(sug.id)}
                      onToggleSelect={() => {
                        setSelected((prev) => {
                          const n = new Set(prev);
                          n.has(sug.id) ? n.delete(sug.id) : n.add(sug.id);
                          return n;
                        });
                      }}
                      onMarkOrdered={() => updateStatus.mutate({ id: sug.id, status: 'ORDERED' })}
                      onIgnore={() => updateStatus.mutate({ id: sug.id, status: 'IGNORED' })}
                      onRemove={() => removeMutation.mutate(sug.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

/* ══════════ ROW ══════════ */
function SuggestionRow({ suggestion, hideCost, selected, onToggleSelect, onMarkOrdered, onIgnore, onRemove }: {
  suggestion: ReorderSuggestion;
  hideCost: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onMarkOrdered: () => void;
  onIgnore: () => void;
  onRemove: () => void;
}) {
  const isCritical = suggestion.daysOfStockLeft < 3;
  const isLow = suggestion.daysOfStockLeft >= 3 && suggestion.daysOfStockLeft < 7;
  const orderValue = suggestion.suggestedQuantity * suggestion.lastPurchasePrice;

  return (
    <div className={[
      'px-5 py-4 hover:bg-blue-50/30 transition',
      selected ? 'bg-blue-50/60' : '',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        {suggestion.status === 'PENDING' && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded mt-3 shrink-0"
          />
        )}

        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
          {suggestion.product?.images?.[0]?.url ? (
            <img src={suggestion.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/retail-products/${suggestion.productId}`}
              className="font-extrabold text-slate-900 text-sm hover:text-blue-600 truncate"
            >
              {suggestion.product?.name || 'Product'}
            </Link>
            {isCritical && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                FORAN
              </span>
            )}
            {isLow && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase">
                KAM
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <MiniCell
              label="Abhi Stock"
              value={`${suggestion.currentStock} ${suggestion.product?.unit || ''}`}
              tone={isCritical ? 'rose' : isLow ? 'amber' : 'slate'}
            />
            <MiniCell
              label="Kitne Din"
              value={`${suggestion.daysOfStockLeft.toFixed(1)} din`}
              tone={isCritical ? 'rose' : isLow ? 'amber' : 'slate'}
            />
            <MiniCell
              label="Roz Ki Bikri"
              value={`${suggestion.avgDailySales.toFixed(1)}/din`}
              tone="slate"
            />
            <MiniCell
              label="Order Karo"
              value={`${suggestion.suggestedQuantity} ${suggestion.product?.unit || ''}`}
              tone="blue"
            />
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[110px]">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Order Value</div>
          {!hideCost ? (
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(orderValue)}</div>
          ) : (
            <div className="text-lg font-extrabold text-slate-400">••••</div>
          )}
          {!hideCost && (
            <div className="text-[10px] text-slate-500 font-bold">
              @ {formatPKR(suggestion.lastPurchasePrice)}
            </div>
          )}

          <div className="mt-2 flex gap-1 justify-end">
            {suggestion.status === 'PENDING' && (
              <>
                <button
                  onClick={onMarkOrdered}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1"
                >
                  <Check className="h-3 w-3" /> Ordered
                </button>
                <button
                  onClick={onIgnore}
                  title="Ignore"
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {suggestion.status !== 'PENDING' && (
              <button
                onClick={onRemove}
                title="Hataao"
                className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    slate: 'text-slate-700',
  };
  return (
    <div>
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
