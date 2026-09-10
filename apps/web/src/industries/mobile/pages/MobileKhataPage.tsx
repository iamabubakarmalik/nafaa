// apps/web/src/industries/mobile/pages/MobileKhataPage.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Users, CreditCard, AlertTriangle, Search, RefreshCw, MessageCircle,
  Phone, ChevronRight, Banknote, CalendarClock, TrendingDown, X, FileSpreadsheet,
  HandCoins, PiggyBank, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import { emiApi, type EmiPlan } from '../api/emi.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — KHATA / UDHAAR
   ─────────────────────────────────────────────────────────────
   Mobile shop me paisa do jagah phansta hai:
     • Seedha udhaar (khata)
     • EMI ki qisten
   Ye page dono ko ek jagah dikhata hai — kis se kitna lena hai
   aur kaunsi qist late ho chuki hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'udhaar' | 'emi';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

const daysLate = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const waLink = (phone: string, text: string) => {
  const digits = phone.replace(/\D/g, '');
  const clean = digits.startsWith('92') ? digits : digits.startsWith('0') ? `92${digits.slice(1)}` : `92${digits}`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
};

export default function MobileKhataPage() {
  const queryClient = useQueryClient();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('udhaar');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string; balance: number } | null>(null);

  const { data: summary, refetch: refetchSummary, isRefetching } = useQuery({
    queryKey: ['customer-ledger-summary'],
    queryFn: customerLedgerApi.summary,
  });

  const { data: emiStats } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: emiApi.stats,
  });

  const { data: emiData } = useQuery({
    queryKey: ['emi-plans', 'khata'],
    queryFn: () => emiApi.list({ limit: 200 }),
  });

  const debtors = useMemo(() => {
    let rows = summary?.topDebtors ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.phone ?? '').includes(q),
      );
    }
    return rows;
  }, [summary, search]);

  const emiPlans = useMemo(() => {
    let rows: EmiPlan[] = (emiData?.items ?? []).filter((p) => p.status === 'ACTIVE' || p.status === 'DEFAULTED');
    if (onlyOverdue) rows = rows.filter((p) => p.overdueCount > 0);
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          (p.customerPhone ?? '').includes(q) ||
          p.planNumber.toLowerCase().includes(q),
      );
    }
    return rows.sort((a, b) => b.overdueAmount - a.overdueAmount || b.remainingAmount - a.remainingAmount);
  }, [emiData, onlyOverdue, search]);

  const totalOutstanding = summary?.totalOutstanding ?? 0;
  const emiOutstanding = emiStats?.activeRemaining ?? 0;
  const grandTotal = totalOutstanding + emiOutstanding;

  const exportCsv = () => {
    const rows: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Khata`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['UDHAAR', 'Phone', 'Balance', 'Credit Limit'],
      ...debtors.map((d) => [d.name, d.phone ?? '', d.balance.toFixed(0), d.creditLimit.toFixed(0)]),
      [],
      ['EMI PLAN', 'Customer', 'Phone', 'Kul', 'Ada', 'Baqi', 'Late Qisten', 'Late Amount', 'Agli Tareekh'],
      ...emiPlans.map((p) => [
        p.planNumber, p.customerName, p.customerPhone ?? '',
        p.totalAmount.toFixed(0), p.paidAmount.toFixed(0), p.remainingAmount.toFixed(0),
        String(p.overdueCount), p.overdueAmount.toFixed(0),
        p.nextDueDate ? formatDate(p.nextDueDate) : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-khata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const overduePlans = (emiData?.items ?? []).filter((p) => p.overdueCount > 0);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {payTarget && (
        <ReceivePaymentModal
          customer={payTarget}
          onClose={() => setPayTarget(null)}
          onDone={() => {
            setPayTarget(null);
            queryClient.invalidateQueries({
              predicate: (q) => {
                const k = String(q.queryKey?.[0] ?? '');
                return ['customer-ledger-summary', 'customers', 'customers-stats', 'emi-stats', 'emi-plans'].includes(k);
              },
            });
          }}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-700 dark:from-slate-950 dark:via-indigo-950 dark:to-violet-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
                <Wallet className="h-3.5 w-3.5 text-indigo-300" /> Khata
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">Logon se kitna lena hai?</h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-white/80">
                {shopName ? `${shopName} · ` : ''}Udhaar aur EMI qisten — dono milakar
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button
                onClick={() => refetchSummary()}
                disabled={isRefetching}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportCsv}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Kul Lena Hai" value={formatPKR(grandTotal)} icon={PiggyBank} accent />
            <HeroStat label="Seedha Udhaar" value={formatPKR(totalOutstanding)} icon={HandCoins} />
            <HeroStat label="EMI Baqi" value={formatPKR(emiOutstanding)} icon={CreditCard} />
            <HeroStat label="Late Qisten" value={String(emiStats?.overdueCount ?? 0)} icon={AlertTriangle} />
          </div>
        </div>
      </section>

      {/* ═══ OVERDUE ALERT ═══ */}
      {(emiStats?.overdueCount ?? 0) > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3.5 flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm font-semibold text-rose-900 dark:text-rose-200 min-w-0">
            <strong>{emiStats?.overdueCount} qisten late ho chuki hain</strong> —{' '}
            {formatPKR(emiStats?.overdueAmount ?? 0)} phansa hua hai.{' '}
            {overduePlans.length} customer ko yaad dilana hai.
          </div>
          <button
            onClick={() => { setTab('emi'); setOnlyOverdue(true); }}
            className="px-3.5 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md transition shrink-0 print:hidden"
          >
            <TrendingDown className="h-3.5 w-3.5" /> Late wale dekho
          </button>
        </div>
      )}

      {/* ═══ TABS + SEARCH ═══ */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <div className="flex gap-1.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-1">
          <button
            onClick={() => setTab('udhaar')}
            className={`h-9 px-3.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              tab === 'udhaar'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HandCoins className="h-3.5 w-3.5" /> Udhaar
            {debtors.length > 0 && <span className="px-1.5 rounded-full bg-black/15 text-[10px] tabular-nums">{debtors.length}</span>}
          </button>
          <button
            onClick={() => setTab('emi')}
            className={`h-9 px-3.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              tab === 'emi'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> EMI
            {emiPlans.length > 0 && <span className="px-1.5 rounded-full bg-black/15 text-[10px] tabular-nums">{emiPlans.length}</span>}
          </button>
        </div>

        <div className="relative flex-1 min-w-[12rem]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam, number ya plan #..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {tab === 'emi' && (
          <button
            onClick={() => setOnlyOverdue((v) => !v)}
            className={`h-11 px-3.5 rounded-xl text-xs font-extrabold border-2 inline-flex items-center gap-1.5 transition ${
              onlyOverdue
                ? 'bg-rose-600 text-white border-transparent shadow-lg shadow-rose-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Sirf late
          </button>
        )}
      </div>

      {/* ═══ UDHAAR LIST ═══ */}
      {tab === 'udhaar' && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">
              Udhaar Wale{' '}
              <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({debtors.length})</span>
            </h3>
          </div>

          {debtors.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {search ? `"${search}" se koi nahi mila` : 'Kisi ka udhaar baqi nahi 🎉'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {debtors.map((d) => {
                const overLimit = d.creditLimit > 0 && d.balance > d.creditLimit;
                return (
                  <div key={d.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-extrabold shrink-0">
                      {d.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/customers/${d.id}`}
                        className="font-extrabold text-slate-900 dark:text-white text-sm truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition inline-flex items-center gap-1"
                      >
                        {d.name} <ChevronRight className="h-3 w-3 opacity-50" />
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {d.phone && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3" /> {d.phone}
                          </span>
                        )}
                        {d.creditLimit > 0 && (
                          <span className={overLimit ? 'text-rose-600 dark:text-rose-400' : ''}>
                            Limit {formatPKR(d.creditLimit)}
                            {overLimit && ' — cross!'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-lg font-extrabold tabular-nums ${
                        overLimit ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {formatPKR(d.balance)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">lena hai</div>
                    </div>

                    <div className="flex gap-1.5 shrink-0 print:hidden">
                      {d.phone && (
                        <a
                          href={waLink(
                            d.phone,
                            `Assalam o Alaikum ${d.name},\n\nAap ka udhaar ${formatPKR(d.balance)} baqi hai.\nBaraye meherbani jama karwa dein.\n\nShukriya!`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="h-9 w-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition"
                          title="WhatsApp yaad dilao"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setPayTarget({ id: d.id, name: d.name, balance: d.balance })}
                        className="h-9 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 transition"
                      >
                        <Banknote className="h-3.5 w-3.5" /> Lo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ EMI LIST ═══ */}
      {tab === 'emi' && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">
              EMI Plans{' '}
              <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({emiPlans.length})</span>
            </h3>
          </div>

          {emiPlans.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {onlyOverdue ? 'Koi qist late nahi 🎉' : search ? `"${search}" se koi plan nahi mila` : 'Koi active EMI plan nahi'}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                POS se udhaar sale karne par EMI plan banane ka option aata hai
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emiPlans.map((p) => {
                const paidPct = p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
                const late = p.overdueCount > 0;
                const lateDays = p.nextDueDate ? daysLate(p.nextDueDate) : 0;
                return (
                  <div key={p.id} className="p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start gap-3">
                      <div className={`h-11 w-11 rounded-xl text-white flex items-center justify-center shrink-0 bg-gradient-to-br ${
                        late ? 'from-rose-500 to-red-600' : 'from-violet-500 to-fuchsia-600'
                      }`}>
                        <CreditCard className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/emi-plans/${p.id}`}
                            className="font-extrabold text-slate-900 dark:text-white text-sm truncate hover:text-violet-600 dark:hover:text-violet-400 transition"
                          >
                            {p.customerName}
                          </Link>
                          <span className="font-mono text-[10px] font-extrabold text-violet-700 dark:text-violet-400">
                            {p.planNumber}
                          </span>
                          {late && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold uppercase">
                              {p.overdueCount} qist late
                            </span>
                          )}
                          {p.status === 'DEFAULTED' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-extrabold uppercase">
                              Defaulted
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {p.customerPhone && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3" /> {p.customerPhone}
                            </span>
                          )}
                          <span className="tabular-nums">
                            {p.paidInstallmentCount}/{p.installmentCount} qisten
                          </span>
                          {p.nextDueDate && (
                            <span className={`inline-flex items-center gap-1 ${late ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                              <CalendarClock className="h-3 w-3" />
                              {formatDate(p.nextDueDate)}
                              {late && lateDays > 0 && ` (${lateDays}d late)`}
                            </span>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            <span>{formatPKR(p.paidAmount)} ada</span>
                            <span className="tabular-nums">{paidPct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all bg-gradient-to-r ${
                                late ? 'from-rose-500 to-red-600' : 'from-violet-500 to-fuchsia-600'
                              }`}
                              style={{ width: `${Math.min(paidPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-lg font-extrabold tabular-nums ${
                          late ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                        }`}>
                          {formatPKR(p.remainingAmount)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">baqi</div>
                        {late && (
                          <div className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                            {formatPKR(p.overdueAmount)} late
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex gap-1.5 justify-end print:hidden">
                      {p.customerPhone && (
                        <a
                          href={waLink(
                            p.customerPhone,
                            `Assalam o Alaikum ${p.customerName},\n\nAap ke EMI plan *${p.planNumber}* ki qist${late ? ' *late ho chuki hai*' : ' aane wali hai'}.\n\nBaqi: ${formatPKR(p.remainingAmount)}\n${p.nextDueDate ? `Tareekh: ${formatDate(p.nextDueDate)}` : ''}\n${late ? `Late amount: ${formatPKR(p.overdueAmount)}` : ''}\n\nBaraye meherbani jama karwa dein. Shukriya!`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="h-9 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Yaad Dilao
                        </a>
                      )}
                      <Link
                        to={`/emi-plans/${p.id}`}
                        className="h-9 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 transition"
                      >
                        <Banknote className="h-3.5 w-3.5" /> Qist Lo
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EMI summary strip */}
      {tab === 'emi' && emiStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <MiniStat label="Is Mahine Mila" value={formatPKR(emiStats.collectedThisMonth)} icon={CheckCircle2} tone="emerald" />
          <MiniStat label="Aane Wali Qisten" value={String(emiStats.upcomingCount)} icon={Clock} tone="blue" />
          <MiniStat label="Aane Wali Raqam" value={formatPKR(emiStats.upcomingAmount)} icon={CalendarClock} tone="violet" />
          <MiniStat label="Kul Financed" value={formatPKR(emiStats.activeFinanced)} icon={CreditCard} tone="amber" />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   RECEIVE PAYMENT MODAL
   ═════════════════════════════════════════════════════════════ */

function ReceivePaymentModal({
  customer, onClose, onDone,
}: {
  customer: { id: string; name: string; balance: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(customer.balance || ''));
  const [note, setNote] = useState('');

  const entered = Number(amount) || 0;
  const tooMuch = entered > customer.balance + 0.01;
  const remaining = Math.max(customer.balance - entered, 0);

  const mutation = useMutation({
    mutationFn: () =>
      customerLedgerApi.receivePayment(customer.id, {
        amount: entered,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`✓ ${customer.name} se ${formatPKR(entered)} mil gaye`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment fail hui'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="relative overflow-hidden px-5 py-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur border border-white/25 flex items-center justify-center shrink-0">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/80">Udhaar Wapsi</div>
                <h3 className="font-extrabold text-lg truncate">{customer.name}</h3>
              </div>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3.5 flex justify-between items-baseline">
            <span className="text-sm font-bold text-amber-900 dark:text-amber-200">Kul udhaar</span>
            <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">
              {formatPKR(customer.balance)}
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                Kitna mila
              </label>
              <button
                onClick={() => setAmount(String(customer.balance))}
                className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Poora {formatPKR(customer.balance)}
              </button>
            </div>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`h-14 w-full rounded-2xl border-2 bg-white dark:bg-slate-800 px-4 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none transition ${
                tooMuch ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
              }`}
            />
            {tooMuch && (
              <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                Udhaar sirf {formatPKR(customer.balance)} hai
              </p>
            )}
            {!tooMuch && remaining > 0 && (
              <p className="mt-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                {formatPKR(remaining)} abhi bhi baqi rahega
              </p>
            )}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
          />

          <Button
            size="lg"
            fullWidth
            disabled={tooMuch || entered <= 0}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            leftIcon={<Banknote className="h-4 w-4" />}
            className="bg-gradient-to-r from-indigo-600 to-violet-700 font-extrabold shadow-lg shadow-indigo-500/30"
          >
            {formatPKR(entered)} Jama Karo
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, icon: Icon, accent }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur-md border p-3 ${
      accent ? 'bg-amber-400/20 border-amber-300/40' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

const MINI_TONES: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
  blue: 'from-blue-500 to-cyan-600 shadow-blue-500/30',
  violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
};

function MiniStat({ label, value, icon: Icon, tone }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${MINI_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider truncate">{label}</div>
        <div className="font-extrabold text-slate-900 dark:text-white text-lg tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}
