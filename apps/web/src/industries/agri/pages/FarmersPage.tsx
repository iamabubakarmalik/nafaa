import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Save, Edit3, Trash2, RefreshCw, User, Phone,
  MapPin, DollarSign, TrendingUp, AlertTriangle, Award, Tractor,
  FileText, CheckCircle2, Ban, Play, Link2 as LinkIcon, Wallet,
  GraduationCap, FileSpreadsheet, Printer, BarChart3, MessageCircle,
  Copy, Clock, Sprout, Layers, Wheat, ArrowRight, Calendar, IdCard,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   FARMER — JAHAN DUKAAN KA SARMAYA PARA HOTA HAI
   ─────────────────────────────────────────────────────────────
   Agri dukaan ka aadha paisa hamesha bahar hota hai. Farmer bijai
   ke waqt maal le jata hai aur katai ke baad deta hai — do se teen
   mahine baad. Ye karobar ka tareeqa hai, masla nahi.

   Masla ye hai ke us paise ka hisab kahin nahi hota. Dukaan-daar
   ko yaad hota hai ke "fulan ne lia tha", magar kitna, kab, aur
   kitne din ho gaye — ye kisi ko nahi pata. Season aata hai, naya
   maal mangwana hota hai, aur cash nahi hota.

   Is liye ye safha teen sawal ka jawab deta hai:

     1. KITNA PAISA BAHAR HAI — kul, aur kis farmer ke paas.
     2. KIS KA WAQT GUZAR GAYA — har farmer ka apna credit days
        hota hai (60 din aam hai). Us se ooper jaye to wo alag
        patti me aa jata hai, purana sab se pehle.
     3. HADD SE OOPER KAUN — jis ka udhaar us ki limit chhu gaya,
        us ko aur maal dena nuqsaan ka sauda hai.

   Aur ek chhoti magar ahem cheez: farmer ka khata (Customer) jura
   hua hai ya nahi. Na jura ho to POS par us ki bikri aur udhaar
   kahin darj hi nahi hota.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'udhaar' | 'analytics';
type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type CreditFilter = 'all' | 'owing' | 'overdue' | 'overlimit' | 'clear';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK', 'ICT'];
const FARMING_TYPES = ['Fasal', 'Mawayshi', 'Murghi', 'Dairy', 'Machhli', 'Baghbani', 'Milla jula'];
const COMMON_CROPS = ['Gandum', 'Chawal', 'Kapas', 'Ganna', 'Makai', 'Aloo', 'Tamatar', 'Pyaz', 'Mirch', 'Dalein', 'Chara', 'Chana', 'Sarson'];
const SOIL_TYPES = ['Maira (loamy)', 'Chikni (clay)', 'Reti (sandy)', 'Silt', 'Kallar (saline)', 'Chuna wali', 'Peaty'];
const WATER_SOURCES = ['Nehar', 'Tube well', 'Bore', 'Barish', 'Darya', 'Drip', 'Sprinkler'];

const GRID = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const dayMs = 86_400_000;

/** Aakhri kharidari ko kitne din ho gaye */
function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / dayMs);
}

export default function FarmersPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideAmounts = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [districtFilter, setDistrictFilter] = useState('');
  const [creditFilter, setCreditFilter] = useState<CreditFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Farmer | null>(null);
  const [suspendFor, setSuspendFor] = useState<any>(null);
  const [removeFor, setRemoveFor] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Saare farmer ek baar — chaant client par, taake har patti ka
     counter poora rahe chahe filter koi bhi ho. */
  const farmersQ = useQuery({
    queryKey: ['agri-farmers-all'],
    queryFn: () => farmersApi.list({}),
  });
  const summaryQ = useQuery({
    queryKey: ['farmers-summary'],
    queryFn: () => farmersApi.summary().catch(() => null),
  });

  const isLoading = farmersQ.isLoading;
  const isRefetching = farmersQ.isRefetching || summaryQ.isRefetching;
  const refetchAll = () => { farmersQ.refetch(); summaryQ.refetch(); };
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['agri-farmers-all'] });
    qc.invalidateQueries({ queryKey: ['farmers-summary'] });
    qc.invalidateQueries({ queryKey: ['customers'] });
  };

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => farmersApi.suspend(id, reason),
    onSuccess: () => { toast.success('Farmer band kar diya'); setSuspendFor(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  const reactivateMut = useMutation({
    mutationFn: (id: string) => farmersApi.reactivate(id),
    onSuccess: () => { toast.success('Farmer dobara chalu'); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => farmersApi.remove(id),
    onSuccess: () => { toast.success('Farmer hata diya'); setRemoveFor(null); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  const linkMut = useMutation({
    mutationFn: (id: string) => farmersApi.linkCustomer(id),
    onSuccess: (f: any) => { toast.success(`${f.fullName} ka khata jur gaya`); invalidateAll(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Khata nahi jura'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const list = (farmersQ.data ?? []) as any[];
    return list.map((f) => {
      const owed = Number(f.currentBalance || 0) || Number(f.totalOutstanding || 0);
      const limit = Number(f.creditLimit || 0);
      const days = Number(f.creditDays || 60);
      const since = daysSince(f.lastPurchaseAt);
      /* Har farmer ka apna credit days hota hai — 60 din aam hai,
         magar purane gahak ko 90 bhi milte hain. Isi se naapte hain. */
      const overdueBy = owed > 0 && since !== null ? since - days : null;
      return {
        ...f,
        owed, limit, creditDays: days, since,
        overdueBy,
        overdue: owed > 0 && overdueBy !== null && overdueBy > 0,
        overLimit: limit > 0 && owed >= limit,
        usedPct: limit > 0 ? (owed / limit) * 100 : 0,
        unlinked: !f.customerId,
      };
    });
  }, [farmersQ.data]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.district) set.add(r.district); });
    return [...set].sort();
  }, [rows]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = rows;
    if (statusFilter !== 'all') out = out.filter((r) => r.status === statusFilter);
    if (districtFilter) out = out.filter((r) => r.district === districtFilter);
    if (creditFilter === 'owing') out = out.filter((r) => r.owed > 0);
    if (creditFilter === 'overdue') out = out.filter((r) => r.overdue);
    if (creditFilter === 'overlimit') out = out.filter((r) => r.overLimit);
    if (creditFilter === 'clear') out = out.filter((r) => r.owed <= 0);
    if (q) out = out.filter((r) =>
      (r.fullName ?? '').toLowerCase().includes(q)
      || (r.farmerNumber ?? '').toLowerCase().includes(q)
      || (r.phone ?? '').includes(q)
      || (r.cnic ?? '').includes(q)
      || (r.village ?? '').toLowerCase().includes(q)
      || (r.district ?? '').toLowerCase().includes(q)
      || (r.primaryCrops ?? []).some((c: string) => c.toLowerCase().includes(q)));
    /* Jis ka waqt guzar gaya wo sab se ooper, phir hadd walay */
    return [...out].sort((a, b) => {
      const rank = (r: any) => (r.overdue ? 0 : r.overLimit ? 1 : r.owed > 0 ? 2 : 3);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return b.owed - a.owed;
    });
  }, [rows, statusFilter, districtFilter, creditFilter, q]);

  const unlinked = useMemo(() => rows.filter((r) => r.unlinked), [rows]);

  /* Udhaar wali list — purana sab se pehle */
  const udhaarList = useMemo(
    () => rows.filter((r) => r.owed > 0)
      .sort((a, b) => (b.overdueBy ?? -9999) - (a.overdueBy ?? -9999)),
    [rows],
  );

  /* ── Stats ── */
  const stats = useMemo(() => {
    const owing = rows.filter((r) => r.owed > 0);
    const overdue = rows.filter((r) => r.overdue);
    const overLimit = rows.filter((r) => r.overLimit);
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === 'ACTIVE').length,
      suspended: rows.filter((r) => r.status === 'SUSPENDED').length,
      /** Kul paisa jo farmer ke paas hai — is safhe ka asal number */
      owed: owing.reduce((s, r) => s + r.owed, 0),
      owingCount: owing.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, r) => s + r.owed, 0),
      overdueList: overdue.slice(0, 6),
      overLimitCount: overLimit.length,
      overLimitAmount: overLimit.reduce((s, r) => s + r.owed, 0),
      limit: rows.reduce((s, r) => s + r.limit, 0),
      purchases: rows.reduce((s, r) => s + Number(r.totalPurchases || 0), 0),
      acres: rows.reduce((s, r) => s + Number(r.landAreaAcres || 0), 0),
      unlinked: rows.filter((r) => r.unlinked).length,
      noPhone: rows.filter((r) => !r.phone).length,
      noCnic: rows.filter((r) => !r.cnic).length,
    };
  }, [rows]);

  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));

  /* ── Charts ── */
  const districtChart = useMemo(() => {
    const m = new Map<string, { n: number; owed: number }>();
    rows.forEach((r) => {
      const k = r.district || 'Likha nahi';
      const e = m.get(k) ?? { n: 0, owed: 0 };
      e.n += 1; e.owed += r.owed;
      m.set(k, e);
    });
    return [...m.entries()]
      .map(([name, v]) => ({ name: name.slice(0, 14), farmer: v.n, udhaar: Math.round(v.owed) }))
      .sort((a, b) => b.farmer - a.farmer).slice(0, 8);
  }, [rows]);

  const cropChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => (r.primaryCrops ?? []).forEach((c: string) => m.set(c, (m.get(c) ?? 0) + 1)));
    return [...m.entries()].map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [rows]);

  const creditPie = useMemo(() => ([
    { name: 'Saaf khata', value: rows.filter((r) => r.owed <= 0).length, color: '#10b981' },
    { name: 'Udhaar hai', value: rows.filter((r) => r.owed > 0 && !r.overdue && !r.overLimit).length, color: '#84cc16' },
    { name: 'Waqt guzar gaya', value: stats.overdueCount, color: '#f59e0b' },
    { name: 'Hadd se ooper', value: stats.overLimitCount, color: '#ef4444' },
  ].filter((x) => x.value > 0)), [rows, stats]);

  /** Udhaar kitna purana — paisa kitne arse se atka hai */
  const ageChart = useMemo(() => {
    const b = [
      { name: 'Waqt baqi', value: 0 },
      { name: '1 mahina late', value: 0 },
      { name: '1–3 mahine late', value: 0 },
      { name: '3 mahine se zyada', value: 0 },
    ];
    rows.filter((r) => r.owed > 0).forEach((r) => {
      const d = r.overdueBy;
      if (d === null || d <= 0) b[0].value += r.owed;
      else if (d <= 30) b[1].value += r.owed;
      else if (d <= 90) b[2].value += r.owed;
      else b[3].value += r.owed;
    });
    return b.map((x) => ({ ...x, value: Math.round(x.value) })).filter((x) => x.value > 0);
  }, [rows]);

  /* ── Wusooli ki list ── */
  const chaseText = useMemo(() => {
    const list = udhaarList.filter((r) => r.overdue);
    const lines = list.map((r, i) =>
      `${i + 1}. ${r.fullName}${r.phone ? ` (${r.phone})` : ''}${r.village ? ` — ${r.village}` : ''}`
      + ` — ${formatPKR(r.owed)}`
      + (r.overdueBy !== null ? ` — ${r.overdueBy} din late` : ''));
    return [
      `💰 *${tenant?.name || 'Agri'}* — jin se paisa lena hai`,
      shopName ? `📍 ${shopName}` : '',
      `📅 ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
      '',
      ...lines,
      '',
      `Kul ${list.length} farmer • ${formatPKR(stats.overdueAmount)}`,
    ].filter(Boolean).join('\n');
  }, [udhaarList, tenant, shopName, stats.overdueAmount]);

  const copyChase = async () => {
    try {
      await navigator.clipboard.writeText(chaseText);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success('List copy ho gayi');
    } catch { toast.error('Copy nahi ho saki'); }
  };
  const whatsappChase = () => window.open(`https://wa.me/?text=${encodeURIComponent(chaseText)}`, '_blank');

  /** Ek farmer ko yaad-dehani — us ke apne number par */
  const reminderLink = (r: any) => {
    const msg = [
      `Assalam-o-alaikum ${r.fullName},`,
      '',
      `${tenant?.name || 'Hamari dukaan'} se aap ka baqi ${formatPKR(r.owed)} hai`
      + (r.overdueBy && r.overdueBy > 0 ? ` (${r.overdueBy} din ho gaye).` : '.'),
      '',
      'Jab sahulat ho bhej dein. Shukriya.',
    ].join('\n');
    return `https://wa.me/${(r.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const linkAll = async () => {
    if (unlinked.length === 0) return;
    const res = await Promise.allSettled(unlinked.map((f) => farmersApi.linkCustomer(f.id)));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    if (ok) toast.success(`${ok} farmer ka khata jur gaya`);
    if (res.length - ok) toast.error(`${res.length - ok} nahi jure`);
    invalidateAll();
  };

  /* ── CSV ── */
  const exportCsv = () => {
    if (filtered.length === 0) return toast.error('Koi farmer nahi');
    const head = [
      [`Farmer — ${tenant?.name || 'Nafaa'}`],
      [`Dukaan: ${shopName || 'Sab'}  •  Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [`Kul farmer: ${stats.total}  •  Bahar para paisa: ${stats.owed.toFixed(2)}  •  Waqt guzra: ${stats.overdueCount}`],
      [''],
    ];
    const cols = ['Farmer #', 'Naam', 'Walid', 'Phone', 'CNIC', 'Gaon', 'Tehsil', 'Zila', 'Soobha',
      'Raqba (acre)', 'Fasal', 'Udhaar', 'Hadd', 'Credit din', 'Aakhri kharidari',
      'Din guzre', 'Late din', 'Kul kharidari', 'Halat', 'Khata jura'];
    const body = filtered.map((r) => [
      r.farmerNumber, r.fullName, r.fatherName ?? '', r.phone ?? '', r.cnic ?? '',
      r.village ?? '', r.tehsil ?? '', r.district ?? '', r.province ?? '',
      r.landAreaAcres ?? '', (r.primaryCrops ?? []).join(' / '),
      Math.round(r.owed), Math.round(r.limit), r.creditDays,
      r.lastPurchaseAt ? String(r.lastPurchaseAt).slice(0, 10) : '',
      r.since ?? '', r.overdueBy !== null && r.overdueBy > 0 ? r.overdueBy : '',
      Math.round(Number(r.totalPurchases || 0)), r.status,
      r.unlinked ? 'Nahi' : 'Haan',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...head, cols, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filtered.length} farmer CSV me`);
  };

  const doPrint = () => window.print();

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (suspendFor) return setSuspendFor(null);
        if (removeFor) return setRemoveFor(null);
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return setShowForm(false);
        return;
      }
      if (showForm || suspendFor || removeFor) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setEditing(null); setShowForm(true); }
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') doPrint();
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('udhaar');
      if (e.key === '3') setTab('analytics');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showForm, suspendFor, removeFor]);

  const hasFilters = !!search || statusFilter !== 'all' || !!districtFilter || creditFilter !== 'all';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setDistrictFilter(''); setCreditFilter('all'); };
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showForm && (
        <FarmerForm editing={editing} onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); invalidateAll(); }} />
      )}
      {suspendFor && (
        <SuspendModal farmer={suspendFor} onClose={() => setSuspendFor(null)}
          onConfirm={(reason: string) => suspendMut.mutate({ id: suspendFor.id, reason })}
          saving={suspendMut.isPending} />
      )}
      {removeFor && (
        <RemoveModal farmer={removeFor} onClose={() => setRemoveFor(null)}
          onConfirm={() => removeMut.mutate(removeFor.id)} saving={removeMut.isPending} />
      )}
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🚜 {tenant?.name || 'Agri'} — Farmer</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{filtered.length} farmer •
              Bahar para paisa {formatPKR(stats.owed)} • {stats.overdueCount} ka waqt guzra
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Tractor className="h-3.5 w-3.5 text-lime-300" /> Farmer
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🚜 Farmer aur Khata</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-lime-200">{stats.total}</strong> farmer ·{' '}
              bahar para paisa <strong className="text-amber-200">{money(stats.owed)}</strong>
              {stats.overdueCount > 0 && <> · <span className="text-rose-200">{stats.overdueCount} ka waqt guzar gaya</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
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
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Naya farmer
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KHATA JURA HUA NAHI ═══ */}
      {unlinked.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <LinkIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
              🔗 {unlinked.length} farmer ka khata jura hua nahi
            </h3>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Farmer aur us ka khata (Customer) do alag cheezein hain. Jab tak ye jure na hon, POS
              par us farmer ki bikri aur <strong>udhaar kahin darj nahi hota</strong> — aur yahan
              udhaar hamesha 0 dikhta hai. Ek click me sab jur jayenge.
            </p>
          </div>
          <button onClick={linkAll}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition active:scale-[0.97]">
            <LinkIcon className="h-3.5 w-3.5" /> Sab jor dein
          </button>
        </section>
      )}

      {/* ═══ WAQT GUZAR GAYA ═══ */}
      {stats.overdueCount > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-3 flex-wrap print:hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
              ⏳ {stats.overdueCount} farmer ka udhaar ka waqt guzar chuka — {money(stats.overdueAmount)}
            </h3>
            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
              Har farmer ka apna credit days hota hai. Ye wo hain jin ka wo waqt nikal gaya.
              Katai ke baad farmer ke paas paisa aata hai — wohi maangne ka sab se sahi waqt hai.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.overdueList.map((r: any) => (
                <span key={r.id}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 text-[11px] font-extrabold text-rose-900 dark:text-rose-200">
                  {r.fullName} <span className="text-rose-600">({money(r.owed)} · {r.overdueBy}d)</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={copyChase}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-500/40 hover:border-rose-500 text-rose-800 dark:text-rose-200 text-xs font-black inline-flex items-center gap-1.5 transition">
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
        <Kpi icon={Wallet} label="Bahar para paisa" value={money(stats.owed)}
          sub={stats.owingCount > 0 ? `${stats.owingCount} farmer ke paas` : 'Sab khatay saaf'}
          tone="amber" onClick={() => { setTab('udhaar'); }} active={tab === 'udhaar'} />
        <Kpi icon={Clock} label="Waqt guzar gaya" value={stats.overdueCount}
          sub={stats.overdueAmount > 0 ? money(stats.overdueAmount) : 'Koi late nahi'}
          tone="rose" onClick={() => { setTab('list'); setCreditFilter('overdue'); }}
          active={creditFilter === 'overdue'} />
        <Kpi icon={AlertTriangle} label="Hadd se ooper" value={stats.overLimitCount}
          sub={stats.overLimitCount > 0 ? 'Aur udhaar na dein' : 'Sab hadd me hain'}
          tone="lime" onClick={() => { setTab('list'); setCreditFilter('overlimit'); }}
          active={creditFilter === 'overlimit'} />
        <Kpi icon={Users} label="Kul farmer" value={stats.total}
          sub={`${stats.active} chalu · ${Math.round(stats.acres)} acre`} tone="emerald"
          onClick={() => { setTab('list'); clearFilters(); }} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([
          ['list', 'Farmer', Users, filtered.length, '1'],
          ['udhaar', 'Udhaar', Wallet, udhaarList.length, '2'],
          ['analytics', 'Analytics', BarChart3, undefined, '3'],
        ] as const).map(([id, label, Icon, count, key]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === id
                ? 'bg-gradient-to-r from-emerald-600 to-lime-700 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
            }`}>
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            {count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-lg tabular-nums ${
                tab === id ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
              }`}>{count}</span>
            )}
            <kbd className="hidden sm:inline text-[9px] opacity-60">{key}</kbd>
          </button>
        ))}
      </div>

      {tab === 'analytics' ? (
        <Analytics stats={stats} money={money} hideAmounts={hideAmounts}
          districtChart={districtChart} cropChart={cropChart} creditPie={creditPie}
          ageChart={ageChart} rows={rows} />
      ) : tab === 'udhaar' ? (
        <UdhaarTab rows={udhaarList} money={money} reminderLink={reminderLink}
          onCopy={copyChase} onWhatsapp={whatsappChase} copied={copied} />
      ) : (
        <>
          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, phone, CNIC, gaon, zila, fasal… (/ dabao)"
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
                ['owing', `Udhaar hai (${stats.owingCount})`],
                ['overdue', `Waqt guzra (${stats.overdueCount})`],
                ['overlimit', `Hadd se ooper (${stats.overLimitCount})`],
                ['clear', `Khata saaf (${stats.total - stats.owingCount})`],
              ] as const).map(([v, label]) => (
                <button key={v} onClick={() => setCreditFilter(v as CreditFilter)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black transition ${
                    creditFilter === v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{label}</button>
              ))}

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition">
                <option value="all">Har halat</option>
                <option value="ACTIVE">Chalu</option>
                <option value="SUSPENDED">Band</option>
              </select>

              {districts.length > 0 && (
                <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}
                  className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition">
                  <option value="">Har zila</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}

              {hasFilters && (
                <button onClick={clearFilters}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}
              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {filtered.length} farmer
              </div>
            </div>
          </section>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Empty hasFilters={hasFilters} onClear={clearFilters}
              onNew={() => { setEditing(null); setShowForm(true); }} onGuide={() => setShowTeacher(true)} />
          ) : (
            <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((f) => (
                <FarmerCard key={f.id} f={f} money={money}
                  onEdit={() => { setEditing(f); setShowForm(true); }}
                  onSuspend={() => setSuspendFor(f)}
                  onReactivate={() => reactivateMut.mutate(f.id)}
                  onRemove={() => setRemoveFor(f)}
                  onLink={() => linkMut.mutate(f.id)}
                  linking={linkMut.isPending}
                  reminderHref={reminderLink(f)} />
              ))}
            </section>
          )}
        </>
      )}

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
   FARMER KA CARD
   ═════════════════════════════════════════════════════════════ */
function FarmerCard({ f, money, onEdit, onSuspend, onReactivate, onRemove, onLink, linking, reminderHref }: any) {
  const suspended = f.status === 'SUSPENDED';

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm hover:shadow-lg transition p-4 space-y-3 avoid-break ${
      suspended ? 'border-rose-300 dark:border-rose-500/50 opacity-80'
        : f.overdue ? 'border-rose-300 dark:border-rose-500/50'
        : f.overLimit ? 'border-amber-300 dark:border-amber-500/50'
        : 'border-emerald-200 dark:border-emerald-500/30'
    }`}>
      <div className="flex items-start gap-3">
        {f.photoUrl ? (
          <img src={f.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-600 text-white flex items-center justify-center text-xl font-black shrink-0">
            {f.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white truncate">{f.fullName}</span>
            {suspended && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">Band</span>
            )}
            {f.overdue && !suspended && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                {f.overdueBy}d late
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] font-black text-emerald-700 dark:text-emerald-400">{f.farmerNumber}</div>
          <div className="mt-1 space-y-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {f.phone && (
              <a href={`tel:${f.phone}`} className="flex items-center gap-1 hover:text-emerald-600 transition">
                <Phone className="h-3 w-3 shrink-0" /> {f.phone}
              </a>
            )}
            {(f.village || f.district) && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {[f.village, f.tehsil, f.district].filter(Boolean).join(', ')}
              </div>
            )}
            {f.landAreaAcres ? (
              <div className="flex items-center gap-1">
                <Layers className="h-3 w-3 shrink-0" /> {f.landAreaAcres} acre
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {(f.primaryCrops ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(f.primaryCrops as string[]).slice(0, 4).map((c) => (
            <span key={c} className="px-1.5 py-0.5 rounded-md bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300 text-[10px] font-extrabold">
              🌾 {c}
            </span>
          ))}
          {f.primaryCrops.length > 4 && (
            <span className="text-[10px] font-extrabold text-slate-400 self-center">+{f.primaryCrops.length - 4}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2">
        <div className="text-center">
          <div className="text-[9px] uppercase font-black tracking-widest text-slate-500">Orders</div>
          <div className="font-black text-slate-900 dark:text-white tabular-nums text-sm">{f.totalOrders ?? 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-black tracking-widest text-emerald-700 dark:text-emerald-400">Kharidari</div>
          <div className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums text-[11px] truncate">
            {money(Number(f.totalPurchases || 0))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-black tracking-widest text-amber-700 dark:text-amber-400">Udhaar</div>
          <div className={`font-black tabular-nums text-[11px] truncate ${
            f.owed > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'
          }`}>{money(f.owed)}</div>
        </div>
      </div>

      {/* Udhaar ki hadd — bar se foran pata chalta hai ke aur de sakte hain ya nahi */}
      {f.limit > 0 && (
        <div>
          <div className="flex items-center justify-between text-[10px] font-black mb-1">
            <span className="text-slate-600 dark:text-slate-400">Udhaar ki hadd</span>
            <span className={f.usedPct > 80 ? 'text-rose-700 dark:text-rose-400' : f.usedPct > 50 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
              {money(f.owed)} / {money(f.limit)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={
              f.usedPct > 80 ? 'h-full bg-gradient-to-r from-rose-500 to-red-600'
                : f.usedPct > 50 ? 'h-full bg-gradient-to-r from-amber-500 to-orange-600'
                : 'h-full bg-gradient-to-r from-emerald-500 to-green-600'
            } style={{ width: `${Math.min(f.usedPct, 100)}%` }} />
          </div>
          {f.overLimit && (
            <p className="mt-1 text-[10px] font-black text-rose-600 dark:text-rose-400">
              Hadd poori ho chuki — aur udhaar na dein
            </p>
          )}
        </div>
      )}

      {f.owed > 0 && f.since !== null && (
        <div className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold ${
          f.overdue ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}>
          <Clock className="h-3 w-3 inline" />{' '}
          {f.overdue
            ? `${f.overdueBy} din late — ${f.creditDays} din ka waada tha`
            : `${f.since} din hue · ${f.creditDays - f.since} din baqi`}
        </div>
      )}

      {/* Khata jura hua nahi — sab se ahem warning */}
      {f.unlinked && (
        <button onClick={onLink} disabled={linking}
          className="w-full h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 disabled:opacity-50 text-amber-800 dark:text-amber-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
          <LinkIcon className="h-3.5 w-3.5" /> Khata jorein — warna udhaar darj nahi hoga
        </button>
      )}

      <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 print:hidden">
        <Link to={`/agri/farmers/${f.id}`}
          className="flex-1 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 transition">
          <FileText className="h-3.5 w-3.5" /> Khata
        </Link>
        {f.owed > 0 && f.phone && (
          <a href={reminderHref} target="_blank" rel="noreferrer" title="Yaad-dehani"
            className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition">
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={onEdit} title="Edit"
          className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        {f.status === 'ACTIVE' ? (
          <button onClick={onSuspend} title="Band karein"
            className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center transition">
            <Ban className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button onClick={onReactivate} title="Dobara chalu"
            className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition">
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onRemove} title="Hatayein"
          className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {f.suspensionReason && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2 text-[11px] font-bold text-rose-800 dark:text-rose-300">
          ❌ {f.suspensionReason}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   UDHAAR TAB — sab se purana sab se ooper
   ─────────────────────────────────────────────────────────────
   Yehi wo list hai jo dukaan-daar katai ke dinon me haath me le
   kar nikalta hai. Is liye chhoti, saaf, aur har line par phone
   ka button.
   ═════════════════════════════════════════════════════════════ */
function UdhaarTab({ rows, money, reminderLink, onCopy, onWhatsapp, copied }: any) {
  if (rows.length === 0) {
    return (
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-14 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Kisi ka udhaar baqi nahi</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
          Saare khatay saaf hain. Ye agri dukaan me bohat kam hota hai — achhi baat hai.
        </p>
      </section>
    );
  }

  const total = rows.reduce((s: number, r: any) => s + r.owed, 0);
  const late = rows.filter((r: any) => r.overdue);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-center gap-3 flex-wrap print:hidden">
        <Wallet className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 tabular-nums">{money(total)}</div>
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
            {rows.length} farmer ke paas · {late.length} ka waqt guzar chuka
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onCopy}
            className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-500/40 hover:border-amber-500 text-amber-800 dark:text-amber-200 text-xs font-black inline-flex items-center gap-1.5 transition">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copy hui' : 'List copy'}
          </button>
          <button onClick={onWhatsapp}
            className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
              <tr>
                <Th>Farmer</Th>
                <Th>Gaon</Th>
                <Th className="text-right">Udhaar</Th>
                <Th className="text-right">Hadd</Th>
                <Th className="text-center">Waqt</Th>
                <Th className="text-right print:hidden">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r: any) => (
                <tr key={r.id} className={`transition avoid-break ${
                  r.overdue ? 'bg-rose-50/60 dark:bg-rose-500/5' : 'hover:bg-amber-50/40 dark:hover:bg-amber-500/5'
                }`}>
                  <td className="px-3 py-2.5">
                    <Link to={`/agri/farmers/${r.id}`} className="group flex items-center gap-2.5">
                      <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        {r.fullName?.charAt(0).toUpperCase() || '?'}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600">
                          {r.fullName}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-400 truncate">
                          {r.farmerNumber}{r.phone ? ` · ${r.phone}` : ''}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {[r.village, r.district].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-amber-700 dark:text-amber-400 tabular-nums">
                    {money(r.owed)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">
                    {r.limit > 0 ? (
                      <span className={r.overLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}>
                        {money(r.limit)}
                      </span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.overdue ? <Pill tone="rose">{r.overdueBy} din late</Pill>
                      : r.since !== null ? <Pill tone="emerald">{Math.max(r.creditDays - r.since, 0)} din baqi</Pill>
                      : <Pill tone="slate">—</Pill>}
                  </td>
                  <td className="px-3 py-2.5 print:hidden">
                    <div className="flex items-center justify-end gap-1">
                      {r.phone && (
                        <>
                          <a href={`tel:${r.phone}`} title="Call"
                            className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 flex items-center justify-center transition">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a href={reminderLink(r)} target="_blank" rel="noreferrer" title="WhatsApp yaad-dehani"
                            className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-500/15 hover:bg-green-100 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </>
                      )}
                      <Link to={`/agri/farmers/${r.id}`} title="Khata"
                        className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition">
                        <FileText className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, money, hideAmounts, districtChart, cropChart, creditPie, ageChart, rows }: any) {
  const topOwing = useMemo(
    () => [...rows].filter((r: any) => r.owed > 0).sort((a: any, b: any) => b.owed - a.owed).slice(0, 6),
    [rows],
  );
  const topBuyers = useMemo(
    () => [...rows].sort((a: any, b: any) => Number(b.totalPurchases || 0) - Number(a.totalPurchases || 0)).slice(0, 6),
    [rows],
  );

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Wallet} label="Bahar para paisa" value={money(stats.owed)}
          sub={`${stats.owingCount} farmer ke paas`} tone="amber" />
        <MiniStat icon={TrendingUp} label="Kul kharidari" value={money(stats.purchases)}
          sub={`${stats.total} farmer`} tone="emerald" />
        <MiniStat icon={Layers} label="Kul raqba" value={`${Math.round(stats.acres)} acre`}
          sub={stats.total > 0 ? `aam ${(stats.acres / stats.total).toFixed(1)} acre` : undefined} tone="lime" />
        <MiniStat icon={AlertTriangle} label="Hadd se ooper" value={stats.overLimitCount}
          sub={stats.overLimitAmount > 0 ? money(stats.overLimitAmount) : 'Koi nahi'} tone="rose" />
      </section>

      {(stats.unlinked > 0 || stats.noPhone > 0 || stats.noCnic > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {stats.unlinked > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.unlinked}</strong> farmer ka khata jura hua nahi — un ki bikri aur
              udhaar POS par darj hi nahi ho raha.
            </p>
          )}
          {stats.noPhone > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noPhone}</strong> ka phone nahi likha — yaad-dehani nahi bhej sakte.
            </p>
          )}
          {stats.noCnic > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noCnic}</strong> ka CNIC nahi — sarkari subsidy ka claim nahi banega.
            </p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Wallet} title="Udhaar kitna purana hai" wide>
          {hideAmounts ? <EmptyBox text="🔒 Raqam chhupi hai — PIN se kholein" />
            : ageChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                  <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Udhaar']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {ageChart.map((_: any, i: number) => (
                      <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox text="Kisi ka udhaar baqi nahi" />}
        </ChartCard>

        <ChartCard icon={Users} title="Khaton ki halat">
          {creditPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={creditPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {creditPie.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Abhi koi farmer nahi" />}
        </ChartCard>

        <ChartCard icon={MapPin} title="Kis zila me kitne farmer">
          {districtChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={95} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [n === 'farmer' ? v : formatPKR(Number(v)), n === 'farmer' ? 'Farmer' : 'Udhaar']} />
                <Bar dataKey="farmer" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Zila likha hi nahi gaya" />}
        </ChartCard>

        <ChartCard icon={Wheat} title="Kaun si fasal sab se zyada">
          {cropChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cropChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {cropChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Fasal likhi hi nahi gayi" />}
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ListCard icon={Wallet} title="Sab se zyada udhaar kis par" rows={topOwing.map((r: any) => ({
          key: r.id, to: `/agri/farmers/${r.id}`,
          title: r.fullName,
          sub: `${[r.village, r.district].filter(Boolean).join(', ') || 'Gaon nahi'}${r.overdue ? ` · ${r.overdueBy} din late` : ''}`,
          value: money(r.owed),
        }))} emptyText="Kisi ka udhaar baqi nahi" />

        <ListCard icon={Award} title="Sab se bare farmer" rows={topBuyers.map((r: any) => ({
          key: r.id, to: `/agri/farmers/${r.id}`,
          title: r.fullName,
          sub: `${r.totalOrders ?? 0} order${r.landAreaAcres ? ` · ${r.landAreaAcres} acre` : ''}`,
          value: money(Number(r.totalPurchases || 0)),
        }))} emptyText="Abhi koi kharidari nahi" />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BAND KARNA / HATANA
   ═════════════════════════════════════════════════════════════ */
const SUSPEND_REASONS = [
  'Udhaar bohat purana ho gaya',
  'Phone band hai, rabta nahi',
  'Gaon chhor gaya',
  'Jhoot bola / bharosa toot gaya',
];

function SuspendModal({ farmer, onClose, onConfirm, saving }: any) {
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
        <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Ban className="h-3 w-3" /> Farmer band karein
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{farmer.fullName}</h3>
            {farmer.owed > 0 && (
              <div className="text-xs text-white/80 font-bold">Baqi {formatPKR(farmer.owed)}</div>
            )}
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Band karne par is farmer ko naya udhaar nahi diya ja sakega. Purana khata aur record
            waise ka waisa rahega — kabhi bhi dobara chalu kar sakte hain.
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Wajah <span className="text-rose-500">*</span>
            </label>
            <textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Kyun band kar rahe hain…"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 resize-none transition" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUSPEND_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 transition">
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={!ok} loading={saving}
              onClick={() => onConfirm(reason.trim())}>
              <Ban className="h-4 w-4" /> Band karein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoveModal({ farmer, onClose, onConfirm, saving }: any) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">Farmer hatayein</div>
            <h3 className="font-extrabold text-lg truncate">{farmer.fullName}</h3>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {farmer.owed > 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-[12px] font-bold text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Is farmer par <strong>{formatPKR(farmer.owed)}</strong> baqi hai. Hatane se wo paisa
                wapas nahi aayega — behtar hai "band karein" istemal karein.
              </span>
            </div>
          )}
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
            Farmer ka profile hat jayega. Us ka Customer khata aur purani bikri waise ki waisi
            rahegi — sirf ye agri profile (zameen, fasal, CNIC) hategi.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne do</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700" loading={saving} onClick={onConfirm}>
              <Trash2 className="h-4 w-4" /> Hata dein
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   FARMER KA FORM
   ─────────────────────────────────────────────────────────────
   Sirf naam aur phone zaroori hain — baqi sab marzi. Wajah ye ke
   counter par farmer khara hota hai aur poora form bharne ka waqt
   nahi hota. CNIC aur raqba baad me Edit se bhar sakte hain, aur
   form khud yaad dilata hai ke wo kyun kaam ka hai.
   ═════════════════════════════════════════════════════════════ */
function FarmerForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    fullName: editing?.fullName ?? '',
    fatherName: editing?.fatherName ?? '',
    cnic: editing?.cnic ?? '',
    phone: editing?.phone ?? '',
    altPhone: editing?.altPhone ?? '',
    village: editing?.village ?? '',
    tehsil: editing?.tehsil ?? '',
    district: editing?.district ?? '',
    province: editing?.province ?? 'Punjab',
    address: editing?.address ?? '',
    landmark: editing?.landmark ?? '',
    landAreaAcres: editing?.landAreaAcres ?? '',
    landAreaKanals: editing?.landAreaKanals ?? '',
    landOwnership: editing?.landOwnership ?? '',
    soilType: editing?.soilType ?? '',
    waterSource: editing?.waterSource ?? '',
    irrigationType: editing?.irrigationType ?? '',
    farmingType: editing?.farmingType ?? [],
    primaryCrops: editing?.primaryCrops ?? [],
    creditLimit: editing?.creditLimit ?? 0,
    creditDays: editing?.creditDays ?? 60,
    interestRate: editing?.interestRate ?? 0,
    notes: editing?.notes ?? '',
    photoUrl: editing?.photoUrl ?? '',
  });

  const errors: string[] = [];
  if (!form.fullName.trim()) errors.push('Naam likhna zaroori hai');
  if (!form.phone.trim()) errors.push('Phone likhna zaroori hai — warna yaad-dehani nahi bhej sakte');
  const valid = errors.length === 0;

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 60,
        interestRate: Number(form.interestRate) || 0,
        landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
        landAreaKanals: form.landAreaKanals ? Number(form.landAreaKanals) : null,
      };
      return editing ? farmersApi.update(editing.id, payload) : farmersApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Farmer update ho gaya' : 'Farmer register ho gaya'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const toggle = (key: 'primaryCrops' | 'farmingType', v: string) => {
    setForm({
      ...form,
      [key]: form[key].includes(v) ? form[key].filter((x: string) => x !== v) : [...form[key], v],
    });
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg overflow-hidden print:hidden">
      <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          <Tractor className="h-5 w-5" /> {editing ? 'Farmer ki tafseel' : 'Naya farmer'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
          <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {!editing && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 text-[12px] font-bold text-slate-600 dark:text-slate-300">
            Sirf <strong>naam aur phone</strong> zaroori hain — baqi sab baad me bhar sakte hain.
            Farmer banate hi us ka khata (Customer) bhi khud ban jata hai, taake POS par udhaar
            sahi jagah darj ho.
          </div>
        )}

        {/* Zaati */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Naam" req>
            <input autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Poora naam" className={inp} />
          </Field>
          <Field label="Walid ka naam" opt>
            <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
              placeholder="Walid ka naam" className={inp} />
          </Field>
          <Field label="Phone" req>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03XX-XXXXXXX" className={inp} />
          </Field>
          <Field label="Doosra phone" opt>
            <input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
              placeholder="Ghar ya beta" className={inp} />
          </Field>
        </div>

        <Field label="CNIC" opt>
          <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })}
            placeholder="XXXXX-XXXXXXX-X" className={`${inp} font-mono`} />
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <IdCard className="h-3 w-3 inline" /> Sarkari subsidy ka claim banate waqt ye zaroori hota hai
          </p>
        </Field>

        {/* Jagah */}
        <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-3">
          <div className="text-sm font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Jagah
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Gaon"><input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="Gaon ka naam" className={inp} /></Field>
            <Field label="Tehsil"><input value={form.tehsil} onChange={(e) => setForm({ ...form, tehsil: e.target.value })} placeholder="Tehsil" className={inp} /></Field>
            <Field label="Zila"><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Zila" className={inp} /></Field>
            <Field label="Soobha">
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inp}>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Poora pata" opt>
            <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Delivery ke liye" className={`${inp} h-auto py-2 resize-none`} />
          </Field>
        </div>

        {/* Zameen */}
        <div className="rounded-2xl border-2 border-lime-200 dark:border-lime-500/30 bg-lime-50/60 dark:bg-lime-500/5 p-4 space-y-3">
          <div className="text-sm font-black text-lime-900 dark:text-lime-200 flex items-center gap-2">
            <Tractor className="h-4 w-4" /> Zameen
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Raqba (acre)">
              <input type="number" step="0.1" min={0} value={form.landAreaAcres}
                onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })}
                placeholder="5" className={`${inp} tabular-nums`} />
            </Field>
            <Field label="Raqba (kanal)" opt>
              <input type="number" min={0} value={form.landAreaKanals}
                onChange={(e) => setForm({ ...form, landAreaKanals: e.target.value })}
                placeholder="40" className={`${inp} tabular-nums`} />
            </Field>
            <Field label="Zameen ki qism" opt>
              <select value={form.soilType} onChange={(e) => setForm({ ...form, soilType: e.target.value })} className={inp}>
                <option value="">— Chunein —</option>
                {SOIL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Paani kahan se" opt>
              <select value={form.waterSource} onChange={(e) => setForm({ ...form, waterSource: e.target.value })} className={inp}>
                <option value="">— Chunein —</option>
                {WATER_SOURCES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-[11px] font-bold text-lime-800 dark:text-lime-300">
            Raqba likha ho to bata sakte hain ke kitni bori khaad chahiye — farmer aksar yehi poochta hai.
          </p>
        </div>

        {/* Fasal */}
        <Field label="Kaun si fasal ugata hai" opt>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_CROPS.map((c) => {
              const on = form.primaryCrops.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggle('primaryCrops', c)}
                  className={`h-9 px-3 rounded-xl border-2 text-xs font-extrabold transition ${
                    on ? 'border-lime-500 bg-lime-50 dark:bg-lime-500/15 text-lime-700 dark:text-lime-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-lime-400'
                  }`}>🌾 {c}</button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Season aane par pata chal jata hai ke kis ko kya chahiye hoga
          </p>
        </Field>

        <Field label="Kya kaam karta hai" opt>
          <div className="flex flex-wrap gap-1.5">
            {FARMING_TYPES.map((ft) => {
              const on = form.farmingType.includes(ft);
              return (
                <button key={ft} type="button" onClick={() => toggle('farmingType', ft)}
                  className={`h-9 px-3 rounded-xl border-2 text-xs font-extrabold transition ${
                    on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>{ft}</button>
              );
            })}
          </div>
        </Field>

        {/* Udhaar */}
        <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-3">
          <div className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Udhaar ki shartein
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Udhaar ki hadd (Rs)">
              <input type="number" min={0} value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                className={`${inp} tabular-nums`} />
            </Field>
            <Field label="Kitne din ka">
              <input type="number" min={0} value={form.creditDays}
                onChange={(e) => setForm({ ...form, creditDays: e.target.value })}
                className={`${inp} tabular-nums`} />
            </Field>
            <Field label="Sood %" opt>
              <input type="number" step="0.1" min={0} value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className={`${inp} tabular-nums`} />
            </Field>
          </div>
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
            "Kitne din ka" se hi tay hota hai ke kis ka waqt guzar gaya. Katai tak ka waqt dena ho
            to 90 din rakhein — 60 din aam hai.
          </p>
        </div>

        {/* Tasveer */}
        <Field label="Tasveer" opt>
          {form.photoUrl ? (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
              <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setForm({ ...form, photoUrl: '' })}
                className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <UploadDropzone onUploaded={(records) => {
              const first = Array.isArray(records) ? records[0] : records;
              const url = typeof first === 'string' ? first : (first as any)?.url;
              if (url) setForm({ ...form, photoUrl: url });
            }} />
          )}
        </Field>

        <Field label="Note" opt>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Jo baat yaad rakhni ho…" className={`${inp} h-auto py-2 resize-none`} />
        </Field>

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
            <Save className="h-4 w-4" /> {editing ? 'Update karein' : 'Register karein'}
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
      <div className="mt-1.5 text-lg font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{sub}</div>}
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

function ListCard({ icon: Icon, title, rows, emptyText }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r: any, i: number) => (
            <Link key={r.key} to={r.to} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.title}</span>
                <span className="block text-[11px] font-bold text-slate-400 truncate">{r.sub}</span>
              </span>
              <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{r.value}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>{children}</th>;
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Empty({ hasFilters, onClear, onNew, onGuide }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Tractor className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        {hasFilters ? 'Is chaant par koi farmer nahi' : 'Abhi koi farmer register nahi'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto leading-relaxed">
        {hasFilters
          ? 'Chaant badal kar dekhein'
          : 'Jo farmer aap se maal lete hain, unhein yahan register kar lein — phir udhaar, zameen aur fasal sab ka hisab rahega.'}
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
              <Plus className="h-4 w-4" /> Pehla farmer
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
            <GraduationCap className="h-5 w-5" /> Farmer ka khata kaise chalta hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Agri dukaan ka aadha paisa hamesha bahar hota hai — farmer bijai ke waqt maal leta
              hai aur katai ke baad deta hai. <strong>Ye karobar ka tareeqa hai, masla nahi.</strong>{' '}
              Masla tab banta hai jab us paise ka hisab na ho.
            </p>
          </div>
          <Tip icon={LinkIcon} title="Khata jorna — sab se pehle">
            Farmer aur us ka khata (Customer) do alag cheezein hain. Naya farmer banate hi khata
            khud ban jata hai, magar purane farmers ka khali hai. Jab tak na jure, POS par un ki
            bikri aur <strong>udhaar kahin darj nahi hota</strong>. Amber patti par "Sab jor dein".
          </Tip>
          <Tip icon={Clock} title="Kitne din ka udhaar">
            Har farmer ka apna "kitne din ka" hota hai — 60 din aam hai, purane gahak ko 90 bhi
            milte hain. Us se ooper jaye to wo <strong>Udhaar</strong> tab me sab se ooper aa jata
            hai. Ye ginti aakhri kharidari se hoti hai.
          </Tip>
          <Tip icon={Wallet} title="Udhaar tab — katai ke dinon ka safha">
            Yehi list dukaan-daar haath me le kar nikalta hai. Purana sab se ooper, har line par
            phone aur WhatsApp ka button, aur poori list ek click me copy.
          </Tip>
          <Tip icon={AlertTriangle} title="Udhaar ki hadd">
            Har farmer ki apni limit. Bar laal ho jaye to us ko aur maal dena nuqsaan ka sauda
            hai — POS par bhi wohi hadd dikhti hai.
          </Tip>
          <Tip icon={IdCard} title="CNIC aur raqba">
            CNIC sarkari subsidy ke claim me chahiye. Raqba likha ho to farmer ko bata sakte hain
            ke us ke khet ke liye kitni bori khaad chahiye.
          </Tip>
          <Tip icon={Ban} title="Band karna vs hatana">
            <strong>Band</strong> — naya udhaar nahi milega, purana khata mehfooz. Ye behtar hai.{' '}
            <strong>Hatana</strong> — sirf agri profile jati hai, Customer khata aur purani bikri
            rehti hai. Jis par paisa baqi ho, us ko hatayein nahi.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya farmer</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">1-3</kbd> tabs</div>
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
