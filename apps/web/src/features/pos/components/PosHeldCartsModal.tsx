import { X, Pause, User, PlayCircle, Trash2, Receipt, Clock, Sparkles } from 'lucide-react';
import { formatPKR } from '@/lib/format';
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
  const totalValue = heldCarts.reduce((s, h) => s + h.total, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Pause className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Held Sales
                </div>
                <h3 className="font-extrabold text-lg leading-tight">Held Carts</h3>
                <p className="text-[11px] text-white/80 font-semibold mt-0.5">
                  {heldCarts.length} cart{heldCarts.length !== 1 ? 's' : ''} on hold
                  {totalValue > 0 && (
                    <>
                      <span className="text-white/40 mx-1">•</span>
                      <span className="text-amber-300 font-extrabold">{formatPKR(totalValue)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ═══ LIST ═══ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-slate-50/30 to-white">
          {heldCarts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto flex items-center justify-center shadow-inner">
                <Pause className="h-10 w-10 text-slate-400" />
              </div>
              <p className="mt-4 font-extrabold text-slate-900 text-lg">No held carts</p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Hold a cart to switch between customers quickly
              </p>
            </div>
          ) : (
            heldCarts.map((held) => (
              <div
                key={held.id}
                className="group rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-400 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-sm font-extrabold shadow-md shrink-0">
                          {held.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{held.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="inline-flex items-center gap-0.5">
                              <Receipt className="h-2.5 w-2.5" />
                              {held.items.length} item{held.items.length !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatRelative(held.heldAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-11 flex flex-wrap gap-1">
                        {held.items.slice(0, 3).map((item, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                          >
                            {item.name}{item.variantName && ` (${item.variantName})`} ×{item.quantity}
                          </span>
                        ))}
                        {held.items.length > 3 && (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            +{held.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-extrabold text-emerald-700 leading-none tabular-nums">
                        {formatPKR(held.total)}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => onResume(held)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-md shadow-amber-500/30 transition"
                        >
                          <PlayCircle className="h-3 w-3" /> Resume
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete held cart for ${held.customerName}?`)) {
                              onDelete(held.id);
                            }
                          }}
                          className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
