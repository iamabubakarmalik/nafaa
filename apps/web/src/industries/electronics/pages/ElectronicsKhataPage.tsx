// apps/web/src/industries/electronics/pages/ElectronicsKhataPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HandCoins, Users, Search, RefreshCw, FileSpreadsheet, Printer, X,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Wallet, TrendingUp,
  AlertTriangle, Phone, ArrowRight, Loader2, Plus, Receipt, ShieldAlert,
  Store, MessageCircle, Barcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — UDHAAR KHATA
   ─────────────────────────────────────────────────────────────
   💰 Kis ka kitna paisa baqi hai
   ⚠️ Credit limit se upar gaye customers ka alert
   🔖 Jis sale me serial unit gaya tha wo alag nazar aata hai —
      mehngi cheez udhaar par gayi ho to pata hona chahiye
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'over' | 'big';

export default function ElectronicsKhataPage() {
  const qc = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [payFor, setPayFor] = useState<{ id: string; name: string; balance: number } | null>(null);
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

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (payFor) return setPayFor(null);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, payFor]);

  const anyModal = showTeacher || showShortcuts || !!payFor;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  /* Credit wali sales — kis customer ne kya udhaar liya */
  const creditSales = useMemo(
    () => sales.filter((s) => (s.creditAmount ?? 0) > 0),
    [sales],
  );

  /* Kis customer ki udhaar wali sale me serial unit gaya tha */
  const serialCreditByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of creditSales) {
      if (!s.customer?.id) continue;
      const n = (s.items ?? []).reduce((a: number, it: any) => a + (it.serials?.length ?? 0), 0);
      if (n > 0) m.set(s.customer.id, (m.get(s.customer.id) ?? 0) + n);
    }
    return m;
  }, [creditSales]);

  const debtors = summary?.topDebtors ?? [];

  const counts = useMemo(() => ({
    all: debtors.length,
    over: debtors.filter((d) => d.creditLimit > 0 && d.balance > d.creditLimit).length,
    big: debtors.filter((d) => d.balance >= 50000).length,
  }), [debtors]);

  const list = useMemo(() => {
    let l = [...debtors];
    if (tab === 'over') l = l.filter((d) => d.creditLimit > 0 && d.balance > d.creditLimit);
    if (tab === 'big') l = l.filter((d) => d.balance >= 50000);
    const q = search.toLowerCase().trim();
    if (q) l = l.filter((d) => d.name.toLowerCase().includes(q) || (d.phone ?? '').includes(q));
    return l.sort((a, b) => b.balance - a.balance);
  }, [debtors, tab, search]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Udhaar Khata`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul baqi', String(Math.round(summary?.totalOutstanding ?? 0))],
      ['Kul customers', String(summary?.totalCustomers ?? 0)],
      ['Udhaar wale', String(summary?.customersWithCredit ?? 0)],
      [],
      ['Naam', 'Phone', 'Baqi', 'Credit Limit', 'Limit se upar', 'Serial units udhaar par'],
      ...list.map((d) => [
        d.name, d.phone ?? '',
        String(Math.round(d.balance)),
        String(Math.round(d.creditLimit)),
        d.creditLimit > 0 && d.balance > d.creditLimit ? 'HAAN' : '',
        String(serialCreditByCustomer.get(d.id) ?? 0),
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-khata-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Electronics Udhaar Khata" subtitle="Kis ka kitna baqi hai" />
      {showTeacher && <KhataTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {payFor && (
        <PaymentModal
          customer={payFor}
          onClose={() => setPayFor(null)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['customer-ledger-summary'] }); setPayFor(null); }}
        />
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
                Electronics mehngi hoti hai — udhaar par gaya maal wapas aana zaroori hai
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
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
              </div>
            </div>
            <HeroStat label="Kul Customers" value={String(summary?.totalCustomers ?? 0)} icon={Users} />
            <HeroStat label="Limit Se Upar" value={String(counts.over)} icon={AlertTriangle}
              highlight={counts.over > 0} sub={counts.over > 0 ? 'dhyan dein' : 'sab theek'} />
          </div>
        </div>
      </section>

      {counts.over > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-3 print:hidden">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-semibold text-rose-900">
            <b>{counts.over} customers apni credit limit se upar ja chuke hain.</b> Naya udhaar dene
            se pehle purana wasool karein — electronics me ek laptop ka udhaar bhi bhaari parta hai.
          </div>
          <button onClick={() => setTab('over')}
            className="px-3 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition">
            Dekho
          </button>
        </div>
      )}

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'all', label: 'Sab', icon: Users, n: counts.all },
            { v: 'over', label: 'Limit Se Upar', icon: AlertTriangle, n: counts.over },
            { v: 'big', label: 'Bara Udhaar', icon: TrendingUp, n: counts.big },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k) => (
            <button key={k.v} onClick={() => setTab(k.v)}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-rose-600 to-orange-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam ya phone... (/)"
            className="h-10 w-full sm:w-64 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition" />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search || tab !== 'all' ? 'Kuch nahi mila' : 'Kisi par koi udhaar nahi 🎉'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5">
            {search || tab !== 'all' ? 'Filter hata kar dekhein' : 'Sab customers clear hain'}
          </p>
        </div>
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
                    {over && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> Limit se upar
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
                  <button onClick={() => setPayFor({ id: d.id, name: d.name, balance: d.balance })}
                    className="h-10 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow hover:shadow-lg transition">
                    <Plus className="h-3.5 w-3.5" /> Wasooli
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creditSales.length > 0 && (
        <Link to="/sales"
          className="inline-flex items-center gap-1.5 text-sm font-extrabold text-rose-700 hover:underline print:hidden">
          Udhaar wali {creditSales.length} sales dekhein <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   WASOOLI MODAL
   ═════════════════════════════════════════════════════════════ */

function PaymentModal({ customer, onClose, onDone }: {
  customer: { id: string; name: string; balance: number };
  onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => customerLedgerApi.receivePayment(customer.id, {
      amount: Number(amount), note: note || undefined,
    }),
    onSuccess: () => {
      toast.success(`${formatPKR(Number(amount))} wasool ho gaya`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Wasooli fail hui'),
  });

  const amt = Number(amount || 0);
  const remaining = Math.max(0, customer.balance - amt);
  const valid = amt > 0 && amt <= customer.balance && !mutation.isPending;

  const QUICK = [1000, 5000, 10000, 25000];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur shrink-0">
              <HandCoins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Wasooli</div>
              <h3 className="font-extrabold truncate">{customer.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/20 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center justify-between">
            <span className="text-sm font-bold text-rose-900">Abhi baqi</span>
            <span className="text-xl font-extrabold text-rose-700 tabular-nums">{formatPKR(customer.balance)}</span>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Kitna Paisa Mila?
            </label>
            <input type="number" autoFocus value={amount} min={0} max={customer.balance}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="h-16 w-full rounded-2xl border-2 border-emerald-400 bg-white px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 transition" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.filter((q) => q <= customer.balance).map((q) => (
                <button key={q} onClick={() => setAmount(q)}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold transition">
                  {formatPKR(q)}
                </button>
              ))}
              <button onClick={() => setAmount(customer.balance)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition">
                Poora ({formatPKR(customer.balance)})
              </button>
            </div>
          </div>

          {amt > 0 && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">Wasooli ke baad baqi</span>
              <span className={`text-lg font-extrabold tabular-nums ${remaining === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {remaining === 0 ? 'Clear ✅' : formatPKR(remaining)}
              </span>
            </div>
          )}

          {amt > customer.balance && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 text-sm font-semibold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Baqi se zyada paisa nahi liya ja sakta
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Note <span className="text-slate-400 normal-case font-bold">(optional)</span>
            </label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="jaise: cash mila"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500 transition" />
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
            Cancel
          </button>
          <Button onClick={() => mutation.mutate()} disabled={!valid}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Wasooli Darj Karein
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70">{sub}</div>}
    </div>
  );
}

function KhataTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Wallet, title: 'Kul baqi',
      body: 'Sab customers ka mila kar kitna paisa bahar hai. Electronics me ek laptop ya camera ka udhaar hi bara hota hai — is liye ye number roz dekhna chahiye.',
      tips: ['List me sab se bara udhaar upar aata hai'],
    },
    {
      icon: AlertTriangle, title: 'Credit limit se upar',
      body: 'Har customer ki ek limit set ki ja sakti hai. Jo us se upar chala gaya uska naam laal me aata hai — usse naya udhaar dene se pehle purana wasool karein.',
      tips: ['Neeche wali patti batati hai limit ka kitna hissa istemal hua'],
    },
    {
      icon: Barcode, title: 'Serial unit ka badge',
      body: 'Agar kisi customer ne udhaar par serial wali cheez (laptop, camera) li hai to uske naam ke sath badge aata hai. Ye jaanna zaroori hai — wo mehngi cheez bahar hai.',
      tips: ['Sales page se poori tafseel mil jati hai'],
    },
    {
      icon: MessageCircle, title: 'Wasooli aur yaad dahani',
      body: 'Wasooli button se paisa darj karein — balance foran kam ho jata hai. WhatsApp button se customer ko izzat ke sath yaad dila sakte hain.',
      tips: ['P dabao to poori list print', 'CSV me sab kuch Excel ke liye'],
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
    ['/', 'Search par jao'], ['G', 'Guide kholo'], ['R', 'Refresh'],
    ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
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
