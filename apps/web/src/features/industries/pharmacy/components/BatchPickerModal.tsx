import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Search, Pill, Check, AlertCircle, Calendar, FileCheck, Sparkles, AlertTriangle,
} from 'lucide-react';
import { batchesApi, type ProductBatch } from '../api/batches.api';
import { formatPKR } from '@/lib/format';

interface Props {
  productId: string;
  productName: string;
  unit: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  onSelect: (batch: ProductBatch) => void;
  onClose: () => void;
}

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const expiry = new Date(date);
  const now = new Date();
  const diff = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function BatchPickerModal({
  productId, productName, unit, variantId, variantName, quantity, onSelect, onClose,
}: Props) {
  const [search, setSearch] = useState('');

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches-available', productId, variantId],
    queryFn: () => batchesApi.available(productId, variantId),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return batches;
    return batches.filter((b) =>
      b.batchNumber.toLowerCase().includes(q),
    );
  }, [batches, search]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shrink-0">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Select Batch</div>
              <h3 className="font-bold text-slate-900 truncate">{productName}</h3>
              {variantName && (
                <p className="text-xs text-violet-700 font-semibold truncate">{variantName}</p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Need: <strong className="text-rose-700">{quantity} {unit}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="h-4 w-4 text-rose-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch number..."
              className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50/30 pl-10 pr-3 text-sm font-mono focus:outline-none focus:border-rose-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-10 w-10 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-7 w-7 text-amber-600" />
              </div>
              <div className="font-bold text-slate-900">
                {batches.length === 0 ? 'No batches available' : 'No matches found'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {batches.length === 0 ? 'Add batches from product page' : 'Try different search'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((batch) => {
                const days = daysUntil(batch.expiryDate);
                const isExpired = days !== null && days < 0;
                const isExpiringSoon = days !== null && days >= 0 && days <= 30;
                const insufficient = batch.quantity < quantity;

                return (
                  <button
                    key={batch.id}
                    onClick={() => !isExpired && onSelect(batch)}
                    disabled={isExpired}
                    className={`group w-full text-left rounded-2xl border-2 p-4 transition ${
                      isExpired
                        ? 'bg-rose-50 border-rose-300 opacity-60 cursor-not-allowed'
                        : isExpiringSoon
                        ? 'bg-amber-50 border-amber-300 hover:border-amber-500 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-rose-500 hover:shadow-md hover:bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 text-base">
                            #{batch.batchNumber}
                          </span>
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              EXPIRED
                            </span>
                          )}
                          {!isExpired && isExpiringSoon && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                              {days}d left
                            </span>
                          )}
                          {insufficient && !isExpired && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                              ONLY {batch.quantity}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold">Stock</div>
                            <div className="font-bold text-slate-900">{batch.quantity} {unit}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold">Cost</div>
                            <div className="font-bold text-slate-900">{formatPKR(batch.costPrice)}</div>
                          </div>
                          {batch.expiryDate && (
                            <div className="col-span-2">
                              <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" /> Expiry
                              </div>
                              <div className={`font-bold ${isExpired ? 'text-rose-700' : isExpiringSoon ? 'text-amber-700' : 'text-slate-900'}`}>
                                {new Date(batch.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isExpired && (
                        <div className="shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
                            <Check className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-rose-50/40 text-center">
          <div className="text-[11px] text-slate-600 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            FEFO — Expiring soon shown first
          </div>
        </div>
      </div>
    </div>
  );
}
