import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Search, ScanLine, Check, Package, AlertCircle,
  Smartphone, ShieldCheck, Sparkles,
} from 'lucide-react';
import { imeiApi, type ProductImei } from '../api/imei.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

interface Props {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  onSelect: (imei: ProductImei) => void;
  onClose: () => void;
  /** Optional: already selected IMEIs to disable */
  excludeIds?: string[];
}

export function ImeiPickerModal({
  productId, productName, variantId, variantName, onSelect, onClose, excludeIds = [],
}: Props) {
  const [search, setSearch] = useState('');

  const { data: imeis = [], isLoading } = useQuery({
    queryKey: ['imei-available', productId, variantId],
    queryFn: () => imeiApi.available(productId, variantId),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return imeis;
    return imeis.filter(
      (i) =>
        i.imei1.toLowerCase().includes(q) ||
        (i.imei2 || '').toLowerCase().includes(q) ||
        (i.serialNumber || '').toLowerCase().includes(q) ||
        (i.color || '').toLowerCase().includes(q),
    );
  }, [imeis, search]);

  const excludedSet = new Set(excludeIds);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">
                Select IMEI
              </div>
              <h3 className="font-bold text-slate-900 truncate">{productName}</h3>
              {variantName && (
                <p className="text-xs text-violet-700 font-semibold truncate">
                  {variantName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 transition"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Available
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">{imeis.length}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Filtered
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{filtered.length}</div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <ScanLine className="h-4 w-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan or type IMEI / Serial..."
              className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 pl-10 pr-9 text-sm font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* IMEI list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-3">
                <AlertCircle className="h-7 w-7 text-rose-600" />
              </div>
              <div className="font-bold text-slate-900">
                {imeis.length === 0 ? 'No IMEIs available' : 'No matches found'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {imeis.length === 0
                  ? 'Add IMEIs from product page first'
                  : `Try different search`}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((imei) => {
                const excluded = excludedSet.has(imei.id);
                return (
                  <button
                    key={imei.id}
                    onClick={() => !excluded && onSelect(imei)}
                    disabled={excluded}
                    className={`w-full text-left rounded-2xl border-2 p-4 transition ${
                      excluded
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 text-base">
                            {imei.imei1}
                          </span>
                          {excluded && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                              IN CART
                            </span>
                          )}
                          {imei.color && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                              {imei.color}
                            </span>
                          )}
                        </div>

                        {imei.imei2 && (
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            IMEI 2: {imei.imei2}
                          </div>
                        )}
                        {imei.serialNumber && (
                          <div className="text-xs text-slate-500 font-mono">
                            S/N: {imei.serialNumber}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                          {imei.warrantyMonths && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">
                              <ShieldCheck className="h-3 w-3" />
                              {imei.warrantyMonths}m warranty
                            </span>
                          )}
                          {imei.purchasedAt && (
                            <span className="text-slate-500">
                              Stocked: {new Date(imei.purchasedAt).toLocaleDateString('en-PK')}
                            </span>
                          )}
                        </div>
                      </div>

                      {!excluded && (
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

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
          <div className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            FIFO order — oldest stock first
          </div>
        </div>
      </div>
    </div>
  );
}
