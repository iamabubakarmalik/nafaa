import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning,
  Search, X, Download, Filter, Package, Calendar, User as UserIcon,
  FileSpreadsheet, FileText, RefreshCw, BarChart3, TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { stockAdjustmentsApi, type AdjustmentType } from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<AdjustmentType, { label: string; tone: string; icon: any; color: string; hex: string; isPositive: boolean }> = {
  ADJUSTMENT_IN: { label: 'Stock In', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ArrowUp, color: '#16a34a', hex: '#10b981', isPositive: true },
  ADJUSTMENT_OUT: { label: 'Stock Out', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: ArrowDown, color: '#2563eb', hex: '#3b82f6', isPositive: false },
  DAMAGE: { label: 'Damaged', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: ShieldAlert, color: '#e11d48', hex: '#ef4444', isPositive: false },
  LOSS: { label: 'Loss', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: FileWarning, color: '#d97706', hex: '#f59e0b', isPositive: false },
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

  const { data: adjustments = [], refetch, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const products = productsData?.items ?? [];
    if (!q) return products.slice(0, 30);
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
    if (historyFilter !== 'all') result = result.filter((a) => a.type === historyFilter);
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

  // Type breakdown chart
  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of adjustments) {
      map.set(a.type, (map.get(a.type) || 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({
      name: typeConfig[type as AdjustmentType]?.label || type,
      value: count,
      color: typeConfig[type as AdjustmentType]?.hex || '#64748b',
    }));
  }, [adjustments]);

  // Top affected products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const a of adjustments as any[]) {
      const existing = map.get(a.product.id) || { name: a.product.name, total: 0, count: 0 };
      existing.total += a.quantity;
      existing.count += 1;
      map.set(a.product.id, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
        total: p.total,
        count: p.count,
      }));
  }, [adjustments]);

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      toast.success('Stock adjustment saved');
      setProductId(''); setProductSearch(''); setType('ADJUSTMENT_IN');
      setQuantity(''); setReason(''); setNote('');
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
      a.product.name, formatQty(a.quantity), a.product.unit,
      a.reason || '', a.note || '', a.createdBy?.fullName || 'System',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" />
              Manual Stock Control
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Stock Adjustments</h2>
            <p className="mt-2 text-sm text-white/80">
              Damage, loss, counting correction — manual stock control with full analytics
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20">
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats.today} icon={Calendar} color="blue" />
        <StatCard label="Total Adjustments" value={stats.total} icon={ClipboardCheck} color="violet" />
        <StatCard label="Total Damaged" value={formatQty(stats.damaged)} icon={ShieldAlert} color="rose" />
        <StatCard label="Total Lost" value={formatQty(stats.lost)} icon={FileWarning} color="amber" />
      </section>

      {/* ═══ CHARTS ═══ */}
      {adjustments.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-6 print:hidden">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top Affected Products</h3>
                <p className="text-xs text-slate-500">Most adjusted items</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="total" name="Quantity" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">By Type</h3>
                <p className="text-xs text-slate-500">Adjustment distribution</p>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    cx="50%" cy="45%" outerRadius={90} innerRadius={45}
                    dataKey="value"
                    label={(entry: any) => `${entry.value}`}
                    labelLine={false}
                  >
                    {typeBreakdown.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FORM + HISTORY ═══ */}
      <section className="grid xl:grid-cols-[440px_1fr] gap-6">
        <div className="rounded-3xl bg-white border-2 border-blue-200 shadow-sm p-6 h-fit sticky top-6 print:hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
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
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !productId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
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
                <div className="mt-2 rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                  <div className="font-bold text-sm text-slate-900">{selectedProduct.name}</div>
                  <div className="text-xs text-blue-700 font-bold mt-0.5">
                    Current Stock: {formatQty(selectedProduct.stock)} {selectedProduct.unit}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Adjustment Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = type === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setType(key)}
                      className={`px-3 py-2.5 rounded-xl border-2 transition text-left ${
                        active ? cfg.tone + ' border-2 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-extrabold">{cfg.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!productId) return toast.error('Product select karein');
                if (!Number(quantity) || Number(quantity) <= 0) return toast.error('Valid quantity likhein');
                if (!reason.trim()) return toast.error('Reason likhein');
                createMutation.mutate({
                  productId, type, quantity: Number(quantity),
                  reason: reason.trim(), note: note.trim() || undefined,
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
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-48 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500"
                />
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
                    historyFilter === key ? cfg.tone + ' border-2 shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900">No adjustments yet</h4>
              <p className="text-xs text-slate-500 mt-1">Form se pehla adjustment add karein</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.tone}`}>
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

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
