import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line,
} from 'recharts';
import {
  Truck, Plus, Search, MapPin, Phone, X, Mail, MessageCircle, Eye, Edit3,
  Trash2, FileSpreadsheet, Wallet, TrendingUp, TrendingDown, AlertTriangle,
  Building2, Activity, Crown, BarChart3, RefreshCw, GraduationCap, Printer,
  CheckCircle2, LayoutGrid, List as ListIcon, BookOpen, Banknote, Keyboard,
  Clock, Users, PowerOff, Power, Copy, ChevronRight, Package, HandCoins,
  CalendarClock, Loader2, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { suppliersApi, type Supplier } from '../api/suppliers.api';
import { SupplierKhataModal } from '../components/SupplierKhataModal';
import {
  SUPPLIER_GRADIENT, Kpi, Panel, Empty, Teacher, Shortcuts, Kbd,
  fmtDate, fmtPct, initials, daysPhrase, waNumber, payMeta,
  printHtml, a4Shell, downloadCsv, inputCls,
} from '../components/SuppliersKit';

/* ═════════════════════════════════════════════════════════════
   NAFAA — SUPPLIERS (jin se maal aata hai)
   ─────────────────────────────────────────────────────────────
   Customer wale safhe ki tarah: list ya grid, apni marzi ka
   nazaria yaad rehta hai; analytics ka poora tab; aur har
   supplier ka khata ek click par.

   Sab se ahem farq: yahan paisa ULTA behta hai. Customer ne
   HAMEIN dena hota hai — supplier ko HUM ne dena hota hai.
   Isi liye har jagah "baqi" ka matlab "hamara qarz" hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'analytics';
type View = 'list' | 'grid';
type DueFilter = 'all' | 'due' | 'clear';
type StatusFilter = 'all' | 'active' | 'inactive';
type Sort = 'recent' | 'name' | 'purchased' | 'due' | 'orders';

const VIEW_KEY = 'nafaa:suppliers:view';

const SORTS: Array<{ v: Sort; label: string }> = [
  { v: 'recent', label: 'Naya pehle' },
  { v: 'name', label: 'Naam A-Z' },
  { v: 'purchased', label: 'Sab se zyada kharida' },
  { v: 'due', label: 'Sab se zyada baqi' },
  { v: 'orders', label: 'Sab se zyada bill' },
];

const CHART_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#e11d48', '#8b5cf6', '#10b981', '#3b82f6', '#f97316'];

export default function SuppliersListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hideCost = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as View) || 'list'; } catch { return 'list'; }
  });
  const [search, setSearch] = useState('');
  const [dues, setDues] = useState<DueFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [khataFor, setKhataFor] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode */ } }, [view]);

  /* ─── Data ─── */
  const { data: page, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['suppliers', { search, dues, status, city, sort }],
    queryFn: () => suppliersApi.list({
      search: search || undefined,
      dues: dues === 'all' ? undefined : dues,
      status: status === 'all' ? undefined : status,
      city: city || undefined,
      sort,
      limit: 500,
    }),
  });
  const suppliers = page?.items ?? [];

  const { data: summary } = useQuery({
    queryKey: ['suppliers-summary'],
    queryFn: suppliersApi.summary,
  });

  /* ─── Delete — backend purchases wale ko rokta hai, yahan bhi bata dein ─── */
  const delMut = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast.success('Supplier delete ho gaya');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      suppliersApi.update(id, { isActive } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update nahi hua'),
  });

  /* ─── Selection ─── */
  const toggleSel = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = suppliers.length > 0 && selected.size === suppliers.length;
  const selectAll = () =>
    setSelected(allSelected ? new Set() : new Set(suppliers.map((s) => s.id)));

  /** Jo chune gaye hain wahi; kuch na chuna ho to sab */
  const working = useMemo(
    () => (selected.size > 0 ? suppliers.filter((s) => selected.has(s.id)) : suppliers),
    [suppliers, selected],
  );

  /* ─── Shehr ki list — filter ke liye ─── */
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) if (s.city?.trim()) set.add(s.city.trim());
    return [...set].sort();
  }, [suppliers]);

  /* ─── Mahiny ke liye sade a'dad ─── */
  const totals = useMemo(() => {
    const due = suppliers.reduce((a, s) => a + Number(s.outstandingDue ?? 0), 0);
    const spent = suppliers.reduce((a, s) => a + Number(s.totalPurchased ?? 0), 0);
    return { due, spent, count: suppliers.length };
  }, [suppliers]);

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(el?.tagName ?? '') || el?.isContentEditable;
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showKeys) return setShowKeys(false);
        if (khataFor) return setKhataFor(null);
        if (deleting) return setDeleting(null);
        if (selected.size) return setSelected(new Set());
        if (search) return setSearch('');
      }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); navigate('/suppliers/new'); }
      if (e.key.toLowerCase() === 'g') setView((v) => (v === 'grid' ? 'list' : 'grid'));
      if (e.key.toLowerCase() === 'a') setTab((t) => (t === 'analytics' ? 'list' : 'analytics'));
      if (e.key.toLowerCase() === 'd') setDues((d) => (d === 'due' ? 'all' : 'due'));
      if (e.key.toLowerCase() === 't') setShowTeacher(true);
      if (e.key === '?') setShowKeys(true);
      if (e.key.toLowerCase() === 'p') doPrint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ─── Print + CSV ─── */
  const doPrint = () => {
    const rows = working;
    if (!rows.length) return toast.error('Print ke liye kuch nahi');
    const body = `
      <div class="cards">
        <div class="card"><div class="l">Suppliers</div><div class="v">${rows.length}</div></div>
        <div class="card"><div class="l">Kul kharidari</div><div class="v">${formatPKR(rows.reduce((a, s) => a + Number(s.totalPurchased ?? 0), 0))}</div></div>
        <div class="card"><div class="l">Hamara baqi</div><div class="v due">${formatPKR(rows.reduce((a, s) => a + Number(s.outstandingDue ?? 0), 0))}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Supplier</th><th>Banda</th><th>Phone</th><th>Sheher</th>
          <th class="r">Bill</th><th class="r">Kul kharidari</th><th class="r">Hamara baqi</th><th>Aakhri maal</th>
        </tr></thead>
        <tbody>${rows.map((s, i) => `<tr>
          <td>${i + 1}</td>
          <td><strong>${s.name}</strong></td>
          <td>${s.contactPerson ?? '—'}</td>
          <td class="num">${s.phone ?? '—'}</td>
          <td>${s.city ?? '—'}</td>
          <td class="r num">${s._count?.purchases ?? 0}</td>
          <td class="r num">${formatPKR(Number(s.totalPurchased ?? 0))}</td>
          <td class="r num ${Number(s.outstandingDue ?? 0) > 0 ? 'due' : 'ok'}">${formatPKR(Number(s.outstandingDue ?? 0))}</td>
          <td>${s.lastPurchaseAt ? fmtDate(s.lastPurchaseAt) : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    printHtml(a4Shell(
      'Suppliers — Kharidari aur Baqi',
      body,
      `${rows.length} supplier${selected.size ? ' (chune hue)' : ''} · ${fmtDate(new Date())}`,
    ));
  };

  const doCsv = () => {
    const rows = working;
    if (!rows.length) return toast.error('CSV ke liye kuch nahi');
    downloadCsv(`suppliers-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Naam', 'Banda', 'Phone', 'Doosra phone', 'Email', 'Sheher', 'Ilaqa', 'NTN', 'CNIC',
       'Bank', 'Account', 'IBAN', 'Payment terms', 'Bill', 'Kul kharidari', 'Hamara baqi',
       'Aakhri maal', 'Aakhri adaigi', 'Halat', 'Banaya'],
      ...rows.map((s) => [
        s.name, s.contactPerson, s.phone, s.altPhone, s.email, s.city, s.area, s.ntn, s.cnic,
        s.bankName, s.accountNumber, s.iban, s.paymentTerms,
        s._count?.purchases ?? 0, Number(s.totalPurchased ?? 0), Number(s.outstandingDue ?? 0),
        s.lastPurchaseAt ? fmtDate(s.lastPurchaseAt) : '', s.lastPaymentAt ? fmtDate(s.lastPaymentAt) : '',
        s.isActive ? 'Chalu' : 'Band', fmtDate(s.createdAt),
      ]),
    ]);
    toast.success(`${rows.length} supplier CSV me`);
  };

  const copyNumbers = () => {
    const nums = working.map((s) => s.phone).filter(Boolean);
    if (!nums.length) return toast.error('Kisi ka phone number nahi');
    navigator.clipboard.writeText(nums.join(', '));
    toast.success(`${nums.length} number copy ho gaye`);
  };

  /* ═════════ RENDER ═════════ */
  return (
    <div className="space-y-5 pb-24">
      {/* ─────── HERO ─────── */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${SUPPLIER_GRADIENT} text-white p-5 sm:p-7`}>
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black border border-white/30">
              <Truck className="h-3.5 w-3.5" /> Jin se maal aata hai
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">🚚 Suppliers</h1>
            <p className="text-sm font-bold text-white/85 mt-1">
              {totals.count} supplier · {hideCost ? '•••' : formatPKR(totals.spent)} ka maal liya ·{' '}
              <span className={totals.due > 0 ? 'text-rose-200' : 'text-emerald-200'}>
                {hideCost ? '•••' : formatPKR(totals.due)} hamara baqi
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PrivacyToggle />
            <button onClick={() => setShowTeacher(true)} title="Sikhayein (T)"
              className="h-11 px-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-sm font-extrabold inline-flex items-center gap-1.5 transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => setShowKeys(true)} title="Shortcuts (?)"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <Keyboard className="h-4 w-4" />
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} title="Taaza karein"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <Link to="/suppliers/new"
              className="h-11 px-4 rounded-2xl bg-[#ffffff] text-teal-800 text-sm font-black inline-flex items-center gap-1.5 shadow-lg hover:bg-teal-50 transition">
              <Plus className="h-4 w-4" /> Naya Supplier
            </Link>
          </div>
        </div>
      </div>

      {/* ─────── KPI ─────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        <Kpi icon={Users} label="Kul suppliers" tone="teal"
          value={summary?.totalSuppliers ?? totals.count}
          sub={`${summary?.activeSuppliers ?? 0} chalu`}
          onClick={() => { setStatus('all'); setDues('all'); setTab('list'); }} />
        <Kpi icon={Wallet} label="Hamara baqi" tone="rose"
          value={hideCost ? '•••' : formatPKR(summary?.totalOutstanding ?? totals.due)}
          sub={`${summary?.suppliersWithDebt ?? 0} supplier ko dena hai`}
          active={dues === 'due'} hint="Click: sirf baqi wale (D)"
          onClick={() => { setDues(dues === 'due' ? 'all' : 'due'); setTab('list'); }} />
        <Kpi icon={TrendingUp} label="Is mahine" tone="blue"
          value={hideCost ? '•••' : formatPKR(summary?.monthPurchases ?? 0)}
          sub={`${summary?.monthCount ?? 0} bill · ${fmtPct(summary?.growthVsLastMonth ?? 0)}`} />
        <Kpi icon={HandCoins} label="Mahine ki adaigi" tone="emerald"
          value={hideCost ? '•••' : formatPKR(summary?.monthLedgerPaid ?? 0)}
          sub={`${summary?.monthLedgerPaymentCount ?? 0} dafa paisa diya`} />
        <Kpi icon={Package} label="Kul kharidari" tone="indigo"
          value={hideCost ? '•••' : formatPKR(summary?.totalPurchased ?? totals.spent)}
          sub={`Ausat bill ${hideCost ? '•••' : formatPKR(summary?.avgOrderValue ?? 0)}`} />
        <Kpi icon={BookOpen} label="Purana hisab" tone="violet"
          value={hideCost ? '•••' : formatPKR(summary?.openingBalanceTotal ?? 0)}
          sub={`${summary?.openingBalanceCount ?? 0} khate me darj`} />
        <Kpi icon={Clock} label="Ghaib suppliers" tone="amber"
          value={summary?.staleCount ?? 0}
          sub="90 din se maal nahi aaya" />
        <Kpi icon={AlertTriangle} label="Kabhi adaigi nahi" tone="rose"
          value={summary?.neverPaidDebt ?? 0}
          sub="Baqi hai, paisa diya hi nahi"
          active={dues === 'due'}
          onClick={() => { setDues('due'); setTab('list'); }} />
      </div>

      {/* ─────── TABS ─────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { v: 'list' as Tab, label: 'Suppliers', icon: Truck, n: totals.count },
          { v: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ]).map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`h-11 px-4 rounded-2xl text-sm font-extrabold inline-flex items-center gap-2 shrink-0 transition ${
              tab === t.v
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-500/30'
                : 'bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-400'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.n !== undefined && (
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === t.v ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{t.n}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <>
          {/* ─────── SEARCH + FILTERS ─────── */}
          <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Naam, phone, sheher, NTN se dhoondein… (/)"
                  className={`${inputCls} h-12 pl-9 pr-9`} />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowFilters((f) => !f)}
                className={`h-12 px-4 rounded-xl text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                  showFilters || dues !== 'all' || status !== 'all' || city
                    ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-400 text-teal-700 dark:text-teal-300'
                    : 'bg-[#ffffff] dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                <Filter className="h-4 w-4" /> Chaant
                {(dues !== 'all' || status !== 'all' || !!city) && (
                  <span className="h-5 w-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center">
                    {[dues !== 'all', status !== 'all', !!city].filter(Boolean).length}
                  </span>
                )}
              </button>
              <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
                {([['list', ListIcon], ['grid', LayoutGrid]] as const).map(([v, I]) => (
                  <button key={v} onClick={() => setView(v as View)} title={`${v} view (G)`}
                    className={`h-12 w-12 flex items-center justify-center transition ${
                      view === v ? 'bg-teal-600 text-white' : 'bg-[#ffffff] dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                    <I className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button onClick={doCsv} title="CSV"
                className="h-12 px-3.5 rounded-xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400 transition">
                <FileSpreadsheet className="h-4 w-4" />
              </button>
              <button onClick={doPrint} title="Print (P)"
                className="h-12 px-3.5 rounded-xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition">
                <Printer className="h-4 w-4" />
              </button>
            </div>

            {showFilters && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Khata</div>
                  <div className="flex gap-1.5">
                    {([['all', 'Sab'], ['due', 'Baqi hai'], ['clear', 'Saaf']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setDues(v as DueFilter)}
                        className={`flex-1 h-10 rounded-xl text-[11px] font-extrabold border-2 transition ${
                          dues === v ? 'bg-teal-600 border-teal-600 text-white' : 'bg-[#ffffff] dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Halat</div>
                  <div className="flex gap-1.5">
                    {([['all', 'Sab'], ['active', 'Chalu'], ['inactive', 'Band']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setStatus(v as StatusFilter)}
                        className={`flex-1 h-10 rounded-xl text-[11px] font-extrabold border-2 transition ${
                          status === v ? 'bg-teal-600 border-teal-600 text-white' : 'bg-[#ffffff] dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Sheher</div>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} h-10`}>
                    <option value="">Sab sheher</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Tarteeb</div>
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputCls} h-10`}>
                    {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ─────── BULK BAR ─────── */}
          {selected.size > 0 && (
            <div className="sticky top-2 z-20 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-3 shadow-2xl flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black px-2">{selected.size} chune hue</span>
              <div className="flex-1" />
              <button onClick={copyNumbers} className="h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <Copy className="h-3.5 w-3.5" /> Number copy
              </button>
              <button onClick={doCsv} className="h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={doPrint} className="h-10 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button onClick={() => setSelected(new Set())} className="h-10 w-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─────── LIST / GRID ─────── */}
          {isLoading ? (
            <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 py-20 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-bold text-slate-500">Suppliers aa rahe hain…</p>
            </div>
          ) : isError ? (
            /* Pehle request fail hone par bhi "koi supplier nahi" likha
               aata tha — dukaan-daar samajhta ke record hi khatam ho gaya.
               Ab saaf batate hain ke maamla server ka hai. */
            <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-500/40">
              <Empty icon={AlertTriangle}
                title="Suppliers ki list nahi aa saki"
                desc={
                  (error as any)?.response?.data?.message
                    ? String((error as any).response.data.message)
                    : 'Server se jawab nahi mila. Internet check karein ya dobara koshish karein.'
                }
                action={
                  <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" /> Dobara Koshish
                  </Button>
                } />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
              <Empty icon={Truck}
                title={search || dues !== 'all' || status !== 'all' || city ? 'Is chaant par koi supplier nahi' : 'Abhi koi supplier nahi'}
                desc={search || dues !== 'all' || status !== 'all' || city
                  ? 'Chaant hata kar dobara dekhein'
                  : 'Jis se maal aata hai use yahan add karein — phir har bill uske khate me apne aap chala jayega.'}
                action={
                  search || dues !== 'all' || status !== 'all' || city ? (
                    <Button variant="secondary" onClick={() => { setSearch(''); setDues('all'); setStatus('all'); setCity(''); }}>
                      <X className="h-4 w-4" /> Chaant hatayein
                    </Button>
                  ) : (
                    <Link to="/suppliers/new">
                      <Button><Plus className="h-4 w-4" /> Pehla supplier</Button>
                    </Link>
                  )
                } />
            </div>
          ) : view === 'grid' ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {suppliers.map((s) => (
                <SupplierCard key={s.id} s={s} hideCost={hideCost}
                  selected={selected.has(s.id)} onToggle={() => toggleSel(s.id)}
                  onKhata={() => setKhataFor(s)} onDelete={() => setDeleting(s)}
                  onToggleActive={() => toggleActiveMut.mutate({ id: s.id, isActive: !s.isActive })} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="hidden lg:grid grid-cols-[40px_1fr_150px_120px_130px_130px_220px] gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <button onClick={selectAll} className="flex items-center justify-center">
                  <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                    allSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'
                  }`}>{allSelected && <CheckCircle2 className="h-3 w-3 text-white" />}</span>
                </button>
                <span>Supplier</span><span>Rabta</span><span className="text-right">Bill</span>
                <span className="text-right">Kharidari</span><span className="text-right">Hamara baqi</span>
                <span className="text-right">Kaam</span>
              </div>
              <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                {suppliers.map((s) => (
                  <SupplierRow key={s.id} s={s} hideCost={hideCost}
                    selected={selected.has(s.id)} onToggle={() => toggleSel(s.id)}
                    onKhata={() => setKhataFor(s)} onDelete={() => setDeleting(s)}
                    onToggleActive={() => toggleActiveMut.mutate({ id: s.id, isActive: !s.isActive })} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <AnalyticsTab summary={summary} hideCost={hideCost} />
      )}

      {/* ─────── MODALS ─────── */}
      {khataFor && (
        <SupplierKhataModal supplierId={khataFor.id} onClose={() => setKhataFor(null)} />
      )}

      {deleting && (
        <DeleteConfirm s={deleting} pending={delMut.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => delMut.mutate(deleting.id)} />
      )}

      {showTeacher && (
        <Teacher onClose={() => setShowTeacher(false)}
          title="Supplier ka safha kaise kaam karta hai"
          subtitle="Jin se maal aata hai — unka poora hisab"
          steps={[
            { icon: '🚚', head: 'Supplier kaun hai', body: 'Jis se aap maal khareedte hain — mandi wala, company ka distributor, ya koi aur dukaan. Har kharidari ka bill isi ke naam par banta hai.' },
            { icon: '📖', head: 'Khata: yahan paisa ULTA behta hai', body: 'Customer ne aapko dena hota hai — supplier ko AAP ne dena hota hai. Is liye "baqi" ka matlab hai: itna aap ne uska dena hai. Udhaar par maal lene se ye barhta hai, paisa dene se ghatta hai.' },
            { icon: '📒', head: 'Purana hisab', body: 'System se pehle jo copy par chalta tha — use "Purana Hisab" se ek dafa daal dein. Us din se aage ka poora hisab apne aap banta rahega.' },
            { icon: '🧾', head: 'Bill khud khate me jata hai', body: 'Kharidari ke safhe par jo bill banta hai, uska bacha hua paisa apne aap is supplier ke khate me udhaar ban kar chala jata hai. Alag se likhne ki zaroorat nahi.' },
            { icon: '⏰', head: 'Ghaib supplier', body: '90 din se jis se maal nahi aaya, wo "ghaib" me aa jata hai. Analytics me unki list hai — ya to rabta karein ya band kar dein.' },
            { icon: '🖨️', head: 'Kaghaz par', body: 'Har supplier ka khata A4 ya 80mm parchi par nikal sakte hain, aur WhatsApp par bhi bhej sakte hain — mandi walon ko yahi chahiye hota hai.' },
          ]}
          tips={[
            'KPI card par click karein — list wahin chaant jati hai.',
            'Jitne supplier chunenge, print aur CSV sirf unhi ka banega.',
            'Delete sirf us supplier ka hota hai jiska koi bill aur koi baqi na ho — baqi ko "band" karein, record mehfooz rehta hai.',
            'Purana hisab supplier banate waqt hi daal dein — baad me yaad nahi rehta.',
          ]} />
      )}

      {showKeys && (
        <Shortcuts onClose={() => setShowKeys(false)} list={[
          ['/', 'Search par jayein'],
          ['N', 'Naya supplier'],
          ['G', 'List ya grid'],
          ['A', 'Analytics'],
          ['D', 'Sirf baqi wale'],
          ['P', 'Print'],
          ['T', 'Sikhein'],
          ['?', 'Ye list'],
          ['Esc', 'Band karein / chaant hatayein'],
        ]} />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   LIST ROW
   ═════════════════════════════════════════════════════════════ */
function SupplierRow({ s, hideCost, selected, onToggle, onKhata, onDelete, onToggleActive }: {
  s: Supplier; hideCost: boolean; selected: boolean;
  onToggle: () => void; onKhata: () => void; onDelete: () => void; onToggleActive: () => void;
}) {
  const due = Number(s.outstandingDue ?? 0);
  const wa = waNumber(s.phone);
  const days = s.lastPurchaseAt
    ? Math.floor((Date.now() - new Date(s.lastPurchaseAt).getTime()) / 86400000)
    : null;

  return (
    <div className={`px-3 sm:px-4 py-3 transition ${selected ? 'bg-teal-50 dark:bg-teal-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      <div className="lg:grid lg:grid-cols-[40px_1fr_150px_120px_130px_130px_220px] lg:gap-2 lg:items-center flex flex-col gap-2">
        {/* select */}
        <div className="hidden lg:flex items-center justify-center">
          <button onClick={onToggle}>
            <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
              selected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'
            }`}>{selected && <CheckCircle2 className="h-3 w-3 text-white" />}</span>
          </button>
        </div>

        {/* identity */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onToggle} className="lg:hidden shrink-0">
            <span className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
              selected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'
            }`}>{selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</span>
          </button>
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 ${
            s.isActive ? 'bg-gradient-to-br from-teal-600 to-emerald-700' : 'bg-slate-400'
          }`}>
            {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-full w-full object-cover rounded-2xl" /> : initials(s.name)}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/suppliers/${s.id}`} className="font-black text-slate-900 dark:text-white hover:text-teal-600 truncate block">
              {s.name}
            </Link>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {s.contactPerson && <span>👤 {s.contactPerson}</span>}
              {s.city && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.city}</span>}
              {!s.isActive && <span className="px-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Band</span>}
              {days !== null && days > 90 && (
                <span className="px-1.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {daysPhrase(days)} se ghaib
                </span>
              )}
            </div>
          </div>
        </div>

        {/* contact */}
        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 lg:pl-0 pl-8">
          {s.phone ? <span className="font-mono">{s.phone}</span> : <span className="text-slate-400">—</span>}
          {s.email && <div className="truncate text-slate-400">{s.email}</div>}
        </div>

        {/* bills */}
        <div className="lg:text-right text-[11px] font-extrabold text-slate-600 dark:text-slate-300 tabular-nums lg:pl-0 pl-8">
          <span className="lg:hidden text-slate-400 font-bold">Bill: </span>
          {s._count?.purchases ?? 0}
          {s.lastPurchaseAt && <div className="text-[10px] font-bold text-slate-400">{daysPhrase(days)}</div>}
        </div>

        {/* purchased */}
        <div className="lg:text-right text-xs font-extrabold text-slate-800 dark:text-slate-100 tabular-nums lg:pl-0 pl-8">
          <span className="lg:hidden text-slate-400 font-bold">Kharida: </span>
          {hideCost ? '•••' : formatPKR(Number(s.totalPurchased ?? 0))}
        </div>

        {/* due */}
        <div className="lg:text-right lg:pl-0 pl-8">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black tabular-nums ${
            due > 0
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}>
            {due > 0 ? <Wallet className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {hideCost ? '•••' : formatPKR(due)}
          </span>
        </div>

        {/* actions — hamesha nazar aate hain, hover par chhupte nahi */}
        <div className="flex items-center gap-1.5 lg:justify-end flex-wrap lg:pl-0 pl-8">
          <button onClick={onKhata} title="Khata"
            className="h-9 px-2.5 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-violet-200 dark:hover:bg-violet-500/30 transition">
            <BookOpen className="h-3.5 w-3.5" /> Khata
          </button>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"
              className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition">
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {s.phone && (
            <a href={`tel:${s.phone}`} title="Call"
              className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-500/30 transition">
              <Phone className="h-4 w-4" />
            </a>
          )}
          <Link to={`/suppliers/${s.id}`} title="Tafseel"
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <Eye className="h-4 w-4" />
          </Link>
          <Link to={`/suppliers/${s.id}/edit`} title="Badlein"
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <Edit3 className="h-4 w-4" />
          </Link>
          <button onClick={onToggleActive} title={s.isActive ? 'Band karein' : 'Chalu karein'}
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-500/20 transition">
            {s.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button onClick={onDelete} title="Delete"
            className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-500/20 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GRID CARD
   ═════════════════════════════════════════════════════════════ */
function SupplierCard({ s, hideCost, selected, onToggle, onKhata, onDelete, onToggleActive }: {
  s: Supplier; hideCost: boolean; selected: boolean;
  onToggle: () => void; onKhata: () => void; onDelete: () => void; onToggleActive: () => void;
}) {
  const due = Number(s.outstandingDue ?? 0);
  const wa = waNumber(s.phone);
  const days = s.lastPurchaseAt
    ? Math.floor((Date.now() - new Date(s.lastPurchaseAt).getTime()) / 86400000)
    : null;

  return (
    <div className={`relative rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 overflow-hidden transition ${
      selected ? 'border-teal-500 ring-2 ring-teal-200 dark:ring-teal-500/30' : 'border-slate-200 dark:border-slate-800 hover:border-teal-400 hover:shadow-lg'
    }`}>
      <div className={`h-1.5 ${due > 0 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-teal-500 to-emerald-600'}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={onToggle} className="shrink-0 mt-1">
            <span className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
              selected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-600'
            }`}>{selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</span>
          </button>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 ${
            s.isActive ? 'bg-gradient-to-br from-teal-600 to-emerald-700' : 'bg-slate-400'
          }`}>
            {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-full w-full object-cover rounded-2xl" /> : initials(s.name)}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/suppliers/${s.id}`} className="font-black text-slate-900 dark:text-white hover:text-teal-600 truncate block">
              {s.name}
            </Link>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {s.contactPerson ? `👤 ${s.contactPerson}` : s.city ? `📍 ${s.city}` : 'Tafseel nahi'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Kul kharidari</div>
            <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums truncate">
              {hideCost ? '•••' : formatPKR(Number(s.totalPurchased ?? 0))}
            </div>
            <div className="text-[10px] font-bold text-slate-400">{s._count?.purchases ?? 0} bill</div>
          </div>
          <div className={`rounded-xl p-2.5 ${due > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Hamara baqi
            </div>
            <div className={`text-sm font-black tabular-nums truncate ${due > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {hideCost ? '•••' : formatPKR(due)}
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              {s.lastPaymentAt ? `Adaigi ${fmtDate(s.lastPaymentAt)}` : due > 0 ? 'Kabhi adaigi nahi' : 'Saaf'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[10px] font-extrabold">
          {s.phone && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">{s.phone}</span>}
          {s.city && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{s.city}</span>}
          {s.paymentTerms && <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">{s.paymentTerms}</span>}
          {!s.isActive && <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Band</span>}
          {days !== null && days > 90 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {daysPhrase(days)} se ghaib
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <button onClick={onKhata}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow transition">
            <BookOpen className="h-3.5 w-3.5" /> Khata
          </button>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
              className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition">
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          <Link to={`/suppliers/${s.id}`}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
            <Eye className="h-4 w-4" />
          </Link>
          <Link to={`/suppliers/${s.id}/edit`}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
            <Edit3 className="h-4 w-4" />
          </Link>
          <button onClick={onToggleActive}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
            {s.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button onClick={onDelete}
            className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function AnalyticsTab({ summary, hideCost }: { summary: any; hideCost: boolean }) {
  if (!summary) {
    return (
      <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
        <p className="text-sm font-bold text-slate-500">Hisab lagaya ja raha hai…</p>
      </div>
    );
  }

  const money = (n: number) => (hideCost ? '•••' : formatPKR(n));
  const payData = (summary.paymentBreakdown ?? []).map((p: any) => ({
    name: payMeta(p.paymentMethod).label, value: p.total, hex: payMeta(p.paymentMethod).hex, count: p.count,
  }));

  return (
    <div className="space-y-4">
      {/* 12 mahine */}
      <Panel icon={TrendingUp} title="12 Mahine ka Rujhan" desc="Kis mahine kitna maal aaya aur kitna paisa diya" tone="teal">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={summary.months12 ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'total' ? 'Kharidari' : 'Adaigi']}
                contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
              <Legend formatter={(v) => (v === 'total' ? 'Kharidari' : v === 'paid' ? 'Adaigi' : 'Bill')} />
              <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Baqi ka buraapa */}
        <Panel icon={AlertTriangle} title="Baqi Kitna Purana Hai" desc="Aakhri adaigi se ab tak" tone="rose">
          {(summary.dueAging ?? []).every((a: any) => a.amount === 0) ? (
            <Empty icon={CheckCircle2} title="Kisi ka baqi nahi" desc="Sab ka hisab saaf hai — shabash." />
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.dueAging ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <YAxis type="category" dataKey="bucket" width={72} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                      {(summary.dueAging ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#e11d48'][i] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {(summary.dueAging ?? []).map((a: any, i: number) => (
                  <div key={a.bucket} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-center">
                    <div className="text-[9px] font-extrabold uppercase text-slate-500">{a.bucket}</div>
                    <div className="text-xs font-black tabular-nums" style={{ color: ['#10b981', '#f59e0b', '#f97316', '#e11d48'][i] }}>
                      {money(a.amount)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">{a.count} supplier</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* Payment breakdown */}
        <Panel icon={Banknote} title="Paisa Kis Tarah Diya" desc="Cash, bank ya mobile wallet" tone="emerald">
          {payData.length === 0 ? (
            <Empty icon={Banknote} title="Abhi koi adaigi nahi" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {payData.map((d: any, i: number) => <Cell key={i} fill={d.hex} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top debtors */}
        <Panel icon={Wallet} title="Sab se Zyada Kis ka Dena Hai" desc="Upar wale ko pehle nipta dein" tone="rose">
          {(summary.topDebtors ?? []).length === 0 ? (
            <Empty icon={CheckCircle2} title="Kisi ka baqi nahi" />
          ) : (
            <div className="space-y-1.5">
              {summary.topDebtors.map((d: any, i: number) => (
                <Link key={d.id} to={`/suppliers/${d.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
                  <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
                    i === 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {d.orderCount} bill · adaigi {daysPhrase(d.daysSincePayment)}
                    </div>
                  </div>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-300 tabular-nums shrink-0">
                    {money(d.outstandingDue)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Panel>

        {/* Top suppliers */}
        <Panel icon={Crown} title="Sab se Bara Supplier" desc="Kul kharidari ke hisab se" tone="amber">
          {(summary.topSuppliers ?? []).length === 0 ? (
            <Empty icon={Truck} title="Abhi koi kharidari nahi" />
          ) : (
            <div className="space-y-1.5">
              {summary.topSuppliers.map((t: any, i: number) => (
                <Link key={t.supplierId} to={`/suppliers/${t.supplierId}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition">
                  <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{i === 0 ? '👑' : i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {t.supplier?.name ?? 'Supplier'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {t.orderCount} bill{t.supplier?.city ? ` · ${t.supplier.city}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money(t.totalSpent)}</div>
                    {t.outstanding > 0 && (
                      <div className="text-[10px] font-extrabold text-rose-600 tabular-nums">{money(t.outstanding)} baqi</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Sheher */}
        <Panel icon={MapPin} title="Paisa Kis Sheher Ja Raha Hai" desc="Supplier ke sheher ke hisab se" tone="indigo">
          {(summary.cityBreakdown ?? []).length === 0 ? (
            <Empty icon={MapPin} title="Sheher darj nahi" desc="Supplier ki form me sheher likhein — ye chart tabhi banta hai." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(summary.cityBreakdown ?? []).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="city" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'totalPurchased' ? 'Kharidari' : 'Baqi']}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                  <Bar dataKey="totalPurchased" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="outstanding" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        {/* Ghaib */}
        <Panel icon={Clock} title="Ghaib Suppliers" desc="90 din se jin se maal nahi aaya" tone="violet">
          {(summary.dormantSuppliers ?? []).length === 0 ? (
            <Empty icon={CheckCircle2} title="Koi ghaib nahi" desc="Sab se haal hi me maal aaya hai." />
          ) : (
            <div className="space-y-1.5">
              {summary.dormantSuppliers.map((d: any) => (
                <Link key={d.id} to={`/suppliers/${d.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition">
                  <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-[11px] shrink-0">
                    {initials(d.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{d.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {daysPhrase(d.daysSincePurchase)} · {money(d.totalPurchased)} ka maal liya tha
                    </div>
                  </div>
                  {d.outstandingDue > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold tabular-nums shrink-0">
                      {money(d.outstandingDue)} baqi
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Sab se zyada kharida gaya maal */}
      <Panel icon={Package} title="Sab se Zyada Kya Kharida" desc="Kul kharidari me sab se bara hissa" tone="blue">
        {(summary.topProducts ?? []).length === 0 ? (
          <Empty icon={Package} title="Abhi koi kharidari nahi" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {summary.topProducts.map((p: any, i: number) => (
              <div key={p.productId} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-lg">
                  {p.product?.images?.[0]?.url
                    ? <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    : '📦'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{p.product?.name ?? '—'}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {p.quantity} {p.product?.unit ?? ''} · {p.orderCount} bill
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money(p.total)}</div>
                  <div className="text-[10px] font-bold text-slate-400">#{i + 1}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 7 din */}
      <Panel icon={Activity} title="Pichlay 7 Din" desc="Rozana kitna maal aaya" tone="slate">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.trend7Days ?? []}>
              <defs>
                <linearGradient id="sup7" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
              <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} fill="url(#sup7)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Haal hi ke bill */}
      <Panel icon={CalendarClock} title="Haal Hi ke Bill" desc="Aakhri 8 kharidari" tone="teal">
        {(summary.recentPurchases ?? []).length === 0 ? (
          <Empty icon={Package} title="Abhi koi bill nahi" />
        ) : (
          <div className="space-y-1.5">
            {summary.recentPurchases.map((p: any) => {
              const due = Number(p.total ?? 0) - Number(p.paidAmount ?? 0);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {p.supplier?.name ?? 'Supplier'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono truncate">
                      {p.purchaseNumber} · {fmtDate(p.purchasedAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money(p.total)}</div>
                    {due > 0
                      ? <div className="text-[10px] font-extrabold text-rose-600 tabular-nums">{money(due)} udhaar</div>
                      : <div className="text-[10px] font-extrabold text-emerald-600">Poora diya</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirm({ s, pending, onCancel, onConfirm }: {
  s: Supplier; pending: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const due = Number(s.outstandingDue ?? 0);
  const bills = s._count?.purchases ?? 0;
  const blocked = due > 0 || bills > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#ffffff] dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800">
        <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
            <Trash2 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-black">"{s.name}" delete karein?</h3>
        </div>
        <div className="p-5 space-y-3">
          {blocked ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-3.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 space-y-1">
                  {bills > 0 && <div>Is supplier ki <strong>{bills} kharidari</strong> record me hain — wo mitayi nahi ja saktin.</div>}
                  {due > 0 && <div>Iska <strong>{formatPKR(due)}</strong> baqi bhi chal raha hai.</div>}
                  <div className="pt-1">Behtar ye hai ke ise <strong>"band"</strong> kar dein — record mehfooz rahega aur naye bill me nazar nahi aayega.</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Is supplier ka koi bill aur koi baqi nahi — mehfooz tareeqe se delete ho sakta hai.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1 h-12" onClick={onCancel}>
              <X className="h-4 w-4" /> Rehne dein
            </Button>
            <button onClick={onConfirm} disabled={pending || blocked}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
