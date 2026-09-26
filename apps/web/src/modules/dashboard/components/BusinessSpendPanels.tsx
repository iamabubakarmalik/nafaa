import { Link } from 'react-router-dom';
import { Wallet, ShoppingBag, Package, ArrowRight } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { DashCard, DashCardHeader, DashEmptyList } from './DashCard';

/* ═════════════════════════════════════════════════════════════
   KHARCHA AUR KHARIDARI
   ─────────────────────────────────────────────────────────────
   Do sawal jo hamesha saath chalte hain: paisa kahan kharch hua,
   aur maal kis se aaya.

   Kharche gol chart (pie) me nahi, seedhi patiyon me — sawal
   tarteeb ka hai ("sab se bara kharcha kaunsa hai") aur lambai ka
   muqabla gole ke tukron se kahin aasan hai. Har patti par naam
   aur raqam likhi hai, is liye rang na dikhe (colour-blindness,
   black & white print) tab bhi chart poora parha jata hai.
   ═════════════════════════════════════════════════════════════ */

/**
 * Jin expense categories ka apna rang set nahi, unke liye.
 *
 * Ye aath rang colour-blindness ke sath bhi alag rehte hain (light aur
 * dark dono surface par check kiye hue). Phir bhi har patti par naam
 * aur raqam likhi hoti hai — pehchan kabhi sirf rang par nahi, taake
 * black & white print par bhi chart poora parha jaye.
 */
const CATEGORY_FALLBACK = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100',
  '#e87ba4', '#008300', '#4a3aa7', '#e34948',
];
const CATEGORY_FALLBACK_DARK = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
];

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export function BusinessSpendPanels({ money, hideCost }: { money: any; hideCost?: boolean }) {
  if (!money || hideCost) return null;
  return (
<section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
  <DashCard>
    <DashCardHeader
      icon={Wallet}
      title="Kharcha Kahan Gaya"
      subtitle="Is mahine, sab se bara pehle"
      tone="amber"
      right={
        <Link to="/expenses" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline">
          Sab <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    />
    {money.expenses.byCategory.length > 0 ? (
      <ExpenseBars rows={money.expenses.byCategory} total={money.expenses.month} />
    ) : (
      <DashEmptyList icon={Wallet} message="Is mahine koi kharcha darj nahi" />
    )}
  </DashCard>

  <DashCard noPad>
    <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/40">
        <ShoppingBag className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Maal Ki Kharidari</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
          Aaj {formatPKR(money.purchases.todayTotal)} • mahine {formatPKR(money.purchases.monthTotal)}
        </p>
      </div>
      <Link to="/purchases" className="text-sky-700 dark:text-sky-400 text-xs font-extrabold inline-flex items-center gap-1 hover:underline shrink-0">
        Sab <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[340px] overflow-y-auto">
      {money.purchases.recent?.length ? (
        money.purchases.recent.map((pu: any) => {
          const due = Number(pu.total) - Number(pu.paidAmount);
          return (
            <Link key={pu.id} to={`/purchases/${pu.id}`}
              className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">
                  {pu.supplier?.name || 'Supplier'}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold truncate font-mono">
                  {pu.purchaseNumber} • {formatDate(pu.purchasedAt)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
                  {formatPKR(pu.total)}
                </div>
                {due > 0 && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">
                    Baqi: {formatPKR(due)}
                  </div>
                )}
              </div>
            </Link>
          );
        })
      ) : (
        <DashEmptyList icon={ShoppingBag} message="Abhi koi kharidari nahi" />
      )}
    </div>
  </DashCard>
</section>
  );
}

function ExpenseBars({ rows, total }: { rows: any[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const isDark = typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => {
        const fallback = isDark ? CATEGORY_FALLBACK_DARK : CATEGORY_FALLBACK;
        const color = r.color && r.color !== '#f59e0b'
          ? r.color
          : fallback[i % fallback.length];
        const pctOfTotal = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <div key={r.categoryId ?? `none-${i}`}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {r.name}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  ×{r.count}
                </span>
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                {formatPKR(r.amount)}
                <span className="ml-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {pctOfTotal.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max((r.amount / max) * 100, 2)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-2 mt-1 border-t-2 border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Kul kharcha
        </span>
        <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
          {formatPKR(total)}
        </span>
      </div>
    </div>
  );
}

export default BusinessSpendPanels;
