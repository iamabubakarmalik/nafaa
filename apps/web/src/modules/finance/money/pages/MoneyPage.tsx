import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, AreaChart, Area, BarChart, Bar, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import {
  Wallet, Package, BookOpen, Truck, TrendingUp, TrendingDown, Coins,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, CheckCircle2, Scale,
  RefreshCw, GraduationCap, Printer, Download, CalendarRange, ChevronDown,
  Calculator, Landmark, Receipt, ShoppingCart, PiggyBank, X, Info, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { moneyApi } from '../api/money.api';

/* ═════════════════════════════════════════════════════════════
   DUKAAN KA HISAB
   ─────────────────────────────────────────────────────────────
   Nafaa har cheez alag safhe par batata tha — bikri Sales me,
   kharidari Purchases me, kharch Expenses me, udhaar Khata me,
   golak Cash Register me. Koi ek jagah nahi thi jo kahe:

     "Aaj tumhare paas ITNA cash hai, ITNA maal me phansa hai,
      ITNA logon se lena hai, ITNA dena hai."

   Dukaan-daar isi ek sawal par faisla karta hai ke aaj maal
   khareede ya na khareede. Ye wohi safha hai.

   Chart wohi chuna hai jo sawal ka jawab de:
     • Paisa kahan para hai      → donut (hisson ka bantwara)
     • Har mahine kitna kamaya   → bar + line (ginti aur rujhan)
     • Aaya vs gaya              → do rukh ka bar
     • Kharch kis par            → horizontal bar (naam lambe hote hain)
     • Munafe ka safar           → area (jama hota hua)
     • Hadaf ke muqable          → radial
   ═════════════════════════════════════════════════════════════ */

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TIP = {
  borderRadius: 14, border: 'none',
  backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12,
  boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};

const C = {
  cash: '#10b981',
  stock: '#0ea5e9',
  lena: '#8b5cf6',
  dena: '#e11d48',
  revenue: '#0ea5e9',
  profit: '#10b981',
  expense: '#f59e0b',
  purchase: '#6366f1',
};

/** Bara number chhote roop me — "Rs 20.3 lakh" ek nazar me parha jata hai */
function shortPKR(n: number): string {
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (v >= 10_000_000) return `${sign}Rs ${(v / 10_000_000).toFixed(2)} crore`;
  if (v >= 100_000) return `${sign}Rs ${(v / 100_000).toFixed(1)} lakh`;
  if (v >= 1_000) return `${sign}Rs ${Math.round(v / 1_000)}k`;
  return `${sign}Rs ${Math.round(v)}`;
}

type RangeKey = '7' | '30' | '90' | '365';
const RANGES: { v: RangeKey; l: string }[] = [
  { v: '7', l: '7 din' },
  { v: '30', l: '30 din' },
  { v: '90', l: '3 mahine' },
  { v: '365', l: 'Saal bhar' },
];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function MoneyPage() {
  const hide = useCostHidden();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [range, setRange] = useState<RangeKey>('30');
  const [showGuide, setShowGuide] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcAmount, setCalcAmount] = useState('');

  const [from, to] = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (Number(range) - 1));
    return [dayKey(start), dayKey(end)];
  }, [range]);

  const posQ = useQuery({ queryKey: ['money-position'], queryFn: moneyApi.position });
  const flowQ = useQuery({ queryKey: ['money-flow', from, to], queryFn: () => moneyApi.flow(from, to) });
  const trendQ = useQuery({ queryKey: ['money-trend'], queryFn: () => moneyApi.trend(12) });
  const dailyQ = useQuery({ queryKey: ['money-daily', from, to], queryFn: () => moneyApi.daily(from, to) });

  const p = posQ.data;
  const flow = flowQ.data;
  const trend = trendQ.data ?? [];
  const daily = dailyQ.data ?? [];

  const m = (n: number) => (hide ? '••••' : shortPKR(n));
  const exact = (n: number) => (hide ? undefined : formatPKR(n));

  /* ─── Paisa kahan para hai ─── */
  const whereMoney = useMemo(() => {
    if (!p) return [];
    return [
      { name: 'Golak (cash)', value: p.cashInHand, hex: C.cash, hint: 'Abhi haath me' },
      { name: 'Maal me', value: p.stockCost, hex: C.stock, hint: 'Stock ki lagat' },
      { name: 'Logon se lena', value: p.receivables, hex: C.lena, hint: `${p.receivableCount} customer` },
    ].filter((r) => r.value > 0);
  }, [p]);

  /* ─── Aaya vs gaya ─── */
  const inOut = useMemo(() => {
    if (!flow) return [];
    return [
      { name: 'Bikri se cash', value: flow.in.salesPaid, side: 'in', hex: C.cash },
      { name: 'Udhaar wasooli', value: flow.in.recovered, side: 'in', hex: '#34d399' },
      { name: 'Kharidari me diya', value: -flow.out.purchasesPaid, side: 'out', hex: C.purchase },
      { name: 'Supplier ko diya', value: -flow.out.supplierPayments, side: 'out', hex: '#a855f7' },
      { name: 'Kharch', value: -flow.out.expenses, side: 'out', hex: C.expense },
    ].filter((r) => r.value !== 0);
  }, [flow]);

  /* ─── Munafe ka safar — jama hota hua ─── */
  const cumulative = useMemo(() => {
    let run = 0;
    return daily.map((d) => {
      run += d.profit;
      return { ...d, cumulative: run };
    });
  }, [daily]);

  /* ─── Sehat ka score — teen ishare ─── */
  const health = useMemo(() => {
    if (!p) return null;
    const cashRatio = p.payables > 0 ? p.cashInHand / p.payables : 2;
    const marginOk = p.month.margin >= 10;
    const creditOk = p.month.revenue > 0 ? p.receivables / p.month.revenue < 0.5 : true;
    const score = (cashRatio >= 1 ? 40 : cashRatio >= 0.5 ? 20 : 0)
      + (marginOk ? 30 : p.month.margin > 0 ? 15 : 0)
      + (creditOk ? 30 : 10);
    return {
      score,
      level: score >= 75 ? 'Achhi' : score >= 45 ? 'Theek' : 'Kamzor',
      hex: score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#e11d48',
      cashRatio, marginOk, creditOk,
    };
  }, [p]);

  const calcNum = Number(calcAmount) || 0;
  const afterSpend = (p?.spendable ?? 0) - calcNum;

  const exportCSV = () => {
    if (!p || !flow) return toast.error('Abhi data nahi aaya');
    const rows = [
      [`Dukaan ka Hisab — ${tenantName || 'Nafaa'}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [''],
      ['ABHI KA HAAL'],
      ['Golak (cash)', p.cashInHand.toFixed(2)],
      ['Maal ki lagat', p.stockCost.toFixed(2)],
      ['Logon se lena', p.receivables.toFixed(2)],
      ['Supplier ko dena', p.payables.toFixed(2)],
      ['Dukaan ki maliyat', p.netWorth.toFixed(2)],
      ['Kharch karne layak', p.spendable.toFixed(2)],
      [''],
      [`PAISA KAHAN SE AAYA / GAYA (${range} din)`],
      ['Bikri se cash', flow.in.salesPaid.toFixed(2)],
      ['Udhaar wasooli', flow.in.recovered.toFixed(2)],
      ['Kharidari me diya', flow.out.purchasesPaid.toFixed(2)],
      ['Supplier ko diya', flow.out.supplierPayments.toFixed(2)],
      ['Kharch', flow.out.expenses.toFixed(2)],
      ['Bacha', flow.net.toFixed(2)],
      [''],
      ['IS MAHINE'],
      ['Bikri', p.month.revenue.toFixed(2)],
      ['Maal ki lagat', p.month.cogs.toFixed(2)],
      ['Kaccha munafa', p.month.grossProfit.toFixed(2)],
      ['Kharch', p.month.expenses.toFixed(2)],
      ['Saaf munafa', p.month.netProfit.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dukaan-ka-hisab-${dayKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV ban gaya');
  };

  if (posQ.isLoading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="h-7 w-7 animate-spin mx-auto text-emerald-600 mb-3" />
        <p className="text-sm font-bold text-slate-500">Hisab lagaya ja raha hai…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 sm:p-7 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Landmark className="h-3.5 w-3.5 text-amber-300" /> Dukaan ka Hisab
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">💰 Mera Paisa Kahan Hai</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/85">
              Cash, maal, lena aur dena — sab ek jagah
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowGuide(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Samjhayein</span>
            </button>
            <button onClick={() => { posQ.refetch(); flowQ.refetch(); trendQ.refetch(); dailyQ.refetch(); }}
              disabled={posQ.isRefetching}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${posQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV}
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => window.print()}
              className="h-11 px-3.5 rounded-xl bg-white text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* ── Sab se ahem number ── */}
        {p && (
          <div className="relative mt-5 grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 rounded-2xl bg-white/12 backdrop-blur border-2 border-white/25 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" /> Aaj kharch karne layak
              </div>
              <div className="text-3xl sm:text-4xl font-black tabular-nums mt-1 text-emerald-200"
                title={exact(p.spendable)}>
                {m(p.spendable)}
              </div>
              <div className="text-[11px] font-bold text-white/70 mt-1">
                Golak {m(p.cashInHand)}
                {p.payables > 0 && <> manhaa supplier ka {m(p.payables)}</>}
              </div>
              {p.shortfall > 0 && (
                <div className="mt-2 rounded-xl bg-rose-500/25 border border-rose-300/40 p-2 text-[11px] font-black text-rose-100 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Supplier ka {m(p.shortfall)} golak se zyada hai — wasooli par tawajjo dein
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/12 backdrop-blur border-2 border-white/25 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" /> Dukaan ki maliyat
              </div>
              <div className="text-2xl sm:text-3xl font-black tabular-nums mt-1" title={exact(p.netWorth)}>
                {m(p.netWorth)}
              </div>
              <div className="text-[11px] font-bold text-white/70 mt-1">
                Cash + maal + lena − dena
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ CHAAR KHANE ═══════════ */}
      {p && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
          <Stat icon={Wallet} tone="emerald" label="Golak — cash"
            value={m(p.cashInHand)} exact={exact(p.cashInHand)}
            sub={p.registers.length ? `${p.registers.length} register khula` : 'Koi register khula nahi'} />
          <Stat icon={Package} tone="sky" label="Maal me phansa"
            value={m(p.stockCost)} exact={exact(p.stockCost)}
            sub={`${p.stockUnits.toLocaleString()} units · bikay to +${m(p.stockPotentialProfit)}`} />
          <Stat icon={BookOpen} tone="violet" label="Logon se lena"
            value={m(p.receivables)} exact={exact(p.receivables)}
            sub={`${p.receivableCount} customer par baqi`} link="/khata" />
          <Stat icon={Truck} tone="rose" label="Supplier ko dena"
            value={m(p.payables)} exact={exact(p.payables)}
            sub={`${p.payableCount} supplier ka baqi`} link="/suppliers" alert={p.payables > p.cashInHand} />
        </section>
      )}

      {/* ═══════════ DAIRA ═══════════ */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <CalendarRange className="h-3 w-3" /> Muddat
        </span>
        {RANGES.map((r) => (
          <button key={r.v} onClick={() => setRange(r.v)}
            className={`h-10 px-4 rounded-xl text-xs font-black transition ${
              range === r.v ? 'bg-emerald-600 text-white shadow'
                            : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
            }`}>{r.l}</button>
        ))}
        <button onClick={() => setCalcOpen(true)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow transition ml-auto">
          <Calculator className="h-4 w-4" /> Kya khareed sakta hoon?
        </button>
      </div>

      {/* ═══════════ PAISA KAHAN + SEHAT ═══════════ */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Panel icon={Coins} title="Paisa Kahan Para Hai" tone="emerald"
          hint="Dukaan ki kul maliyat kin hisson me bati hui hai">
          {whereMoney.length === 0 ? (
            <Blank text="Abhi koi hisab nahi bana" />
          ) : (
            <div className="grid sm:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={whereMoney} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={58} outerRadius={86} paddingAngle={4} stroke="none">
                      {whereMoney.map((d, i) => <Cell key={i} fill={d.hex} />)}
                    </Pie>
                    <Tooltip contentStyle={TIP} formatter={(v: any) => formatPKR(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kul</div>
                  <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {m(whereMoney.reduce((s, r) => s + r.value, 0))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {whereMoney.map((r) => {
                  const total = whereMoney.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? (r.value / total) * 100 : 0;
                  return (
                    <div key={r.name} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: r.hex }} />
                        <span className="font-black text-sm text-slate-900 dark:text-white flex-1 truncate">{r.name}</span>
                        <span className="text-sm font-black tabular-nums" style={{ color: r.hex }}>{m(r.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct, 100)}%`, background: r.hex }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>{r.hint}</span><span>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
                {p && p.payables > 0 && (
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-black text-sm text-rose-900 dark:text-rose-200 flex-1">Supplier ko dena</span>
                      <span className="text-sm font-black text-rose-700 dark:text-rose-300 tabular-nums">−{m(p.payables)}</span>
                    </div>
                    <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      Ye upar wale hisse me se nikal jayega
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>

        {/* Sehat */}
        <Panel icon={Target} title="Dukaan Ki Sehat" tone="violet" hint="Teen ishare — ek nazar me">
          {!health || !p ? <Blank text="Hisab nahi bana" /> : (
            <>
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="62%" outerRadius="100%" startAngle={210} endAngle={-30}
                    data={[{ name: 'score', value: health.score, fill: health.hex }]}>
                    <RadialBar dataKey="value" cornerRadius={12} background={{ fill: 'rgba(148,163,184,0.18)' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-3xl font-black tabular-nums" style={{ color: health.hex }}>{health.score}</div>
                  <div className="text-[11px] font-black" style={{ color: health.hex }}>{health.level}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <HealthRow ok={health.cashRatio >= 1}
                  label="Golak supplier ke baqi se zyada"
                  detail={p.payables > 0
                    ? `${m(p.cashInHand)} vs ${m(p.payables)}`
                    : 'Kisi supplier ka baqi nahi'} />
                <HealthRow ok={health.marginOk}
                  label="Munafa 10% se upar"
                  detail={`Is mahine ${p.month.margin.toFixed(1)}%`} />
                <HealthRow ok={health.creditOk}
                  label="Udhaar qaboo me"
                  detail={p.month.revenue > 0
                    ? `Bikri ka ${((p.receivables / p.month.revenue) * 100).toFixed(0)}% logon ke paas`
                    : 'Abhi koi bikri nahi'} />
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* ═══════════ AAYA vs GAYA ═══════════ */}
      <Panel icon={ArrowDownCircle} title="Paisa Kahan Se Aaya, Kahan Gaya" tone="sky"
        hint={`Pichlay ${RANGES.find((r) => r.v === range)?.l}`}
        right={flow && (
          <div className={`px-3 py-1.5 rounded-xl text-xs font-black tabular-nums ${
            flow.net >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}>
            {flow.net >= 0 ? 'Bacha' : 'Ghata'} {m(Math.abs(flow.net))}
          </div>
        )}>
        {!flow || inOut.length === 0 ? <Blank text="Is muddat me koi harkat nahi" /> : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inOut} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" stroke={AXIS} fontSize={11}
                    tickFormatter={(v) => shortPKR(Math.abs(Number(v))).replace('Rs ', '')} />
                  <YAxis type="category" dataKey="name" width={130} stroke={AXIS} fontSize={11} fontWeight={700} />
                  <Tooltip contentStyle={TIP} formatter={(v: any) => formatPKR(Math.abs(Number(v)))} />
                  <ReferenceLine x={0} stroke={AXIS} strokeWidth={2} />
                  <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={30}>
                    {inOut.map((d, i) => <Cell key={i} fill={d.hex} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 mt-2">
              <FlowCell tone="emerald" icon={ArrowDownCircle} label="Andar aaya" value={m(flow.in.total)}
                detail={`Bikri ${m(flow.in.salesPaid)} · wasooli ${m(flow.in.recovered)}`} />
              <FlowCell tone="rose" icon={ArrowUpCircle} label="Bahar gaya" value={m(flow.out.total)}
                detail={`Maal ${m(flow.out.purchasesPaid + flow.out.supplierPayments)} · kharch ${m(flow.out.expenses)}`} />
              <FlowCell tone={flow.net >= 0 ? 'emerald' : 'rose'} icon={Scale}
                label={flow.net >= 0 ? 'Bacha' : 'Ghata'} value={m(Math.abs(flow.net))}
                detail={flow.net >= 0 ? 'Golak barha' : 'Golak kam hua'} />
            </div>
          </>
        )}
      </Panel>

      {/* ═══════════ MAHINA BA MAHINA ═══════════ */}
      <Panel icon={TrendingUp} title="Har Mahine Kitna Kamaya" tone="emerald"
        hint="Bikri, lagat, kharch aur saaf munafa — 12 mahine">
        {trend.length === 0 ? <Blank text="Abhi koi record nahi" /> : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ left: 4, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} fontSize={11} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11}
                  tickFormatter={(v) => shortPKR(Number(v)).replace('Rs ', '')} />
                <Tooltip contentStyle={TIP}
                  formatter={(v: any, n: any) => [formatPKR(Number(v)),
                    n === 'revenue' ? 'Bikri' : n === 'cogs' ? 'Maal ki lagat'
                    : n === 'expenses' ? 'Kharch' : 'Saaf munafa']} />
                <Legend formatter={(v) => (
                  v === 'revenue' ? 'Bikri' : v === 'cogs' ? 'Maal ki lagat'
                  : v === 'expenses' ? 'Kharch' : 'Saaf munafa')} />
                <Bar dataKey="cogs" stackId="cost" fill={C.purchase} radius={[0, 0, 0, 0]} maxBarSize={44} />
                <Bar dataKey="expenses" stackId="cost" fill={C.expense} radius={[6, 6, 0, 0]} maxBarSize={44} />
                <Line type="monotone" dataKey="revenue" stroke={C.revenue} strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 0, fill: C.revenue }} />
                <Line type="monotone" dataKey="netProfit" stroke={C.profit} strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 0, fill: C.profit }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
          Column = paisa jo kharch hua (maal + kharch). Neeli lakeer = bikri. Sabz lakeer = jo waqai bacha.
          Sabz lakeer neeli se jitni door, utna acha.
        </p>
      </Panel>

      {/* ═══════════ MUNAFE KA SAFAR + KHARCH ═══════════ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel icon={TrendingUp} title="Munafe Ka Safar" tone="emerald"
          hint={`Pichlay ${RANGES.find((r) => r.v === range)?.l} — jama hota hua`}>
          {cumulative.length === 0 ? <Blank text="Koi bikri nahi" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ left: 4, right: 4 }}>
                  <defs>
                    <linearGradient id="mpCum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.profit} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={C.profit} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" stroke={AXIS} fontSize={10}
                    interval={Math.max(0, Math.floor(cumulative.length / 8))} />
                  <YAxis stroke={AXIS} fontSize={11}
                    tickFormatter={(v) => shortPKR(Number(v)).replace('Rs ', '')} />
                  <Tooltip contentStyle={TIP}
                    formatter={(v: any) => [formatPKR(Number(v)), 'Ab tak jama munafa']} />
                  <ReferenceLine y={0} stroke={AXIS} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cumulative" stroke={C.profit} strokeWidth={3} fill="url(#mpCum)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel icon={Receipt} title="Kharch Kis Par" tone="amber"
          hint={`Pichlay ${RANGES.find((r) => r.v === range)?.l}`}>
          {!flow || flow.expenseBreakdown.length === 0 ? (
            <Blank text="Is muddat me koi kharch darj nahi" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flow.expenseBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" stroke={AXIS} fontSize={11}
                    tickFormatter={(v) => shortPKR(Number(v)).replace('Rs ', '')} />
                  <YAxis type="category" dataKey="name" width={110} stroke={AXIS} fontSize={11} fontWeight={700} />
                  <Tooltip contentStyle={TIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {flow.expenseBreakdown.slice(0, 8).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* ═══════════ IS MAHINE KA TOOTNA ═══════════ */}
      {p && (
        <Panel icon={Calculator} title="Is Mahine Ka Poora Hisab" tone="sky"
          hint="Bikri se saaf munafe tak — har qadam">
          <div className="space-y-2">
            <LadderRow label="Bikri" value={p.month.revenue} tone="sky" m={m} exact={exact}
              note={`${p.month.bills} bill`} />
            <LadderRow label="Maal ki lagat" value={-p.month.cogs} tone="indigo" m={m} exact={exact}
              note="jo maal bika uski kharid" />
            <LadderRow label="Kaccha munafa" value={p.month.grossProfit} tone="emerald" m={m} exact={exact}
              bold note="bikri manhaa lagat" />
            <LadderRow label="Kharch" value={-p.month.expenses} tone="amber" m={m} exact={exact}
              note={`${p.month.expenseCount} kharch`} />
            <LadderRow label="Saaf munafa" value={p.month.netProfit} tone={p.month.netProfit >= 0 ? 'emerald' : 'rose'}
              m={m} exact={exact} big note={`${p.month.margin.toFixed(1)}% margin`} />
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mt-4">
            <MiniStat label="Udhaar par bika" value={m(p.month.credit)} tone="amber"
              hint="Ye paisa abhi aaya nahi" />
            <MiniStat label="Maal khareeda" value={m(p.month.purchases)} tone="indigo"
              hint={`${m(p.month.purchasesPaid)} turant diya`} />
            <MiniStat label="Udhaar wasool kiya" value={m(p.month.customerRecovered)} tone="emerald"
              hint="Purane khaton se" />
          </div>
        </Panel>
      )}

      {/* ═══════════ KYA KHAREED SAKTA HOON ═══════════ */}
      {calcOpen && p && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCalcOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-violet-200 dark:border-violet-500/40">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white p-5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black">Kya khareed sakta hoon?</h3>
              <p className="text-xs font-bold text-white/85 mt-0.5">
                Raqam likhein — batata hoon golak par kya asar hoga
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Kitne ka maal / kharch
                </label>
                <input type="number" min={0} autoFocus value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)} placeholder="0"
                  className="h-14 w-full rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 text-2xl font-black tabular-nums focus:outline-none focus:border-violet-500 transition" />
              </div>

              <div className="space-y-1.5">
                <CalcRow label="Golak me abhi" value={m(p.cashInHand)} />
                <CalcRow label="Supplier ka baqi" value={`−${m(p.payables)}`} tone="rose" />
                <CalcRow label="Kharch karne layak" value={m(p.spendable)} bold />
                {calcNum > 0 && (
                  <>
                    <CalcRow label="Ye kharidari" value={`−${m(calcNum)}`} tone="violet" />
                    <CalcRow label="Baad me bachega"
                      value={m(afterSpend)} big
                      tone={afterSpend >= 0 ? 'emerald' : 'rose'} />
                  </>
                )}
              </div>

              {calcNum > 0 && (
                <div className={`rounded-2xl border-2 p-3.5 ${
                  afterSpend >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
                }`}>
                  <div className="flex items-start gap-2">
                    {afterSpend >= 0
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      : <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />}
                    <div className={`text-xs font-bold leading-relaxed ${
                      afterSpend >= 0 ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
                    }`}>
                      {afterSpend >= 0 ? (
                        <>Ye kharidari ho sakti hai. Uske baad bhi <strong>{m(afterSpend)}</strong> bacha
                        rahega supplier ka paisa dene ke liye.</>
                      ) : (
                        <>Ehtiyat karein — is ke baad supplier ka paisa dene ke liye <strong>{m(Math.abs(afterSpend))}</strong> kam
                        par jayega. Pehle kuch udhaar wasool kar lein.</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button variant="secondary" className="w-full h-12" onClick={() => setCalcOpen(false)}>
                <X className="h-4 w-4" /> Band karein
              </Button>
            </div>
          </div>
        </div>
      )}

      {showGuide && <MoneyGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}

/* ─────────────── chhote purzay ─────────────── */

const TONES: Record<string, string> = {
  emerald: 'from-emerald-500 to-green-700',
  sky: 'from-sky-500 to-blue-700',
  violet: 'from-violet-500 to-purple-700',
  rose: 'from-rose-500 to-red-700',
  amber: 'from-amber-500 to-orange-600',
  indigo: 'from-indigo-500 to-blue-700',
};

function Stat({ icon: Icon, label, value, exact, sub, tone = 'sky', link, alert }: any) {
  const body = (
    <div className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 p-4 shadow-sm transition h-full ${
      alert ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
    } ${link ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}`}>
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${TONES[tone]} opacity-10 group-hover:opacity-20 transition`} />
      <div className="relative flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">{label}</div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-tight break-words"
            title={exact}>{value}</div>
          {sub && <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug">{sub}</div>}
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{body}</Link> : body;
}

function Panel({ icon: Icon, title, hint, tone = 'sky', right, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
            {hint && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Blank({ text }: { text: string }) {
  return <p className="py-14 text-center text-xs font-bold text-slate-400">{text}</p>;
}

function HealthRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-2.5 ${
      ok ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
    }`}>
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <div className={`text-xs font-black ${ok ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'}`}>
          {label}
        </div>
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{detail}</div>
      </div>
    </div>
  );
}

function FlowCell({ tone, icon: Icon, label, value, detail }: any) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 ${map[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-xl font-black tabular-nums mt-1">{value}</div>
      <div className="text-[10px] font-bold opacity-70 mt-0.5">{detail}</div>
    </div>
  );
}

function LadderRow({ label, value, tone, m, exact, note, bold, big }: any) {
  const neg = value < 0;
  const map: Record<string, string> = {
    sky: 'text-sky-700 dark:text-sky-400',
    indigo: 'text-indigo-700 dark:text-indigo-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
  };
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${
      big ? 'bg-slate-900 dark:bg-slate-800 text-white'
          : bold ? 'bg-slate-100 dark:bg-slate-800'
                 : 'bg-slate-50 dark:bg-slate-800/60'
    }`}>
      <div className="min-w-0">
        <div className={`font-black ${big ? 'text-base text-white' : bold ? 'text-sm text-slate-900 dark:text-white' : 'text-sm text-slate-700 dark:text-slate-200'}`}>
          {label}
        </div>
        {note && <div className={`text-[10px] font-bold ${big ? 'text-white/60' : 'text-slate-400'}`}>{note}</div>}
      </div>
      <div className={`font-black tabular-nums shrink-0 ${big ? 'text-2xl text-white' : `text-lg ${map[tone]}`}`}
        title={exact(Math.abs(value))}>
        {neg ? '−' : ''}{m(Math.abs(value))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone, hint }: any) {
  const map: Record<string, string> = {
    amber: 'text-amber-700 dark:text-amber-400',
    indigo: 'text-indigo-700 dark:text-indigo-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
  };
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-lg font-black tabular-nums ${map[tone]}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-400">{hint}</div>
    </div>
  );
}

function CalcRow({ label, value, tone, bold, big }: any) {
  const map: Record<string, string> = {
    rose: 'text-rose-600 dark:text-rose-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
      big ? 'bg-slate-900 dark:bg-slate-800 text-white' : bold ? 'bg-slate-100 dark:bg-slate-800' : ''
    }`}>
      <span className={`font-bold ${big ? 'text-sm text-white' : 'text-xs text-slate-600 dark:text-slate-300'}`}>{label}</span>
      <span className={`font-black tabular-nums ${
        big ? 'text-xl text-white' : bold ? 'text-base text-slate-900 dark:text-white' : `text-sm ${map[tone] ?? 'text-slate-700 dark:text-slate-200'}`
      }`}>{value}</span>
    </div>
  );
}

/* ─────────────── GUIDE ─────────────── */
function MoneyGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl">
        <div className="px-5 py-3.5 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye Safha Kya Batata Hai
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
            Nafaa har cheez alag safhe par batata hai — bikri Sales me, kharidari Purchases me,
            kharch Expenses me. Ye wohi ek jagah hai jahan sab jama ho kar poori tasveer banti hai.
          </p>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 mb-2">
              Teen cheezein jo log gaddmadd karte hain
            </div>
            <div className="space-y-2.5 text-xs font-bold text-amber-900 dark:text-amber-100">
              <div className="flex gap-2">
                <span className="shrink-0">💵</span>
                <span><strong>Cash</strong> — jo abhi golak me hai. Sirf isi se kharidari ho sakti hai.</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0">📦</span>
                <span><strong>Maal</strong> — paisa jo stock me para hai. "Hai" magar haath me nahi.
                Bikne tak kaam ka nahi.</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0">📈</span>
                <span><strong>Munafa</strong> — bikri munafa NAHI hoti. Bikri manhaa maal ki lagat
                manhaa kharch — jo bachta hai wo munafa hai.</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Sab se ahem number
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed space-y-2">
              <p>
                <strong>"Kharch karne layak"</strong> = golak me jo hai, manhaa supplier ka baqi.
              </p>
              <p>
                Dukaan-daar aksar poora golak apna samajh kar maal khareed leta hai. Phir supplier
                ka paisa dene ka waqt aata hai aur haath khali hota hai. Ye number wohi ghalti
                rokta hai.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Har chart kya poochta hai
            </div>
            <div>🍩 <strong>Paisa kahan para hai</strong> — kul maliyat kin hisson me bati hai</div>
            <div>🎯 <strong>Sehat</strong> — teen ishare: golak, munafa, udhaar</div>
            <div>↔️ <strong>Aaya vs gaya</strong> — kis raste paisa aaya, kis raste gaya</div>
            <div>📊 <strong>Har mahine</strong> — column kharch, lakeerein bikri aur munafa</div>
            <div>📈 <strong>Munafe ka safar</strong> — jama hota hua munafa</div>
            <div>🧾 <strong>Kharch kis par</strong> — sab se bara kharch sab se upar</div>
            <div>🧮 <strong>Kya khareed sakta hoon</strong> — raqam likhein, asar dekhein</div>
          </div>

          <Button onClick={onClose} className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-700 font-black">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}
