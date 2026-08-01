import { ShoppingCart, X, Plus, Minus, Trash2, User, UserPlus,
  ChevronDown, Pause, Percent, ArrowRight, Flower2, Wand2, Truck } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

export interface CartLine {
  id: string; productId: string; name: string; image?: string;
  flowerType?: string; color?: string; colorHex?: string;
  unitPrice: number; quantity: number; baseStock: number; lineTotal: number;
  customization?: string; isCustomizable?: boolean;
}

interface Props {
  isMobile: boolean; onCloseMobile: () => void;
  cart: CartLine[]; itemCount: number; totalQty: number;
  subtotal: number; total: number; extraCharges: number;
  discountPct: number; setDiscountPct: (v: number) => void;
  hidePrices: boolean; customers: any[]; customerId: string;
  setCustomerId: (v: string) => void; onAddCustomer: () => void;
  onHold: () => void; onClear: () => void;
  onChangeQty: (id: string, d: number) => void;
  onSetQty: (id: string, q: number) => void;
  onRemove: (id: string) => void;
  onCustomize: (id: string, current?: string) => void;
  onProceed: () => void; canProceed: boolean;
  hasDelivery: boolean;
}

export function FloristPosCart(p: Props) {
  const cls = p.isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={cls}>
      <div className="shrink-0 bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {p.itemCount} lines • {p.totalQty} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {p.hidePrices ? '••••' : formatPKR(p.total)}
            </div>
            {p.extraCharges > 0 && !p.hidePrices && (
              <div className="text-xs font-extrabold text-emerald-300 mt-1 inline-flex items-center gap-1">
                <Truck className="h-3 w-3" /> incl. {formatPKR(p.extraCharges)} delivery/wrap
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {p.cart.length > 0 && (
              <>
                <button onClick={p.onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 text-xs sm:text-sm font-extrabold border-2 border-white/20 inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5" /> Hold
                </button>
                <button onClick={p.onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-xs sm:text-sm font-extrabold border-2 border-white/20">
                  Clear
                </button>
              </>
            )}
            {p.isMobile && (
              <button onClick={p.onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={p.customerId} onChange={(e) => p.setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold focus:outline-none focus:border-pink-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {p.customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.balance > 0 ? ` • Balance ${formatPKR(c.balance)}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={p.onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center shadow-md shrink-0">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {p.cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg sm:text-xl">Cart is empty</p>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Tap a bouquet or scan a barcode</p>
          </div>
        ) : (
          p.cart.map((l) => (
            <div key={l.id} className={`rounded-2xl bg-white border-4 p-2.5 sm:p-3 shadow-sm ${l.customization ? 'border-violet-300' : 'border-slate-200'}`}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Flower2 className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {l.color && <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: l.colorHex || '#ec4899' }} />}
                    {l.flowerType && <span className="text-[10px] font-bold text-slate-500">{l.flowerType}</span>}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-pink-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                  {l.customization && (
                    <div className="text-[10px] font-semibold text-violet-700 mt-1 bg-violet-50 px-2 py-1 rounded-lg">
                      ✨ {l.customization}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {l.isCustomizable && (
                    <button onClick={() => p.onCustomize(l.id, l.customization)}
                      className="h-9 w-9 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 flex items-center justify-center">
                      <Wand2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => p.onRemove(l.id)}
                    className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => p.onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 flex items-center justify-center">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <input type="number" value={l.quantity}
                    onChange={(e) => p.onSetQty(l.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="h-12 sm:h-14 w-[70px] sm:w-[80px] text-center bg-white border-0 text-lg sm:text-xl font-extrabold tabular-nums focus:outline-none" />
                  <button onClick={() => p.onChangeQty(l.id, 1)}
                    className="h-12 sm:h-14 w-12 sm:w-14 bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                  {p.hidePrices ? '•••' : formatPKR(l.lineTotal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {p.cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
              <Percent className="h-3.5 w-3.5 text-amber-600" />
              <span className="hidden sm:inline">Discount:</span>
            </div>
            <div className="flex gap-1 flex-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => p.setDiscountPct(d)}
                  className={`flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
                    p.discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={p.onProceed} disabled={!p.canProceed}
            className="w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98] bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 disabled:opacity-50 flex items-center justify-between px-5 sm:px-6">
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider inline-flex items-center gap-1">
                <Truck className="h-3 w-3" /> {p.hasDelivery ? 'Update delivery' : 'Delivery details'} <span className="hidden sm:inline">(F9)</span>
              </div>
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(p.total)}</div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
