// apps/web/src/industries/electronics/pages/ElectronicsKhataPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  HandCoins, Users, Search, RefreshCw, FileSpreadsheet, Printer, X,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Wallet, TrendingUp,
  AlertTriangle, Phone, ArrowRight, Loader2, Plus, Minus, ShieldAlert,
  MessageCircle, Barcode, BookOpen, Clock, History, BarChart3, Crown,
  TrendingDown, UserPlus, Upload, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import {
  customerLedgerApi, type Debtor, type LedgerType,
} from '@modules/customers/khata/api/customer-ledger.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — UDHAAR KHATA
   ─────────────────────────────────────────────────────────────
   💰 Kis ka kitna baqi — poori list, sirf top 20 nahi
   ➕ Udhaar seedha chadhayein — sale ke baghair bhi
   📖 Purana khata (copy se software par) — opening balance
   📊 Is mahine kitna udhaar gaya, kitna wasool hua
   ⏰ Jo 30+ din se khamosh hain — unhe yaad dilayein
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'over' | 'stale' | 'activity';

const LEDGER_META: Record<LedgerType, { label: string; chip: string; icon: any }> = {
  SALE_CREDIT:      { label: 'Sale par udhaar', chip: 'bg-amber-100 text-amber-700',   icon: ArrowUpRight },
  ADJUSTMENT:       { label: 'Udhaar chadhaya', chip: 'bg-orange-100 text-orange-700', icon: Plus },
  PAYMENT_RECEIVED: { label: 'Wasooli',         chip: 'bg-emerald-100 text-emerald-700', icon: ArrowDownLeft },
  OPENING_BALANCE:  { label: 'Purana khata',    chip: 'bg-violet-100 text-violet-700', icon: BookOpen },
};

export default function ElectronicsKhataPage() {
  const qc = useQueryClient();
  const currentShopId = useShopParam();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<
    { kind: 'pay' | 'udhaar'; customer: Debtor } | { kind: 'opening' } | null
  >(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: summary, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['customer-ledger-summary'],
    queryFn: customerLedgerApi.summary,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', currentShopId],
    queryFn: () => salesApi.list(currentShopId || undefined),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['customer-ledger-summary'] });
    qc.invalidateQueries({ queryKey: ['customers'] });
    qc.invalidateQueries({ queryKey: ['customers-stats'] });
  };

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (action) return setAction(null);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n') setAction({ kind: 'opening' });
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['all', 'over', 'stale', 'activity'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, action]);

  const anyModal = showTeacher || showShortcuts || !!action;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  /* Kis customer ki udhaar wali sale me serial unit gaya tha */
  const serialCreditByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sales) {
      if ((s.creditAmount ?? 0) <= 0 || !s.customer?.id) continue;
      const n = (s.items ?? []).reduce((a: number, it: any) => a + (it.serials?.length ?? 0), 0);
      if (n > 0) m.set(s.customer.id, (m.get(s.customer.id) ?? 0) + n);
    }
    return m;
  }, [sales]);

  const debtors = summary?.topDebtors ?? [];
  const stale = summary?.staleDebtors ?? [];

  const counts = useMemo(() => ({
    all: debtors.length,
    over: debtors.filter((d) => d.creditLimit > 0 && d.balance > d.creditLimit).length,
    stale: stale.length,
    activity: summary?.recentActivity?.length ?? 0,
  }), [debtors, stale, summary]);

  const list = useMemo(() => {
    let l: Debtor[] = tab === 'stale' ? stale : debtors;
    if (tab === 'over') l = l.filter((d) => d.creditLimit > 0 && d.balance > d.creditLimit);
    const q = search.toLowerCase().trim();
    if (q) l = l.filter((d) => d.name.toLowerCase().includes(q) || (d.phone ?? '').includes(q));
    return [...l].sort((a, b) => b.balance - a.balance);
  }, [debtors, stale, tab, search]);

  /* Top 8 ka chart */
  const chartRows = useMemo(
    () => debtors.slice(0, 8).map((d) => ({
      name: d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name,
      Baqi: Math.round(d.balance),
      over: d.creditLimit > 0 && d.balance > d.creditLimit,
    })),
    [debtors],
  );

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Udhaar Khata`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul baqi', String(Math.round(summary?.totalOutstanding ?? 0))],
      ['Udhaar wale customers', String(summary?.customersWithCredit ?? 0)],
      ['Kul customers', String(summary?.totalCustomers ?? 0)],
      ['Is mahine udhaar gaya', String(Math.round(summary?.thisMonth.udhaar ?? 0))],
      ['Is mahine wasool hua', String(Math.round(summary?.thisMonth.wasooli ?? 0))],
      ['Limit se upar', String(summary?.overLimitCount ?? 0)],
      ['30+ din se khamosh', String(summary?.staleCount ?? 0)],
      ['Advance jama', String(Math.round(summary?.advance.amount ?? 0))],
      [],
      ['Naam', 'Phone', 'Baqi', 'Credit Limit', 'Limit se upar', 'Kitne din se khamosh', 'Serial units udhaar par'],
      ...list.map((d) => [
        d.name, d.phone ?? '',
        String(Math.round(d.balance)),
        String(Math.round(d.creditLimit)),
        d.creditLimit > 0 && d.balance > d.creditLimit ? 'HAAN' : '',
        d.daysSinceActivity != null ? String(d.daysSinceActivity) : '',
        String(serialCreditByCustomer.get(d.id) ?? 0),
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const whatsapp = (name: string, phone: string | null | undefined, balance: number) => {
    if (!phone) return toast.error('Phone number nahi hai');
    const p = phone.replace(/[^0-9]/g, '');
    const clean = p.startsWith('92') ? p : p.startsWith('0') ? '92' + p.slice(1) : '92' + p;
    const msg = [
      `Assalam-o-Alaikum ${name}!`, '',
      `${tenantName ?? 'Hamari dukan'} par aap ka baqi: *${formatPKR(balance)}*`, '',
      'Baraye meherbani jald adaigi kar dein. Shukriya 🙏',
    ].join('\n');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  const net = (summary?.thisMonth.wasooli ?? 0) - (summary?.thisMonth.udhaar ?? 0);

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Udhaar Khata" subtitle="Kis ka kitna baqi hai" />
      {showTeacher && <KhataTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {action?.kind === 'pay' && (
        <AmountModal kind="pay" customer={action.customer}
          onClose={() => setAction(null)} onDone={() => { refreshAll(); setAction(null); }} />
      )}
      {action?.kind === 'udhaar' && (
        <AmountModal kind="udhaar" customer={action.customer}
          onClose={() => setAction(null)} onDone={() => { refreshAll(); setAction(null); }} />
      )}
      {action?.kind === 'opening' && (
        <OpeningBalanceModal onClose={() => setAction(null)}
          onDone={() => { refreshAll(); setAction(null); }} />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-orange-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <HandCoins className="h-3.5 w-3.5 text-amber-300" /> Udhaar Khata
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💰 Kis Ka Kitna Baqi?</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Sale se bhi, aur seedha bhi — poora khata ek jagah
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setAction({ kind: 'opening' })} title="Purana khata (N)"
                className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <BookOpen className="h-4 w-4" /> Purana Khata
              </button>
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/25 backdrop-blur border border-white/40 p-4 shadow-lg sm:col-span-2">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider inline-flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Kul Baqi
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                {formatPKR(summary?.totalOutstanding ?? 0)}
              </div>
              <div className="mt-1 text-[11px] font-bold text-white/75">
                {summary?.customersWithCredit ?? 0} customers ke zimme
                {(summary?.advance.count ?? 0) > 0 && (
                  <> · <span className="text-emerald-300">
                    {summary?.advance.count} ne {formatPKR(summary?.advance.amount ?? 0)} advance diya
                  </span></>
                )}
              </div>
            </div>
            <HeroStat label="Is Mahine Udhaar" value={formatPKR(summary?.thisMonth.udhaar ?? 0)}
              icon={ArrowUpRight} sub="bahar gaya" />
            <HeroStat label="Is Mahine Wasooli" value={formatPKR(summary?.thisMonth.wasooli ?? 0)}
              icon={ArrowDownLeft} highlight={net >= 0}
              sub={net >= 0 ? `${formatPKR(net)} zyada wasool` : `${formatPKR(-net)} zyada udhaar`} />
          </div>
        </div>
      </section>

      {/* ═══ ALERTS ═══ */}
      {((summary?.overLimitCount ?? 0) > 0 || (summary?.staleCount ?? 0) > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 print:hidden">
          {(summary?.overLimitCount ?? 0) > 0 && (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-rose-900 min-w-0">
                <b>{summary?.overLimitCount} customers limit se upar ja chuke hain.</b> Naya udhaar
                dene se pehle purana wasool karein.
              </div>
              <button onClick={() => setTab('over')}
                className="px-3 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition">
                Dekho
              </button>
            </div>
          )}
          {(summary?.staleCount ?? 0) > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-semibold text-amber-900 min-w-0">
                <b>{summary?.staleCount} customers 30+ din se khamosh hain.</b> Na kuch liya, na
                kuch diya — inhe yaad dila dein.
              </div>
              <button onClick={() => setTab('stale')}
                className="px-3 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0 transition">
                Dekho
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ CHART ═══ */}
      {chartRows.length > 1 && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Sab Se Bara Udhaar</h3>
              <p className="text-[11px] font-bold text-slate-500">Laal = credit limit se upar</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b"
                  interval={0} angle={-12} height={44} textAnchor="end" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={52} tickLine={false} axisLine={false}
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                  contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                <Bar dataKey="Baqi" radius={[6, 6, 0, 0]}>
                  {chartRows.map((r, i) => <Cell key={i} fill={r.over ? '#e11d48' : '#f97316'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: 'Sab', icon: Users, n: counts.all },
            { v: 'over', label: 'Limit Se Upar', icon: AlertTriangle, n: counts.over },
            { v: 'stale', label: 'Khamosh', icon: Clock, n: counts.stale },
            { v: 'activity', label: 'Hal Ki Harkat', icon: History, n: counts.activity },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k, i) => (
            <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-rose-600 to-orange-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        {tab !== 'activity' && (
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam ya phone... (/)"
              className="h-10 w-full sm:w-64 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition" />
          </div>
        )}
      </div>

      {/* ═══ ACTIVITY ═══ */}
      {tab === 'activity' ? (
        (summary?.recentActivity ?? []).length === 0 ? (
          <Empty icon={History} title="Abhi koi harkat nahi"
            desc="Udhaar ya wasooli hote hi yahan nazar aayegi" />
        ) : (
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {(summary?.recentActivity ?? []).map((a) => {
              const meta = LEDGER_META[a.type] ?? LEDGER_META.ADJUSTMENT;
              const isIn = a.amount < 0;
              return (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${meta.chip}`}>
                    <meta.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={a.customer?.id ? `/customers/${a.customer.id}` : '#'}
                        className="font-extrabold text-slate-900 text-sm hover:underline truncate">
                        {a.customer?.name ?? 'Customer'}
                      </Link>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${meta.chip}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500 truncate">
                      {a.note}
                      {a.reference && <span className="font-mono"> · {a.reference}</span>}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {new Date(a.createdAt).toLocaleString('en-PK', {
                        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                      {a.createdBy?.fullName && ` · ${a.createdBy.fullName}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-extrabold tabular-nums ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIn ? '−' : '+'}{formatPKR(Math.abs(a.amount))}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 tabular-nums">
                      baqi {formatPKR(a.balanceAfter)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : list.length === 0 ? (
        <Empty icon={CheckCircle2} tone="emerald"
          title={search ? 'Kuch nahi mila' : tab === 'all' ? 'Kisi par koi udhaar nahi 🎉' : 'Is filter me koi nahi'}
          desc={tab === 'all' && !search
            ? 'Sab customers clear hain. Purana khata shuru karna ho to upar "Purana Khata" dabayein.'
            : 'Filter hata kar dekhein'} />
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {list.map((d) => {
            const over = d.creditLimit > 0 && d.balance > d.creditLimit;
            const serialUnits = serialCreditByCustomer.get(d.id) ?? 0;
            const pct = d.creditLimit > 0 ? Math.min(100, (d.balance / d.creditLimit) * 100) : 0;
            return (
              <div key={d.id} className="px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center font-extrabold text-white shrink-0 shadow ${
                  over ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'
                }`}>
                  {d.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/customers/${d.id}`} className="font-extrabold text-slate-900 text-sm hover:text-rose-700 hover:underline truncate">
                      {d.name}
                    </Link>
                    {d.isVip && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <Crown className="h-2.5 w-2.5" /> VIP
                      </span>
                    )}
                    {over && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> Limit se upar
                      </span>
                    )}
                    {d.daysSinceActivity != null && d.daysSinceActivity >= 30 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {d.daysSinceActivity} din khamosh
                      </span>
                    )}
                    {serialUnits > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <Barcode className="h-2.5 w-2.5" /> {serialUnits} serial unit
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                    {d.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                    {d.creditLimit > 0 && <span>Limit {formatPKR(d.creditLimit)}</span>}
                  </div>
                  {d.creditLimit > 0 && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-xs print:hidden">
                      <div className={`h-full rounded-full ${over ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-base font-extrabold tabular-nums ${over ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatPKR(d.balance)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">baqi</div>
                </div>

                <div className="flex gap-1.5 shrink-0 print:hidden">
                  {d.phone && (
                    <button onClick={() => whatsapp(d.name, d.phone, d.balance)} title="WhatsApp par yaad dilayein"
                      className="h-10 w-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setAction({ kind: 'udhaar', customer: d })} title="Aur udhaar chadhayein"
                    className="h-10 w-10 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 flex items-center justify-center transition">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => setAction({ kind: 'pay', customer: d })}
                    className="h-10 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow hover:shadow-lg transition">
                    <Minus className="h-3.5 w-3.5" /> Wasooli
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   WASOOLI / UDHAAR MODAL
   ═════════════════════════════════════════════════════════════ */

function AmountModal({ kind, customer, onClose, onDone }: {
  kind: 'pay' | 'udhaar';
  customer: Debtor;
  onClose: () => void; onDone: () => void;
}) {
  const isPay = kind === 'pay';
  const [amount, setAmount] = useState<number | ''>('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => (isPay
      ? customerLedgerApi.receivePayment(customer.id, {
          amount: Number(amount), reference: reference || undefined, note: note || undefined,
        })
      : customerLedgerApi.addUdhaar(customer.id, {
          amount: Number(amount), reference: reference || undefined, note: note || undefined,
        })),
    onSuccess: () => {
      toast.success(isPay
        ? `${formatPKR(Number(amount))} wasool ho gaya`
        : `${formatPKR(Number(amount))} udhaar chadh gaya`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Kaam nahi hua'),
  });

  const amt = Number(amount || 0);
  const after = isPay ? Math.max(0, customer.balance - amt) : customer.balance + amt;
  const tooMuch = isPay && amt > customer.balance;
  const valid = amt > 0 && !tooMuch && !mutation.isPending;
  const QUICK = [500, 1000, 5000, 10000, 25000];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className={`px-5 py-4 text-white flex items-center justify-between shrink-0 ${
          isPay ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-orange-600 to-red-700'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              {isPay ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">
                {isPay ? 'Wasooli — paisa mila' : 'Udhaar chadhayein'}
              </div>
              <h3 className="font-extrabold truncate">{customer.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-600">Abhi baqi</span>
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatPKR(customer.balance)}</span>
          </div>

          {!isPay && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold text-amber-900">
                Ye udhaar bina sale ke chadh raha hai — jaise koi cheez bina bill ke di,
                ya purana hisab reh gaya tha.
              </div>
            </div>
          )}

          <div>
            <Lbl>{isPay ? 'Kitna Paisa Mila?' : 'Kitna Udhaar?'}</Lbl>
            <input type="number" autoFocus value={amount} min={0}
              max={isPay ? customer.balance : undefined}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className={`h-16 w-full rounded-2xl border-2 bg-white px-4 text-center text-3xl font-extrabold tabular-nums focus:outline-none focus:ring-4 transition ${
                isPay
                  ? 'border-emerald-400 text-emerald-900 focus:border-emerald-600 focus:ring-emerald-200'
                  : 'border-orange-400 text-orange-900 focus:border-orange-600 focus:ring-orange-200'
              }`} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.filter((q) => !isPay || q <= customer.balance).map((q) => (
                <button key={q} onClick={() => setAmount(q)}
                  className={`px-3 py-1.5 rounded-xl bg-white border-2 text-xs font-extrabold transition ${
                    isPay ? 'border-emerald-200 hover:border-emerald-400 text-emerald-800'
                      : 'border-orange-200 hover:border-orange-400 text-orange-800'
                  }`}>
                  {formatPKR(q)}
                </button>
              ))}
              {isPay && customer.balance > 0 && (
                <button onClick={() => setAmount(customer.balance)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition">
                  Poora ({formatPKR(customer.balance)})
                </button>
              )}
            </div>
          </div>

          {amt > 0 && !tooMuch && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">Iske baad baqi</span>
              <span className={`text-lg font-extrabold tabular-nums ${
                after === 0 ? 'text-emerald-600' : isPay ? 'text-slate-900' : 'text-rose-600'
              }`}>
                {after === 0 ? 'Clear ✅' : formatPKR(after)}
              </span>
            </div>
          )}

          {tooMuch && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 text-sm font-semibold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Baqi se zyada paisa nahi liya ja sakta
            </div>
          )}

          {!isPay && customer.creditLimit > 0 && after > customer.creditLimit && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-semibold text-amber-900 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Is se customer apni credit limit ({formatPKR(customer.creditLimit)}) se upar chala jayega.</span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Parchi / Bill # <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
              <input value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="jaise: 1204"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-slate-400 transition" />
            </div>
            <div>
              <Lbl>Note <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
              <input value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={isPay ? 'jaise: cash mila' : 'jaise: charger bina bill'}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-slate-400 transition" />
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={!valid}
            className={isPay
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg'
              : 'bg-gradient-to-r from-orange-600 to-red-700 font-extrabold shadow-lg'}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isPay ? 'Wasooli Darj Karein' : 'Udhaar Chadhayein'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PURANA KHATA — copy se software par
   ═════════════════════════════════════════════════════════════ */

function OpeningBalanceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<{ id: string; name: string; phone?: string | null; balance: number } | null>(null);
  const [balance, setBalance] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'opening-balance', search],
    queryFn: () => customersApi.list({ search, page: 1, limit: 30 }),
  });
  const customers = (data as any)?.items ?? [];

  const mutation = useMutation({
    mutationFn: () => customerLedgerApi.setOpeningBalance(chosen!.id, {
      balance: Number(balance), note: note || undefined,
    }),
    onSuccess: () => {
      toast.success(`${chosen!.name} ka purana khata shuru ho gaya`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Khata shuru nahi hua'),
  });

  const valid = !!chosen && Number(balance || 0) >= 0 && balance !== '' && !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Purana Khata</div>
              <h3 className="font-extrabold">Copy Se Software Par</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 flex items-start gap-2">
            <Upload className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-violet-900">
              Pehle copy par khata likhte the? Yahan har customer ka <b>purana baqi</b> ek bar
              likh dein — uske baad software khud hisab rakhega. Ye har customer ka
              <b> sirf ek bar</b> lagta hai.
            </div>
          </div>

          <div>
            <Lbl>Customer</Lbl>
            {chosen ? (
              <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold shrink-0">
                  {chosen.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{chosen.name}</div>
                  <div className="text-[11px] font-bold text-slate-600">
                    {chosen.phone ?? 'phone nahi'} · abhi {formatPKR(chosen.balance)} baqi
                  </div>
                </div>
                <button onClick={() => setChosen(null)}
                  className="h-9 w-9 rounded-lg bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                    placeholder="Naam ya phone se dhoondein..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
                </div>
                <div className="rounded-xl border-2 border-slate-200 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {isLoading ? (
                    <div className="p-6 text-center text-sm font-bold text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm font-bold text-slate-700">Koi customer nahi mila</p>
                      <Link to="/customers/new"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 hover:underline">
                        <UserPlus className="h-3.5 w-3.5" /> Naya customer banayein
                      </Link>
                    </div>
                  ) : customers.map((c: any) => (
                    <button key={c.id} onClick={() => { setChosen(c); setBalance(c.balance || ''); }}
                      className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-violet-50 transition">
                      <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{c.name}</div>
                        <div className="text-[11px] font-bold text-slate-500">{c.phone ?? '—'}</div>
                      </div>
                      {c.balance > 0 && (
                        <span className="text-xs font-extrabold text-rose-600 tabular-nums shrink-0">
                          {formatPKR(c.balance)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {chosen && (
            <>
              <div>
                <Lbl>Purana Baqi Kitna Hai?</Lbl>
                <input type="number" min={0} value={balance}
                  onChange={(e) => setBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="h-16 w-full rounded-2xl border-2 border-violet-400 bg-white px-4 text-center text-3xl font-extrabold tabular-nums text-violet-900 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-200 transition" />
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  Ye balance <b>set</b> hoga — jurta nahi. Copy me jo likha hai wohi likhein.
                </p>
              </div>

              <div>
                <Lbl>Note <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="jaise: Jan 2026 tak ka purana hisab"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={!valid}
            className="bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold shadow-lg">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Khata Shuru Karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

function Empty({ icon: Icon, title, desc, tone = 'slate' }: any) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
      <Icon className={`h-12 w-12 mx-auto mb-3 ${tone === 'emerald' ? 'text-emerald-400' : 'text-slate-300'}`} />
      <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
      <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">{desc}</p>
    </div>
  );
}

function KhataTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: BookOpen, title: 'Copy se software par — purana khata',
      body: 'Agar aap pehle copy par khata likhte the, to upar "Purana Khata" dabayein. Har customer ka jo baqi copy me likha hai wo ek bar daal dein — uske baad software khud hisab rakhega.',
      tips: ['Har customer ka sirf ek bar lagta hai', 'Balance SET hota hai, jurta nahi'],
    },
    {
      icon: Plus, title: 'Bina sale ke udhaar',
      body: 'Kisi ko cheez bina bill ke de di? Customer ke naam ke aage ➕ dabayein aur raqam likh dein. POS se sale kiye baghair bhi udhaar chadh jata hai.',
      tips: ['Parchi ka number bhi likh sakte hain', 'Limit se upar jaye to warning aata hai'],
    },
    {
      icon: ArrowDownLeft, title: 'Wasooli',
      body: 'Paisa mile to "Wasooli" dabayein — balance foran kam ho jata hai aur record me chala jata hai. "Poora" button se ek click me poora khata clear.',
      tips: ['Hal Ki Harkat tab me har entry ka record'],
    },
    {
      icon: Clock, title: 'Khamosh customers',
      body: 'Jo 30+ din se na kuch le rahe hain na de rahe, wo "Khamosh" tab me alag hain. Ye wahi log hote hain jo bhool jate hain — WhatsApp button se izzat ke sath yaad dila dein.',
      tips: ['Is mahine ka udhaar vs wasooli upar dikhta hai', 'CSV me poora khata Excel ke liye'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Khata Kaise Chalayein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-600 to-orange-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['N', 'Purana khata shuru'], ['/', 'Search par jao'], ['1 – 4', 'Tab badlein'],
    ['G', 'Guide kholo'], ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
