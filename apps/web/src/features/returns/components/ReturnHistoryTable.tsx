import { useState, useMemo } from 'react';
import {
  Search, Download, RotateCcw, Banknote, CreditCard,
  Smartphone, Building2, Zap, Layers, Scissors,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';
import { formatDate } from './return-types';
import type { SaleReturn } from '@/api/returns.api';
import { toast } from 'sonner';

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building2,
};

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank',
};

interface Props {
  returns: SaleReturn[];
  loading: boolean;
}

export function ReturnHistoryTable({ returns, loading }: Props) {
  const [historySearch, setHistorySearch] = useState('');

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

  const exportReturnsCSV = () => {
    if (filteredReturns.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Return #', 'Sale #', 'Customer', 'Items', 'Refund', 'Method', 'Reason', 'Date', 'Cut Pieces'];
    const rows = filteredReturns.map((r) => [
      r.returnNumber,
      r.sale.saleNumber,
      r.sale.customer?.name || 'Walk-in',
      r.items.length,
      r.refundAmount.toFixed(2),
      paymentLabels[r.refundMethod] || r.refundMethod,
      r.reason || '',
      new Date(r.returnedAt).toLocaleString('en-PK'),
      (r.createdCutPieces || []).join('; '),
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

  return (
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
            <button
              onClick={exportReturnsCSV}
              className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
            <RotateCcw className="h-7 w-7 text-slate-400" />
          </div>
          <h4 className="mt-4 text-lg font-bold text-slate-900">
            {historySearch ? 'No matches' : 'No returns yet'}
          </h4>
          <p className="text-sm text-slate-500 mt-1">
            {historySearch ? 'Different search try karein' : 'Returns process hote hi yahan dikhenge'}
          </p>
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
                <th className="text-center px-6 py-3 font-bold text-xs uppercase tracking-wider">Cut Pieces</th>
                <th className="text-right px-6 py-3 font-bold text-xs uppercase tracking-wider">Refund</th>
                <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Method</th>
                <th className="text-left px-6 py-3 font-bold text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((r) => {
                const Icon = paymentIcons[r.refundMethod] || CreditCard;
                const cutPiecesCount = r.createdCutPieces?.length ?? 0;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 font-mono text-xs font-bold text-slate-900">
                      {r.returnNumber}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs font-bold text-blue-700">
                      {r.sale.saleNumber}
                    </td>
                    <td className="px-6 py-3 text-slate-700 font-semibold">
                      {r.sale.customer?.name || 'Walk-in'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {r.items.length}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {cutPiecesCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold"
                          title={r.createdCutPieces?.join(', ')}
                        >
                          <Scissors className="h-2.5 w-2.5" />
                          {cutPiecesCount}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-extrabold text-rose-700">
                      {formatPKR(r.refundAmount)}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        <Icon className="h-3 w-3" />
                        {paymentLabels[r.refundMethod] || r.refundMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{formatDate(r.returnedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
