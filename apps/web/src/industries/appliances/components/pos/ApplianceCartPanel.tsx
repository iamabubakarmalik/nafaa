import { ShoppingCart, X, Pause, User, UserPlus, ChevronDown, MapPin, Trash2, Plus, Minus, HardHat, Shield, ArrowRight, Percent, Home } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

interface Props {
  isMobile: boolean;
  onCloseMobile: () => void;
  cart: any[];
  itemCount: number;
  totalQty: number;
  subtotal: number;
  installationCharges: number;
  total: number;
  installsBooked: number;
  discountPct: number;
  setDiscountPct: (v: number) => void;
  discountAmount: number;
  hidePrices: boolean;
  customers: any[];
  customerId: string;
  setCustomerId: (v: string) => void;
  selectedCustomer?: any;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  onAddCustomer: () => void;
  onHold: () => void;
  onClear: () => void;
  onChangeQty: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onToggleInstallation: (line: any) => void;
  onCheckout: () => void;
  canCheckout: boolean;
}

export function ApplianceCartPanel(props: Props) {
  const containerClass = props.isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {props.itemCount} lines • {props.totalQty} qty
              {props.installsBooked > 0 && ` • ${props.installsBooked} install`}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {props.hidePrices ? '••••' : formatPKR(props.total)}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {props.cart.length > 0 && (
              <>
                <button onClick={props.onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hold
                </button>
                <button onClick={props.onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition">
                  Clear
                </button>
              </>
            )}
            {props.isMobile && (
              <button onClick={props.onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={props.customerId} onChange={(e) => props.setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold focus:outline-none focus:border-violet-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {props.customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.balance > 0 ? ` • Bal ${formatPKR(c.balance)}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={props.onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md shrink-0 transition">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        {props.installsBooked > 0 && (
          <div className="relative">
            <MapPin className="h-4 w-4 text-cyan-600 absolute left-3 top-3.5" />
            <textarea value={props.deliveryAddress} onChange={(e) => props.setDeliveryAddress(e.target.value)}
              rows={2} placeholder="Delivery / installation address..."
              className="w-full rounded-xl border-2 border-cyan-300 bg-cyan-50 pl-10 pr-3 py-2 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {props.cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg sm:text-xl">Cart is empty</p>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Scan or tap products</p>
          </div>
        ) : (
          props.cart.map((l: any) => (
            <div key={l.id} className={['rounded-2xl bg-white border-4 p-2.5 sm:p-3 shadow-sm',
              l.bookInstallation ? 'border-amber-400' : l.serialTrackingId ? 'border-blue-300' : 'border-slate-200'].join(' ')}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Home className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                  {l.capacity && <div className="text-[10px] font-mono font-bold text-cyan-700">{l.capacity}</div>}
                  <div className="text-xs sm:text-sm font-bold text-cyan-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                  {l.warrantyMonths && (
                    <div className="text-[10px] font-extrabold text-cyan-700 mt-1 inline-flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> {l.warrantyMonths}m warranty
                    </div>
                  )}
                </div>
                <button onClick={() => props.onRemove(l.id)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Installation toggle */}
              {l.requiresInstallation && (
                <button onClick={() => props.onToggleInstallation(l)}
                  className={['mt-2 w-full rounded-xl border-2 p-2 flex items-center gap-2 transition',
                    l.bookInstallation ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200 hover:border-amber-300'].join(' ')}>
                  <HardHat className={l.bookInstallation ? 'h-4 w-4 text-amber-700' : 'h-4 w-4 text-slate-500'} />
                  <div className="flex-1 text-left text-xs">
                    <div className={['font-extrabold', l.bookInstallation ? 'text-amber-900' : 'text-slate-700'].join(' ')}>
                      {l.bookInstallation ? '✓ Installation Booked' : 'Book Installation'}
                    </div>
                    {l.bookInstallation && l.installationScheduledDate && (
                      <div className="text-[10px] text-amber-700 font-bold">
                        {new Date(l.installationScheduledDate).toLocaleDateString('en-PK')} • {l.installationTimeSlot}
                      </div>
                    )}
                    {!l.bookInstallation && (
                      <div className="text-[10px] text-slate-500 font-bold">
                        {l.installationCovered ? 'Free with product' : `Charge: ${formatPKR(l.installationCharge)}`}
                      </div>
                    )}
                  </div>
                </button>
              )}

              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => props.onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 flex items-center justify-center transition">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <input type="number" value={l.quantity}
                    onChange={(e) => props.onSetQty(l.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    disabled={!!l.serialTrackingId}
                    className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center bg-white border-0 text-lg sm:text-xl font-extrabold tabular-nums focus:outline-none disabled:opacity-70" />
                  <button onClick={() => props.onChangeQty(l.id, 1)}
                    disabled={!!l.serialTrackingId}
                    className="h-12 sm:h-14 w-12 sm:w-14 bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center transition">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                  {props.hidePrices ? '•••' : formatPKR(l.lineTotal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout */}
      {props.cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 bg-white space-y-2">
          {props.installationCharges > 0 && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-800">
                <HardHat className="h-3.5 w-3.5" /> Installation charges
              </div>
              <div className="text-sm font-extrabold text-amber-900 tabular-nums">
                +{formatPKR(props.installationCharges)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
              <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
              <span className="hidden sm:inline">Discount:</span>
            </div>
            <div className="flex gap-1 flex-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => props.setDiscountPct(d)}
                  className={['flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition',
                    props.discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'].join(' ')}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={props.onCheckout} disabled={!props.canCheckout}
            className={['w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Checkout <span className="hidden sm:inline">(F9)</span>
              </div>
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(props.total)}</div>
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
