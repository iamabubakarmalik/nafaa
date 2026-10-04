import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HandCoins, Plus, X, Trophy, Target, Gauge, CheckCircle2, Undo2,
  Download, Printer, GraduationCap, RefreshCw, AlertTriangle, Users,
  Receipt, Wallet, ChevronDown, Info, Pencil, CalendarRange, UserCheck,
  UserX, Link2, Package, Layers, TrendingUp, Eye, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import { useCommission, periodLabel, recentPeriods, thisPeriod } from '../hooks/useCommission';
import { CommissionRuleModal } from '../components/CommissionRuleModal';
import { CommissionDetailDrawer } from '../components/CommissionDetailDrawer';
import { BASIS_META, type CommissionRule, type CommissionRow } from '../api/commission.api';

/* ═════════════════════════════════════════════════════════════
   COMMISSION — har industry ka ek hi safha
   ─────────────────────────────────────────────────────────────
   Staff → Commission. Is me retail, bakery, mobile ya kisi aur
   ki koi khaas baat nahi — sirf bikri, bande aur rules. Rang
   `tone` se aata hai, baqi sab ek jaisa.
   ═════════════════════════════════════════════════════════════ */

const TONES: Record<string, { hero: string; grad: string; text: string }> = {
  pink:    { hero: 'from-slate-950 via-pink-900 to-fuchsia-700',  grad: 'from-pink-600 to-fuchsia-700',  text: 'text-pink-700 dark:text-pink-400' },
  sky:     { hero: 'from-slate-950 via-sky-900 to-cyan-700',      grad: 'from-sky-600 to-cyan-700',      text: 'text-sky-700 dark:text-sky-400' },
  emerald: { hero: 'from-slate-950 via-emerald-900 to-teal-700',  grad: 'from-emerald-600 to-teal-700',  text: 'text-emerald-700 dark:text-emerald-400' },
  blue:    { hero: 'from-slate-950 via-blue-900 to-cyan-700',     grad: 'from-blue-600 to-cyan-700',     text: 'text-blue-700 dark:text-blue-400' },
  violet:  { hero: 'from-slate-950 via-violet-900 to-purple-700', grad: 'from-violet-600 to-purple-700', text: 'text-violet-700 dark:text-violet-400' },
};

export default function CommissionPage({ tone = 'violet' }: { tone?: string }) {
  const t = TONES[tone] ?? TONES.violet;
  const tenant = useAuthStore((s) => s.tenant);
  const hideAmounts = useCostHidden();
  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));

  const [period, setPeriod] = useState(thisPeriod());
  const [showPeriods, setShowPeriods] = useState(false);
  const [ruleModal, setRuleModal] = useState<{ rule?: CommissionRule | null } | null>(null);
  const [payTarget, setPayTarget] = useState<CommissionRow | null>(null);
  const [detailUser, setDetailUser] = useState<CommissionRow | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const c = useCommission(period);

  /* App user ka HR record bana dein.
     Login aur HR record Nafaa me do alag cheezein hain: login se bikri
     us ke naam lagti hai, HR record se tankhwah aur attendance chalti
     hai. Team me banda daalne par sirf login banta hai — is liye yahan
     se ek click me doosra bhi bana dete hain, warna "tankhwah +
     commission" ka jor adhoora rehta hai. */
  const makeStaff = async (userId: string, name: string) => {
    setLinking(userId);
    try {
      await staffApi.linkUser(userId);
      toast.success(`${name} ka HR record ban gaya — ab tankhwah bhi daal sakte hain`);
      c.refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'HR record nahi bana');
    } finally {
      setLinking(null);
    }
  };
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const exportCsv = () => {
    if (c.rows.length === 0) return toast.error('Koi hisab nahi');
    const head = ['Banda', 'Designation', 'Chaalu', 'Bill', 'Bikri', 'Munafa', 'Commission', 'Bonus', 'Haalat', 'Ada hua'];
    const body = c.rows.map((r) => [
      r.name, r.staff?.designation ?? '', r.enrolled ? 'Haan' : 'Nahi', r.bills,
      r.sale.toFixed(2), r.profit.toFixed(2), r.earned.toFixed(2), r.bonus.toFixed(2),
      r.paid ? 'Ada ho gayi' : 'Baqi',
      r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-PK') : '',
    ]);
    const summary = [
      [`Commission — ${tenant?.name ?? 'Nafaa'}`],
      [`${periodLabel(period)}  •  ${new Date().toLocaleString('en-PK')}`],
      [`Kul ${c.total.toFixed(2)}  •  Ada ${c.paidTotal.toFixed(2)}  •  Baqi ${c.pendingTotal.toFixed(2)}`],
      [''],
    ];
    const csv = [...summary, head, ...body]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `commission-${period}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${c.rows.length} bandon ka hisab export ho gaya`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ruleModal) return setRuleModal(null);
        if (detailUser) return setDetailUser(null);
        if (payTarget) return setPayTarget(null);
        if (showTeacher) return setShowTeacher(false);
        if (showPeriods) return setShowPeriods(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'n') { e.preventDefault(); setRuleModal({}); }
      if (k === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ruleModal, detailUser, payTarget, showTeacher, showPeriods]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <Teacher tone={t} onClose={() => setShowTeacher(false)} />}

      {ruleModal && (
        <CommissionRuleModal
          rule={ruleModal.rule}
          people={c.people as any[]}
          categories={categories as any[]}
          saving={c.busy}
          onClose={() => setRuleModal(null)}
          onSave={async (data) => {
            const ok = ruleModal.rule
              ? await c.updateRule(ruleModal.rule.id, data)
              : await c.addRule(data);
            if (ok) setRuleModal(null);
          }}
          onDelete={ruleModal.rule ? async () => {
            await c.removeRule(ruleModal.rule!.id);
            setRuleModal(null);
          } : undefined}
        />
      )}

      {detailUser && (
        <CommissionDetailDrawer row={detailUser} period={period} tone={t}
          shopName={tenant?.name} hideAmounts={hideAmounts}
          onClose={() => setDetailUser(null)} />
      )}

      {payTarget && (
        <PayModal row={payTarget} period={period} money={money} saving={c.busy}
          onClose={() => setPayTarget(null)}
          onConfirm={async (note: string) => {
            await c.markPaid(payTarget.userId, payTarget.earned, note);
            setPayTarget(null);
          }} />
      )}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-black">{tenant?.name ?? 'Dukaan'} — Commission</h1>
        <p className="text-xs text-slate-600">
          {periodLabel(period)} • {new Date().toLocaleString('en-PK', { dateStyle: 'full' })}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Kul {formatPKR(c.total)} • Ada {formatPKR(c.paidTotal)} • Baqi {formatPKR(c.pendingTotal)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${t.hero} text-white p-5 sm:p-6 shadow-2xl print:hidden`}>
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <HandCoins className="h-3.5 w-3.5 text-amber-300" /> Staff · Commission
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black">💰 Commission</h1>
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
              {periodLabel(period)} · <strong>{c.enabledCount}</strong> bande chaalu ·{' '}
              <strong className="text-emerald-200">{money(c.total)}</strong> banti hai
              {c.pendingTotal > 0 && <> · <span className="text-amber-200">{money(c.pendingTotal)} dena baqi</span></>}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <PeriodPicker period={period} open={showPeriods} tone={t}
              onToggle={() => setShowPeriods((v) => !v)}
              onPick={(p: string) => { setPeriod(p); setShowPeriods(false); }}
              onClose={() => setShowPeriods(false)} />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => c.refetch()} title="Taaza" className={heroBtn}>
              <RefreshCw className={`h-4 w-4 ${c.busy ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><Download className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="Print (P)" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <button onClick={() => setRuleModal({})}
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Naya rule
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={HandCoins} label="Kul banti hai" value={money(c.total)} sub={periodLabel(period)} tone={t.grad} />
        <Kpi icon={CheckCircle2} label="Ada ho gayi" value={money(c.paidTotal)}
          sub={`${c.rows.filter((r) => r.paid).length} bandon ko`} tone="from-emerald-500 to-green-600" />
        <Kpi icon={Wallet} label="Dena baqi" value={money(c.pendingTotal)}
          sub={`${c.rows.filter((r) => !r.paid && r.earned > 0).length} bandon ka`} tone="from-amber-500 to-orange-600" />
        <Kpi icon={Users} label="Chaalu bande" value={c.enabledCount}
          sub={c.notEnrolled.length > 0 ? `${c.notEnrolled.length} abhi shamil nahi` : 'Jin ki bikri hai, sab shamil'}
          tone="from-sky-500 to-blue-600" />
      </section>

      {/* ═══ TANKHWAH + COMMISSION ═══
          Banda ye nahi poochta ke "meri commission kitni bani" — wo
          poochta hai ke "is mahine mujhe kitna milega". Is liye pakki
          tankhwah aur commission ek hi jagah jor kar dikhate hain. */}
      {c.baseTotal > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shrink-0`}>
              <Wallet className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Is mahine kul kitna dena hai</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Pakki tankhwah Staff ke record se, commission bikri se — dono jor kar
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <PayCell label="Pakki tankhwah" value={money(c.baseTotal)} sub="Staff record se" />
            <PayCell label="+ Commission" value={money(c.total)} sub="Is mahine ki bikri par" tone={t.text} />
            <PayCell label="= Kul" value={money(c.payTotal)} sub={`${c.enabledCount} bandon ka`} big />
          </div>
          <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Tankhwah yahan se ada nahi hoti — wo Payroll se hoti hai. Yahan sirf poora
            naqsha hai, taake pata rahe ke mahine ka kul bojh kitna hai.
          </p>
        </section>
      )}

      {/* ═══ KHABARDAAR ═══ */}
      {(c.orphanBills > 0 || c.notEnrolled.length > 0 || c.withoutLogin.length > 0 || c.reassignedBills > 0) && (
        <section className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 space-y-1.5 print:hidden">
          {c.notEnrolled.length > 0 && (
            <Warn icon={UserCheck}>
              <strong>{c.notEnrolled.length} bandon</strong> ki bikri hui hai magar commission chaalu nahi
              ({c.notEnrolled.map((r) => r.name).slice(0, 3).join(', ')}
              {c.notEnrolled.length > 3 && ` +${c.notEnrolled.length - 3}`}) — neeche switch se shamil karein.
            </Warn>
          )}
          {c.withoutLogin.length > 0 && (
            <Warn icon={UserX}>
              <strong>{c.withoutLogin.length} employee</strong> aise hain jin ka apna login nahi
              ({c.withoutLogin.map((p) => p.name).slice(0, 3).join(', ')}
              {c.withoutLogin.length > 3 && ` +${c.withoutLogin.length - 3}`}) — un ki bikri kisi ke
              naam darj nahi hoti, is liye commission ban hi nahi sakti.
            </Warn>
          )}
          {c.reassignedBills > 0 && (
            <Warn icon={UserCheck}>
              <strong>{c.reassignedBills} bill</strong> aise hain jinka cashier koi aur tha magar
              bikri kisi aur ke naam lagi — POS par "bikri kis ke naam" chuna gaya tha. Commission
              usi ko gayi hai.
            </Warn>
          )}
          {c.orphanBills > 0 && (
            <Warn icon={AlertTriangle}>
              <strong>{c.orphanBills} bill</strong> par kisi bande ka naam darj nahi ({money(c.orphanSale)}) —
              in ki commission kisi ko nahi mil rahi.
            </Warn>
          )}
        </section>
      )}

      {/* ═══ KIS PAR CHAALU ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
        <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5 flex-wrap">
          <span className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shrink-0`}>
            <UserCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Kis par commission chaalu hai</h2>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Har bande ko alag se chaalu karna parta hai — jis ka switch band hai uski commission nahi banti
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${t.text} bg-slate-100 dark:bg-slate-800`}>
            {c.enabledCount}/{c.people.length} chaalu
          </span>
        </header>

        {c.people.length === 0 && c.withoutLogin.length === 0 ? (
          <Empty icon={Users} title="Abhi koi banda nahi"
            sub="Team me log daalein — har bande ka apna login hoga, tabhi pata chalega kis ne becha" />
        ) : (
          <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {c.people.map((p) => (
              <PersonCard key={p.userId!} p={p} tone={t} money={money}
                row={c.rows.find((r) => r.userId === p.userId)}
                busy={c.busy || linking === p.userId}
                onToggle={() => c.setEnabled(p.userId!, !p.enrolled, p.staff?.id)}
                onMakeStaff={() => makeStaff(p.userId!, p.name)} />
            ))}
            {c.withoutLogin.map((p, i) => (
              <div key={`nl-${i}`}
                className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="h-10 w-10 rounded-2xl bg-slate-300 dark:bg-slate-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                    {(p.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {p.staff?.designation ?? 'Employee'}
                      {p.staff?.staffNumber && ` · ${p.staff.staffNumber}`}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Is ka apna login nahi — bikri is ke naam darj hi nahi hoti. Team me is ka login
                  banayein (wohi email ya phone), to ye apne aap yahan aa jayega.
                </p>
                <a href="/team"
                  className="mt-2 inline-flex h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-black items-center gap-1.5 transition">
                  <Link2 className="h-3.5 w-3.5" /> Login banayein
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ RULES ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
        <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5 flex-wrap">
          <span className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shrink-0`}>
            <Gauge className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Rules</h2>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Kisi bande ka apna rule ho to us par wohi chalta hai, "sab wala" nahi
            </p>
          </div>
          <Button size="sm" onClick={() => setRuleModal({})} className={`bg-gradient-to-r ${t.grad}`}>
            <Plus className="h-3.5 w-3.5" /> Naya <kbd className="hidden sm:inline text-[9px] opacity-70 ml-1">N</kbd>
          </Button>
        </header>

        {c.rules.length === 0 ? (
          <Empty icon={HandCoins} title="Abhi koi rule nahi"
            sub="Ek rule bana dein — phir har mahine ka hisab khud banta rahega aur kisi ko ginti nahi karni paregi" />
        ) : (
          <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {c.rules.map((r) => {
              const m = BASIS_META[r.basis];
              const who = r.userId ? (r.user?.fullName ?? 'Nikala hua banda') : 'Sab bande';
              const val = r.valueType === 'PERCENT' ? `${r.value}%` : formatPKR(r.value);
              return (
                <div key={r.id}
                  className={`rounded-2xl border-2 p-3 transition ${
                    r.isActive
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 opacity-60'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {r.name || `${m.emoji} ${m.label}`}
                      </div>
                      <div className={`text-sm font-black ${t.text}`}>
                        {m.emoji} {m.label} — {val}
                        {r.valueType === 'FIXED' && r.basis !== 'PER_BILL' && (
                          <span className="text-[10px] font-bold text-slate-400"> / cheez</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate inline-flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" /> {who}
                      </div>
                    </div>
                    <button onClick={() => setRuleModal({ rule: r })} title="Badlein"
                      className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.categoryIds?.length > 0 && <Tag>{r.categoryIds.length} category</Tag>}
                    {r.minMonthlySale ? <Tag>Hadd {formatPKR(r.minMonthlySale)}</Tag> : null}
                    {r.targetAmount ? <Tag tone="amber">🎯 {formatPKR(r.targetAmount)} → {formatPKR(r.targetBonus ?? 0)}</Tag> : null}
                  </div>

                  {r.note && <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{r.note}</p>}

                  <button onClick={() => c.updateRule(r.id, { ...r, isActive: !r.isActive })} disabled={c.busy}
                    className={`mt-2 w-full h-9 rounded-xl text-[11px] font-black disabled:opacity-50 transition ${
                      r.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                    {r.isActive ? '✓ Chaalu hai' : 'Band hai — chalayein'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ BANDON KA HISAB ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          <span className={`h-9 w-9 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shrink-0`}>
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{periodLabel(period)} ka hisab</h2>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Kisi line par dabayein — poora khata khul jayega
            </p>
          </div>
        </header>

        {c.isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : c.rows.length === 0 ? (
          <Empty icon={Receipt} title="Is mahine koi bikri nahi" />
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {c.rows.map((r, i) => (
              <RowCard key={r.userId} r={r} i={i} tone={t} money={money} busy={c.busy}
                onOpen={() => setDetailUser(r)}
                onPay={() => setPayTarget(r)}
                onEnable={() => c.setEnabled(r.userId, true, r.staff?.id)}
                onUndo={() => c.undoPaid(r.userId)} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition';

/* ════════════════ CHHOTE HISSE ════════════════ */

/**
 * Mahina chunne wali list.
 *
 * Ye portal se `document.body` par lagti hai. Pehle hero ke andar
 * thi, aur hero ka apna `overflow-hidden` aur upar ki patti is ko
 * kaat deti thi — list aadhi chhup jati thi. Portal is se bahar
 * nikal deta hai, aur jagah button ke hisab se nap kar milti hai.
 */
function PeriodPicker({ period, open, tone, onToggle, onPick, onClose }: any) {
  const [btn, setBtn] = useState<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open || !btn) return;
    const place = () => {
      const r = btn.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, btn]);

  return (
    <>
      <button ref={setBtn} onClick={onToggle} className={heroBtn}>
        <CalendarRange className="h-4 w-4" /> {periodLabel(period)}
        <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={onClose} />
          <div style={{ top: pos.top, right: pos.right }}
            className="fixed z-[91] w-56 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-2">
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Mahina chunein
            </div>
            {recentPeriods().map((p) => (
              <button key={p} onClick={() => onPick(p)}
                className={`w-full h-10 px-3 rounded-xl text-left text-xs font-black transition ${
                  p === period
                    ? `bg-gradient-to-r ${tone.grad} text-white`
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>{periodLabel(p)}</button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none truncate">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] font-bold text-slate-400 truncate">{sub}</p>}
    </div>
  );
}

function PayCell({ label, value, sub, tone, big }: any) {
  return (
    <div className={`rounded-2xl border-2 p-3 ${
      big
        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800'
        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
    }`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</div>
      <div className={`font-black tabular-nums truncate ${big ? 'text-xl sm:text-2xl text-slate-900 dark:text-white' : `text-lg ${tone ?? 'text-slate-700 dark:text-slate-200'}`}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-slate-400 truncate">{sub}</div>
    </div>
  );
}

function Warn({ icon: Icon, children }: any) {
  return (
    <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function Tag({ children, tone }: any) {
  return (
    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
      tone === 'amber'
        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
    }`}>{children}</span>
  );
}

function Empty({ icon: Icon, title, sub }: any) {
  return (
    <div className="p-8 text-center">
      <Icon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{title}</p>
      {sub && <p className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400 max-w-md mx-auto">{sub}</p>}
    </div>
  );
}

/* ── Ek bande ka switch wala khana ── */
function PersonCard({ p, tone, money, row, busy, onToggle, onMakeStaff }: any) {
  const on = p.enrolled;
  const st = p.staff;
  /* HR record kehta hai commission wala banda hai magar yahan band hai */
  const hrSays = st?.salaryType === 'COMMISSION' || st?.salaryType === 'HYBRID';

  return (
    <div className={`rounded-2xl border-2 p-3 transition ${
      on
        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10'
        : hrSays
          ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      <div className="flex items-start gap-2.5">
        <span className={`h-10 w-10 rounded-2xl text-white text-sm font-black flex items-center justify-center shrink-0 overflow-hidden ${
          on ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-slate-300 dark:bg-slate-600'
        }`}>
          {st?.avatarUrl
            ? <img src={st.avatarUrl} alt="" className="h-full w-full object-cover" />
            : (p.name || '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900 dark:text-white truncate">{p.name}</div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
            {st?.designation ?? p.role ?? '—'}
            {st?.staffNumber && ` · ${st.staffNumber}`}
          </div>
        </div>
        <button onClick={onToggle} disabled={busy}
          role="switch" aria-checked={on} aria-label={`${p.name} ki commission`}
          className={`relative h-6 w-11 rounded-full shrink-0 disabled:opacity-50 transition ${
            on ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {row && row.bills > 0 && (
        <p className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          Is mahine {row.bills} bill · {money(row.sale)}
          {on && row.earned > 0 && <span className={`ml-1 font-black ${tone.text}`}>→ {money(row.earned)}</span>}
        </p>
      )}

      {!on && hrSays && (
        <p className="mt-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          ⚠️ Staff record me is ki tankhwah <strong>{st?.salaryType === 'HYBRID' ? 'hybrid' : 'commission'}</strong> wali
          likhi hai, magar yahan band hai — shamil karna reh gaya?
        </p>
      )}
      {!on && !hrSays && row && row.bills > 0 && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Band hai — is ki bikri par koi commission nahi ban rahi
        </p>
      )}
      {!st && (
        <div className="mt-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 p-2">
          <p className="text-[11px] font-bold text-sky-900 dark:text-sky-200">
            Is ka sirf <strong>login</strong> hai, HR record nahi — is liye tankhwah nahi dikhti.
          </p>
          <button onClick={onMakeStaff} disabled={busy}
            className="mt-1.5 h-9 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-50 transition">
            <UserPlus className="h-3.5 w-3.5" /> HR record bana dein
          </button>
        </div>
      )}
      {st?.linkedByGuess && (
        <p className="mt-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
          HR record email/phone se mila — chaalu karte hi pakka jur jayega
        </p>
      )}
    </div>
  );
}

/* ── Hisab ki ek line ── */
function RowCard({ r, i, tone, money, busy, onOpen, onPay, onEnable, onUndo }: any) {
  const rate = r.sale > 0 ? (r.earned / r.sale) * 100 : 0;
  return (
    <div className={`px-4 sm:px-5 py-3.5 flex items-center gap-3 transition ${
      !r.enrolled ? 'opacity-60' : r.paid ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : ''
    }`}>
      <span className={`h-10 w-10 rounded-2xl text-white text-sm font-black flex items-center justify-center shrink-0 ${
        !r.enrolled ? 'bg-slate-300 dark:bg-slate-600'
          : i === 0 && r.earned > 0
            ? 'bg-gradient-to-br from-amber-400 to-orange-600'
            : `bg-gradient-to-br ${tone.grad}`
      }`}>
        {i === 0 && r.earned > 0 && r.enrolled ? <Trophy className="h-4 w-4" /> : i + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-black text-slate-900 dark:text-white truncate">{r.name}</span>
          {r.staff?.designation && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400">
              {r.staff.designation}
            </span>
          )}
          {r.paid && <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black">Ada ho gayi</span>}
          {r.bonus > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black">🎯 Target</span>}
          {!r.enrolled && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300">
              Band
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
          {r.bills} bill · bikri {money(r.sale)} · munafa {money(r.profit)}
          {r.blockedByMin && ` · hadd se ${money(r.blockedByMin.short)} kam`}
        </div>
        {r.enrolled && r.baseSalary > 0 && (
          <div className="mt-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
            Tankhwah {money(r.baseSalary)} + commission {money(r.earned)} ={' '}
            <strong className="text-slate-900 dark:text-white">{money(r.totalPay)}</strong>
          </div>
        )}
        {r.targetPct !== undefined && r.targetPct < 100 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[160px]">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-600"
                style={{ width: `${Math.min(r.targetPct, 100)}%` }} />
            </div>
            <span className="text-[10px] font-black text-amber-600">{r.targetPct.toFixed(0)}% target</span>
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className={`text-lg sm:text-xl font-black tabular-nums ${
          !r.enrolled ? 'text-slate-400' : r.earned > 0 ? tone.text : 'text-slate-400'
        }`}>
          {r.enrolled ? money(r.earned) : '—'}
        </div>
        {r.enrolled && r.earned > 0 && (
          <div className="text-[10px] font-bold text-slate-400">bikri ka {rate.toFixed(1)}%</div>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0 print:hidden">
        {!r.enrolled ? (
          <button onClick={onEnable} disabled={busy}
            className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-50 transition">
            <UserCheck className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Chaalu</span>
          </button>
        ) : (
          <>
            <button onClick={onOpen} title="Poora khata"
              className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-black inline-flex items-center gap-1.5 transition">
              <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tafseel</span>
            </button>
            {r.paid ? (
              <button onClick={onUndo} disabled={busy} title="Adaigi wapas lein"
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 transition">
                <Undo2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={onPay} disabled={busy || r.earned <= 0} title="Ada kar di"
                className="h-10 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-40 transition">
                <CheckCircle2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ada</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Adaigi likhne ka khana ── */
function PayModal({ row, period, money, saving, onClose, onConfirm }: any) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
          <h3 className="text-lg font-black">Commission ada kar di?</h3>
          <p className="text-xs font-bold text-white/80 mt-0.5">{periodLabel(period)}</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className="text-sm font-black text-slate-900 dark:text-white">{row.name}</p>
            <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {money(row.earned)}
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {row.bills} bill · {money(row.sale)} ki bikri par
            </p>
          </div>

          <label className="block">
            <span className="block mb-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
              Note <span className="normal-case font-bold text-slate-400">(marzi)</span>
            </span>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Cash di, ya tankhwah ke sath…"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
          </label>

          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Ye sirf nishani hai ke aap ne de di — paisa khud kahin se nahi katta. Kharcha alag se
            darj karna ho to Expenses me likhein.
          </p>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black transition">
              Rehne dein
            </button>
            <Button onClick={() => onConfirm(note.trim())} loading={saving}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700">
              Haan, likh dein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ tone, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Commission kaise chalti hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Ek dafa set karein, phir khud chalta hai</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Gauge, t: 'Pehle rule banayein', d: 'Do faisle alag hain. Pehla: kis par — bikri par, munafa par, ya har bill par. Doosra: kitna — percent me ya seedhi raqam me. "Bikri par 2.5%" aur "har cheez par Rs 20" dono isi se bante hain.' },
            { i: TrendingUp, t: 'Munafa wala rule dukaan ke liye behtar', d: 'Bikri par commission do to banda chhoot de kar bhi khush rehta hai. Munafa par do to chhoot us ki apni jeb se jati hai — is liye wo rate par khara rehta hai.' },
            { i: UserCheck, t: 'Har bande ko alag se chaalu karein', d: 'Rule bana dene se kisi ki commission shuru nahi hoti. Upar wale khane me us bande ka switch on karna parta hai. Jin ka band hai, un ki bikri dikhegi magar commission 0 rahegi.' },
            { i: UserX, t: 'Employee aur login do alag cheezein', d: 'Staff me jo employee aap banate hain wo HR ka record hai. Bikri hamesha LOGIN ke naam lagti hai. Jis employee ka login nahi, us ki commission ban hi nahi sakti — safha aise logon ko alag se dikha deta hai. Login banate waqt wohi email ya phone dein, dono record khud jur jayenge.' },
            { i: Eye, t: 'Tafseel me sab kuch hai', d: 'Kisi bande ke samne "Tafseel" dabayein — kaunsi cheez kitni bikin, kis par kitni commission bani, kis category se kitna aaya, aur poori bill ki list. Ginti dobara nahi karni parti.' },
            { i: Undo2, t: 'Wapsi apne aap kat jati hai', d: 'Void bill ginti me nahi aate, aur jo maal wapas aaya us ki miqdar har line se khud kat jati hai. Is liye aadhi wapsi wale bill bhi bilkul theek gine jate hain.' },
            { i: CheckCircle2, t: 'Ada kar dein to likh dein', d: 'Paisa dene ke baad "Ada" dabayein. Ye sirf nishani hai — paisa khud kahin se nahi katta. Kharcha darj karna ho to Expenses me alag se likhein.' },
            { i: Layers, t: 'Har dukaan ke liye ek jaisa', d: 'Ye safha kirana, bakery, mobile, electronics — sab ke liye wohi hai. Rules server par mehfooz hote hain, is liye counter ki har machine par ek jaise milte hain.' },
          ].map((x, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tone.grad} text-white flex items-center justify-center shrink-0`}>
                <x.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{x.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{x.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['N', 'Naya rule'], ['G', 'Ye safha'], ['P', 'Print'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className={`w-full bg-gradient-to-r ${tone.grad}`}>Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
