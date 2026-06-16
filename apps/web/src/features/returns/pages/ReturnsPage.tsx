import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Search, Package, Plus, Minus, X, Receipt,
  ArrowLeftRight, Calendar, User, Filter, Download, AlertTriangle,
  CheckCircle2, Banknote, CreditCard, Smartphone, Building2, Zap,
  Sparkles, RefreshCw, ChevronRight, MessageCircle,
} from 'lucide-react';
import { returnsApi } from '@/api/returns.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank',
};

interface ReturnLine {
  saleItemId: string;
  productName: string;
  variantName?: string;
  variantImage?: string;
  variantColorHex?: string;
  unit: string;
  price: number;
  maxQty: number;
  quantity: number;
}

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [saleQuery, setSaleQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const { data: sales = [] } = useQuery({
    queryKey: ['sales-for-return'],
    queryFn: () => salesApi.list(),
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: returnsApi.list,
  });

  const { data: selectedSale } = useQuery({
    queryKey: ['sale-detail-for-return', selectedSaleId],
    queryFn: () => salesApi.getOne(selectedSaleId!),
    enabled: !!selectedSaleId,
  });

  const createMutation = useMutation({
    mutationFn: returnsApi.create,
    onSuccess: () => {
      toast.success('Return processed successfully', {
        description: 'Stock wapas aa gaya aur refund record ho gaya',
      });
      setSelectedSaleId(null);
      setReturnLines([]);
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales-for-return'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Return fail'),
  });

  const filteredSales = useMemo(() => {
    const q = saleQuery.toLowerCase().trim();
    let result = sales.filter((s) => s.status !== 'FULLY_RETURNED' && s.status !== 'VOIDED');
    if (q) {
      result = result.filter(
        (s) =>
          s.saleNumber.toLowerCase().includes(q) ||
          s.customer?.name.toLowerCase().includes(q) ||
          s.customer?.phone?.toLowerCase().includes(q),
      );
    }
    return result.slice(0, 15);
  }, [sales, saleQuery]);

  const filteredReturns = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return returns;
    return returns.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.sale.saleNumber.toLowerCase().includes(q) ||
        r.sale.customer?.name?.toLowerCase().includes(q),
    );
  }, [returns, historySearch]);

  const loadSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setReturnLines([]);
  };

  const addLine = (item: any) => {
    const remaining = item.quantity - (item.returnedQty || 0);
    if (remaining <= 0) {
      toast.error('Already fully returned');
      return;
    }
    if (returnLines.find((l) => l.saleItemId === item.id)) {
      toast.error('Already added');
      return;
    }
    const variant = item.variantLink?.variant;
    setReturnLines((prev) => [
      ...prev,
      {
        saleItemId: item.id,
        productName: item.product.name,
        variantName: variant?.name,
        variantImage: variant?.imageUrl,
        variantColorHex: variant?.colorHex,
        unit: item.product.unit,
        price: item.price,
        maxQty: remaining,
        quantity: Math.min(1, remaining),
      },
    ]);
  };

  const updateQty = (saleItemId: string, newQty: number) => {
    setReturnLines((prev) =>
      prev.map((l) =>
        l.saleItemId === saleItemId
          ? { ...l, quantity: Math.max(0.01, Math.min(l.maxQty, newQty)) }
          : l,
      ),
    );
  };

  const removeLine = (saleItemId: string) => {
    setReturnLines((prev) => prev.filter((l) => l.saleItemId !== saleItemId));
  };

  const totalRefund = returnLines.reduce((s, l) => s + l.price * l.quantity, 0);

  const handleSubmit = () => {
    if (!selectedSaleId) return toast.error('Sale select karein');
    if (returnLines.length === 0) return toast.error('Items add karein');

    createMutation.mutate({
      saleId: selectedSaleId,
      reason: reason.trim() || undefined,
      refundMethod,
      notes: notes.trim() || undefined,
      items: returnLines.map((l) => ({
        saleItemId: l.saleItemId,
        quantity: l.quantity,
      })),
    });
  };

  const exportReturnsCSV = () => {
    if (filteredReturns.length === 0) return toast.error('No data');
    const headers = ['Return #', 'Sale #', 'Customer', 'Items', 'Refund', 'Method', 'Reason', 'Date'];
    const rows = filteredReturns.map((r) => [
      r.returnNumber,
      r.sale.saleNumber,
      r.sale.customer?.name || 'Walk-in',
      r.items.length,
      r.refundAmount.toFixed(2),
      paymentLabels[r.refundMethod] || r.refundMethod,
      r.reason || '',
      new Date(r.returnedAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Returns exported');
  };

  const stats = useMemo(() => {
    const totalRefunded = returns.reduce((s, r) => s + r.refundAmount, 0);
    const today = new Date().toDateString();
    const todayReturns = returns.filter((r) => new Date(r.returnedAt).toDateString() === today);
    return {
      totalReturns: returns.length,
      totalRefunded,
      todayReturns: todayReturns.length,
      todayRefunded: todayReturns.reduce((s, r) => s + r.refundAmount, 0),
    };
  }, [returns]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 text-white p-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
            Sales Returns & Refunds
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">Returns Management</h2>
          <p className="mt-2 text-sm text-white/80">
            Customer maal wapas la sakta hai — stock automatic restore, refund record, customer credit adjust.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Aaj ke Returns</div>
              <div className="mt-2 text-2xl font-extrabold text-orange-700">{stats.todayReturns}</div>
              <div className="text-xs text-orange-600 font-semibold mt-1">Today's count</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Aaj ka Refund</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">{formatPKR(stats.todayRefunded)}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">Refunded today</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <RotateCcw className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Returns</div>
              <div className="mt-2 text-2xl font-extrabold text-violet-700">{stats.totalReturns}</div>
              <div className="text-xs text-violet-600 font-semibold mt-1">All time</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Refunded</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatPKR(stats.totalRefunded)}</div>
              <div className="text-xs text-slate-600 font-semibold mt-1">Lifetime refunds</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-lg">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Sale Search</h3>
              <p className="text-sm text-slate-500">Sale number ya customer name search karo</p>
            </div>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="NF-12345678 ya customer name..."
              value={saleQuery}
              onChange={(e) => setSaleQuery(e.target.value)}
            />
            {saleQuery && (
              <button onClick={() => setSaleQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="mt-4 max-h-[320px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredSales.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-2">
                  <Receipt className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">No sales found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {saleQuery ? 'Different search try karein' : 'POS se sales add karein'}
                </p>
              </div>
            ) : (
              filteredSales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSale(s.id)}
                  className={`w-full px-5 py-3 text-left hover:bg-slate-50 transition group ${
                    selectedSaleId === s.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(s.customer?.name || 'W').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm font-mono">{s.saleNumber}</span>
                        {s.status === 'PARTIALLY_RETURNED' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">PARTIAL</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {s.customer?.name || 'Walk-in'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(s.soldAt)} • {s.items.length} items
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-slate-900 text-sm">{formatPKR(s.total)}</div>
                      <ChevronRight className="h-3 w-3 text-slate-300 ml-auto mt-1 group-hover:text-orange-500" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedSale && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  Sale Items
                </h4>
                <span className="text-xs text-slate-500 font-bold">{selectedSale.items.length} items</span>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {selectedSale.items.map((item: any) => {
                  const remaining = item.quantity - (item.returnedQty || 0);
                  const alreadyAdded = returnLines.find((l) => l.saleItemId === item.id);
                  const variant = item.variantLink?.variant;
                  return (
                    <div key={item.id} className={`rounded-xl border-2 p-3 transition ${
                      remaining <= 0 ? 'border-slate-200 bg-slate-50 opacity-60' :
                      alreadyAdded ? 'border-emerald-300 bg-emerald-50' :
                      'border-slate-200 bg-white hover:border-blue-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {variant?.imageUrl ? (
                            <img src={variant.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : variant?.colorHex ? (
                            <div className="h-full w-full" style={{ backgroundColor: variant.colorHex }} />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate">{item.product.name}</div>
                          {variant && (
                            <div className="text-[11px] font-bold text-violet-700 flex items-center gap-1">
                              {variant.colorHex && (
                                <span className="h-2 w-2 rounded-full border border-slate-300" style={{ backgroundColor: variant.colorHex }} />
                              )}
                              {variant.name}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Sold: {formatQty(item.quantity)} • Returned: {formatQty(item.returnedQty || 0)} • Available: <span className="font-bold text-emerald-700">{formatQty(remaining)}</span> {item.product.unit}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-700 mt-0.5">{formatPKR(item.price)} / {item.product.unit}</div>
                        </div>
                        <button
                          disabled={remaining <= 0 || !!alreadyAdded}
                          onClick={() => addLine(item)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 transition ${
                            alreadyAdded ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                            remaining <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                            'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {alreadyAdded ? '✓ Added' : remaining <= 0 ? 'Fully Returned' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Return Items</h3>
              <p className="text-sm text-slate-500">Quantity adjust karein aur reason add karein</p>
            </div>
          </div>

          {returnLines.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
              <ArrowLeftRight className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No items added yet</p>
              <p className="text-xs text-slate-500 mt-1">Left side se sale select karein aur items add karein</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {returnLines.map((line) => (
                <div key={line.saleItemId} className="rounded-xl border-2 border-orange-200 bg-orange-50/50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                      {line.variantImage ? (
                        <img src={line.variantImage} alt="" className="h-full w-full object-cover" />
                      ) : line.variantColorHex ? (
                        <div className="h-full w-full" style={{ backgroundColor: line.variantColorHex }} />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">{line.productName}</div>
                      {line.variantName && (
                        <div className="text-[11px] font-bold text-violet-700 flex items-center gap-1">
                          {line.variantColorHex && (
                            <span className="h-2 w-2 rounded-full border border-slate-300" style={{ backgroundColor: line.variantColorHex }} />
                          )}
                          {line.variantName}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {formatPKR(line.price)} × {formatQty(line.quantity)} = <span className="font-extrabold text-rose-700">{formatPKR(line.price * line.quantity)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Max returnable: {formatQty(line.maxQty)} {line.unit}</div>
                    </div>
                    <button onClick={() => removeLine(line.saleItemId)} className="text-rose-600 hover:bg-rose-100 rounded-lg p-1.5 shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => updateQty(line.saleItemId, line.quantity - 1)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={line.maxQty}
                      value={line.quantity}
                      onChange={(e) => updateQty(line.saleItemId, parseFloat(e.target.value) || 0.01)}
                      className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-bold focus:outline-none focus:border-orange-500"
                    />
                    <button onClick={() => updateQty(line.saleItemId, line.quantity + 1)} disabled={line.quantity >= line.maxQty} className="h-8 w-8 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white flex items-center justify-center">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => updateQty(line.saleItemId, line.maxQty)} className="px-2.5 h-8 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold">
                      Max
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged, wrong item..." />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Refund Method</label>
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold">
                <option value="CASH">💵 Cash</option>
                <option value="JAZZCASH">📱 JazzCash</option>
                <option value="EASYPAISA">⚡ EasyPaisa</option>
                <option value="CARD">💳 Card</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
              </select>
            </div>
          </div>
          <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" />

          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-rose-700 font-bold">Total Refund</div>
              <div className="text-3xl font-extrabold text-rose-900 mt-1">{formatPKR(totalRefund)}</div>
              <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                {returnLines.length} item{returnLines.length !== 1 ? 's' : ''} • via {paymentLabels[refundMethod]}
              </div>
            </div>
            <RotateCcw className="h-12 w-12 text-rose-300" />
          </div>

          <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg" loading={createMutation.isPending} onClick={handleSubmit} disabled={returnLines.length === 0}>
            <RotateCcw className="h-4 w-4" />
            Process Return • {formatPKR(totalRefund)}
          </Button>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Return History</h3>
            <p className="text-sm text-slate-500">{filteredReturns.length} returns</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search returns..."
                className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            {filteredReturns.length > 0 && (
              <button onClick={exportReturnsCSV} className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Export
              </button>
            )}
          </div>
        </div>

        {returnsLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <RotateCcw className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-900">{historySearch ? 'No matches' : 'No returns yet'}</h4>
            <p className="text-sm text-slate-500 mt-1">{historySearch ? 'Different search try karein' : 'Returns process hote hi yahan dikhenge'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Return #</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Sale</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider">Items</th>
                  <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Refund</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Method</th>
                  <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map((r) => {
                  const Icon = paymentIcons[r.refundMethod] || CreditCard;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 font-mono text-xs font-bold text-slate-900">{r.returnNumber}</td>
                      <td className="px-6 py-3 font-mono text-xs font-bold text-blue-700">{r.sale.saleNumber}</td>
                      <td className="px-6 py-3 text-slate-700 font-semibold">{r.sale.customer?.name || 'Walk-in'}</td>
                      <td className="px-6 py-3 text-center"><span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">{r.items.length}</span></td>
                      <td className="px-6 py-3 text-right font-extrabold text-rose-700">{formatPKR(r.refundAmount)}</td>
                      <td className="px-6 py-3"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold"><Icon className="h-3 w-3" />{paymentLabels[r.refundMethod] || r.refundMethod}</span></td>
                      <td className="px-6 py-3 text-slate-600 text-xs">{formatDate(r.returnedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
