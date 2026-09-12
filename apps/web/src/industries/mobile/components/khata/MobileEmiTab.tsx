// apps/web/src/industries/mobile/components/khata/MobileEmiTab.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, Search, Phone, CalendarClock, AlertTriangle,
  Wallet, TrendingUp, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { emiApi, type EmiPlan } from '../../api/emi.api';

/* ═════════════════════════════════════════════════════════════
   MOBILE EMI TAB — khata page ke andar lagta hai
   ─────────────────────────────────────────────────────────────
   Khata ab global hai. Mobile me sirf yehi ek cheez alag thi —
   is liye poora page copy karne ke bajaye sirf ye tab alag hai.
   ═════════════════════════════════════════════════════════════ */

const daysLate = (due: string) =>
  Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);

export default function MobileEmiTab() {
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: emiApi.stats,
  });

  const { data: emiData, isLoading } = useQuery({
    queryKey: ['emi-plans', 'khata'],
    queryFn: () => emiApi.list({ limit: 200 }),
  });

  const plans = useMemo(() => {
    let rows: EmiPlan[] = (emiData?.items ?? []).filter(
      (p) => p.status === 'ACTIVE' || p.status === 'DEFAULTED',
    );
    if (onlyOverdue) rows = rows.filter((p) => p.overdueCount > 0);
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter((p) =>
        p.customerName.toLowerCase().includes(q) ||
        (p.customerPhone ?? '').includes(q) ||
        p.planNumber.toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) => b.overdueCount - a.overdueCount || b.remainingAmount - a.remainingAmount);
  }, [emiData, search, onlyOverdue]);

  const overdueTotal = useMemo(
    () => (emiData?.items ?? []).filter((p) => p.overdueCount > 0).length,
    [emiData],
  );

  return (
    <div className="space-y-4">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Chal Rahe Plans" value={String(stats?.byStatus?.find((s) => s.status === 'ACTIVE')?.count ?? 0)}
          icon={CreditCard} tone="violet" />
        <Kpi label="Baqi Raqam" value={formatPKR(stats?.activeRemaining ?? 0)} icon={Wallet} tone="blue" />
        <Kpi label="Late Qisten" value={String(stats?.overdueCount ?? 0)}
          sub={stats?.overdueAmount ? formatPKR(stats.overdueAmount) : undefined}
          icon={AlertTriangle} tone="rose" alert={(stats?.overdueCount ?? 0) > 0} />
        <Kpi label="Is Mahine Wasool" value={formatPKR(stats?.collectedThisMonth ?? 0)}
          sub={`${stats?.collectedCountThisMonth ?? 0} qisten`} icon={TrendingUp} tone="emerald" />
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setOnlyOverdue((v) => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
            onlyOverdue ? 'bg-rose-600 text-white border-transparent shadow'
              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
          }`}>
          <AlertTriangle className="h-3.5 w-3.5" /> Sirf Late ({overdueTotal})
        </button>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam, phone ya plan number..."
            className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-500 transition" />
        </div>
      </div>

      {/* ── List ── */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="font-extrabold text-slate-900">
            EMI Plans <span className="text-slate-500 font-bold tabular-nums">({plans.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm font-bold text-slate-500">Load ho raha hai…</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {onlyOverdue ? 'Koi qist late nahi 🎉'
                : search ? `"${search}" se koi plan nahi mila`
                : 'Koi chalu EMI plan nahi'}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              POS se udhaar sale karte waqt EMI plan banane ka option aata hai
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((p) => {
              const paidPct = p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
              const late = p.overdueCount > 0;
              const lateDays = p.nextDueDate ? daysLate(p.nextDueDate) : 0;
              return (
                <div key={p.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl text-white flex items-center justify-center shrink-0 bg-gradient-to-br ${
                      late ? 'from-rose-500 to-red-600' : 'from-violet-500 to-fuchsia-600'
                    }`}>
                      <CreditCard className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/emi-plans/${p.id}`}
                          className="font-extrabold text-slate-900 text-sm truncate hover:text-violet-600 transition">
                          {p.customerName}
                        </Link>
                        <span className="font-mono text-[10px] font-extrabold text-violet-700">{p.planNumber}</span>
                        {late && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase">
                            {p.overdueCount} qist late{lateDays > 0 ? ` · ${lateDays} din` : ''}
                          </span>
                        )}
                        {p.status === 'DEFAULTED' && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-extrabold uppercase">
                            Defaulted
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                        {p.customerPhone && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3" /> {p.customerPhone}
                          </span>
                        )}
                        <span className="tabular-nums">{p.paidInstallmentCount}/{p.installmentCount} qisten</span>
                        {p.nextDueDate && (
                          <span className={`inline-flex items-center gap-1 ${late ? 'text-rose-600' : ''}`}>
                            <CalendarClock className="h-3 w-3" />
                            {new Date(p.nextDueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${late ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
                          style={{ width: `${Math.min(100, paidPct)}%` }} />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900 tabular-nums">
                        {formatPKR(p.remainingAmount)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">baqi</div>
                      <div className="text-[10px] font-bold text-emerald-600 tabular-nums">
                        {formatPKR(p.installmentAmount)}/qist
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link to="/emi-plans"
        className="inline-flex items-center gap-1.5 text-sm font-extrabold text-violet-700 hover:underline">
        Saare EMI plans dekhein <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

const TONES: Record<string, string> = {
  violet: 'from-violet-500 to-purple-600',
  blue: 'from-blue-500 to-indigo-600',
  rose: 'from-rose-500 to-red-600',
  emerald: 'from-emerald-500 to-teal-600',
};

function Kpi({ label, value, sub, icon: Icon, tone, alert }: any) {
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm flex items-center justify-between gap-2 ${
      alert ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
    }`}>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
        <div className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
        {sub && <div className="text-[10px] font-bold text-slate-500 truncate">{sub}</div>}
      </div>
      <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
