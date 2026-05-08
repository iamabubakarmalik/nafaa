import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Search, Package, Plus, Minus, X,
  Receipt, ArrowLeftRight, AlertCircle,
} from 'lucide-react';
import { returnsApi } from '@/api/returns.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

interface ReturnLine {
  saleItemId: string;
  productName: string;
  unit: string;
  price: number;
  maxQty: number;
  quantity: number;
}

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [saleNumberQuery, setSaleNumberQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  const { data: sales = [] } = useQuery({
    queryKey: ['sales-for-return'],
    queryFn: salesApi.list,
  });

  const { data: returns = [] } = useQuery({
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
      toast.success('Return processed successfully');
      setSelectedSaleId(null);
      setReturnLines([]);
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales-for-return'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Return fail'),
  });

  const filteredSales = sales
    .filter((s) =>
      saleNumberQuery
        ? s.saleNumber.toLowerCase().includes(saleNumberQuery.toLowerCase())
        : true,
    )
    .slice(0, 10);

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

    setReturnLines((prev) => {
      if (prev.find((l) => l.saleItemId === item.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          saleItemId: item.id,
          productName: item.product.name,
          unit: item.product.unit,
          price: item.price,
          maxQty: remaining,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (saleItemId: string, delta: number) => {
    setReturnLines((prev) =>
      prev
        .map((l) =>
          l.saleItemId === saleItemId
            ? {
                ...l,
                quantity: Math.max(1, Math.min(l.maxQty, l.quantity + delta)),
              }
            : l,
        ),
    );
  };

  const removeLine = (saleItemId: string) => {
    setReturnLines((prev) => prev.filter((l) => l.saleItemId !== saleItemId));
  };

  const totalRefund = returnLines.reduce(
    (s, l) => s + l.price * l.quantity,
    0,
  );

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <RotateCcw className="h-3.5 w-3.5" />
            Sales Returns / Refunds
          </div>
          <h2 className="mt-3 text-3xl font-bold">Returns</h2>
          <p className="mt-2 text-sm text-white/80">
            Customer maal wapas la sakta hai, refund process karein.
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Sale Search</h3>
          <p className="text-sm text-slate-500 mt-1">Sale number ya customer search karo</p>

          <div className="relative mt-4">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="NF-12345678"
              value={saleNumberQuery}
              onChange={(e) => setSaleNumberQuery(e.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[300px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {filteredSales.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                Sales nahi mili
              </div>
            ) : (
              filteredSales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSale(s.id)}
                  className={`w-full px-5 py-3 text-left hover:bg-slate-50 transition ${
                    selectedSaleId === s.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{s.saleNumber}</div>
                      <div className="text-xs text-slate-500">
                        {s.customer?.name || 'Walk-in'} • {formatDate(s.soldAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatPKR(s.total)}</div>
                      {s.status === 'PARTIALLY_RETURNED' && (
                        <span className="text-[10px] text-amber-700 font-semibold">PARTIAL</span>
                      )}
                      {s.status === 'FULLY_RETURNED' && (
                        <span className="text-[10px] text-rose-700 font-semibold">RETURNED</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedSale && (
            <div className="mt-5">
              <h4 className="font-semibold text-slate-900">Items in Sale</h4>
              <div className="mt-2 space-y-2 max-h-[280px] overflow-y-auto">
                {selectedSale.items.map((item: any) => {
                  const remaining = item.quantity - (item.returnedQty || 0);
                  const alreadyAdded = returnLines.find((l) => l.saleItemId === item.id);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Sold: {item.quantity} • Returned: {item.returnedQty || 0} •
                          Available: {remaining} • {formatPKR(item.price)}
                        </div>
                      </div>
                      <button
                        disabled={remaining <= 0 || !!alreadyAdded}
                        onClick={() => addLine(item)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                      >
                        {alreadyAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Return Items</h3>
              <p className="text-sm text-slate-500">Quantity adjust karein</p>
            </div>
          </div>

          {returnLines.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-500">
              Left side se sale select karein, phir items add karein
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {returnLines.map((line) => (
                <div key={line.saleItemId} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{line.productName}</div>
                      <div className="text-xs text-slate-500">
                        {formatPKR(line.price)} × {line.quantity} = {formatPKR(line.price * line.quantity)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Max: {line.maxQty}</div>
                    </div>
                    <button
                      onClick={() => removeLine(line.saleItemId)}
                      className="text-rose-600 hover:bg-rose-50 rounded-lg p-1.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQty(line.saleItemId, -1)}
                      className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-semibold">{line.quantity}</span>
                    <button
                      onClick={() => updateQty(line.saleItemId, 1)}
                      className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Input
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged, wrong item..."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
          />

          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between">
            <span className="font-semibold text-rose-900">Total Refund</span>
            <span className="text-2xl font-bold text-rose-900">{formatPKR(totalRefund)}</span>
          </div>

          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
            loading={createMutation.isPending}
            onClick={handleSubmit}
          >
            <RotateCcw className="h-4 w-4" />
            Process Return
          </Button>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Return History</h3>
          <p className="text-sm text-slate-500">Last 50 returns</p>
        </div>

        {returns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <RotateCcw className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">No returns yet</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-6 py-4 font-medium">Return #</th>
                  <th className="text-left px-6 py-4 font-medium">Sale</th>
                  <th className="text-left px-6 py-4 font-medium">Customer</th>
                  <th className="text-left px-6 py-4 font-medium">Items</th>
                  <th className="text-left px-6 py-4 font-medium">Refund</th>
                  <th className="text-left px-6 py-4 font-medium">Method</th>
                  <th className="text-left px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs">{r.returnNumber}</td>
                    <td className="px-6 py-3 font-medium">{r.sale.saleNumber}</td>
                    <td className="px-6 py-3">{r.sale.customer?.name || 'Walk-in'}</td>
                    <td className="px-6 py-3">{r.items.length}</td>
                    <td className="px-6 py-3 font-bold text-rose-700">
                      {formatPKR(r.refundAmount)}
                    </td>
                    <td className="px-6 py-3">{r.refundMethod}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(r.returnedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
