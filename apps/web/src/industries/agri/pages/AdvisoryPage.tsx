import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Leaf, Plus, Search, X, Save, RefreshCw, User, Calendar, CheckCircle2,
  Clock, FlaskConical, ArrowRight, GraduationCap, FileSpreadsheet,
  Printer, BarChart3, AlertTriangle, Bug, Sprout, Phone, Layers,
  MessageCircle, Copy, Package, Wheat, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { advisoryApi, type CropAdvisory } from '../api/advisory.api';
import { farmersApi } from '../api/farmers.api';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, type AgriKind } from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   FASAL KI RAAY — MASHWARA JO BIKRI BANTA HAI
   ─────────────────────────────────────────────────────────────
   Agri dukaan sirf maal nahi bechti, raay bhi deti hai. Farmer
   patta le kar aata hai: "ye peela kyun ho raha hai?" Jo dukaan
   sahi jawab deti hai, wohi us ka saara season ka maal bechti hai.

   Do cheezein is ko kaam ki banati hain:

     1. FOLLOW-UP — raay de kar bhool jana bekaar hai. Agar 10 din
        baad poocha nahi ke faida hua ya nahi, to farmer samajhta
        hai ke dukaan ko parwah nahi. Yahan follow-up ki tareekh
        sab se ooper aati hai.

     2. MASHWARA → MAAL — jis fasal ya keeray ka mashwara diya,
        us ka maal dukaan me hai ya nahi? Yahan dono jur jate hain,
        taake mashwara dete waqt hi pata ho ke kya bech sakte hain.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type Filter = 'pending' | 'due' | 'completed' | 'all';

const CROPS = [
  'Gandum', 'Chawal', 'Kapas', 'Ganna', 'Makai', 'Aloo', 'Tamatar', 'Pyaz',
  'Mirch', 'Dalein', 'Chara', 'Soybean', 'Sarson', 'Sooraj mukhi', 'Chana', 'Tarbooz',
];

const STAGES = [
  { v: 'Bijai se pehle', e: '🌱' },
  { v: 'Bijai', e: '🌾' },
  { v: 'Ugao', e: '🌿' },
  { v: 'Barhotri', e: '🍃' },
  { v: 'Phool', e: '🌸' },
  { v: 'Phal', e: '🌽' },
  { v: 'Katai', e: '✂️' },
  { v: 'Katai ke baad', e: '📦' },
];

/** Aam masle — click karke likhne ki zaroorat nahi parti */
const COMMON_ISSUES = [
  'Patte peele ho rahe hain',
  'Sundi lag gayi hai',
  'Phaphoondi / blight',
  'Khar patwar zyada hai',
  'Paani ki kami',
  'Barhotri ruk gayi hai',
  'Zameen sakht ho gayi',
  'Phool jhar rahe hain',
];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const dayMs = 86_400_000;

function daysTo(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((t - a) / dayMs);
}

function dayPhrase(d: number): string {
  if (d === 0) return 'aaj';
  if (d === 1) return 'kal';
  if (d === -1) return 'kal guzra';
  if (d > 0) return `${d} din me`;
  return `${Math.abs(d)} din pehle`;
}

export default function AdvisoryPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Saari advisory ek baar — chaant client par */
  const advQ = useQuery({
    queryKey: ['agri-advisories-all'],
    queryFn: () => advisoryApi.list({}),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
  });
  const stockQ = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }).catch(() => null),
  });

  const isLoading = advQ.isLoading;
  const isRefetching = advQ.isRefetching || profilesQ.isRefetching;
  const refetchAll = () => { advQ.refetch(); profilesQ.refetch(); stockQ.refetch(); };

  const complete = useMutation({
    mutationFn: (id: string) => advisoryApi.complete(id),
    onSuccess: () => {
      toast.success('Mashwara poora ho gaya');
      qc.invalidateQueries({ queryKey: ['agri-advisories-all'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  /* ── Fasal ka maal ──
     Mashwara dete waqt ye pata hona chahiye ke us fasal ka maal
     dukaan me hai ya nahi. Product ke andar wale "kis fasal par
     chalta hai" se jor lagta hai. */
  const stockByCrop = useMemo(() => {
    const rows = stockQ.data?.rows ?? [];
    const byId = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) byId.set(p.productId, p); });

    const m = new Map<string, any[]>();
    rows.forEach((r) => {
      const profile = byId.get(r.productId);
      const crops = profile?.targetCrops ?? [];
      if (crops.length === 0) return;
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(r.category, r.productName);
      const item = {
        ...r, profile, kind,
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        pests: profile?.targetPests ?? [],
      };
      crops.forEach((c: string) => {
        const k = c.trim().toLowerCase();
        if (!k) return;
        m.set(k, [...(m.get(k) ?? []), item]);
      });
    });
    return m;
  }, [stockQ.data, profilesQ.data]);

  const matchCrop = (cropName: string, issues?: string) => {
    const key = (cropName || '').trim().toLowerCase();
    if (!key) return [] as any[];
    let out: any[] = [];
    stockByCrop.forEach((items, k) => {
      if (k === key || k.includes(key) || key.includes(k)) out.push(...items);
    });
    out = [...new Map(out.map((i) => [i.productId, i])).values()];
    /* Agar masla likha hai to us keeray/beemari wali cheezein pehle */
    if (issues) {
      const iss = issues.toLowerCase();
      out.sort((a, b) => {
        const am = (a.pests ?? []).some((p: string) => iss.includes(p.toLowerCase())) ? 0 : 1;
        const bm = (b.pests ?? []).some((p: string) => iss.includes(p.toLowerCase())) ? 0 : 1;
        return am - bm;
      });
    }
    return out;
  };

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = advQ.data ?? [];
    return list.map((a) => {
      const toFollow = daysTo(a.followUpDate);
      const items = matchCrop(a.cropName, a.currentIssues);
      return {
        ...a,
        toFollow,
        /* Follow-up ki tareekh aa gayi ya guzar gayi, aur kaam abhi baqi */
        followDue: !a.completed && toFollow !== null && toFollow <= 0,
        followSoon: !a.completed && toFollow !== null && toFollow > 0 && toFollow <= 3,
        items,
        inStock: items.filter((i) => !i.isOut).length,
        outStock: items.filter((i) => i.isOut).length,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advQ.data, stockByCrop]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'pending') out = out.filter((r) => !r.completed);
    else if (filter === 'due') out = out.filter((r) => r.followDue);
    else if (filter === 'completed') out = out.filter((r) => r.completed);
    if (q) out = out.filter((r) =>
      (r.advisoryNumber || '').toLowerCase().includes(q)
      || (r.cropName || '').toLowerCase().includes(q)
      || (r.cropVariety || '').toLowerCase().includes(q)
      || (r.currentIssues || '').toLowerCase().includes(q)
      || (r.advisorName || '').toLowerCase().includes(q)
      || (r.stage || '').toLowerCase().includes(q));
    /* Jin ka follow-up aa gaya wo sab se ooper */
    return [...out].sort((a, b) => {
      const rank = (r: any) => (r.followDue ? 0 : r.followSoon ? 1 : r.completed ? 3 : 2);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rows, filter, q]);

  const hasFilters = !!search || filter !== 'pending';

  /* ── Stats ── */
  const stats = useMemo(() => {
    const due = rows.filter((r) => r.followDue);
    return {
      total: rows.length,
      pending: rows.filter((r) => !r.completed).length,
      completed: rows.filter((r) => r.completed).length,
      due: due.length,
      dueList: due.slice(0, 6),
      soon: rows.filter((r) => r.followSoon).length,
      /* Jin fasalon ka mashwara diya magar maal hi nahi — mauqa gaya */
      noStock: rows.filter((r) => !r.completed && r.items.length === 0).length,
      outStock: rows.filter((r) => !r.completed && r.outStock > 0).length,
      acres: rows.reduce((s, r) => s + Number(r.landAreaAcres || 0), 0),
    };
  }, [rows]);

  /* ── Charts ── */
  const cropChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.cropName || '—';
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name: name.slice(0, 14), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const stageChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const def = STAGES.find((s) => s.v === r.stage);
      const label = def ? `${def.e} ${def.v}` : (r.stage || 'Likha nahi');
      m.set(label, (m.get(label) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  /** Kaunsa masla sab se zyada aata hai — usi ka maal rakhna chahiye */
  const issueChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const txt = (r.currentIssues || '').toLowerCase();
      if (!txt.trim()) return;
      COMMON_ISSUES.forEach((iss) => {
        /* Mukammal jumla milne ka intezaar nahi karte — do lafz
           kaafi hain, kyunke har koi apne alfaz me likhta hai. */
        const words = iss.toLowerCase().split(' ').filter((w) => w.length > 3);
        if (words.some((w) => txt.includes(w))) {
          m.set(iss, (m.get(iss) ?? 0) + 1);
        }
      });
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name: name.length > 20 ? `${name.slice(0, 19)}…` : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      m.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    rows.forEach((r) => {
      const d = new Date(r.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (m.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].map(([k, v]) => {
      const [y, mo] = k.split('-').map(Number);
      return { name: new Date(y, mo, 1).toLocaleDateString('en-PK', { month: 'short' }), value: v };
    });
  }, [rows]);

  /* ── Follow-up list ── */
  const followText = useMemo(() => {
    const list = rows.filter((r) => r.followDue || r.followSoon)
      .sort((a, b) => (a.toFollow ?? 0) - (b.toFollow ?? 0));
    const lines = list.map((r, i) =>
      `${i + 1}. ${r.cropName}${r.cropVariety ? ` (${r.cropVariety})` : ''} — ${r.advisoryNumber}`
      + (r.toFollow !== null ? ` — ${dayPhrase(r.toFollow)}` : ''));
    return [
      `🌿 *${tenant?.name || 'Agri'}* — jin farmer se baat karni hai`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${list.length} follow-up`,
    ].filter(Boolean).join('\n');
  }, [rows, tenant, shopName]);

  const copyFollow = async () => {
    try {
      await navigator.clipboard.writeText(followText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch { toast.error('Copy nahi ho saki'); }
  };
  const whatsappFollow = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(followText)}`, '_blank');

  /* ── CSV ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Fasal ki raay — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Follow-up due: ${stats.due}  •  Chal rahe: ${stats.pending}`],
      [''],
    ];
    const head = ['Number', 'Fasal', 'Variety', 'Qadam', 'Raqba (acre)', 'Masla',
      'Raay dene wala', 'Bijai', 'Katai (tawaqqo)', 'Follow-up', 'Din', 'Halat',
      'Maal maujood', 'Maal khatam', 'Note'];
    const body = shown.map((r) => [
      r.advisoryNumber, r.cropName, r.cropVariety || '', r.stage || '',
      r.landAreaAcres ?? '', r.currentIssues || '', r.advisorName || '',
      r.sowingDate ? String(r.sowingDate).slice(0, 10) : '',
      r.expectedHarvest ? String(r.expectedHarvest).slice(0, 10) : '',
      r.followUpDate ? String(r.followUpDate).slice(0, 10) : '',
      r.toFollow ?? '',
      r.completed ? 'Poora' : r.followDue ? 'Follow-up due' : 'Chal raha',
      r.inStock, r.outStock, r.notes || '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasal-ki-raay-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${shown.length} mashware CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return setShowForm(false);
        return;
      }
      if (showForm) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setShowForm(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (k === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showForm]);

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌿 {tenant?.name || 'Agri'} — Fasal ki raay</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{shown.length} mashware • {stats.due} follow-up due
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
              <Leaf className="h-3.5 w-3.5 text-lime-300" /> Fasal ki raay
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🌿 Fasal Ki Raay</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.pending}</strong> chal rahe ·{' '}
              <strong className="text-amber-200">{stats.due}</strong> follow-up due
              {stats.acres > 0 && <> · <strong className="text-emerald-300">{Math.round(stats.acres)}</strong> acre</>}
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
              <Plus className="h-4 w-4" /> Nayi raay
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOLLOW-UP DUE ═══ */}
      {(stats.due > 0 || stats.soon > 0) && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              📞 {stats.due > 0 && `${stats.due} farmer se aaj baat karni hai`}
              {stats.due > 0 && stats.soon > 0 && ' · '}
              {stats.soon > 0 && `${stats.soon} agle teen din me`}
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Raay de kar poochna zaroori hai ke faida hua ya nahi. Jo dukaan poochti hai, farmer
              wohin wapas aata hai — aur agla maal bhi wahin se leta hai.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.dueList.map((r: any) => (
                <span key={r.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
                  🌾 {r.cropName}
                  {r.toFollow !== null && <span className="opacity-70"> · {dayPhrase(r.toFollow)}</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={copyFollow}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 hover:border-amber-500 text-amber-800 dark:text-amber-200 text-xs font-black inline-flex items-center gap-1.5 transition">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copy hui' : 'List'}
            </button>
            <button onClick={whatsappFollow}
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Phone} label="Follow-up due" value={stats.due}
          sub={stats.soon > 0 ? `${stats.soon} agle teen din me` : 'Sab waqt par hain'}
          tone="amber" onClick={() => { setTab('list'); setFilter('due'); }} active={filter === 'due'} />
        <Kpi icon={Leaf} label="Chal rahe" value={stats.pending}
          sub={`${stats.completed} poore ho chuke`} tone="emerald"
          onClick={() => { setTab('list'); setFilter('pending'); }} active={filter === 'pending'} />
        <Kpi icon={Layers} label="Kul raqba" value={`${Math.round(stats.acres)} acre`}
          sub={`${stats.total} mashware`} tone="lime" />
        <Kpi icon={AlertTriangle} label="Maal nahi" value={stats.noStock + stats.outStock}
          sub="In fasalon ka maal poora nahi" tone="rose" />
      </section>

      {/* ═══ MAAL KI KAMI ═══ */}
      {(stats.noStock > 0 || stats.outStock > 0) && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <Package className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="flex-1 min-w-[200px] text-[12px] font-bold text-rose-900 dark:text-rose-200">
            {stats.outStock > 0 && (
              <><strong>{stats.outStock}</strong> mashwaron ki fasal ka kuch maal khatam hai. </>
            )}
            {stats.noStock > 0 && (
              <><strong>{stats.noStock}</strong> fasalon ka koi maal hi juda hua nahi — product ke
              andar "kis fasal par chalta hai" bhar dein. </>
            )}
            Mashwara de kar maal na dena mauqa zaya karna hai.
          </p>
          <Link to="/low-stock"
            className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition">
            Kya mangwana hai <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          ['list', 'Mashware', Leaf, shown.length],
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
        <AdvisoryForm onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['agri-advisories-all'] }); }} />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : tab === 'analytics' ? (
        <Analytics stats={stats} cropChart={cropChart} stageChart={stageChart}
          issueChart={issueChart} monthChart={monthChart} rows={rows} />
      ) : (
        <>
          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Fasal, masla, variety, raay dene wala… (/ dabao)"
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
                ['pending', `Chal rahe (${stats.pending})`],
                ['due', `Follow-up due (${stats.due})`],
                ['completed', `Poore (${stats.completed})`],
                ['all', `Sab (${stats.total})`],
              ] as const).map(([v, label]) => (
                <button key={v} onClick={() => setFilter(v as Filter)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    filter === v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{label}</button>
              ))}
              {hasFilters && (
                <button onClick={() => { setSearch(''); setFilter('pending'); }}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}
              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {shown.length} mashware
              </div>
            </div>
          </section>

          {shown.length === 0 ? (
            <Empty hasFilters={hasFilters}
              onClear={() => { setSearch(''); setFilter('pending'); }}
              onNew={() => setShowForm(true)} onGuide={() => setShowTeacher(true)} />
          ) : (
            <section className="grid gap-3">
              {shown.map((a) => (
                <AdvisoryCard key={a.id} a={a}
                  onComplete={() => complete.mutate(a.id)} busy={complete.isPending} />
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
   EK MASHWARE KA CARD
   ═════════════════════════════════════════════════════════════ */
function AdvisoryCard({ a, onComplete, busy }: { a: any; onComplete: () => void; busy: boolean }) {
  const stage = STAGES.find((s) => s.v === a.stage);
  const toHarvest = daysTo(a.expectedHarvest);

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-4 space-y-3 avoid-break transition hover:shadow-lg ${
      a.completed ? 'border-slate-200 dark:border-slate-800 opacity-75'
        : a.followDue ? 'border-amber-300 dark:border-amber-500/50'
        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow shrink-0 ${
            a.completed ? 'bg-gradient-to-br from-slate-400 to-slate-600'
              : a.followDue ? 'bg-gradient-to-br from-amber-500 to-orange-600'
              : 'bg-gradient-to-br from-emerald-500 to-lime-600'
          }`}>
            <Leaf className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-extrabold text-slate-900 dark:text-white">{a.advisoryNumber}</span>
              {a.completed ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Poora
                </span>
              ) : a.followDue ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500 text-white inline-flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5" /> Baat karni hai
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                  Chal raha
                </span>
              )}
              {stage && (
                <span className="px-2 py-0.5 rounded-md bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300 text-[9px] font-extrabold uppercase">
                  {stage.e} {stage.v}
                </span>
              )}
            </div>

            <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              🌾 {a.cropName}
              {a.cropVariety && (
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400"> · {a.cropVariety}</span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-bold flex-wrap">
              {a.landAreaAcres ? (
                <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{a.landAreaAcres} acre</span>
              ) : null}
              {a.advisorName && (
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{a.advisorName}</span>
              )}
              {a.sowingDate && (
                <span className="inline-flex items-center gap-1">
                  <Sprout className="h-3 w-3" />
                  bijai {new Date(a.sowingDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
                </span>
              )}
              {a.expectedHarvest && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  katai {toHarvest !== null ? dayPhrase(toHarvest) : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {!a.completed && a.followUpDate && (
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Follow-up</div>
            <div className={`text-sm font-black tabular-nums ${
              a.followDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {a.toFollow !== null ? dayPhrase(a.toFollow) : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              {new Date(a.followUpDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        )}
      </div>

      {a.currentIssues && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-0.5 inline-flex items-center gap-1">
            <Bug className="h-3 w-3" /> Masla
          </div>
          <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-snug whitespace-pre-wrap">
            {a.currentIssues}
          </p>
        </div>
      )}

      {a.notes && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5 inline-flex items-center gap-1">
            <FlaskConical className="h-3 w-3" /> Jo raay di
          </div>
          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 leading-snug whitespace-pre-wrap">
            {a.notes}
          </p>
        </div>
      )}

      {/* Is fasal ka maal — mashwara dete waqt yehi bechna hai */}
      <div className={`rounded-xl border-2 p-2.5 ${
        a.items.length === 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
          : a.outStock > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
          : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
      }`}>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 inline-flex items-center gap-1">
          <Package className="h-3 w-3" /> Is fasal ka maal
        </div>
        {a.items.length === 0 ? (
          <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 leading-snug">
            Koi cheez <strong>{a.cropName}</strong> se juri nahi. Product ke andar "kis fasal par
            chalta hai" bhar dein — phir mashwara dete waqt yahin nazar aa jayegi.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {a.items.slice(0, 6).map((i: any) => (
              <Link key={i.productId} to={`/agri-products/${i.productId}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold transition hover:underline ${
                  i.isOut ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                }`}>
                {AGRI_KIND_EMOJI[i.kind as AgriKind]} {String(i.productName).slice(0, 18)}
                {i.isOut && ' · khatam'}
              </Link>
            ))}
            {a.items.length > 6 && (
              <span className="text-[10px] font-extrabold text-slate-400 self-center">+{a.items.length - 6}</span>
            )}
          </div>
        )}
      </div>

      {!a.completed && (
        <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 print:hidden">
          <button onClick={onComplete} disabled={busy}
            className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <CheckCircle2 className="h-3.5 w-3.5" /> Poora ho gaya
          </button>
          <Link to="/pos"
            className="h-9 px-3 rounded-lg bg-lime-50 dark:bg-lime-500/15 hover:bg-lime-100 dark:hover:bg-lime-500/25 text-lime-700 dark:text-lime-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
            <Package className="h-3.5 w-3.5" /> POS par jayein
          </Link>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, cropChart, stageChart, issueChart, monthChart, rows }: any) {
  const topCrop = cropChart[0];
  const topIssue = issueChart[0];

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Leaf} label="Kul mashware" value={stats.total}
          sub={`${stats.completed} poore ho chuke`} tone="emerald" />
        <MiniStat icon={Wheat} label="Sab se zyada fasal" value={topCrop?.name ?? '—'}
          sub={topCrop ? `${topCrop.value} mashware` : undefined} tone="lime" />
        <MiniStat icon={Bug} label="Sab se aam masla" value={topIssue?.name ?? '—'}
          sub={topIssue ? `${topIssue.value} dafa aaya` : 'Masle likhe hi nahi'} tone="amber" />
        <MiniStat icon={Layers} label="Kul raqba" value={`${Math.round(stats.acres)} acre`} tone="rose" />
      </section>

      {topIssue && (
        <section className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="font-black text-emerald-900 dark:text-emerald-200">Is se kya faida uthana hai</h3>
          </div>
          <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
            Sab se zyada masla <strong>"{topIssue.name}"</strong> ka aa raha hai
            {topCrop && <> aur sab se zyada fasal <strong>{topCrop.name}</strong> ki hai</>}.
            Yani us masle ki dawa ki maang sab se zyada hai — us ka stock poora rakhein aur
            counter ke saamne rakhein. Jo dukaan masla samajh kar hal deti hai, farmer wahin
            ka ho jata hai.
          </p>
          <Link to="/agri/products"
            className="mt-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <Package className="h-3.5 w-3.5" /> Maal dekhein
          </Link>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Bug} title="Kaunsa masla sab se zyada aata hai" wide>
          {issueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={140} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Kitni dafa']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {issueChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Masle likhe hi nahi gaye — form me masla likhna shuru karein" />}
        </ChartCard>

        <ChartCard icon={Wheat} title="Kis fasal ki raay zyada maangi jati hai">
          {cropChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={40} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Mashware']} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi mashwara nahi" />}
        </ChartCard>

        <ChartCard icon={Sprout} title="Fasal ke kis qadam par">
          {stageChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {stageChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi mashwara nahi" />}
        </ChartCard>

        <ChartCard icon={BarChart3} title="Pichle 6 mahine" wide>
          {monthChart.some((m: any) => m.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={40} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Mashware']} />
                <Bar dataKey="value" fill="#84cc16" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi mashwara nahi" />}
        </ChartCard>
      </div>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Phone className="h-4 w-4 text-amber-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Agla follow-up — tarteeb se</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...rows]
            .filter((r: any) => !r.completed && r.toFollow !== null)
            .sort((a: any, b: any) => (a.toFollow ?? 0) - (b.toFollow ?? 0))
            .slice(0, 8)
            .map((r: any) => (
              <div key={r.id} className="p-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                  🌾
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {r.cropName}{r.cropVariety ? ` · ${r.cropVariety}` : ''}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 truncate">
                    {r.advisoryNumber}{r.currentIssues ? ` · ${String(r.currentIssues).slice(0, 40)}` : ''}
                  </div>
                </div>
                <span className={`text-[11px] font-black tabular-nums shrink-0 px-2 py-1 rounded-lg ${
                  (r.toFollow ?? 0) <= 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {dayPhrase(r.toFollow)}
                </span>
              </div>
            ))}
          {rows.filter((r: any) => !r.completed && r.toFollow !== null).length === 0 && (
            <div className="p-8 text-center text-sm font-bold text-slate-400">
              Kisi mashware par follow-up ki tareekh nahi bhari
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYI RAAY
   ═════════════════════════════════════════════════════════════ */
function AdvisoryForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    farmerId: '', cropName: 'Gandum', cropVariety: '', stage: 'Barhotri',
    landAreaAcres: '', advisorName: '', sowingDate: '', expectedHarvest: '',
    followUpDate: '', currentIssues: '', notes: '',
  });
  const [ownCrop, setOwnCrop] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [farmer, setFarmer] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-advisory', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showPicker,
  });

  /* Follow-up ki tareekh na bhari ho to 10 din ka andaza — ye
     wohi muddat hai jis me spray ya khaad ka asar nazar aata hai. */
  const suggestFollow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setForm({ ...form, followUpDate: d.toISOString().slice(0, 10) });
  };

  const errors: string[] = [];
  if (!form.cropName.trim()) errors.push('Fasal ka naam likhein');
  if (!form.currentIssues.trim() && !form.notes.trim()) {
    errors.push('Masla ya raay — kam az kam ek to likhein');
  }
  const valid = errors.length === 0;

  const save = useMutation({
    mutationFn: () => advisoryApi.create({
      ...form,
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
      sowingDate: form.sowingDate || undefined,
      expectedHarvest: form.expectedHarvest || undefined,
      followUpDate: form.followUpDate || undefined,
      farmerId: form.farmerId || undefined,
    }),
    onSuccess: () => { toast.success('Mashwara likh diya'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi likha gaya'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg overflow-hidden print:hidden">
      <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Leaf className="h-5 w-5" /> Nayi raay
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
          <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Farmer — marzi */}
        {farmer ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-900 dark:text-white truncate">{farmer.fullName}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                {farmer.phone || 'Phone nahi'}
              </div>
            </div>
            <button onClick={() => { setFarmer(null); setForm({ ...form, farmerId: '' }); }}
              className="text-xs font-extrabold text-emerald-600 hover:underline shrink-0">Badlein</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowPicker(!showPicker)}
              className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-extrabold text-slate-600 dark:text-slate-300 hover:border-emerald-400 inline-flex items-center justify-center gap-2 transition">
              <Search className="h-4 w-4" /> Farmer chunein <span className="text-slate-400 font-bold">— marzi</span>
            </button>
            {showPicker && (
              <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5 p-3 space-y-2">
                <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)}
                  placeholder="Naam ya phone se dhoondein…"
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {farmers.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 text-center py-3">Koi farmer nahi mila</p>
                  ) : farmers.map((f: any) => (
                    <button key={f.id}
                      onClick={() => { setFarmer(f); setForm({ ...form, farmerId: f.id }); setShowPicker(false); }}
                      className="w-full px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-left transition">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-extrabold text-slate-900 dark:text-white truncate">{f.fullName}</span>
                        <span className="block text-[10px] font-bold text-slate-500">{f.phone || 'Phone nahi'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Fasal" req>
            {ownCrop ? (
              <input autoFocus value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })}
                placeholder="Fasal ka naam" className={inp} />
            ) : (
              <select value={form.cropName}
                onChange={(e) => {
                  if (e.target.value === '__own') { setOwnCrop(true); setForm({ ...form, cropName: '' }); }
                  else setForm({ ...form, cropName: e.target.value });
                }}
                className={inp}>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__own">✍️ Apna naam likhein…</option>
              </select>
            )}
          </Field>
          <Field label="Variety" opt>
            <input value={form.cropVariety} onChange={(e) => setForm({ ...form, cropVariety: e.target.value })}
              placeholder="Sehar-2006…" className={inp} />
          </Field>
          <Field label="Fasal ka qadam" opt>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className={inp}>
              {STAGES.map((s) => <option key={s.v} value={s.v}>{s.e} {s.v}</option>)}
            </select>
          </Field>
          <Field label="Raqba (acre)" opt>
            <input type="number" step="0.1" min={0} value={form.landAreaAcres}
              onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })}
              placeholder="5" className={`${inp} tabular-nums`} />
          </Field>
        </div>

        {/* Masla */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
            Kya masla hai?
          </label>
          <textarea rows={3} value={form.currentIssues}
            onChange={(e) => setForm({ ...form, currentIssues: e.target.value })}
            placeholder="Patte peele ho rahe hain, sundi lag gayi hai, paani ki kami…"
            className="w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 resize-none transition" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COMMON_ISSUES.map((iss) => (
              <button key={iss} type="button"
                onClick={() => setForm({
                  ...form,
                  currentIssues: form.currentIssues ? `${form.currentIssues}, ${iss}` : iss,
                })}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 transition">
                + {iss}
              </button>
            ))}
          </div>
        </div>

        {/* Raay */}
        <Field label="Kya raay di" opt>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Kaunsi dawa, kitni miqdar, kab chhirakni hai…"
            className={`${inp} h-auto py-2 resize-none`} />
        </Field>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Raay dene wala" opt>
            <input value={form.advisorName} onChange={(e) => setForm({ ...form, advisorName: e.target.value })}
              placeholder="Naam" className={inp} />
          </Field>
          <Field label="Bijai kab hui" opt>
            <input type="date" value={form.sowingDate}
              onChange={(e) => setForm({ ...form, sowingDate: e.target.value })} className={inp} />
          </Field>
          <Field label="Katai kab hogi" opt>
            <input type="date" value={form.expectedHarvest}
              onChange={(e) => setForm({ ...form, expectedHarvest: e.target.value })} className={inp} />
          </Field>
          <Field label="Follow-up kab">
            <input type="date" value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
          </Field>
        </div>

        {!form.followUpDate && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-center gap-3 flex-wrap">
            <Phone className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="flex-1 min-w-[180px] text-[11px] font-bold text-amber-900 dark:text-amber-200">
              Follow-up ki tareekh bhar dein — warna ye mashwara likh kar bhool jayega. Spray ya
              khaad ka asar aam tor par 10 din me nazar aa jata hai.
            </p>
            <button type="button" onClick={suggestFollow}
              className="h-9 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 transition">
              10 din baad rakh do
            </button>
          </div>
        )}

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
            <Save className="h-4 w-4" /> Likh dein
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
      <div className="mt-1.5 text-lg font-black text-slate-900 dark:text-white break-words">{value}</div>
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
        <Leaf className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par kuch nahi mila' : 'Abhi koi mashwara nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
        {hasFilters
          ? 'Chaant badal kar dekhein'
          : 'Jab koi farmer patta le kar aaye ya khet ka masla poochhe, wo yahan likh dein. Phir follow-up bhi yaad rahega aur us fasal ka maal bhi saamne rahega.'}
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
              <Plus className="h-4 w-4" /> Pehli raay likhein
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
            <GraduationCap className="h-5 w-5" /> Raay se bikri kaise banti hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Farmer sirf maal nahi khareedta — <strong>bharosa</strong> khareedta hai. Jo dukaan
              sahi mashwara deti hai, wohi us ka saara season ka maal bechti hai.
            </p>
          </div>
          <Tip icon={Phone} title="Follow-up — sab se ahem">
            Raay de kar bhool jana bekaar hai. 10 din baad poochein ke faida hua ya nahi. Jis
            din follow-up ki tareekh aati hai, wo mashwara sab se ooper aa jata hai, aur us ki
            list WhatsApp par bhej sakte hain.
          </Tip>
          <Tip icon={Package} title="Mashwara aur maal ek sath">
            Har card par us fasal ka maal dikhta hai. Ye jor product ke andar wale{' '}
            <strong>"kis fasal par chalta hai"</strong> se banta hai. Mashwara dete waqt hi pata
            chal jata hai ke kya bech sakte hain, aur kya khatam ho chuka hai.
          </Tip>
          <Tip icon={Bug} title="Masla zaroor likhein">
            Masla likhne se Analytics bata deti hai ke ilaqe me sab se zyada kaunsi beemari aa
            rahi hai. Usi ki dawa ka stock pehle se rakh lein — jab rush aayega to aap tayyar honge.
          </Tip>
          <Tip icon={Sprout} title="Fasal ka qadam">
            Bijai, barhotri, phool, phal — har qadam par alag cheez chahiye hoti hai. Qadam likha
            ho to agli dafa foran yaad aa jata hai ke ab kya lagana hai.
          </Tip>
          <Tip icon={Calendar} title="Katai ki tareekh">
            Katai kab hogi, ye likh lein. Usi ke baad farmer ke paas paisa aata hai — udhaar
            maangne ka sab se sahi waqt.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> nayi raay</div>
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
