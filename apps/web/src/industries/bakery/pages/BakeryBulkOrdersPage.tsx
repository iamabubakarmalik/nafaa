import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Plus, X, Search, RefreshCw, Calendar, Clock, Phone, MapPin,
  CheckCircle2, AlertTriangle, BarChart3, GraduationCap, FileSpreadsheet,
  Printer, Truck, Wallet, Loader2, Building2, MessageCircle, TrendingUp,
  Layers, Wrench, Undo2, Ban, Receipt, Edit3, ChefHat, Cake, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { bulkOrdersApi, type BulkOrder } from '../api/bulk-orders.api';
import { OrderDeliverModal, billedSaleId, printOrderSlip, type OrderForBill } from '../components/OrderDeliverModal';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   BULK ORDERS — SHADI, DAFTAR, EVENT
   ─────────────────────────────────────────────────────────────
   Ek shadi ka order poore mahine ki bikri ke barabar ho sakta hai.

   Ab juda hua:
     • "De diya" = ASLI BILL (OrderDeliverModal) — cheezon ka stock
       ghatta hai, Bikri me aata hai, baqi khate me
     • Order khulta hai → Edit (pehle list se khul hi nahi sakta tha)
     • 🍳 "Kya banana hai" — agle 1/3/7 din ke saare orders ki
       cheezein jama, stock se milan, aur kitchen ke liye print
   Theek hua:
     • "Advance nahi aaya" sirf pakke order par (QUOTED par nahi)
     • Cancel (advance ki yaad-dehani) + ek qadam peeche
     • Mahine ka chart tarteeb se
   ═════════════════════════════════════════════════════════════ */

const ROUTES = {
  create: '/bakery/bulk-orders/new',
  edit: (id: string) => `/bakery/bulk-orders/${id}/edit`,
  cake: '/bakery/cake-orders',
  receipt: (id: string) => `/sales/${id}/receipt`,
};

type Tab = 'list' | 'kitchen' | 'analytics';
type Filter = 'active' | 'week' | 'late' | 'unpaid' | 'all';

const STATUS: Record<string, { label: string; chip: string; hex: string }> = {
  ENQUIRY:     { label: 'Poocha hai', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', hex: '#94a3b8' },
  QUOTED:      { label: 'Rate bataya', chip: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300', hex: '#0ea5e9' },
  CONFIRMED:   { label: 'Pakka hua', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', hex: '#3b82f6' },
  IN_PROGRESS: { label: 'Ban raha hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', hex: '#f97316' },
  READY:       { label: 'Tayyar hai', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', hex: '#10b981' },
  DELIVERED:   { label: 'De diya', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', hex: '#059669' },
  CANCELLED:   { label: 'Cancel', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', hex: '#f43f5e' },
};

const NEXT: Record<string, { to: string; label: string }> = {
  ENQUIRY:     { to: 'QUOTED', label: 'Rate bata diya' },
  QUOTED:      { to: 'CONFIRMED', label: 'Pakka karein' },
  CONFIRMED:   { to: 'IN_PROGRESS', label: 'Banana shuru' },
  IN_PROGRESS: { to: 'READY', label: 'Tayyar hai' },
  READY:       { to: 'DELIVER', label: 'De diya — bill' },
};
const PREV: Record<string, string> = { QUOTED: 'ENQUIRY', CONFIRMED: 'QUOTED', IN_PROGRESS: 'CONFIRMED', READY: 'IN_PROGRESS' };

const DONE = ['DELIVERED', 'CANCELLED'];
/** Pakka order — isi par advance ka hisab banta hai aur kitchen me ginta hai */
const COMMITTED = ['CONFIRMED', 'IN_PROGRESS', 'READY'];

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6', '#ef4444'];
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, padding: '10px 12px',
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const stockOf = (p: any) => Number(p?.shopStock ?? p?.stock ?? 0);

function hoursTo(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (t - Date.now()) / 3_600_000;
}

function phrase(h: number): string {
  if (h < 0) {
    const p = Math.abs(h);
    return p < 24 ? `${Math.round(p)} ghante late` : `${Math.round(p / 24)} din late`;
  }
  if (h < 24) return `${Math.round(h)} ghante me`;
  return `${Math.round(h / 24)} din baad`;
}

function linesOf(o: any) {
  return (Array.isArray(o.items) ? o.items : []).map((i: any) => ({
    productId: i.productId ?? i.product?.id,
    name: String(i.name ?? i.productName ?? i.product?.name ?? 'Cheez'),
    qty: Number(i.qty ?? i.quantity ?? 0) || 0,
    rate: Number(i.rate ?? i.price ?? 0) || 0,
    unit: i.unit ?? i.product?.unit,
  }));
}

function toBill(o: any): OrderForBill {
  return {
    kind: 'bulk', id: o.id, orderNumber: o.orderNumber ?? o.id.slice(-6),
    customerName: o.organizationName || o.contactPerson, customerPhone: o.contactPhone,
    total: o.price, paid: Number(o.paidAmount || 0),
    lines: o.lines.length ? o.lines : [{ name: `${o.organizationName} ka order`, qty: 1, rate: o.price }],
    deliveryAddress: o.requiresDelivery ? (o.deliveryAddress || o.venue) : undefined,
  };
}

export default function BakeryBulkOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [kitchenDays, setKitchenDays] = useState<1 | 3 | 7>(3);
  const [showTeacher, setShowTeacher] = useState(false);
  const [payOn, setPayOn] = useState<any>(null);
  const [deliverOn, setDeliverOn] = useState<any>(null);
  const [cancelOn, setCancelOn] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ['bulk-orders'], queryFn: () => bulkOrdersApi.list({}), refetchInterval: 120_000 });
  const productsQ = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
    staleTime: 60_000,
    enabled: tab === 'kitchen',
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bulkOrdersApi.updateStatus(id, status),
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (_d, v) => { toast.success(`Halat: ${STATUS[v.status]?.label ?? v.status}`); qc.invalidateQueries({ queryKey: ['bulk-orders'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Halat nahi badli'),
  });

  const rows = useMemo(() => ((listQ.data ?? []) as BulkOrder[]).map((o: any) => {
    const left = hoursTo(o.eventDate);
    const price = Number(o.finalPrice ?? o.quotedPrice ?? 0);
    const due = Math.max(price - Number(o.paidAmount || 0), 0);
    const lines = linesOf(o);
    const isDone = DONE.includes(o.status);
    return {
      ...o, left, price, due, lines,
      itemCount: lines.length || Number(o.totalItems || 0),
      isDone,
      billId: billedSaleId(o.id),
      isLate: left !== null && left < 0 && !isDone,
      isSoon: left !== null && left >= 0 && left <= 168,
      noAdvance: COMMITTED.includes(o.status) && Number(o.advancePaid ?? o.paidAmount ?? 0) <= 0,
    };
  }), [listQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'active') out = out.filter((r) => !r.isDone);
    if (filter === 'week') out = out.filter((r) => r.isSoon && !r.isDone);
    if (filter === 'late') out = out.filter((r) => r.isLate);
    if (filter === 'unpaid') out = out.filter((r) => !r.isDone && r.due > 0);
    if (q) out = out.filter((r) =>
      [r.organizationName, r.orderNumber, r.contactPerson, r.contactPhone, r.venue]
        .some((x) => String(x ?? '').toLowerCase().includes(q)));
    return [...out].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return (a.left ?? 99999) - (b.left ?? 99999);
    });
  }, [rows, filter, q]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.isDone);
    const done = rows.filter((r) => r.status === 'DELIVERED');
    return {
      active: active.length,
      week: active.filter((r) => r.isSoon).length,
      late: rows.filter((r) => r.isLate).length,
      value: active.reduce((s, r) => s + r.price, 0),
      due: active.reduce((s, r) => s + r.due, 0),
      unpaid: active.filter((r) => r.due > 0).length,
      noAdvance: rows.filter((r) => r.noAdvance).length,
      delivered: done.length,
      avgTicket: done.length > 0 ? done.reduce((s, r) => s + r.price, 0) / done.length : 0,
    };
  }, [rows]);

  /* ── 🍳 Kya banana hai — pakke orders ki cheezein jama ── */
  const kitchen = useMemo(() => {
    const limit = kitchenDays * 24;
    const orders = rows.filter((r) => COMMITTED.includes(r.status) && r.left !== null && r.left <= limit);
    const products: any[] = productsQ.data?.items ?? [];
    const pBy = new Map(products.map((p) => [p.id, p]));
    type KitchenItem = { key: string; name: string; unit?: string; qty: number; productId?: string; orders: string[] };
    const m = new Map<string, KitchenItem>();
    orders.forEach((o) => o.lines.forEach((l: any) => {
      const key = l.productId ?? `n:${l.name.trim().toLowerCase()}`;
      const e: KitchenItem = m.get(key) ?? { key, name: l.name, unit: l.unit, qty: 0, productId: l.productId, orders: [] };
      e.qty += l.qty;
      if (!e.orders.includes(o.orderNumber)) e.orders.push(o.orderNumber);
      m.set(key, e);
    }));
    const items = [...m.values()].map((e) => {
      const p = e.productId ? pBy.get(e.productId) : undefined;
      const have = p ? stockOf(p) : null;
      return { ...e, unit: e.unit ?? p?.unit, have, make: have === null ? e.qty : Math.max(e.qty - have, 0) };
    }).sort((a, b) => b.make - a.make);
    return { orders, items, toMake: items.filter((i) => i.make > 0).length };
  }, [rows, kitchenDays, productsQ.data]);

  /* ── Charts ── */
  const statusPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => !r.isDone).forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ name: STATUS[k]?.label ?? k, value: v, hex: STATUS[k]?.hex }));
  }, [rows]);

  const typeChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.orderType) m.set(r.orderType, (m.get(r.orderType) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name: String(name).replace(/_/g, ' ').slice(0, 14), value }));
  }, [rows]);

  const monthChart = useMemo(() => {
    const m = new Map<string, { name: string; orders: number; value: number }>();
    rows.forEach((r) => {
      if (r.status === 'CANCELLED') return;
      const d = new Date(r.eventDate || r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const k = monthKey(d);
      const e = m.get(k) ?? { name: d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }), orders: 0, value: 0 };
      e.orders += 1; e.value += r.price;
      m.set(k, e);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([, v]) => ({ ...v, value: Math.round(v.value) }));
  }, [rows]);

  /* ── Kaam ── */
  const onNext = (o: any) => {
    const n = NEXT[o.status];
    if (!n) return;
    if (n.to === 'DELIVER') { setDeliverOn(o); return; }
    statusMut.mutate({ id: o.id, status: n.to });
  };

  const shop = { name: tenant?.name, phone: shopPhone, address: shopAddress };
  const printSlip = (o: any) => printOrderSlip(toBill(o), shop, {
    dueDate: o.eventDate ? `${new Date(o.eventDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}${o.eventTime ? ' ' + o.eventTime : ''}` : undefined,
    note: o.venue ? `Jagah: ${o.venue}` : undefined,
  });

  const waText = (o: any) => [
    `Assalam o alaikum${o.contactPerson ? ' ' + o.contactPerson : ''},`,
    `${tenant?.name ?? 'Bakery'} se — ${o.organizationName} ka order *${o.orderNumber}*`,
    `Halat: ${STATUS[o.status]?.label ?? o.status}`,
    o.eventDate ? `Event: ${new Date(o.eventDate).toLocaleDateString('en-PK', { dateStyle: 'medium' })}${o.eventTime ? ' ' + o.eventTime : ''}` : '',
    `Kul: ${formatPKR(o.price)} · Mila: ${formatPKR(o.paidAmount)}`,
    o.due > 0 ? `Baqi: ${formatPKR(o.due)}` : 'Poora paisa mil gaya ✅',
    'Shukriya!',
  ].filter(Boolean).join('\n');

  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi order nahi');
    const head = ['Order', 'Idara', 'Rabta', 'Phone', 'Qism', 'Event', 'Mehmaan', 'Halat', 'Rate', 'Mila', 'Baqi', 'Bill'];
    const body = shown.map((r) => [
      r.orderNumber, r.organizationName, r.contactPerson ?? '', r.contactPhone, r.orderType,
      r.eventDate ? new Date(r.eventDate).toLocaleString('en-PK') : '', r.totalGuests ?? '',
      STATUS[r.status]?.label ?? r.status, Math.round(r.price), Math.round(Number(r.paidAmount || 0)), Math.round(r.due),
      r.billId ? 'Ban gaya' : '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `bulk-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${shown.length} order CSV me`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deliverOn) return setDeliverOn(null);
        if (payOn) return setPayOn(null);
        if (cancelOn) return setCancelOn(null);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (deliverOn || payOn || cancelOn) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'g') setShowTeacher(true);
      else if (k === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      else if (k === 'k') setTab('kitchen');
      else if (k === 'n') navigate(ROUTES.create);
      else if (k === 'p') window.print();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [payOn, deliverOn, cancelOn, showTeacher, navigate]);

  const heroBtn = 'h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">
          {tenant?.name || 'Bakery'} — {tab === 'kitchen' ? `Kya banana hai (agle ${kitchenDays} din)` : 'Bare orders'}
        </h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" /> Bakery · Bara order
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🎪 Shadi &amp; Event Orders</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-amber-200">{stats.week}</strong> is hafte · <strong className="text-rose-200">{stats.late}</strong> late ·{' '}
              <strong className="text-white">{formatPKR(stats.value)}</strong> ka kaam
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to={ROUTES.create} title="Naya order (N)"
              className="h-11 px-3.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya order
            </Link>
            <Link to={ROUTES.cake} title="Cake orders"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <Cake className="h-4 w-4" /> <span className="hidden sm:inline">Cake orders</span>
            </Link>
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)" className={heroBtn}><GraduationCap className="h-4 w-4" /></button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><FileSpreadsheet className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="Print (P)" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <button onClick={() => listQ.refetch()} disabled={listQ.isRefetching} title="Taaza" className={`${heroBtn} disabled:opacity-50`}>
              <RefreshCw className={`h-4 w-4 ${listQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={Clock} label="Is hafte" value={stats.week} sub={stats.late > 0 ? `${stats.late} pehle hi late` : 'Koi late nahi'} tone="amber"
          active={filter === 'week' && tab === 'list'} onClick={() => { setFilter('week'); setTab('list'); }} />
        <Kpi icon={Layers} label="Chal rahe orders" value={stats.active} sub={formatPKR(stats.value)} tone="violet"
          active={filter === 'active' && tab === 'list'} onClick={() => { setFilter('active'); setTab('list'); }} />
        <Kpi icon={Wallet} label="Lena baqi hai" value={formatPKR(stats.due)}
          sub={stats.noAdvance > 0 ? `${stats.noAdvance} pakke order bina advance` : `${stats.unpaid} order par baqi`}
          tone={stats.noAdvance > 0 ? 'rose' : 'emerald'}
          active={filter === 'unpaid' && tab === 'list'} onClick={() => { setFilter('unpaid'); setTab('list'); }} />
        <Kpi icon={TrendingUp} label="Ausat order" value={formatPKR(stats.avgTicket)} sub={`${stats.delivered} poore ho chuke`} tone="emerald" />
      </section>

      {stats.noAdvance > 0 && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200 min-w-0 flex-1">
            <strong>{stats.noAdvance}</strong> pakke order par advance nahi aaya. Bina advance ke itna saamaan khareedna bakery ka paisa phansa deta hai.
          </p>
          <button onClick={() => { setFilter('unpaid'); setTab('list'); }}
            className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition">Dekhein</button>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Orders', ShoppingBag, shown.length], ['kitchen', 'Kya banana hai', ChefHat, kitchen.toMake || undefined], ['analytics', 'Analytics', BarChart3, undefined]] as const)
          .map(([v, label, Icon, n]) => (
            <button key={v} onClick={() => setTab(v as Tab)}
              className={`h-14 rounded-2xl border-2 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 sm:gap-2 transition ${
                tab === v ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-transparent shadow-lg'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
              }`}>
              <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{label}</span>
              {n !== undefined && <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{n}</span>}
            </button>
          ))}
      </div>

      {tab === 'list' && (
        <>
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Idara, order #, phone, jagah… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['active', 'Chal rahe', stats.active], ['week', '⏰ Is hafte', stats.week], ['late', '🔴 Late', stats.late],
                  ['unpaid', '💰 Baqi', stats.unpaid], ['all', 'Sab', rows.length]] as const).map(([v, l, n]) => (
                  <button key={v} onClick={() => setFilter(v as Filter)}
                    className={`h-12 px-3 rounded-2xl border-2 text-xs font-black inline-flex items-center gap-1.5 transition ${
                      filter === v ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                    }`}>{l} <span className="text-[10px] opacity-60 tabular-nums">{n}</span></button>
                ))}
              </div>
            </div>
          </section>

          {listQ.isLoading ? (
            <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-amber-100 dark:bg-amber-500/20 mx-auto flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-amber-600 dark:text-amber-400" /></div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {search ? 'Kuch nahi mila' : filter === 'late' ? 'Koi order late nahi — shabash' : 'Koi bara order nahi'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                Shadi, daftar ki party ya school ka function — bare order yahan aate hain. Ek cake ho to Cake orders istemal karein.
              </p>
              <Link to={ROUTES.create} className="mt-4 h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
                <Plus className="h-4 w-4" /> Naya bara order
              </Link>
            </div>
          ) : (
            <section className="space-y-2.5">
              {shown.map((o) => (
                <OrderCard key={o.id} o={o} busy={busyId === o.id}
                  onNext={() => onNext(o)}
                  onBack={PREV[o.status] ? () => statusMut.mutate({ id: o.id, status: PREV[o.status] }) : undefined}
                  onPay={() => setPayOn(o)}
                  onCancel={() => setCancelOn(o)}
                  onSlip={() => printSlip(o)}
                  onBill={o.billId ? () => navigate(ROUTES.receipt(o.billId)) : undefined}
                  waHref={o.contactPhone ? `https://wa.me/${String(o.contactPhone).replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(waText(o))}` : undefined} />
              ))}
            </section>
          )}
        </>
      )}

      {/* ═══ 🍳 KYA BANANA HAI ═══ */}
      {tab === 'kitchen' && (
        <div className="space-y-4">
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3 flex-wrap print:hidden">
            <ChefHat className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1 min-w-[200px]">
              Pakke orders (<strong>{kitchen.orders.length}</strong>) ki saari cheezein jama — stock minus kar ke <strong>kitna banana baqi</strong>.
            </p>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {([1, 3, 7] as const).map((d) => (
                <button key={d} onClick={() => setKitchenDays(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-black transition ${kitchenDays === d ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                  {d === 1 ? 'Kal tak' : `${d} din`}
                </button>
              ))}
            </div>
            <button onClick={() => window.print()} className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <Printer className="h-4 w-4" /> Kitchen ke liye print
            </button>
          </section>

          {kitchen.items.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
              <ChefHat className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="mt-3 font-black text-slate-700 dark:text-slate-200">Agle {kitchenDays} din me koi pakka order nahi</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Sirf "Pakka hua", "Ban raha hai" aur "Tayyar" wale order ginte hain.</p>
            </div>
          ) : (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      {['Cheez', 'Chahiye', 'Stock me', 'Banana hai', 'Orders'].map((h, i) => (
                        <th key={h} className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 ${i === 0 || i === 4 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {kitchen.items.map((i) => (
                      <tr key={i.key} className={i.make > 0 ? '' : 'opacity-60'}>
                        <td className="px-3 py-2.5 font-extrabold text-slate-900 dark:text-white">
                          {i.name}
                          {!i.productId && <span className="ml-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Maal se nahi juri</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{Number(i.qty.toFixed(2))} {i.unit ?? ''}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-500">
                          {i.have === null ? (productsQ.isLoading ? '…' : '—') : Number(i.have.toFixed(2))}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-black tabular-nums ${i.make > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600'}`}>
                          {i.make > 0 ? `${Number(i.make.toFixed(2))} ${i.unit ?? ''}` : 'Kaafi hai ✓'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-bold text-slate-500">{i.orders.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t-2 border-slate-100 dark:border-slate-800 p-3 space-y-1">
                {kitchen.orders.map((o) => (
                  <div key={o.id} className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                    <span className="font-black">{o.orderNumber}</span> · {o.organizationName} ·
                    <span className={o.isLate ? 'text-rose-600' : 'text-amber-600'}>
                      {o.eventDate && new Date(o.eventDate).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} ({o.left !== null ? phrase(o.left) : ''})
                    </span>
                    {o.requiresDelivery && <span>· 🚚 pahunchana</span>}
                    {o.requiresSetup && <span>· 🔧 setup {o.setupTime ?? ''}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard icon={Layers} title="Chal rahe orders kis halat me">
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusPie.map((p, i) => <Cell key={i} fill={p.hex ?? PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>
          <ChartCard icon={Building2} title="Kis qism ke order zyada">
            {typeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Order']} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>
          <ChartCard icon={TrendingUp} title="Mahine ke hisaab se (cancel ke bagair)" wide>
            {monthChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={11} fontWeight={700} />
                  <YAxis yAxisId="l" stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                  <YAxis yAxisId="r" orientation="right" stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [n === 'value' ? formatPKR(Number(v)) : v, n === 'value' ? 'Paisa' : 'Order']} />
                  <Legend formatter={(v) => (v === 'value' ? 'Paisa' : 'Order')} />
                  <Bar yAxisId="l" dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="r" dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyBox />}
          </ChartCard>
        </div>
      )}

      {payOn && (
        <PayModal order={payOn} onClose={() => setPayOn(null)}
          onDone={() => { setPayOn(null); qc.invalidateQueries({ queryKey: ['bulk-orders'] }); }} />
      )}

      {deliverOn && (
        <OrderDeliverModal accent="amber"
          order={toBill(deliverOn)}
          onClose={() => setDeliverOn(null)}
          onDone={() => setDeliverOn(null)}
          recordPayment={(amount) => bulkOrdersApi.payment(deliverOn.id, amount)}
          markDelivered={() => bulkOrdersApi.updateStatus(deliverOn.id, 'DELIVERED')} />
      )}

      {cancelOn && (
        <CancelModal order={cancelOn} pending={statusMut.isPending} onClose={() => setCancelOn(null)}
          onConfirm={() => statusMut.mutate({ id: cancelOn.id, status: 'CANCELLED' }, { onSuccess: () => setCancelOn(null) })} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          [class*="fixed"] { display: none !important; }
          .overflow-x-auto, .overflow-hidden { overflow: visible !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          table { font-size: 11px !important; border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 6px !important; color: #0f172a !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══ CARD ═══ */
function OrderCard({ o, onNext, onBack, onPay, onCancel, onSlip, onBill, waHref, busy }: any) {
  const s = STATUS[o.status] ?? STATUS.ENQUIRY;
  const next = NEXT[o.status];

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
      o.isDone ? 'border-slate-200 dark:border-slate-800 opacity-75'
        : o.isLate ? 'border-rose-300 dark:border-rose-500/40' : o.isSoon ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          o.isLate ? 'bg-rose-100 dark:bg-rose-500/20' : o.isSoon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-800'
        }`}>
          <Building2 className={`h-5 w-5 ${o.isLate ? 'text-rose-600' : o.isSoon ? 'text-amber-600' : 'text-slate-500'}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={ROUTES.edit(o.id)} className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-amber-600 truncate">{o.organizationName}</Link>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${s.chip}`}>{s.label}</span>
            <span className="text-[10px] font-black text-slate-400">{o.orderNumber}</span>
            {o.billId && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">Bill bana</span>}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {[o.contactPerson, String(o.orderType || '').replace(/_/g, ' ').toLowerCase(),
              o.totalGuests ? `${o.totalGuests} mehmaan` : '', o.itemCount ? `${o.itemCount} cheezein` : ''].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black inline-flex items-center gap-1 ${o.isLate ? 'text-rose-600' : o.isSoon ? 'text-amber-600' : 'text-slate-500'}`}>
              <Calendar className="h-3 w-3" />
              {o.isDone ? s.label : o.left !== null ? phrase(o.left) : 'Tareekh nahi'}
              {o.eventDate && ` · ${new Date(o.eventDate).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`}
            </span>
            {o.requiresDelivery && <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1"><Truck className="h-3 w-3" /> Pahunchana</span>}
            {o.requiresSetup && <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> Setup</span>}
          </div>
          {o.venue && <div className="text-[11px] font-bold text-slate-400 mt-0.5 inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> {o.venue}</div>}
          {o.lines.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {o.lines.slice(0, 4).map((l: any, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                  {l.name} × {Number(l.qty.toFixed(2))}
                </span>
              ))}
              {o.lines.length > 4 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">+{o.lines.length - 4} aur</span>}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(o.price)}</div>
          {o.due > 0 ? <div className="text-[11px] font-black text-amber-600 tabular-nums">{formatPKR(o.due)} baqi</div>
            : <div className="text-[11px] font-black text-emerald-600">Poora mil gaya</div>}
        </div>
      </div>

      {o.noAdvance && (
        <div className="mt-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
            Is pakke order par <strong>advance nahi aaya</strong>. Itna bara saamaan apni jeb se khareedna bakery ka paisa phansa deta hai.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
        {next && !o.isDone && (
          <button onClick={onNext} disabled={busy}
            className={`h-9 px-3 rounded-xl text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition ${
              next.to === 'DELIVER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : next.to === 'DELIVER' ? <Receipt className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {next.label}
          </button>
        )}
        {onBack && !o.isDone && (
          <button onClick={onBack} disabled={busy} title="Ek qadam peeche"
            className="h-9 w-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 inline-flex items-center justify-center disabled:opacity-50 transition">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
        )}
        {o.due > 0 && !o.isDone && (
          <button onClick={onPay}
            className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Wallet className="h-3.5 w-3.5" /> Paisa mila
          </button>
        )}
        {onBill && (
          <button onClick={onBill} className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Receipt className="h-3.5 w-3.5" /> Bill dekhein
          </button>
        )}
        <button onClick={onSlip} title="Order / advance ki parchi"
          className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
          <Printer className="h-3.5 w-3.5" /> Parchi
        </button>
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer"
            className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
        {o.contactPhone && (
          <a href={`tel:${o.contactPhone}`} className="h-9 w-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center transition">
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        <div className="ml-auto flex gap-1.5">
          {!o.isDone && (
            <button onClick={onCancel}
              className="h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          {!o.isDone && (
            <Link to={ROUTES.edit(o.id)}
              className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ PAISA ═══ */
function PayModal({ order, onClose, onDone }: any) {
  const due = order.due;
  const half = Math.round(order.price * 0.5 - Number(order.paidAmount || 0));
  const [amount, setAmount] = useState<number | ''>(half > 0 && half < due ? half : due);

  const mut = useMutation({
    mutationFn: () => bulkOrdersApi.payment(order.id, Number(amount) || 0),
    onSuccess: () => { toast.success(`${formatPKR(Number(amount))} darj ho gaya`); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Darj nahi hua'),
  });

  const bad = amount === '' || Number(amount) <= 0 || Number(amount) > due;
  const chips = [{ l: 'Poora', v: due }, { l: '50% tak', v: half }, { l: 'Aadha baqi', v: Math.round(due / 2) }].filter((c) => c.v > 0 && c.v <= due);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center"><Wallet className="h-5 w-5 text-emerald-600" /></span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">Paisa mila</h3>
            <p className="text-[11px] font-bold text-slate-500 truncate">{order.organizationName} · {formatPKR(due)} baqi</p>
          </div>
        </div>
        <input type="number" min={0} max={due} step="any" autoFocus value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !mut.isPending) mut.mutate(); }}
          className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {chips.map((c) => (
            <button key={c.l} onClick={() => setAmount(c.v)} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-black text-slate-700 dark:text-slate-200 tabular-nums transition">
              {c.l} <span className="opacity-60">{formatPKR(c.v)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] font-bold text-slate-400">Order dete waqt jo bill banta hai us me ye "pehle mila" gina jayega.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-700" disabled={bad} loading={mut.isPending} onClick={() => mut.mutate()}>
            <CheckCircle2 className="h-4 w-4" /> Darj karein
          </Button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ order, pending, onClose, onConfirm }: any) {
  const paid = Number(order.paidAmount || 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto"><Ban className="h-6 w-6 text-rose-600" /></div>
        <h3 className="mt-3 text-center font-black text-slate-900 dark:text-white text-lg">Order cancel karein?</h3>
        <p className="mt-1 text-center text-sm font-bold text-slate-500">{order.organizationName} · {order.orderNumber} · {formatPKR(order.price)}</p>
        {paid > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <strong>{formatPKR(paid)}</strong> advance aa chuka hai. Wapas karna hai ya kaat lena hai — idare se tay kar lein. Cancel se paisa khud wapas nahi hota.
            </p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Rehne dein</Button>
          <Button className="flex-[2] bg-rose-600 hover:bg-rose-700" loading={pending} onClick={onConfirm}>Haan, cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all ${
        active ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      } ${onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
          {sub && <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}><Icon className="h-5 w-5" /></div>
      </div>
    </Comp>
  );
}

function ChartCard({ icon: Icon, title, wide, children }: any) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-amber-600" /> {title}</h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Bare orders</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"><X className="h-4 w-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Receipt} title="POS, cake order, bara order">
            <strong>POS</strong> = abhi becho. <strong>Cake order</strong> = ek cake book. <strong>Bara order</strong> = shadi/daftar — kai cheezein, bari rakam.
          </Tip>
          <Tip icon={CheckCircle2} title="Agla qadam">
            Rate bataya → pakka → banana shuru → tayyar → de diya. ↶ se ek qadam peeche.
          </Tip>
          <Tip icon={Package} title='"De diya" = asli bill'>
            Jo cheez apne maal se juri hai us ka stock ghatta hai, rakam Bikri me aati hai, baqi paisa idare ke khate me. Ek order ka bill do dafa nahi banta.
          </Tip>
          <Tip icon={ChefHat} title="Kya banana hai (K)">
            Agle 1/3/7 din ke pakke orders ki saari cheezein ek list me — stock minus kar ke kitna banana baqi. Kitchen ke liye print kar dein.
          </Tip>
          <Tip icon={Wallet} title="Advance">
            Pakke order par advance na aaya ho to laal warning. "Paisa mila" me 50% ka button saamne hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya order</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">K</kbd> kya banana hai</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
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
      <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
