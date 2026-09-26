import { useState, useEffect } from 'react';
import {
  ShoppingCart, X, Plus, Minus, Trash2, UserPlus, ArrowRight,
  AlertTriangle, Pause, Sparkles, Zap, Scale, Pencil, Check, Tag,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { isWeightUnit, qtyStep } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';
import { PosCustomerPicker } from './PosCustomerPicker';
import { PosDeliveryPanel } from './PosDeliveryPanel';
import { PosReceiverField } from './PosReceiverField';

/* ═════════════════════════════════════════════════════════════
   CART — bill banne ki jagah
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Har line par unit, rate aur
   ginti khuli hoti hai — rate par click karke wahin badla ja
   sakta hai, kyunke mol-tol counter par hota hai, settings me
   ja kar nahi.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   CART PANEL
   ═════════════════════════════════════════════════════════════ */
export function PosCartPanel({
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total, totalSavings,
  discountMode, discountPct, discountRs, discountAmount, onOpenDiscount, onClearDiscount,
  delivery, onDeliveryChange, deliveryFee,
  hidePrices, customers, customerId, setCustomerId, selectedCustomer, onAddCustomer,
  receiver, onReceiverChange,
  onHold, onClear, onChangeQty, onSetQty, onRemove, priceEditId, onStartPriceEdit,
  onSetPrice, onCheckout, onInstantCash, canCheckout, checkoutPending,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white dark:bg-slate-950 flex flex-col lg:hidden'
    : 'hidden lg:flex rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden flex-col min-h-0';
  const hasDiscount = discountAmount > 0;

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {itemCount} lines • {totalQty.toFixed(totalQty % 1 === 0 ? 0 : 1)} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
            {totalSavings > 0 && !hidePrices && (
              <div className="text-xs font-extrabold text-emerald-300 mt-1 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Combo bachat {formatPKR(totalSavings)}
              </div>
            )}
            {hasDiscount && !hidePrices && (
              <div className="text-xs font-bold text-amber-300 mt-0.5 tabular-nums inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> Discount {discountMode === 'pct' ? `${discountPct}%` : ''} • Save {formatPKR(discountAmount)}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <>
                <button onClick={onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hold
                </button>
                <button onClick={onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition">
                  Khaali
                </button>
              </>
            )}
            {isMobile && (
              <button onClick={onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <PosCustomerPicker
              customers={customers}
              customerId={customerId}
              setCustomerId={setCustomerId}
              selectedCustomer={selectedCustomer}
              onAddCustomer={onAddCustomer}
            />
          </div>
          <button onClick={onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        {selectedCustomer && selectedCustomer.balance > 0 && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Purana udhaar: {formatPKR(selectedCustomer.balance)}
          </div>
        )}

        {/* Maal lene wala — customer chunte hi yahan.
            Pehle ye checkout modal ke andar tha aur sirf udhaar wali
            soorat me khulta tha. Do masle thay: dukaan-daar ko nazar
            hi nahi aata tha, aur INSTANT CASH (F12) to checkout modal
            kholta hi nahi — us raste se banne wale har bill par naam
            chhoot jata tha.

            Ab cart me customer ke saath hi hai: cash ho ya udhaar,
            dono par chalta hai, aur khali chhorna bhi theek hai. */}
        {selectedCustomer && receiver && onReceiverChange && (
          <div className="mt-2">
            <PosReceiverField
              customerId={customerId}
              customerName={selectedCustomer.name}
              value={receiver}
              onChange={onReceiverChange}
              compact
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-4 border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 dark:text-slate-200 text-lg sm:text-xl">Cart khaali hai</p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">Scan karo, click karo, ya 🎤 bolo: "2 kilo chini"</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-2 inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> F12 = instant cash + print!
            </p>
          </div>
        ) : (
          cart.map((l: PosCartLine) => (
            <PosCartRow
              key={l.id}
              line={l}
              hidePrices={hidePrices}
              editing={priceEditId === l.id}
              onStartPriceEdit={() => onStartPriceEdit(l.id)}
              onSetPrice={(p: number) => onSetPrice(l.id, p)}
              onCancelPriceEdit={() => onStartPriceEdit(null)}
              onChangeQty={(d: number) => onChangeQty(l.id, d)}
              onSetQty={(q: number) => onSetQty(l.id, q)}
              onRemove={() => onRemove(l.id)}
            />
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2">
          <button onClick={onOpenDiscount}
            className={['w-full h-12 rounded-2xl font-extrabold text-sm inline-flex items-center justify-between px-4 border-2 transition active:scale-[0.98]',
              hasDiscount ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white shadow-md shadow-amber-500/30'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'].join(' ')}>
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {hasDiscount ? <span>Discount: {discountMode === 'pct' ? `${discountPct}%` : formatPKR(discountRs)}</span> : <span>Discount lagayein?</span>}
            </span>
              {hasDiscount && !hidePrices && <span className="text-xs tabular-nums opacity-90">−{formatPKR(discountAmount)}</span>}
              {hasDiscount ? (
                <span onClick={(e) => { e.stopPropagation(); onClearDiscount(); }}
                  className="h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition" role="button">
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : (
                <ArrowRight className="h-4 w-4 opacity-60" />
              )}
              
          </button>

          {hasDiscount && !hidePrices && (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums flex justify-between px-1">
              <span>Subtotal</span>
              <span className="line-through">{formatPKR(subtotal)}</span>
            </div>
          )}

          {/* 🚚 Ghar bhejna hai? — customer se liya aur rider ko diya, dono alag */}
          <PosDeliveryPanel value={delivery} onChange={onDeliveryChange} tone="emerald" compact={isMobile} />

          {deliveryFee > 0 && !hidePrices && (
            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums flex justify-between px-1">
              <span>+ Delivery</span>
              <span>{formatPKR(deliveryFee)}</span>
            </div>
          )}

          {/* ⚡ INSTANT CASH — sab se tez rasta */}
          <button onClick={onInstantCash} disabled={!canCheckout || checkoutPending}
            className={['w-full h-14 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'].join(' ')}
            title="Cash sale + print — koi sawal nahi!">
            <Zap className="h-5 w-5" />
            ⚡ INSTANT CASH {hidePrices ? '' : `— ${formatPKR(total)}`} <KbdInline>F12</KbdInline>
          </button>

          <button onClick={onCheckout} disabled={!canCheckout || checkoutPending}
            className={['w-full h-[68px] sm:h-[80px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98]',
              'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5 sm:px-6'].join(' ')}>
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Paisay lein <span className="hidden sm:inline">(F9)</span> — cash / udhaar / card
              </div>
              <FbrModeIndicator saleTotal={total} className="mb-2" />
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
          {!canCheckout && <p className="text-center text-xs font-extrabold text-rose-600 dark:text-rose-400">⚠️ Pehle shop select karein</p>}
        </div>
      )}
    </aside>
  );
}

function KbdInline({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-[10px] font-mono font-extrabold">{children}</kbd>
  );
}

/* ══════════ CART ROW ══════════ */
export function PosCartRow({ line: l, hidePrices, editing, onStartPriceEdit, onSetPrice, onCancelPriceEdit, onChangeQty, onSetQty, onRemove }: any) {
  const [draft, setDraft] = useState('');
  const customPriced = Number(l.unitPrice) !== Number(l.basePrice);
  const isWeight = isWeightUnit(l.unitName);

  useEffect(() => { if (editing) setDraft(String(l.unitPrice)); }, [editing, l.unitPrice]);

  const commit = () => {
    const v = Number(draft);
    if (!isNaN(v) && v >= 0) onSetPrice(v);
    else onCancelPriceEdit();
  };

  return (
    <div className={['rounded-2xl bg-white dark:bg-slate-900 border-4 p-2.5 sm:p-3 shadow-sm dark:shadow-black/20',
      l.type === 'combo' ? 'border-violet-300 dark:border-violet-500/40' : customPriced ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700'].join(' ')}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={['h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative bg-slate-100 dark:bg-slate-800',
          l.type === 'combo' ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20' : ''].join(' ')}>
          {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <span className="text-xl sm:text-2xl">{l.emoji}</span>}
          {l.type === 'combo' && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight line-clamp-2">{l.name}</div>
            {l.type === 'combo' && <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Combo</span>}
            {customPriced && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Custom Rs</span>}
          </div>

          {editing ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rs</span>
              <input autoFocus type="number" inputMode="decimal" step="any" min={0} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancelPriceEdit(); }}
                onBlur={commit}
                className="h-9 w-28 rounded-lg border-2 border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 px-2 text-base font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none" />
              <button onClick={commit} className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Check className="h-4 w-4" /></button>
              <button onClick={() => onSetPrice(l.basePrice)} title="Wapas original rate"
                className="h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">Reset</button>
            </div>
          ) : (
            <button onClick={onStartPriceEdit} title="Rate badlo"
              className="mt-0.5 text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-400 inline-flex items-center gap-1 hover:text-sky-900 dark:hover:text-sky-300 transition group/price">
              {l.emoji} {formatPKR(l.unitPrice)} / {l.unitName}
              <Pencil className="h-3 w-3 opacity-0 group-hover/price:opacity-100 transition" />
            </button>
          )}

          {l.note && <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{l.note}</div>}
          {customPriced && !editing && (
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">(original {formatPKR(l.basePrice)})</div>
          )}
        </div>
        <button onClick={onRemove}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 active:scale-95 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition">
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
      <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
          <button onClick={() => onChangeQty(-1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 flex items-center justify-center transition">
            <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-200" />
          </button>
          <input type="number" step="0.001" value={l.quantity}
            onChange={(e) => onSetQty(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center bg-white dark:bg-slate-900 border-0 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none" />
          <button onClick={() => onChangeQty(1)}
            className={['h-12 sm:h-14 w-12 sm:w-14 text-white flex items-center justify-center transition',
              l.type === 'combo' ? 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800' : isWeight ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'].join(' ')}>
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {hidePrices ? '•••' : formatPKR(l.lineTotal)}
        </div>
      </div>
      {isWeight && (
        <div className="mt-1 text-[9px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider inline-flex items-center gap-1">
          <Scale className="h-2.5 w-2.5" /> Weigh item — +/− {qtyStep(l.unitName)} {l.unitName} step
        </div>
      )}
    </div>
  );
}
