import { useState, useMemo } from 'react';
import { X, Pause, PlayCircle, Trash2, Receipt, Clock, Sparkles, Search, User } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { HeldCart } from './pos-types';

interface Props {
  heldCarts: HeldCart[];
  onResume: (held: HeldCart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const formatRelative = (date?: string | number) => {
  if (!date) return 'Never';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

export function PosHeldCartsModal({ heldCarts, onResume, onDelete, onClose }: Props) {
  const [search, setSearch] = useState('');

  const totalValue = useMemo(() => heldCarts.reduce((s, h) => s + h.total, 0), [heldCarts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return heldCarts;
    return heldCarts.filter(
      (h) =>
        h.customerName.toLowerCase().includes(q) ||
        h.items.some((item) =>
          item.name.toLowerCase().includes(q) ||
          (item.variantName || '').toLowerCase().includes(q)
        )
    );
  }, [heldCarts, search]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Pause className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Multi-Cart Manager
                </div>
                <h3 className="font-extrabold text-xl leading-tight">Held Carts</h3>
                <p className="text-sm text-white/80 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                  <span>{heldCarts.length} cart{heldCarts.length !== 1 ? 's' : ''}</span>
                  {totalValue > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="text-amber-300 font-extrabold">{formatPKR(totalValue)} total value</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        {heldCarts.length > 3 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer or product..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-11 text-base font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30 min-h-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center shadow-inner">
                <Pause className="h-10 w-10 text-slate-400" />
              </div>
              <p className="mt-4 font-extrabold text-slate-900 text-lg">
                {search ? 'No matching carts' : 'No held carts'}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-semibold">
                {search ? 'Try different search' : 'Hold a cart to switch customers quickly'}
              </p>
            </div>
          ) : (
            filtered.map((held) => {
              const totalQty = held.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <div
                  key={held.id}
                  className="group rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-400 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-base font-extrabold shadow-md shrink-0">
                            {held.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-base truncate flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                              {held.customerName}
                            </div>
                            <div className="text-xs text-slate-500 font-bold flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="inline-flex items-center gap-0.5">
                                <Receipt className="h-3 w-3" />
                                {held.items.length} line{held.items.length !== 1 ? 's' : ''}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Sparkles className="h-3 w-3" />
                                {totalQty.toFixed(totalQty % 1 === 0 ? 0 : 2)} qty
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {formatRelative(held.heldAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-12 flex flex-wrap gap-1">
                          {held.items.slice(0, 3).map((item, i) => (
                            <span
                              key={i}
                              className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[160px]"
                            >
                              {item.name}
                              {item.variantName && ` (${item.variantName})`}
                              {' × '}
                              {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)}
                            </span>
                          ))}
                          {held.items.length > 3 && (
                            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              +{held.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">
                          {formatPKR(held.total)}
                        </div>
                        <div className="flex gap-1 mt-2 justify-end">
                          <button
                            onClick={() => onResume(held)}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md transition"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Resume
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete held cart for ${held.customerName}?`)) {
                                onDelete(held.id);
                              }
                            }}
                            className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER STATS */}
        {heldCarts.length > 0 && (
          <div className="border-t-2 border-slate-200 bg-white px-5 py-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Tip: Held carts persist offline
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete ALL ${heldCarts.length} held carts?`)) {
                    heldCarts.forEach((h) => onDelete(h.id));
                  }
                }}
                className="text-xs font-extrabold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
