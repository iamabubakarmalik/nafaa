import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning,
  Search, X, Download, Filter, Package, Calendar, User as UserIcon,
} from 'lucide-react';
import { stockAdjustmentsApi, type AdjustmentType } from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<AdjustmentType, { label: string; tone: string; icon: any; color: string; isPositive: boolean }> = {
  ADJUSTMENT_IN: { label: 'Stock In', tone: 'bg-emerald-100 text-emerald-700', icon: ArrowUp, color: '#16a34a', isPositive: true },
  ADJUSTMENT_OUT: { label: 'Stock Out', tone: 'bg-blue-100 text-blue-700', icon: ArrowDown, color: '#2563eb', isPositive: false },
  DAMAGE: { label: 'Damaged', tone: 'bg-rose-100 text-rose-700', icon: ShieldAlert, color: '#e11d48', isPositive: false },
  LOSS: { label: 'Loss', tone: 'bg-amber-100 text-amber-700', icon: FileWarning, color: '#d97706', isPositive: false },
};

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<AdjustmentType | 'all'>('all');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-adjustments'],
    queryFn: () => productsApi.list({ page: 1, limit: 200 }),
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const products = productsData?.items ?? [];
    if (!q) return products.slice(0, 50);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [productsData, productSearch]);

  const selectedProduct = productsData?.items.find((p) => p.id === productId);

  const filteredAdjustments = useMemo(() => {
    let result = [...adjustments];
    const q = historySearch.toLowerCase().trim();
    if (q) {
      result = result.filter((a: any) =>
        a.product.name.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q)
      );
    }
    if (historyFilter !== 'all') {
      result = result.filter((a) => a.type === historyFilter);
    }
    return result;
  }, [adjustments, historySearch, historyFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayAdj = adjustments.filter((a) => new Date(a.createdAt).toDateString() === today);
    const stockIn = adjustments.filter((a) => a.type === 'ADJUSTMENT_IN').reduce((s, a) => s + a.quantity, 0);
    const damaged = adjustments.filter((a) => a.type === 'DAMAGE').reduce((s, a) => s + a.quantity, 0);
    const lost = adjustments.filter((a) => a.type === 'LOSS').reduce((s, a) => s + a.quantity, 0);
    return { total: adjustments.length, today: todayAdj.length, stockIn, damaged, lost };
  }, [adjustments]);

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      toast.success('Stock adjustment saved');
      setProductId('');
      setProductSearch('');
      setType('ADJUSTMENT_IN');
      setQuantity('');
      setReason('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Adjustment fail ho gayi'),
  });

  const exportCSV = () => {
    if (filteredAdjustments.length === 0) return toast.error('No data');
    const headers = ['Date', 'Type', 'Product', 'Quantity', 'Unit', 'Reason', 'Note', 'By'];
    const rows = filteredAdjustments.map((a: any) => [
      new Date(a.createdAt).toLocaleString('en-PK'),
      typeConfig[a.type as AdjustmentType]?.label || a.type,
      a.product.name,
      formatQty(a.quantity),
      a.product.unit,
      a.reason || '',
      a.note || '',
      a.createdBy?.fullName || 'System',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" /> Manual Stock Control
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">Stock Adjustments</h2>
          <p className="mt-2 text-sm text-white/80">
            Damage, loss, ya counting correction ke liye stock manually adjust karein.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats.today} icon={Calendar} color="blue" />
        <StatCard label="Total Adjustments" value={stats.total} icon={ClipboardCheck} color="violet" />
        <StatCard label="Total Damaged" value={formatQty(stats.damaged)} icon={ShieldAlert} color="rose" />
        <StatCard label="Total Lost" value={formatQty(stats.lost)} icon={FileWarning} color="amber" />
      </section>

      <section className="grid xl:grid-cols-[440px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">New Adjustment</h3>
              <p className="text-sm text-slate-500">Stock manually adjust karein</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Product *</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductId(''); }}
                  placeholder="Search product..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !productId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setProductId(p.id); setProductSearch(p.name); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition"
                    >
                      <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.sku || 'No SKU'} • Stock: <span className="font-bold text-emerald-700">{formatQty(p.stock)} {p.unit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <div className="font-bold text-sm text-slate-900">{selectedProduct.name}</div>
                  <div className="text-xs text-blue-700 font-bold mt-0.5">
                    Current Stock: {formatQty(selectedProduct.stock)} {selectedProduct.unit}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Adjustment Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AdjustmentType)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="ADJUSTMENT_IN">📈 Stock In (+) — Counting correction</option>
                <option value="ADJUSTMENT_OUT">📉 Stock Out (−) — Counting correction</option>
                <option value="DAMAGE">💥 Damage — Saamaan kharab</option>
                <option value="LOSS">❓ Loss — Chori / kho gaya</option>
              </select>
            </div>

            <Input
              label="Quantity *"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="5"
              hint="Decimal allowed (e.g. 2.5 kg)"
            />
            <Input
              label="Reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged in transport"
            />
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details"
            />

            <Button
              className="w-full"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!productId) return toast.error('Product select karein');
                if (!Number(quantity) || Number(quantity) <= 0) return toast.error('Valid quantity likhein');
                if (!reason.trim()) return toast.error('Reason likhein');
                createMutation.mutate({
                  productId,
                  type,
                  quantity: Number(quantity),
                  reason: reason.trim(),
                  note: note.trim() || undefined,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Save Adjustment
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Adjustment History</h3>
                <p className="text-sm text-slate-500">{filteredAdjustments.length} of {adjustments.length} adjustments</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search..."
                    className="h-9 w-48 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                {filteredAdjustments.length > 0 && (
                  <button onClick={exportCSV} className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  historyFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setHistoryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                    historyFilter === key ? cfg.tone + ' shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAdjustments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <ClipboardCheck className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">
                {historySearch || historyFilter !== 'all' ? 'No matches' : 'No adjustments yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {historySearch || historyFilter !== 'all' ? 'Try different filter' : 'Pehla adjustment add karein'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredAdjustments.map((a: any) => {
                const cfg = typeConfig[a.type as AdjustmentType];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="px-6 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{a.product.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.tone}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 mt-0.5">{a.reason}</div>
                          {a.note && <div className="text-xs text-slate-500 mt-0.5 italic">{a.note}</div>}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(a.createdAt)}
                            </span>
                            {a.createdBy && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <UserIcon className="h-2.5 w-2.5" />
                                  {a.createdBy.fullName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-extrabold text-lg ${cfg.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {cfg.isPositive ? '+' : '−'}{formatQty(a.quantity)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">{a.product.unit}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
