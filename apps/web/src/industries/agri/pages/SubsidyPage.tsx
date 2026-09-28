import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark, Plus, Search, X, Save, RefreshCw, User, CheckCircle2, Ban,
  DollarSign, FileText, TrendingUp, AlertCircle, GraduationCap,
  FileSpreadsheet, Printer, BarChart3, Clock, Wheat, Calculator,
  IdCard, Sprout, Layers, ArrowRight, Copy, MessageCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { subsidyApi, type SubsidyClaim } from '../api/subsidy.api';
import { farmersApi } from '../api/farmers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   SARKARI SUBSIDY — CLAIM SE PAISA MILNE TAK
   ─────────────────────────────────────────────────────────────
   Pakistan me farmer ko khaad aur beej par sarkari rayaat milti
   hai — Kissan Card, Ehsaas, fertilizer subsidy wagaira. Kaam
   aise chalta hai:

     1. Farmer sasta maal le jata hai (dukaan-daar kam paise leta).
     2. Baqi raqam dukaan-daar SARKAR se claim karta hai.
     3. Sarkar approve karti hai, phir paisa deti hai.

   Masla step 3 ka hai. Claim daal kar bhool jana aam baat hai,
   aur wo paisa mahinon atka rehta hai — wo dukaan-daar ka apna
   paisa hai jo us ne farmer ko chhoot ke tor par diya.

   Is liye yahan sab se ooper ye dikhta hai: **kitna paisa abhi
   sarkar ke paas atka hua hai aur kitne din se.** Baqi safha
   usi ke ird gird hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'claims' | 'analytics';
type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED';

const SCHEMES = [
  'Kissan Card', 'Ehsaas Kisan', 'PM Kisan Scheme', 'Punjab Kisan Package',
  'Sindh Agriculture Subsidy', 'Fertilizer Subsidy', 'Seed Subsidy',
  'Solar Tube Well', 'Drip Irrigation', 'Tractor Subsidy', 'Aur koi',
];

const STATUS: Record<string, { label: string; hint: string; color: string; pill: string; icon: any }> = {
  PENDING: {
    label: 'Intezaar me', hint: 'Sarkar ne abhi dekha nahi',
    color: 'bg-amber-500', icon: AlertCircle,
    pill: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  APPROVED: {
    label: 'Manzoor', hint: 'Manzoor ho gaya, paisa aana baqi hai',
    color: 'bg-sky-500', icon: CheckCircle2,
    pill: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
  },
  DISBURSED: {
    label: 'Paisa mil gaya', hint: 'Kaam poora',
    color: 'bg-emerald-600', icon: CheckCircle2,
    pill: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'Rad ho gaya', hint: 'Sarkar ne manzoor nahi kiya',
    color: 'bg-rose-500', icon: Ban,
    pill: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  },
};

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#84cc16', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

/** Claim daale hue kitne din guzar gaye */
function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export default function SubsidyPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('claims');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [scheme, setScheme] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [rejectFor, setRejectFor] = useState<SubsidyClaim | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Saare claims ek baar — chaant client par hoti hai taake
     status ke counter hamesha poore dikhein, filter chahe koi bhi ho. */
  const claimsQ = useQuery({
    queryKey: ['subsidy-claims-all'],
    queryFn: () => subsidyApi.list({}),
  });
  const summaryQ = useQuery({
    queryKey: ['subsidy-summary'],
    queryFn: () => subsidyApi.summary().catch(() => null),
  });

  const isLoading = claimsQ.isLoading;
  const isRefetching = claimsQ.isRefetching || summaryQ.isRefetching;
  const refetchAll = () => { claimsQ.refetch(); summaryQ.refetch(); };
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['subsidy-claims-all'] });
    qc.invalidateQueries({ queryKey: ['subsidy-summary'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => subsidyApi.approve(id),
    onSuccess: () => { toast.success('Claim manzoor kar diya'); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => subsidyApi.reject(id, reason),
    onSuccess: () => { toast.success('Claim rad kar diya'); setRejectFor(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  const disburse = useMutation({
    mutationFn: (id: string) => subsidyApi.disburse(id),
    onSuccess: () => { toast.success('Paisa mil gaya — likh diya'); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = claimsQ.data ?? [];
    return list.map((c) => {
      const age = daysSince(c.createdAt);
      const pending = c.status === 'PENDING' || c.status === 'APPROVED';
      return {
        ...c,
        age,
        /** Abhi bhi sarkar ke paas atka hua hai */
        stuck: pending,
        /** 30 din se zyada ho gaye — peecha karna chahiye */
        overdue: pending && (age ?? 0) > 30,
      };
    });
  }, [claimsQ.data]);

  const schemes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.schemeName) set.add(r.schemeName); });
    return [...set].sort();
  }, [rows]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (statusFilter !== 'all') out = out.filter((r) => r.status === statusFilter);
    if (scheme !== 'all') out = out.filter((r) => r.schemeName === scheme);
    if (q) out = out.filter((r) =>
      (r.claimNumber || '').toLowerCase().includes(q)
      || (r.schemeName || '').toLowerCase().includes(q)
      || (r.govtScheme || '').toLowerCase().includes(q)
      || (r.productType || '').toLowerCase().includes(q)
      || (r.farmerCnic || '').toLowerCase().includes(q)
      || (r.cropTarget || '').toLowerCase().includes(q));
    /* Sab se purana atka hua claim sab se ooper — wohi sab se
       zyada peecha maangta hai. */
    return [...out].sort((a, b) => {
      if (a.stuck !== b.stuck) return a.stuck ? -1 : 1;
      return (b.age ?? 0) - (a.age ?? 0);
    });
  }, [rows, statusFilter, scheme, q]);

  const hasFilters = !!search || statusFilter !== 'all' || scheme !== 'all';

  /* ── Stats ── */
  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s);
    const pending = by('PENDING');
    const approved = by('APPROVED');
    const disbursed = by('DISBURSED');
    const rejected = by('REJECTED');
    const stuck = [...pending, ...approved];
    const sum = (list: any[]) => list.reduce((s, r) => s + Number(r.subsidyAmount || 0), 0);
    const oldest = stuck.reduce((m, r) => Math.max(m, r.age ?? 0), 0);
    return {
      total: rows.length,
      pending: pending.length, approved: approved.length,
      disbursed: disbursed.length, rejected: rejected.length,
      /** Sab se ahem number: kitna paisa sarkar ke paas atka hai */
      stuckAmount: sum(stuck),
      stuckCount: stuck.length,
      oldestDays: oldest,
      overdue: rows.filter((r) => r.overdue).length,
      overdueAmount: sum(rows.filter((r) => r.overdue)),
      gotAmount: sum(disbursed),
      lostAmount: sum(rejected),
      totalAmount: sum(rows),
      /** Farmer ko kitni chhoot di — ye dukaan ne apni jeb se di */
      farmerSaved: rows.reduce((s, r) => s + Number(r.subsidyAmount || 0), 0),
    };
  }, [rows]);

  /* ── Charts ── */
  const statusPie = useMemo(() => ([
    { name: 'Intezaar me', value: stats.pending, color: '#f59e0b' },
    { name: 'Manzoor', value: stats.approved, color: '#3b82f6' },
    { name: 'Paisa mil gaya', value: stats.disbursed, color: '#10b981' },
    { name: 'Rad ho gaya', value: stats.rejected, color: '#ef4444' },
  ].filter((x) => x.value > 0)), [stats]);

  const schemeChart = useMemo(() => {
    const m = new Map<string, { count: number; amount: number; stuck: number }>();
    rows.forEach((r) => {
      const k = r.schemeName || 'Aur koi';
      const e = m.get(k) ?? { count: 0, amount: 0, stuck: 0 };
      e.count += 1;
      e.amount += Number(r.subsidyAmount || 0);
      if (r.stuck) e.stuck += Number(r.subsidyAmount || 0);
      m.set(k, e);
    });
    return [...m.entries()]
      .map(([name, v]) => ({
        name: name.length > 16 ? `${name.slice(0, 15)}…` : name,
        mila: Math.round(v.amount - v.stuck),
        atka: Math.round(v.stuck),
      }))
      .sort((a, b) => (b.mila + b.atka) - (a.mila + a.atka))
      .slice(0, 8);
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, { claim: number; mila: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      m.set(`${d.getFullYear()}-${d.getMonth()}`, { claim: 0, mila: 0 });
    }
    rows.forEach((r) => {
      const d = new Date(r.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const e = m.get(k);
      if (!e) return;
      e.claim += Number(r.subsidyAmount || 0);
      if (r.status === 'DISBURSED') e.mila += Number(r.subsidyAmount || 0);
    });
    return [...m.entries()].map(([k, v]) => {
      const [y, mo] = k.split('-').map(Number);
      const d = new Date(y, mo, 1);
      return {
        name: d.toLocaleDateString('en-PK', { month: 'short' }),
        claim: Math.round(v.claim),
        mila: Math.round(v.mila),
      };
    });
  }, [rows]);

  const ageChart = useMemo(() => {
    const stuck = rows.filter((r) => r.stuck);
    const b = [
      { name: '7 din se kam', value: 0 },
      { name: '1–4 hafte', value: 0 },
      { name: '1–3 mahine', value: 0 },
      { name: '3 mahine se zyada', value: 0 },
    ];
    stuck.forEach((r) => {
      const d = r.age ?? 0;
      if (d < 7) b[0].value += Number(r.subsidyAmount || 0);
      else if (d < 30) b[1].value += Number(r.subsidyAmount || 0);
      else if (d < 90) b[2].value += Number(r.subsidyAmount || 0);
      else b[3].value += Number(r.subsidyAmount || 0);
    });
    return b.map((x) => ({ ...x, value: Math.round(x.value) })).filter((x) => x.value > 0);
  }, [rows]);

  /* ── Peecha karne wali list — daftar bhejne ke liye ── */
  const chaseText = useMemo(() => {
    const list = rows.filter((r) => r.overdue).sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
    const lines = list.map((r, i) =>
      `${i + 1}. ${r.claimNumber} — ${r.schemeName} — ${formatPKR(r.subsidyAmount)} — ${r.age} din`);
    return [
      `🏛️ *${tenant?.name || 'Agri'}* — subsidy claims jo atke hue hain`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${list.length} claims • ${formatPKR(stats.overdueAmount)} atka hua`,
    ].filter(Boolean).join('\n');
  }, [rows, tenant, shopName, stats.overdueAmount]);

  const copyChase = async () => {
    try {
      await navigator.clipboard.writeText(chaseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch { toast.error('Copy nahi ho saki'); }
  };
  const whatsappChase = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(chaseText)}`, '_blank');

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Subsidy Claims — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Sarkar ke paas atka hua: ${formatPKR(stats.stuckAmount)} (${stats.stuckCount} claims)`],
      [`Mil chuka: ${formatPKR(stats.gotAmount)}`],
      [''],
    ];
    const head = ['Claim #', 'Scheme', 'Govt scheme', 'CNIC', 'Cheez', 'Tadaad',
      'Asal rate', 'Subsidy', 'Farmer ne diya', 'Fasal', 'Raqba (acre)',
      'Halat', 'Din guzre', 'Manzoori', 'Paisa mila', 'Rad ki wajah'];
    const body = shown.map((r) => [
      r.claimNumber, r.schemeName, r.govtScheme || '', r.farmerCnic || '',
      r.productType, r.quantity,
      Math.round(Number(r.originalPrice || 0)),
      Math.round(Number(r.subsidyAmount || 0)),
      Math.round(Number(r.finalPrice || 0)),
      r.cropTarget || '', r.landAreaAcres ?? '',
      STATUS[r.status]?.label ?? r.status,
      r.age ?? '',
      r.approvalDate ? String(r.approvalDate).slice(0, 10) : '',
      r.disbursementDate ? String(r.disbursementDate).slice(0, 10) : '',
      r.rejectionReason || '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `subsidy-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} claims CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rejectFor) return setRejectFor(null);
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return setShowForm(false);
        return;
      }
      if (showForm || rejectFor) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setShowForm(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (k === 'a') setTab((x) => (x === 'analytics' ? 'claims' : 'analytics'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showForm, rejectFor]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🏛️ {tenant?.name || 'Agri'} — Subsidy Claims</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{shown.length} claims •
              Atka hua {formatPKR(stats.stuckAmount)}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Landmark className="h-3.5 w-3.5 text-amber-300" /> Sarkari Scheme
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🏛️ Sarkari Subsidy</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              Sarkar ke paas atka hua <strong className="text-amber-200">{formatPKR(stats.stuckAmount)}</strong>
              {stats.stuckCount > 0 && <> ({stats.stuckCount} claims)</>} ·
              mil chuka <strong className="text-emerald-300">{formatPKR(stats.gotAmount)}</strong>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={exportCsv}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={doPrint} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={refetchAll} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowForm(true)}
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Naya claim
            </button>
          </div>
        </div>
      </section>

      {/* ═══ PURANE CLAIMS — sab se ooper ═══ */}
      {stats.overdue > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              ⏳ {stats.overdue} claims ek mahine se zyada atke hue — {formatPKR(stats.overdueAmount)}
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Ye aap ka apna paisa hai jo aap ne farmer ko chhoot ke tor par diya tha. Sab se
              purana claim <strong>{stats.oldestDays} din</strong> ka hai. Daftar me peecha
              karein — list copy karke le jayein ya WhatsApp kar dein.
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={copyChase}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 hover:border-amber-500 text-amber-800 dark:text-amber-200 text-xs font-black inline-flex items-center gap-1.5 transition">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copy hui' : 'List'}
            </button>
            <button onClick={whatsappChase}
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Clock} label="Sarkar ke paas atka" value={formatPKR(stats.stuckAmount)}
          sub={stats.stuckCount > 0 ? `${stats.stuckCount} claims · sab se purana ${stats.oldestDays} din` : 'Kuch atka nahi'}
          tone="amber" onClick={() => { setTab('claims'); setStatusFilter('PENDING'); }}
          active={statusFilter === 'PENDING'} />
        <Kpi icon={CheckCircle2} label="Mil chuka" value={formatPKR(stats.gotAmount)}
          sub={`${stats.disbursed} claims poore hue`} tone="emerald"
          onClick={() => { setTab('claims'); setStatusFilter('DISBURSED'); }}
          active={statusFilter === 'DISBURSED'} />
        <Kpi icon={FileText} label="Kul claims" value={stats.total}
          sub={`${stats.pending} intezaar · ${stats.approved} manzoor`} tone="lime"
          onClick={() => { setTab('claims'); setStatusFilter('all'); }} />
        <Kpi icon={Ban} label="Rad ho gaye" value={stats.rejected}
          sub={stats.lostAmount > 0 ? `${formatPKR(stats.lostAmount)} ka nuqsaan` : 'Koi rad nahi hua'}
          tone="rose" onClick={() => { setTab('claims'); setStatusFilter('REJECTED'); }}
          active={statusFilter === 'REJECTED'} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          ['claims', 'Claims', FileText, shown.length],
          ['analytics', 'Analytics', BarChart3, undefined],
        ] as const).map(([id, label, Icon, count]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg tabular-nums ${
                tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <SubsidyForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); invalidateAll(); }}
        />
      )}

      {rejectFor && (
        <RejectModal claim={rejectFor} onClose={() => setRejectFor(null)}
          onConfirm={(reason) => reject.mutate({ id: rejectFor.id, reason })}
          saving={reject.isPending} />
      )}

      {tab === 'analytics' ? (
        <Analytics stats={stats} statusPie={statusPie} schemeChart={schemeChart}
          monthChart={monthChart} ageChart={ageChart} rows={rows} />
      ) : (
        <>
          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Claim number, scheme, CNIC, cheez, fasal… (/ dabao)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 flex-wrap items-center">
              {([
                ['all', `Sab (${stats.total})`],
                ['PENDING', `Intezaar me (${stats.pending})`],
                ['APPROVED', `Manzoor (${stats.approved})`],
                ['DISBURSED', `Paisa mila (${stats.disbursed})`],
                ['REJECTED', `Rad (${stats.rejected})`],
              ] as const).map(([v, label]) => (
                <button key={v} onClick={() => setStatusFilter(v as StatusFilter)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    statusFilter === v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{label}</button>
              ))}

              {schemes.length > 1 && (
                <select value={scheme} onChange={(e) => setScheme(e.target.value)}
                  className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition">
                  <option value="all">Sab schemes</option>
                  {schemes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              {hasFilters && (
                <button onClick={() => { setSearch(''); setStatusFilter('all'); setScheme('all'); }}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}
              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {shown.length} claims
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : shown.length === 0 ? (
            <Empty hasFilters={hasFilters}
              onClear={() => { setSearch(''); setStatusFilter('all'); setScheme('all'); }}
              onNew={() => setShowForm(true)} onGuide={() => setShowTeacher(true)} />
          ) : (
            <section className="grid gap-3">
              {shown.map((claim) => (
                <ClaimCard key={claim.id} claim={claim}
                  onApprove={() => approve.mutate(claim.id)}
                  onReject={() => setRejectFor(claim)}
                  onDisburse={() => disburse.mutate(claim.id)}
                  busy={approve.isPending || disburse.isPending} />
              ))}
            </section>
          )}
        </>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EK CLAIM KA CARD
   ═════════════════════════════════════════════════════════════ */
function ClaimCard({ claim, onApprove, onReject, onDisburse, busy }: {
  claim: any; onApprove: () => void; onReject: () => void; onDisburse: () => void; busy: boolean;
}) {
  const cfg = STATUS[claim.status] ?? STATUS.PENDING;
  const StatusIcon = cfg.icon;
  const original = Number(claim.originalPrice || 0);
  const subsidy = Number(claim.subsidyAmount || 0);
  const pct = original > 0 ? (subsidy / original) * 100 : 0;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-4 space-y-3 avoid-break transition ${
      claim.overdue ? 'border-amber-400 dark:border-amber-500/50'
        : claim.status === 'PENDING' ? 'border-amber-200 dark:border-amber-500/30'
        : claim.status === 'DISBURSED' ? 'border-emerald-200 dark:border-emerald-500/30'
        : claim.status === 'REJECTED' ? 'border-rose-200 dark:border-rose-500/30'
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ${
            claim.status === 'DISBURSED' ? 'bg-gradient-to-br from-emerald-500 to-green-600'
              : claim.status === 'PENDING' ? 'bg-gradient-to-br from-amber-500 to-orange-600'
              : claim.status === 'REJECTED' ? 'bg-gradient-to-br from-rose-500 to-red-600'
              : 'bg-gradient-to-br from-sky-500 to-blue-600'
          }`}>
            <Landmark className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-slate-900 dark:text-white">{claim.claimNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white inline-flex items-center gap-1 ${cfg.color}`}>
                <StatusIcon className="h-2.5 w-2.5" /> {cfg.label}
              </span>
              {claim.overdue && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {claim.age} din se atka
                </span>
              )}
            </div>
            <div className="mt-1 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{claim.schemeName}</div>
            {claim.govtScheme && (
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{claim.govtScheme}</div>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Tag icon={Wheat}>{claim.productType} × {claim.quantity}</Tag>
              {claim.farmerCnic && <Tag icon={IdCard}>{claim.farmerCnic}</Tag>}
              {claim.cropTarget && <Tag icon={Sprout}>{claim.cropTarget}</Tag>}
              {claim.landAreaAcres ? <Tag icon={Layers}>{claim.landAreaAcres} acre</Tag> : null}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Sarkar se lena hai</div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-0.5">
            {formatPKR(subsidy)}
          </div>
          {pct > 0 && (
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {formatPKR(original)} me se {pct.toFixed(0)}%
            </div>
          )}
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Farmer ne diya {formatPKR(Number(claim.finalPrice || 0))}
          </div>
        </div>
      </div>

      {/* Safar ki patti — claim kahan tak pahuncha */}
      {claim.status !== 'REJECTED' && (
        <div className="flex items-center gap-1.5 text-[10px] font-black print:hidden">
          <Step on label="Claim daala" />
          <Line on={claim.status === 'APPROVED' || claim.status === 'DISBURSED'} />
          <Step on={claim.status === 'APPROVED' || claim.status === 'DISBURSED'} label="Manzoor" />
          <Line on={claim.status === 'DISBURSED'} />
          <Step on={claim.status === 'DISBURSED'} label="Paisa mila" />
        </div>
      )}

      {claim.status === 'PENDING' && (
        <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <button onClick={onApprove} disabled={busy}
            className="flex-1 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 hover:bg-sky-200 dark:hover:bg-sky-500/30 disabled:opacity-50 text-sky-700 dark:text-sky-300 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition">
            <CheckCircle2 className="h-3.5 w-3.5" /> Manzoor ho gaya
          </button>
          <button onClick={onReject} disabled={busy}
            className="flex-1 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 disabled:opacity-50 text-rose-600 dark:text-rose-400 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition">
            <Ban className="h-3.5 w-3.5" /> Rad ho gaya
          </button>
        </div>
      )}

      {claim.status === 'APPROVED' && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <button onClick={onDisburse} disabled={busy}
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition">
            <DollarSign className="h-3.5 w-3.5" /> Paisa mil gaya — likh do
          </button>
        </div>
      )}

      {claim.rejectionReason && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-[12px] font-bold text-rose-800 dark:text-rose-300">
          ❌ Rad ki wajah: {claim.rejectionReason}
        </div>
      )}

      {(claim.approvalDate || claim.disbursementDate) && (
        <div className="text-[10px] font-bold text-slate-400 flex gap-3 flex-wrap">
          {claim.approvalDate && (
            <span>Manzoor: {new Date(claim.approvalDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
          )}
          {claim.disbursementDate && (
            <span>Paisa mila: {new Date(claim.disbursementDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Step({ on, label }: { on?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
      on ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
    }`}>
      {on ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {label}
    </span>
  );
}

function Line({ on }: { on?: boolean }) {
  return <span className={`h-0.5 flex-1 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />;
}

function Tag({ icon: Icon, children }: any) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════
   RAD KARNE KA MODAL — pehle `prompt()` tha, jo mobile par
   theek nahi chalta aur wajah bhi lambi nahi likhi ja sakti
   ═════════════════════════════════════════════════════════════ */
const COMMON_REASONS = [
  'CNIC ka record match nahi hua',
  'Kaghazat poore nahi thay',
  'Scheme ki muddat khatam ho chuki',
  'Farmer pehle hi is scheme me hai',
  'Raqba (acre) sahi nahi',
];

function RejectModal({ claim, onClose, onConfirm, saving }: {
  claim: any; onClose: () => void; onConfirm: (reason: string) => void; saving: boolean;
}) {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length > 0;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Ban className="h-3 w-3" /> Claim rad karein
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate font-mono">{claim.claimNumber}</h3>
            <div className="text-xs text-white/80 font-bold">{formatPKR(claim.subsidyAmount)} · {claim.schemeName}</div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Sarkar ne kyun rad kiya? <span className="text-rose-500">*</span>
            </label>
            <textarea rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Wajah likhein — baad me pata chalega ke kya theek karna tha…"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 resize-none transition" />
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Aam wajah — click karein</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 transition">
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
            Ye chhoot aap pehle hi farmer ko de chuke hain — rad hone ka matlab hai ke
            {' '}<strong>{formatPKR(claim.subsidyAmount)}</strong> aap ki jeb se gaya.
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" disabled={!ok} loading={saving}
              onClick={() => onConfirm(reason.trim())}>
              <Ban className="h-4 w-4" /> Rad karein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, statusPie, schemeChart, monthChart, ageChart, rows }: any) {
  const topStuck = useMemo(
    () => rows.filter((r: any) => r.stuck).sort((a: any, b: any) => (b.age ?? 0) - (a.age ?? 0)).slice(0, 6),
    [rows],
  );
  const approvalRate = stats.total > 0
    ? ((stats.approved + stats.disbursed) / Math.max(stats.approved + stats.disbursed + stats.rejected, 1)) * 100
    : 0;

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={DollarSign} label="Kul claim kiya" value={formatPKR(stats.totalAmount)} tone="lime" />
        <MiniStat icon={CheckCircle2} label="Mil chuka" value={formatPKR(stats.gotAmount)} tone="emerald" />
        <MiniStat icon={Clock} label="Abhi atka hua" value={formatPKR(stats.stuckAmount)}
          sub={stats.oldestDays > 0 ? `Sab se purana ${stats.oldestDays} din` : undefined} tone="amber" />
        <MiniStat icon={TrendingUp} label="Manzoori ki shrah" value={`${approvalRate.toFixed(0)}%`}
          sub={`${stats.rejected} rad hue`} tone={approvalRate >= 80 ? 'emerald' : 'rose'} />
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Layers} title="Claims kahan tak pahunche">
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {statusPie.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi claim nahi" />}
        </ChartCard>

        <ChartCard icon={Clock} title="Atka hua paisa — kitna purana">
          {ageChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Atka hua']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ageChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Kuch atka hua nahi — sab paisa mil chuka" />}
        </ChartCard>

        <ChartCard icon={Landmark} title="Kis scheme se kitna" wide>
          {schemeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schemeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'mila' ? 'Mil chuka' : 'Atka hua']} />
                <Legend formatter={(v) => (v === 'mila' ? 'Mil chuka' : 'Atka hua')} />
                <Bar dataKey="mila" stackId="s" fill="#10b981" />
                <Bar dataKey="atka" stackId="s" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi claim nahi" />}
        </ChartCard>

        <ChartCard icon={BarChart3} title="Pichle 6 mahine" wide>
          {monthChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'claim' ? 'Claim kiya' : 'Paisa mila']} />
                <Legend formatter={(v) => (v === 'claim' ? 'Claim kiya' : 'Paisa mila')} />
                <Bar dataKey="claim" fill="#84cc16" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mila" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi claim nahi" />}
        </ChartCard>
      </div>

      {topStuck.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-slate-900 dark:text-white">Sab se purane atke hue claims</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topStuck.map((r: any, i: number) => (
              <div key={r.id} className="p-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-700 dark:text-amber-300 shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.claimNumber}</div>
                  <div className="text-[11px] font-bold text-slate-400 truncate">
                    {r.schemeName} · {STATUS[r.status]?.label}
                  </div>
                </div>
                <span className={`text-[11px] font-black tabular-nums shrink-0 ${
                  (r.age ?? 0) > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                }`}>{r.age} din</span>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">
                  {formatPKR(r.subsidyAmount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYA CLAIM
   ═════════════════════════════════════════════════════════════ */
function SubsidyForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    farmerId: '', schemeName: 'Kissan Card', govtScheme: '',
    productType: '', quantity: 1,
    originalPrice: '', subsidyAmount: '', finalPrice: '',
    farmerCnic: '', cropTarget: '', landAreaAcres: '',
  });

  const [farmerSearch, setFarmerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [farmer, setFarmer] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-subsidy', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showPicker,
  });

  /* Teen number aapas me jure hain: asal rate − subsidy = farmer
     ne jo diya. Dukaan-daar koi bhi do bhare, teesra khud ban jaye. */
  const setOriginal = (v: string) => {
    const o = Number(v) || 0;
    const s = Number(form.subsidyAmount) || 0;
    setForm({ ...form, originalPrice: v, finalPrice: String(Math.max(o - s, 0)) });
  };
  const setSubsidy = (v: string) => {
    const o = Number(form.originalPrice) || 0;
    const s = Number(v) || 0;
    setForm({ ...form, subsidyAmount: v, finalPrice: String(Math.max(o - s, 0)) });
  };
  const setFinal = (v: string) => {
    const o = Number(form.originalPrice) || 0;
    const f = Number(v) || 0;
    setForm({ ...form, finalPrice: v, subsidyAmount: String(Math.max(o - f, 0)) });
  };

  const original = Number(form.originalPrice) || 0;
  const subsidy = Number(form.subsidyAmount) || 0;
  const final = Number(form.finalPrice) || 0;
  const pct = original > 0 ? (subsidy / original) * 100 : 0;
  const mismatch = original > 0 && Math.abs(original - subsidy - final) > 1;

  const errors: string[] = [];
  if (!form.farmerId) errors.push('Farmer chunein');
  if (!form.productType.trim()) errors.push('Kaunsi cheez par subsidy hai — likhein');
  if (subsidy <= 0) errors.push('Subsidy ki raqam bharein');
  const valid = errors.length === 0;

  const save = useMutation({
    mutationFn: () => subsidyApi.create({
      ...form,
      quantity: Number(form.quantity) || 0,
      originalPrice: original,
      subsidyAmount: subsidy,
      finalPrice: final,
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
    }),
    onSuccess: () => { toast.success('Claim ban gaya'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Claim nahi bana'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg overflow-hidden print:hidden">
      <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Landmark className="h-5 w-5" /> Naya subsidy claim
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
          <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Farmer */}
        {farmer ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-900 dark:text-white truncate">{farmer.fullName}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                {farmer.cnic || 'CNIC nahi likha'}{farmer.phone ? ` · ${farmer.phone}` : ''}
              </div>
            </div>
            <button onClick={() => { setFarmer(null); setForm({ ...form, farmerId: '', farmerCnic: '' }); }}
              className="text-xs font-extrabold text-emerald-600 hover:underline shrink-0">Badlein</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowPicker(!showPicker)}
              className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-extrabold text-slate-600 dark:text-slate-300 hover:border-emerald-400 inline-flex items-center justify-center gap-2 transition">
              <Search className="h-4 w-4" /> Farmer chunein <span className="text-rose-500">*</span>
            </button>
            {showPicker && (
              <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 space-y-2">
                <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)}
                  placeholder="Naam ya CNIC se dhoondein…"
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {farmers.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-3">Koi farmer nahi mila</p>
                  ) : farmers.map((f: any) => (
                    <button key={f.id}
                      onClick={() => {
                        setFarmer(f);
                        setForm({ ...form, farmerId: f.id, farmerCnic: f.cnic || '' });
                        setShowPicker(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-left transition">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-extrabold text-slate-900 dark:text-white truncate">{f.fullName}</span>
                        <span className="block text-[10px] font-bold text-slate-500">{f.cnic || 'CNIC nahi'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kaunsi scheme" req>
            <select value={form.schemeName} onChange={(e) => setForm({ ...form, schemeName: e.target.value })} className={inp}>
              {SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Sarkari scheme ka number" opt>
            <input value={form.govtScheme} onChange={(e) => setForm({ ...form, govtScheme: e.target.value })}
              placeholder="Jaise: PKC-2026-01" className={`${inp} font-mono`} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kis cheez par subsidy hai" req>
            <input value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}
              placeholder="Urea, DAP, gandum ka beej…" className={inp} />
          </Field>
          <Field label="Kitni tadaad" opt>
            <input type="number" min={0} value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="10 bori" className={`${inp} tabular-nums`} />
          </Field>
        </div>

        {/* Paisa — teen number jo aapas me jure hain */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Paisa ka hisab — koi bhi do bharein, teesra khud ban jayega
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Asal rate">
              <input type="number" min={0} value={form.originalPrice} onChange={(e) => setOriginal(e.target.value)}
                placeholder="0" className={`${inp} tabular-nums`} />
            </Field>
            <Field label="Sarkar se lena hai">
              <input type="number" min={0} value={form.subsidyAmount} onChange={(e) => setSubsidy(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 text-sm font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 transition" />
            </Field>
            <Field label="Farmer ne diya">
              <input type="number" min={0} value={form.finalPrice} onChange={(e) => setFinal(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 text-sm font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-600 transition" />
            </Field>
          </div>

          {subsidy > 0 && original > 0 && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-500/30 p-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-200">
              Farmer ne <strong>{formatPKR(final)}</strong> diya, aap ne{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">{formatPKR(subsidy)}</strong>{' '}
              ({pct.toFixed(0)}%) apni jeb se laga diya — wohi sarkar se wapas lena hai.
            </div>
          )}

          {mismatch && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Hisab nahi mil raha: {formatPKR(original)} − {formatPKR(subsidy)} ≠ {formatPKR(final)}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Kis fasal ke liye" opt>
            <input value={form.cropTarget} onChange={(e) => setForm({ ...form, cropTarget: e.target.value })}
              placeholder="Gandum, kapas…" className={inp} />
          </Field>
          <Field label="Raqba (acre)" opt>
            <input type="number" step="0.1" min={0} value={form.landAreaAcres}
              onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })}
              placeholder="5" className={`${inp} tabular-nums`} />
          </Field>
        </div>

        {!valid && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-1">
              Ye reh gaya hai
            </div>
            <ul className="space-y-0.5">
              {errors.map((e) => (
                <li key={e} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!valid}>
            <Save className="h-4 w-4" /> Claim daal dein
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
const inp = 'h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition';

function Field({ label, req, opt, children }: any) {
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
        {req && <span className="text-rose-500"> *</span>}
        {opt && <span className="text-slate-400 normal-case font-bold"> — marzi</span>}
      </label>
      {children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.98]' : '',
        active ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function MiniStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400', lime: 'text-lime-600 dark:text-lime-400',
    amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone] ?? tones.emerald}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Empty({ hasFilters, onClear, onNew, onGuide }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Landmark className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par kuch nahi mila' : 'Abhi koi subsidy claim nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
        {hasFilters
          ? 'Chaant badal kar dekhein'
          : 'Jab kisi farmer ko Kissan Card ya kisi aur scheme par sasta maal dein, wo yahan likh dein — phir sarkar se paisa lene ka poora hisab rahega.'}
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        {hasFilters ? (
          <Button variant="secondary" onClick={onClear}><X className="h-4 w-4" /> Chaant hatao</Button>
        ) : (
          <>
            <button onClick={onGuide}
              className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
              <GraduationCap className="h-4 w-4" /> Pehle seekh lo
            </button>
            <button onClick={onNew}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Naya claim
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Subsidy kaise chalti hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Kaam teen qadam ka hai: farmer <strong>sasta maal</strong> le jata hai → aap baqi
              raqam <strong>sarkar se claim</strong> karte hain → sarkar manzoor karke{' '}
              <strong>paisa deti hai</strong>. Ye safha teeno qadam ka hisab rakhta hai.
            </p>
          </div>
          <Tip icon={Clock} title="Atka hua paisa — sab se ahem">
            Ooper jo number dikhta hai wo aap ka apna paisa hai jo abhi sarkar ke paas hai.
            Claim daal kar bhool jana aam baat hai — is liye ek mahine se purane claims ki
            alag patti aati hai, aur us ki list copy karke daftar le ja sakte hain.
          </Tip>
          <Tip icon={Plus} title="Naya claim">
            Farmer chunein, scheme chunein, aur paisa bhar dein. Teen number — asal rate,
            sarkar se lena, farmer ne diya — aapas me jure hain: koi bhi do bharein, teesra
            khud ban jata hai.
          </Tip>
          <Tip icon={CheckCircle2} title="Manzoor / rad">
            Sarkar se jawab aaye to yahan likh dein. Manzoor hone ke baad "Paisa mil gaya" ka
            button aata hai — jab paisa asal me haath me aa jaye tabhi dabayein, warna hisab
            ghalat ho jayega.
          </Tip>
          <Tip icon={Ban} title="Rad ho jaye to">
            Wajah zaroor likhein. Aglay claim me wohi ghalti dobara nahi hogi. Yaad rahe:
            rad hone ka matlab hai ke wo chhoot aap ki jeb se gayi.
          </Tip>
          <Tip icon={BarChart3} title="Analytics">
            Kis scheme se paisa jaldi milta hai aur kis me atakta hai — chart se foran pata
            chal jata hai. Jis scheme me zyada rad hote hon, us me kaghazat zyada dhyan se lagayein.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya claim</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
