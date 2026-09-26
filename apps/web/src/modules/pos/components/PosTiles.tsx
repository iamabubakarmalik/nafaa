import { Star, RotateCcw, Scale } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { unitEmoji, isWeightUnit } from '../lib/posUnits';
import type { PosCartLine } from '../lib/posCart';

/* ═════════════════════════════════════════════════════════════
   POS KE TILE — product, combo, quick key
   ─────────────────────────────────────────────────────────────
   Counter ki screen par nazar teen cheezein dhoondti hai: naam,
   rate, aur stock. Baqi sab shor hai. Isi liye tile par utna hi
   hai, aur khatam hone wala maal apne aap alag rang le leta hai.
   ═════════════════════════════════════════════════════════════ */

/* ══════════ VIEW TAB ══════════ */
export function PosViewTab({ active, onClick, icon: Icon, label, count, color, shortcut, highlight }: any) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-600 text-white shadow-md',
    violet: 'bg-violet-600 text-white shadow-md',
    amber: 'bg-amber-600 text-white shadow-md',
  };
  return (
    <button onClick={onClick}
      className={['flex-1 h-12 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition active:scale-95 relative',
        active ? colors[color] : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'].join(' ')}>
      {highlight && !active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={['px-1.5 rounded-md text-[10px] tabular-nums', active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>{count}</span>
      )}
      <span className={['hidden lg:inline text-[9px] font-mono px-1 rounded', active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'].join(' ')}>{shortcut}</span>
    </button>
  );
}

/* ══════════ PRODUCT TILE ══════════ */
export function PosProductTile({ product: p, cart, hidePrices, onClick }: any) {
  const inCart = cart.filter((l: PosCartLine) => l.productId === p.id);
  const cartQty = inCart.reduce((s: number, l: PosCartLine) => s + l.baseQuantity, 0);
  const out = p.stock <= 0;
  const low = !out && p.stock <= (p.lowStockAlert || 0);
  const img = p.images?.[0]?.url;
  const isWeight = isWeightUnit(p.unit || '');
  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        out ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 opacity-50 cursor-not-allowed'
        : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-xl ring-4 ring-emerald-200 dark:ring-emerald-500/30'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500/60 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900 z-10 tabular-nums">
          {cartQty % 1 === 0 ? cartQty : cartQty.toFixed(1)}
        </div>
      )}
      <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10">
            <span className="text-4xl sm:text-5xl">{unitEmoji(p.unit)}</span>
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">KHATAM</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">KAM</div>}
        {p.isFeatured && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
        {isWeight && !out && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-600/95 text-white text-[9px] font-extrabold shadow-lg inline-flex items-center gap-0.5">
            <Scale className="h-2.5 w-2.5" /> WAZAN
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        <div className="mt-1.5 sm:mt-2 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
            <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">per {p.unit}</div>
          </div>
          <div className={['text-xs sm:text-sm font-extrabold tabular-nums shrink-0',
            out ? 'text-rose-700 dark:text-rose-400' : low ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
            {p.stock.toFixed(p.stock % 1 === 0 ? 0 : 1)}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ══════════ COMBO TILE ══════════ */
export function PosComboTile({ combo, cart, hidePrices, onClick }: any) {
  const inCart = cart.filter((l: PosCartLine) => l.comboId === combo.id);
  const cartQty = inCart.reduce((s: number, l: PosCartLine) => s + l.quantity, 0);
  const savings = Number(combo.savingsAmount || 0);
  const savingsPct = Number(combo.savingsPercentage || 0);
  return (
    <button onClick={onClick}
      className={['group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95',
        cartQty > 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 shadow-xl ring-4 ring-emerald-200 dark:ring-emerald-500/30'
        : 'border-violet-200 dark:border-violet-500/40 bg-gradient-to-br from-white via-violet-50 to-white dark:from-slate-900 dark:via-violet-500/10 dark:to-slate-900 hover:border-violet-400 dark:hover:border-violet-500/60 hover:shadow-xl hover:-translate-y-1'].join(' ')}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-slate-900 z-10 tabular-nums">{cartQty}</div>
      )}
      <div className="aspect-square bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-500/20 dark:to-fuchsia-500/20 overflow-hidden relative">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-5xl sm:text-6xl">🎁</span></div>
        )}
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg">Combo</div>
        {savingsPct > 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-xs font-extrabold shadow-lg tabular-nums">Save {savingsPct.toFixed(0)}%</div>
        )}
        {combo.isFeatured && (
          <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{combo.name}</div>
        {combo.tagLine && <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 uppercase mt-0.5 line-clamp-1">{combo.tagLine}</div>}
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(combo.comboPrice)}</div>
            {savings > 0 && !hidePrices && <div className="text-[10px] text-slate-500 dark:text-slate-400 line-through font-bold mt-0.5 tabular-nums">{formatPKR(combo.originalTotal)}</div>}
          </div>
          <div className="text-[10px] font-extrabold text-violet-700 dark:text-violet-400 shrink-0">{combo.items.length} items</div>
        </div>
      </div>
    </button>
  );
}

/* ══════════ QUICK KEY TILE ══════════ */
export function PosQuickKeyTile({ qk, products, combos, hidePrices, onClick }: any) {
  const product = qk.productId ? products.find((p: any) => p.id === qk.productId) : null;
  const combo = qk.comboId ? combos.find((c: any) => c.id === qk.comboId) : null;
  const price = product?.price ?? combo?.comboPrice ?? 0;
  const out = product ? product.stock <= 0 : false;
  return (
    <button onClick={onClick} disabled={out}
      className={['group relative text-left rounded-2xl border-4 p-2.5 sm:p-3 transition-all active:scale-95 aspect-square flex flex-col items-center justify-center bg-white dark:bg-slate-900',
        out ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60' : 'hover:shadow-xl hover:-translate-y-1'].join(' ')}
      style={{ borderColor: out ? undefined : (qk.color || '#f59e0b') }}>
      <div className="absolute inset-0 opacity-10 dark:opacity-15 pointer-events-none rounded-2xl" style={{ background: qk.color || '#f59e0b' }} />
      {qk.hotkey && <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-mono font-extrabold z-10">{qk.hotkey}</div>}
      {qk.icon && <div className="text-3xl sm:text-4xl mb-1 relative">{qk.icon}</div>}
      <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm text-center leading-tight line-clamp-2 relative">{qk.label}</div>
      {price > 0 && <div className="mt-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums relative">{hidePrices ? '•••' : formatPKR(price)}</div>}
      {combo && <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[8px] font-extrabold uppercase">Combo</div>}
    </button>
  );
}

/* ══════════ EMPTY STATE ══════════ */
export function PosEmptyState({ icon: Icon, title, hint, onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 dark:text-white text-xl">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center font-semibold">{hint}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold transition inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
}
