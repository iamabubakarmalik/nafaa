import { Link } from 'react-router-dom';
import {
  PiggyBank, Boxes, ShoppingBag, Wallet, BookOpen, Building2,
  Banknote, Hourglass, ArrowRight,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';

/* ═════════════════════════════════════════════════════════════
   PAISA KAHAN HAI — har dukaan ka wohi sawal
   ─────────────────────────────────────────────────────────────
   Dukaan bakery ho ya kiryana, malik subah yehi poochta hai:
   maal kitne ka para hai, kharcha kitna gaya, logon se kitna
   lena hai, supplier ko kitna dena hai, aur golak me kya hai.

   Chhe khane, har ek apni jagah le jata hai — sawal ka jawab do
   click me. Neeche phansa hua maal, kyunke wo paisa hai jo
   shelf par khara hai aur kuch nahi kar raha.
   ═════════════════════════════════════════════════════════════ */

export interface MoneyTileSpec {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone?: 'teal' | 'violet' | 'amber' | 'rose' | 'orange' | 'emerald' | 'pink';
  to: string;
  urgent?: boolean;
}

export function BusinessMoneyMap({
  money, hideCost, title, subtitle, extraTiles = [],
}: {
  money: any;
  hideCost?: boolean;
  title?: string;
  subtitle?: string;
  /**
   * Industry ke apne khane — bakery me "banane ka saamaan", carpet me
   * "roll ka maal". Chhe mushtarak khanon ke baad lagte hain, taake
   * har dukaan apni cheez bhi isi ek nazar me dekh sake.
   */
  extraTiles?: MoneyTileSpec[];
}) {
  if (!money || hideCost) return null;
  return (
<section>
  <div className="flex items-center gap-2.5 mb-3">
    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
      <PiggyBank className="h-5 w-5" />
    </div>
    <div>
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
        {title ?? 'Paisa Kahan Hai 💰'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
        {subtitle ?? 'Maal, kharcha, lena aur dena — sab ek nazar me'}
      </p>
    </div>
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
    <MoneyTile
      icon={Boxes} tone="teal" to="/stock-report"
      label="Maal Para Hai"
      value={formatPKR(money.inventory.valueAtCost)}
      sub={`${money.inventory.productCount} items • bikne par ${formatPKR(money.inventory.valueAtRetail)}`}
    />
    <MoneyTile
      icon={ShoppingBag} tone="violet" to="/purchases"
      label="Is Mahine Maal Aaya"
      value={formatPKR(money.purchases.monthTotal)}
      sub={`${money.purchases.monthCount} bills${money.purchases.monthUnpaid > 0 ? ` • ${formatPKR(money.purchases.monthUnpaid)} baqi` : ''}`}
    />
    <MoneyTile
      icon={Wallet} tone="amber" to="/expenses"
      label="Is Mahine Kharcha"
      value={formatPKR(money.expenses.month)}
      sub={`${money.expenses.monthCount} entries • pichhle mahine ${formatPKR(money.expenses.lastMonth)}`}
    />
    <MoneyTile
      icon={BookOpen} tone="rose" to="/khata"
      label="Logon Se Lena"
      value={formatPKR(money.receivable.total)}
      sub={`${money.receivable.customerCount} customers ka udhaar`}
      urgent={money.receivable.total > 0}
    />
    <MoneyTile
      icon={Building2} tone="orange" to="/suppliers"
      label="Supplier Ko Dena"
      value={formatPKR(money.payable.total)}
      sub={`${money.payable.supplierCount} suppliers`}
      urgent={money.payable.total > 0}
    />
    <MoneyTile
      icon={Banknote} tone="emerald" to="/cash-register"
      label="Counter Me Cash"
      value={money.cash.registerOpen ? formatPKR(money.cash.expected) : '—'}
      sub={money.cash.registerOpen
        ? `Opening ${formatPKR(money.cash.opening)}`
        : 'Register band hai'}
    />

    {/* Industry ke apne khane — bakery ka "banane ka saamaan",
        carpet ke roll. Mushtarak chhe ke baad, usi qatar me. */}
    {extraTiles.map((t) => (
      <MoneyTile
        key={t.label}
        icon={t.icon} tone={t.tone ?? 'pink'} to={t.to}
        label={t.label} value={t.value} sub={t.sub} urgent={t.urgent}
      />
    ))}
  </div>

  {money.inventory.deadStockValue > 0 && (
    <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-500/15 dark:to-orange-500/15 border-2 border-rose-200 dark:border-rose-500/30 px-4 py-3 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
        <Hourglass className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
          {formatPKR(money.inventory.deadStockValue)} ka maal phansa hua hai
        </div>
        <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
          {money.inventory.deadStockCount} products 60 din se nahi bike — discount ya bundle karke nikaalein
        </div>
      </div>
      <Link to="/retail/combos" className="shrink-0 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
        Combo banao <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )}
</section>
  );
}

function MoneyTile({ icon: Icon, label, value, sub, tone, to, urgent }: any) {
  const tones: Record<string, { grad: string; ring: string }> = {
    teal:    { grad: 'from-teal-500 to-emerald-600',   ring: 'hover:border-teal-300 dark:hover:border-teal-500/50' },
    violet:  { grad: 'from-violet-500 to-purple-600',  ring: 'hover:border-violet-300 dark:hover:border-violet-500/50' },
    amber:   { grad: 'from-amber-500 to-orange-600',   ring: 'hover:border-amber-300 dark:hover:border-amber-500/50' },
    rose:    { grad: 'from-rose-500 to-red-600',       ring: 'hover:border-rose-300 dark:hover:border-rose-500/50' },
    orange:  { grad: 'from-orange-500 to-amber-600',   ring: 'hover:border-orange-300 dark:hover:border-orange-500/50' },
    emerald: { grad: 'from-emerald-500 to-green-600',  ring: 'hover:border-emerald-300 dark:hover:border-emerald-500/50' },
    pink:    { grad: 'from-pink-500 to-fuchsia-600',   ring: 'hover:border-pink-300 dark:hover:border-pink-500/50' },
  };
  const t = tones[tone] ?? tones.teal;
  return (
    <Link to={to} className={[
      'rounded-2xl bg-white dark:bg-slate-900/60 border-2 p-3 sm:p-4',
      'shadow-sm dark:shadow-black/20 hover:shadow-lg transition-all hover:-translate-y-0.5',
      urgent ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800',
      t.ring,
    ].join(' ')}>
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-extrabold truncate">
        {label}
      </div>
      <div className="mt-0.5 text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
        {value}
      </div>
      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-1 leading-snug line-clamp-2">
        {sub}
      </div>
    </Link>
  );
}

export default BusinessMoneyMap;
