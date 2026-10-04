import { Link } from 'react-router-dom';
import { HandCoins, ArrowRight, Trophy, Target, AlertTriangle, Users } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useCommission, periodLabel } from '../hooks/useCommission';

/* ═════════════════════════════════════════════════════════════
   COMMISSION CARD — kisi bhi industry ke dashboard par
   ─────────────────────────────────────────────────────────────
   Ek line me daal dein:

       <CommissionCard tone="pink" />

   Bas. Bikri, team aur rules ye khud le aata hai. Jahan commission
   set hi nahi, wahan apne aap ek halka sa "set kar lein" wala
   khana dikhata hai — safha khali nahi lagta.

   Safha Staff section me global hai (`/staff/commission`), is liye
   `to` dene ki zaroorat nahi — chhorein to wohi chalta hai.
   ═════════════════════════════════════════════════════════════ */

const TONES: Record<string, { grad: string; text: string; ring: string }> = {
  pink:    { grad: 'from-pink-500 to-fuchsia-700',   text: 'text-pink-700 dark:text-pink-400',   ring: 'hover:border-pink-300 dark:hover:border-pink-500/50' },
  sky:     { grad: 'from-sky-500 to-cyan-700',       text: 'text-sky-700 dark:text-sky-400',     ring: 'hover:border-sky-300 dark:hover:border-sky-500/50' },
  emerald: { grad: 'from-emerald-500 to-teal-700',   text: 'text-emerald-700 dark:text-emerald-400', ring: 'hover:border-emerald-300 dark:hover:border-emerald-500/50' },
  blue:    { grad: 'from-blue-500 to-cyan-700',      text: 'text-blue-700 dark:text-blue-400',   ring: 'hover:border-blue-300 dark:hover:border-blue-500/50' },
  violet:  { grad: 'from-violet-500 to-purple-700',  text: 'text-violet-700 dark:text-violet-400', ring: 'hover:border-violet-300 dark:hover:border-violet-500/50' },
};

const DEFAULT_TO = '/staff/commission';

export function CommissionCard({
  to = DEFAULT_TO, tone = 'emerald', hideAmounts = false, max = 4,
}: {
  /** Poore safhe ka raasta — chhorein to Staff wala global safha */
  to?: string;
  tone?: keyof typeof TONES | string;
  hideAmounts?: boolean;
  max?: number;
}) {
  const c = useCommission();
  const t = TONES[tone] ?? TONES.emerald;
  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));

  return (
    <section className={`rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition ${t.ring}`}>
      <header className="px-4 sm:px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <span className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <HandCoins className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
            Bandon ki commission
          </h3>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
            {periodLabel(c.period)}
            {c.rules.length > 0 && ` · ${c.rules.filter((r) => r.isActive).length} rule chaalu`}
          </p>
        </div>
        <Link to={to} className={`text-xs font-black inline-flex items-center gap-1 hover:underline shrink-0 ${t.text}`}>
          Poora <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {c.rules.length === 0 ? (
        <div className="px-4 sm:px-5 py-6 text-center">
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            Commission set nahi hai
          </p>
          <p className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Agar aap apne bandon ko bikri par hissa dete hain, to ek dafa rule bana
            dein — phir har mahine ka hisab khud banta rahega.
          </p>
          <Link to={to}
            className={`mt-3 inline-flex h-10 px-4 rounded-xl bg-gradient-to-r ${t.grad} text-white text-xs font-black items-center gap-1.5 transition`}>
            <Target className="h-4 w-4" /> Rule banayein
          </Link>
        </div>
      ) : c.isLoading ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : c.enabledCount === 0 ? (
        <div className="px-4 sm:px-5 py-6 text-center">
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            Rule to bana hai, magar kisi bande par chaalu nahi
          </p>
          <p className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Har bande ko alag se chaalu karna parta hai — tabhi uski commission banti hai.
          </p>
          <Link to={to}
            className={`mt-3 inline-flex h-10 px-4 rounded-xl bg-gradient-to-r ${t.grad} text-white text-xs font-black items-center gap-1.5 transition`}>
            <Users className="h-4 w-4" /> Bande chunein
          </Link>
        </div>
      ) : c.enabledCount === 0 ? (
        <div className="px-4 sm:px-5 py-6 text-center">
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            Rule to bana hai, magar kisi bande par chaalu nahi
          </p>
          <p className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Har bande ko alag se chaalu karna parta hai — tabhi uski commission banti hai.
          </p>
          <Link to={to}
            className={`mt-3 inline-flex h-10 px-4 rounded-xl bg-gradient-to-r ${t.grad} text-white text-xs font-black items-center gap-1.5 transition`}>
            <Users className="h-4 w-4" /> Bande chunein
          </Link>
        </div>
      ) : c.rows.length === 0 ? (
        <div className="px-4 sm:px-5 py-8 text-center">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">
            Is mahine kisi ki bikri nahi
          </p>
        </div>
      ) : (
        <>
          <div className="px-4 sm:px-5 py-3 grid grid-cols-3 gap-2 border-b-2 border-slate-100 dark:border-slate-800">
            <Mini label="Kul banti hai" value={money(c.total)} tone={t.text} />
            <Mini label="Ada ho gayi" value={money(c.paidTotal)} tone="text-slate-600 dark:text-slate-300" />
            <Mini label="Dena baqi" value={money(c.pendingTotal)}
              tone={c.pendingTotal > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'} />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {c.rows.filter((r) => r.enrolled).slice(0, max).map((r, i) => (
              <div key={r.userId} className="px-4 sm:px-5 py-2.5 flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-xl text-white text-xs font-black flex items-center justify-center shrink-0 ${
                  i === 0 && r.earned > 0
                    ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {i === 0 && r.earned > 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">{r.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {r.bills} bill · {money(r.sale)}
                    {r.blockedByMin && ` · hadd se ${money(r.blockedByMin.short)} kam`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-black tabular-nums ${r.earned > 0 ? t.text : 'text-slate-400'}`}>
                    {money(r.earned)}
                  </div>
                  {r.paid && <div className="text-[9px] font-black text-emerald-600">Ada ho gayi</div>}
                </div>
              </div>
            ))}
          </div>

          {c.notEnrolled.length > 0 && (
            <div className="px-4 sm:px-5 py-2 border-t border-slate-100 dark:border-slate-800">
              <Link to={to} className="text-[11px] font-black text-slate-500 dark:text-slate-400 hover:underline">
                {c.notEnrolled.length} aur bandon ki bikri hai magar commission chaalu nahi →
              </Link>
            </div>
          )}
          {c.notEnrolled.length > 0 && (
            <div className="px-4 sm:px-5 py-2 border-t border-slate-100 dark:border-slate-800">
              <Link to={to} className="text-[11px] font-black text-slate-500 dark:text-slate-400 hover:underline">
                {c.notEnrolled.length} aur bandon ki bikri hai magar commission chaalu nahi →
              </Link>
            </div>
          )}
          {c.orphanBills > 0 && (
            <div className="px-4 sm:px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-t-2 border-amber-200 dark:border-amber-500/30 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                {c.orphanBills} bill par kisi bande ka naam nahi ({money(c.orphanSale)}) — in ki
                commission kisi ko nahi mil rahi
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</div>
      <div className={`text-sm sm:text-base font-black tabular-nums truncate ${tone}`}>{value}</div>
    </div>
  );
}
