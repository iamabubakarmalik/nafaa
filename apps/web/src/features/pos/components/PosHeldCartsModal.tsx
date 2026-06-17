import { X, Pause, User, PlayCircle, Trash2 } from 'lucide-react';
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
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

export function PosHeldCartsModal({ heldCarts, onResume, onDelete, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900">Held Carts</h3>
              <p className="text-xs text-slate-600">
                {heldCarts.length} cart{heldCarts.length !== 1 ? 's' : ''} on hold
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {heldCarts.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Pause className="h-12 w-12 mx-auto opacity-30 mb-2" />
              <p className="font-bold">No held carts</p>
              <p className="text-xs mt-1">Hold a cart to switch between customers</p>
            </div>
          ) : (
            heldCarts.map((held) => (
              <div key={held.id} className="rounded-2xl border-2 border-slate-200 hover:border-amber-400 p-3 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3.5 w-3.5 text-violet-600" />
                      <div className="font-bold text-slate-900 truncate">{held.customerName}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {held.items.length} items • Held {formatRelative(held.heldAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700">{formatPKR(held.total)}</div>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => onResume(held)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <PlayCircle className="h-3 w-3" /> Resume
                      </button>
                      <button
                        onClick={() => onDelete(held.id)}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
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
