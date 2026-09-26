import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cake, Plus, X, Search, RefreshCw, Clock, Phone, CheckCircle2, AlertTriangle,
  BarChart3, GraduationCap, FileSpreadsheet, Printer, Truck, Store, Wallet,
  Loader2, ChefHat, Star, Layers, MessageCircle, ArrowRight, TrendingUp,
  Undo2, Ban, Receipt, ShoppingBag, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cakeOrdersApi, type CakeOrder } from '../api/cake-orders.api';
import { OrderDeliverModal, billedSaleId, printOrderSlip, type OrderForBill } from '../components/OrderDeliverModal';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   CAKE ORDERS — PEHLE SE BOOK HUE CAKE
   ─────────────────────────────────────────────────────────────
   POS = abhi becho.  Cake order = aaj book, kal do.

   Ab ye safha baqi app se jura hua hai:
     • "De diya" = ASLI BILL — stock ghatta hai, Bikri me aata hai,
       baqi paisa customer ke khate me (OrderDeliverModal)
     • Paisa baqi ho to pehle wahi poochta hai — bina paisa liye
       order chup-chaap "de diya" nahi hota
     • Advance ki raseed thermal par — POS wala hi printer
   Theek hua:
     • Advance poora hote hi halat khud "Advance mila"
     • Ghar bhejna ho to "Raaste me" ka qadam bhi
     • Cancel (advance wapsi ki yaad-dehani ke saath) + ek qadam peeche
     • "Aaj" ab asal din hai, 24 ghante nahi
     • Mahine ka chart tarteeb se
   ═════════════════════════════════════════════════════════════ */

const ROUTES = {
  create: '/bakery/cake-orders/new',
  detail: (id: string) => `/bakery/cake-orders/${id}`,
  bulk: '/bakery/bulk-orders',
  pos: '/pos',
  receipt: (id: string) => `/sales/${id}/receipt`,
};

type Tab = 'list' | 'analytics';
type Filter = 'active' | 'today' | 'tomorrow' | 'late' | 'ready' | 'unpaid' | 'all';

const STATUS: Record<string, { label: string; chip: string; hex: string }> = {
  ENQUIRY:          { label: 'Poocha hai', chip: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', hex: '#94a3b8' },
  CONFIRMED:        { label: 'Pakka hua', chip: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', hex: '#3b82f6' },
  DEPOSIT_PAID:     { label: 'Advance mila', chip: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300', hex: '#06b6d4' },
  IN_PRODUCTION:    { label: 'Ban raha hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', hex: '#f97316' },
  BAKING:           { label: 'Oven me hai', chip: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', hex: '#fb923c' },
  DECORATING:       { label: 'Sajawat ho rahi', chip: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300', hex: '#d946ef' },
  QUALITY_CHECK:    { label: 'Check ho raha', chip: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300', hex: '#8b5cf6' },
  READY:            { label: 'Tayyar hai', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', hex: '#10b981' },
  OUT_FOR_DELIVERY: { label: 'Raaste me', chip: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', hex: '#f59e0b' },
  DELIVERED:        { label: 'De diya', chip: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', hex: '#059669' },
  CANCELLED:        { label: 'Cancel', chip: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', hex: '#f43f5e' },
};

/** Agla qadam — 'DELIVER' ka matlab bill wali khirki */
function nextStep(o: any): { to: string; label: string } | null {
  switch (o.status) {
    case 'ENQUIRY': return { to: 'CONFIRMED', label: 'Pakka karein' };
    case 'CONFIRMED':
    case 'DEPOSIT_PAID': return { to: 'IN_PRODUCTION', label: 'Banana shuru' };
    case 'IN_PRODUCTION':
    case 'BAKING': return { to: 'DECORATING', label: 'Sajawat shuru' };
    case 'DECORATING':
    case 'QUALITY_CHECK': return { to: 'READY', label: 'Tayyar hai' };
    case 'READY': return o.deliveryType === 'DELIVERY'
      ? { to: 'OUT_FOR_DELIVERY', label: 'Bhej diya' }
      : { to: 'DELIVER', label: 'De diya — bill' };
    case 'OUT_FOR_DELIVERY': return { to: 'DELIVER', label: 'Pahunch gaya — bill' };
    default: return null;
  }
}

/** Ghalti se agla dab gaya — ek qadam peeche */
const PREV: Record<string, string> = {
  CONFIRMED: 'ENQUIRY',
  DEPOSIT_PAID: 'CONFIRMED',
  IN_PRODUCTION: 'CONFIRMED',
  BAKING: 'IN_PRODUCTION',
  DECORATING: 'IN_PRODUCTION',
  QUALITY_CHECK: 'DECORATING',
  READY: 'DECORATING',
  OUT_FOR_DELIVERY: 'READY',
};

const DONE = ['DELIVERED', 'CANCELLED'];
const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const PIE_COLORS = ['#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, padding: '10px 12px',
};

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

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
  if (h < 1) return `${Math.round(h * 60)} minute me`;
  if (h < 24) return `${Math.round(h)} ghante me`;
  return `${Math.round(h / 24)} din baad`;
}

const nice = (s?: string) => String(s ?? '').replace(/_/g, ' ').toLowerCase();

/** Cake order → bill ki lines */
function toBill(o: any): OrderForBill {
  const lines = Array.isArray(o.items) && o.items.length
    ? o.items.map((i: any) => ({
        productId: i.productId ?? i.product?.id,
        name: String(i.name ?? i.productName ?? i.product?.name ?? 'Cake'),
        qty: Number(i.qty ?? i.quantity ?? 1) || 1,
        rate: Number(i.rate ?? i.price ?? i.unitPrice ?? 0),
        unit: i.unit,
      }))
    : [{
        productId: o.productId ?? o.product?.id ?? o.bakeryProduct?.productId ?? undefined,
        name: ['🎂', o.occasion ? `${o.occasion} cake` : 'Cake', o.size ? nice(o.size) : '', o.flavor ? nice(o.flavor) : '']
          .filter(Boolean).join(' '),
        qty: 1,
        rate: Number(o.total || 0),
      }];
  return {
    kind: 'cake', id: o.id, orderNumber: o.orderNumber ?? o.id.slice(-6),
    customerName: o.customerName, customerPhone: o.customerPhone,
    total: Number(o.total || 0), paid: Number(o.paidAmount || 0),
    lines, deliveryAddress: o.deliveryType === 'DELIVERY' ? (o.deliveryAddress ?? undefined) : undefined,
  };
}

export default function CakeOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tenant = useAuthStore((s) => s.tenant);
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [payOn, setPayOn] = useState<any>(null);
  const [deliverOn, setDeliverOn] = useState<any>(null);
  const [cancelOn, setCancelOn] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ['cake-orders'],
    queryFn: () => cakeOrdersApi.list({}),
    refetchInterval: 120_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => cakeOrdersApi.updateStatus(id, status),
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (_d, v) => {
      toast.success(`Halat: ${STATUS[v.status]?.label ?? v.status}`);
      qc.invalidateQueries({ queryKey: ['cake-orders'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Halat nahi badli'),
  });

  /* ── Rows ── */
  const rows = useMemo(() => {
    const today0 = dayStart(new Date()).getTime();
    const tomorrow0 = today0 + 86_400_000;
    const after0 = tomorrow0 + 86_400_000;
    return ((listQ.data ?? []) as CakeOrder[]).map((o: any) => {
      const when = o.deliveryDate || o.neededBy;
      const t = when ? new Date(when).getTime() : NaN;
      const left = hoursTo(when);
      const due = Math.max(Number(o.total || 0) - Number(o.paidAmount || 0), 0);
      const advanceShort = Math.max(Number(o.advanceRequired || 0) - Number(o.advancePaid ?? o.paidAmount ?? 0), 0);
      const isDone = DONE.includes(o.status);
      return {
        ...o, left, due, advanceShort, isDone,
        billId: billedSaleId(o.id),
        isLate: left !== null && left < 0 && !isDone,
        isToday: !Number.isNaN(t) && t >= today0 && t < tomorrow0,
        isTomorrow: !Number.isNaN(t) && t >= tomorrow0 && t < after0,
      };
    });
  }, [listQ.data]);

  const q = search.trim().toLowerCase();
  const shown = useMemo(() => {
    let out = rows;
    if (filter === 'active') out = out.filter((r) => !r.isDone);
    if (filter === 'today') out = out.filter((r) => r.isToday && !r.isDone);
    if (filter === 'tomorrow') out = out.filter((r) => r.isTomorrow && !r.isDone);
    if (filter === 'late') out = out.filter((r) => r.isLate);
    if (filter === 'ready') out = out.filter((r) => r.status === 'READY' || r.status === 'OUT_FOR_DELIVERY');
    if (filter === 'unpaid') out = out.filter((r) => !r.isDone && r.due > 0);
    if (q) out = out.filter((r) =>
      [r.customerName, r.orderNumber, r.customerPhone, r.occasion, r.messageOnCake, r.flavor]
        .some((x) => String(x ?? '').toLowerCase().includes(q)));
    /* Jo pehle dena hai wo pehle — late sab se upar; mukammal neeche */
    return [...out].sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return (a.left ?? 99999) - (b.left ?? 99999);
    });
  }, [rows, filter, q]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.isDone);
    const rated = rows.filter((r) => Number(r.customerRating) > 0);
    return {
      active: active.length,
      today: active.filter((r) => r.isToday).length,
      tomorrow: active.filter((r) => r.isTomorrow).length,
      late: rows.filter((r) => r.isLate).length,
      ready: active.filter((r) => r.status === 'READY' || r.status === 'OUT_FOR_DELIVERY').length,
      value: active.reduce((s, r) => s + Number(r.total || 0), 0),
      due: active.reduce((s, r) => s + r.due, 0),
      unpaid: active.filter((r) => r.due > 0).length,
      advanceShort: active.filter((r) => r.advanceShort > 0 && r.status !== 'ENQUIRY').length,
      delivered: rows.filter((r) => r.status === 'DELIVERED').length,
      cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
      avgRating: rated.length > 0 ? rated.reduce((s, r) => s + Number(r.customerRating), 0) / rated.length : 0,
    };
  }, [rows]);

  /* ── Charts ── */
  const statusPie = useMemo(() => {
    const m = new Map<string, number>();
    rows.filter((r) => !r.isDone).forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return [...m.entries()].map(([k, v]) => ({ name: STATUS[k]?.label ?? k, value: v, hex: STATUS[k]?.hex }));
  }, [rows]);

  const occasionChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.occasion) m.set(r.occasion, (m.get(r.occasion) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.slice(0, 14), value }));
  }, [rows]);

  /* Tarteeb se — pehle Map ki andaruni tarteeb thi, "aakhri 8" koi bhi 8 ho sakte thay */
  const monthChart = useMemo(() => {
    const m = new Map<string, { name: string; orders: number; value: number }>();
    rows.forEach((r) => {
      if (r.status === 'CANCELLED') return;
      const d = new Date(r.deliveryDate || r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const k = monthKey(d);
      const e = m.get(k) ?? { name: d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }), orders: 0, value: 0 };
      e.orders += 1; e.value += Number(r.total || 0);
      m.set(k, e);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([, v]) => ({ ...v, value: Math.round(v.value) }));
  }, [rows]);

  /* ── Kaam ── */
  const onNext = (o: any) => {
    const n = nextStep(o);
    if (!n) return;
    if (n.to === 'DELIVER') { setDeliverOn(o); return; }
    statusMut.mutate({ id: o.id, status: n.to });
  };

  const shop = { name: tenant?.name, phone: shopPhone, address: shopAddress };
  const printSlip = (o: any) => printOrderSlip(toBill(o), shop, {
    dueDate: o.deliveryDate ? new Date(o.deliveryDate).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : undefined,
    note: o.messageOnCake ? `Cake par: "${o.messageOnCake}"` : undefined,
  });

  const waText = (o: any) => {
    const when = o.deliveryDate ? new Date(o.deliveryDate).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    return [
      `Assalam o alaikum ${o.customerName ?? ''},`,
      `${tenant?.name ?? 'Bakery'} se — aap ka cake order *${o.orderNumber}*`,
      `Halat: ${STATUS[o.status]?.label ?? o.status}`,
      when ? `${o.deliveryType === 'DELIVERY' ? 'Pahunchega' : 'Le sakte hain'}: ${when}` : '',
      `Kul: ${formatPKR(o.total)} · Mila: ${formatPKR(o.paidAmount)}`,
      o.due > 0 ? `Baqi: ${formatPKR(o.due)}` : 'Poora paisa mil gaya ✅',
      'Shukriya!',
    ].filter(Boolean).join('\n');
  };

  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Koi order nahi');
    const head = ['Order', 'Customer', 'Phone', 'Mauqa', 'Kab dena hai', 'Halat', 'Total', 'Mila', 'Baqi', 'Delivery', 'Bill'];
    const body = shown.map((r) => [
      r.orderNumber, r.customerName, r.customerPhone, r.occasion,
      r.deliveryDate ? new Date(r.deliveryDate).toLocaleString('en-PK') : '',
      STATUS[r.status]?.label ?? r.status, r.total, r.paidAmount, r.due,
      r.deliveryType === 'DELIVERY' ? 'Ghar bhejna' : 'Dukaan se', r.billId ? 'Ban gaya' : '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `cake-orders-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <h1 className="text-xl font-extrabold">{tenant?.name || 'Bakery'} — Cake orders</h1>
        <p className="text-xs text-slate-600">{new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })} · {shown.length} order</p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Cake className="h-3.5 w-3.5 text-pink-300" /> Bakery · Booking
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🎂 Cake Orders</h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90">
              <strong className="text-amber-200">{stats.today}</strong> aaj · <strong className="text-sky-200">{stats.tomorrow}</strong> kal ·{' '}
              <strong className="text-rose-200">{stats.late}</strong> late · <strong className="text-emerald-200">{stats.ready}</strong> tayyar
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Link to={ROUTES.create} title="Naya order (N)"
              className="h-11 px-3.5 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya order
            </Link>
            <Link to={ROUTES.bulk} title="Shadi / event ke bare order"
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
              <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Bare order</span>
            </Link>
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 w-11 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg transition">
              <GraduationCap className="h-4 w-4" />
            </button>
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
        <Kpi icon={Clock} label="Aaj dena hai" value={stats.today}
          sub={stats.late > 0 ? `${stats.late} pehle hi late` : `Kal ${stats.tomorrow}`} tone="amber"
          active={filter === 'today'} onClick={() => { setFilter('today'); setTab('list'); }} />
        <Kpi icon={Layers} label="Chal rahe orders" value={stats.active}
          sub={formatPKR(stats.value)} tone="fuchsia"
          active={filter === 'active'} onClick={() => { setFilter('active'); setTab('list'); }} />
        <Kpi icon={Wallet} label="Lena baqi hai" value={formatPKR(stats.due)}
          sub={stats.advanceShort > 0 ? `${stats.advanceShort} ka advance adhoora` : `${stats.unpaid} order par baqi`}
          tone={stats.advanceShort > 0 ? 'rose' : 'emerald'}
          active={filter === 'unpaid'} onClick={() => { setFilter('unpaid'); setTab('list'); }} />
        <Kpi icon={Star} label="Customer ki raye" value={stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} / 5` : '—'}
          sub={`${stats.delivered} de diye · ${stats.cancelled} cancel`} tone="emerald" />
      </section>

      {stats.late > 0 && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex items-center gap-3 flex-wrap print:hidden">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200 min-w-0 flex-1">
            <strong>{stats.late}</strong> order ka waqt guzar chuka hai. Cake late hone par customer hamesha ke liye chala
            jata hai — pehle inhein dekhein, aur customer ko WhatsApp par bata dein.
          </p>
          <button onClick={() => { setFilter('late'); setTab('list'); }}
            className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
            Dekhein <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([['list', 'Orders', Cake], ['analytics', 'Analytics', BarChart3]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v as Tab)}
            className={`h-14 rounded-2xl border-2 font-black text-sm inline-flex items-center justify-center gap-2 transition ${
              tab === v ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-transparent shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-pink-400'
            }`}>
            <Icon className="h-4 w-4" /> {label}
            {v === 'list' && <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${tab === v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'}`}>{shown.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'list' ? (
        <>
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 print:hidden">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Customer, order #, phone, mauqa… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['active', 'Chal rahe', stats.active], ['today', '⏰ Aaj', stats.today], ['tomorrow', '📅 Kal', stats.tomorrow],
                  ['late', '🔴 Late', stats.late], ['ready', '✅ Tayyar', stats.ready], ['unpaid', '💰 Baqi', stats.unpaid], ['all', 'Sab', rows.length]] as const)
                  .map(([v, l, n]) => (
                    <button key={v} onClick={() => setFilter(v as Filter)}
                      className={`h-12 px-3 rounded-2xl border-2 text-xs font-black inline-flex items-center gap-1.5 transition ${
                        filter === v ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-400'
                      }`}>{l} <span className="text-[10px] opacity-60 tabular-nums">{n}</span></button>
                  ))}
              </div>
            </div>
          </section>

          {listQ.isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
              <div className="h-16 w-16 rounded-3xl bg-pink-100 dark:bg-pink-500/20 mx-auto flex items-center justify-center">
                <Cake className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="mt-4 font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl">
                {search ? 'Kuch nahi mila' : filter === 'late' ? 'Koi order late nahi — shabash' : 'Koi order nahi'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-1.5 max-w-md mx-auto">
                Birthday ya shadi ka cake pehle se book hota hai. Counter par abhi bechna ho to POS istemal karein.
              </p>
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                <Link to={ROUTES.create} className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-black inline-flex items-center gap-2 transition">
                  <Plus className="h-4 w-4" /> Naya order
                </Link>
                <Link to={ROUTES.pos} className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black inline-flex items-center gap-2 transition">
                  <Receipt className="h-4 w-4" /> POS
                </Link>
              </div>
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
                  waHref={o.customerPhone ? `https://wa.me/${String(o.customerPhone).replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(waText(o))}` : undefined}
                  onBill={o.billId ? () => navigate(ROUTES.receipt(o.billId)) : undefined} />
              ))}
            </section>
          )}
        </>
      ) : (
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

          <ChartCard icon={Cake} title="Kis mauqe ke cake sab se zyada">
            {occasionChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occasionChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Order']} />
                  <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={48} />
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
          onDone={async (paidNow: number) => {
            const o = payOn;
            setPayOn(null);
            /* Advance poora hua to halat khud "Advance mila" */
            const advNow = Number(o.advancePaid ?? o.paidAmount ?? 0) + paidNow;
            if (['ENQUIRY', 'CONFIRMED'].includes(o.status) && Number(o.advanceRequired) > 0 && advNow >= Number(o.advanceRequired)) {
              try { await cakeOrdersApi.updateStatus(o.id, 'DEPOSIT_PAID'); } catch { /* halat na badli to koi baat nahi */ }
            }
            qc.invalidateQueries({ queryKey: ['cake-orders'] });
          }} />
      )}

      {deliverOn && (
        <OrderDeliverModal
          order={toBill(deliverOn)}
          onClose={() => setDeliverOn(null)}
          onDone={() => setDeliverOn(null)}
          recordPayment={(amount) => cakeOrdersApi.addPayment(deliverOn.id, amount)}
          markDelivered={() => cakeOrdersApi.updateStatus(deliverOn.id, 'DELIVERED')}
        />
      )}

      {cancelOn && (
        <CancelModal order={cancelOn} pending={statusMut.isPending}
          onClose={() => setCancelOn(null)}
          onConfirm={() => statusMut.mutate({ id: cancelOn.id, status: 'CANCELLED' }, { onSuccess: () => setCancelOn(null) })} />
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═══ ORDER CARD ═══ */
function OrderCard({ o, onNext, onBack, onPay, onCancel, onSlip, onBill, waHref, busy }: any) {
  const s = STATUS[o.status] ?? STATUS.ENQUIRY;
  const next = nextStep(o);
  const late = o.isLate;
  const soon = o.isToday && !late;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 shadow-sm p-3 sm:p-4 avoid-break ${
      o.isDone ? 'border-slate-200 dark:border-slate-800 opacity-75'
        : late ? 'border-rose-300 dark:border-rose-500/40' : soon ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          late ? 'bg-rose-100 dark:bg-rose-500/20' : soon ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-pink-100 dark:bg-pink-500/20'
        }`}>
          <Cake className={`h-5 w-5 ${late ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-pink-600 dark:text-pink-400'}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={ROUTES.detail(o.id)} className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-pink-600 truncate">{o.customerName}</Link>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${s.chip}`}>{s.label}</span>
            <span className="text-[10px] font-black text-slate-400">{o.orderNumber}</span>
            {o.billId && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">Bill bana</span>}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {[o.occasion, o.size ? nice(o.size) : '', o.flavor ? nice(o.flavor) : '', o.weightPounds ? `${o.weightPounds} pound` : ''].filter(Boolean).join(' · ')}
          </div>
          {o.messageOnCake && <div className="text-[11px] font-black text-fuchsia-600 dark:text-fuchsia-400 mt-0.5 truncate">✍️ "{o.messageOnCake}"</div>}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black inline-flex items-center gap-1 ${late ? 'text-rose-600' : soon ? 'text-amber-600' : 'text-slate-500'}`}>
              <Clock className="h-3 w-3" />
              {o.isDone ? s.label : o.left !== null ? phrase(o.left) : 'Tareekh nahi'}
              {o.deliveryDate && ` · ${new Date(o.deliveryDate).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}`}
            </span>
            <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1">
              {o.deliveryType === 'DELIVERY' ? <><Truck className="h-3 w-3" /> Ghar bhejna</> : <><Store className="h-3 w-3" /> Dukaan se lena</>}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(o.total)}</div>
          {o.due > 0 ? <div className="text-[11px] font-black text-amber-600 tabular-nums">{formatPKR(o.due)} baqi</div>
            : <div className="text-[11px] font-black text-emerald-600">Poora mil gaya</div>}
        </div>
      </div>

      {o.advanceShort > 0 && !o.isDone && o.status !== 'ENQUIRY' && (
        <div className="mt-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
            Advance me <strong>{formatPKR(o.advanceShort)}</strong> kam hai. Bina poora advance liye bara cake banane se bakery
            ka paisa phans jata hai.
          </p>
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5 flex-wrap print:hidden">
        {next && !o.isDone && (
          <button onClick={onNext} disabled={busy}
            className={`h-9 px-3 rounded-xl text-white text-[11px] font-black inline-flex items-center gap-1.5 disabled:opacity-60 transition ${
              next.to === 'DELIVER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-pink-600 hover:bg-pink-700'
            }`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : next.to === 'DELIVER' ? <Receipt className="h-3.5 w-3.5" /> : <ChefHat className="h-3.5 w-3.5" />}
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
          <button onClick={onBill}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <Receipt className="h-3.5 w-3.5" /> Bill dekhein
          </button>
        )}
        <button onClick={onSlip} title="Advance ki raseed / parchi"
          className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
          <Printer className="h-3.5 w-3.5" /> Parchi
        </button>
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer"
            className="h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        )}
        {o.customerPhone && (
          <a href={`tel:${o.customerPhone}`}
            className="h-9 w-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center transition">
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        <div className="ml-auto flex gap-1.5">
          {!o.isDone && (
            <button onClick={onCancel} title="Cancel"
              className="h-9 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition">
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
          <Link to={ROUTES.detail(o.id)}
            className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center gap-1.5 transition">
            Tafseel <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══ PAISA ═══ */
function PayModal({ order, onClose, onDone }: any) {
  const due = Math.max(Number(order.total || 0) - Number(order.paidAmount || 0), 0);
  const advLeft = Math.max(Number(order.advanceRequired || 0) - Number(order.advancePaid ?? order.paidAmount ?? 0), 0);
  const [amount, setAmount] = useState<number | ''>(advLeft > 0 ? Math.min(advLeft, due) : due);

  const mut = useMutation({
    mutationFn: () => cakeOrdersApi.addPayment(order.id, Number(amount) || 0),
    onSuccess: () => { toast.success(`${formatPKR(Number(amount))} darj ho gaya`); onDone(Number(amount) || 0); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Darj nahi hua'),
  });

  const bad = amount === '' || Number(amount) <= 0 || Number(amount) > due;
  const chips = [
    { l: 'Poora', v: due },
    { l: 'Advance', v: advLeft },
    { l: 'Aadha', v: Math.round(due / 2) },
  ].filter((c) => c.v > 0 && c.v <= due);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center"><Wallet className="h-5 w-5 text-emerald-600" /></span>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white">Paisa mila</h3>
            <p className="text-[11px] font-bold text-slate-500 truncate">{order.customerName} · {formatPKR(due)} baqi</p>
          </div>
        </div>
        <input type="number" min={0} max={due} step="any" autoFocus value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !mut.isPending) mut.mutate(); }}
          className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-2xl font-black text-center tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {chips.map((c) => (
            <button key={c.l} onClick={() => setAmount(c.v)}
              className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-black text-slate-700 dark:text-slate-200 tabular-nums transition">
              {c.l} <span className="opacity-60">{formatPKR(c.v)}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] font-bold text-slate-400">
          Ye paisa order par darj hota hai. Cake dete waqt jo bill banta hai us me ye "pehle mila" gina jayega.
        </p>
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

/* ═══ CANCEL ═══ */
function CancelModal({ order, pending, onClose, onConfirm }: any) {
  const paid = Number(order.paidAmount || 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto"><Ban className="h-6 w-6 text-rose-600" /></div>
        <h3 className="mt-3 text-center font-black text-slate-900 dark:text-white text-lg">Order cancel karein?</h3>
        <p className="mt-1 text-center text-sm font-bold text-slate-500">{order.customerName} · {order.orderNumber} · {formatPKR(order.total)}</p>
        {paid > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
              Customer <strong>{formatPKR(paid)}</strong> de chuka hai. Wapas karna hai ya agle order me ginna hai — ye
              customer se tay kar lein. Cancel se ye paisa khud wapas nahi hota.
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
    fuchsia: 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={`rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all ${
        active ? 'border-pink-500 ring-2 ring-pink-200 dark:ring-pink-500/20 bg-pink-50/60 dark:bg-pink-500/10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
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
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-pink-600" /> {title}</h3>
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Cake orders ka safha</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"><X className="h-4 w-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Receipt} title="POS aur order me farq">
            <strong>POS</strong> = abhi becho. <strong>Cake order</strong> = aaj book karo, advance lo, kal do.
          </Tip>
          <Tip icon={ChefHat} title="Agla qadam — ek button">
            Pakka → banana shuru → sajawat → tayyar → (ghar bhejna ho to "bhej diya") → de diya. Ghalti ho to ↶ se ek qadam peeche.
          </Tip>
          <Tip icon={Package} title='"De diya" = asli bill'>
            Cake dete hi bill banta hai: jis maal se jora ho us ka stock ghatta hai, rakam Bikri me aati hai, aur baqi
            paisa customer ke khate me jata hai. Ek order ka bill do dafa nahi banta.
          </Tip>
          <Tip icon={Wallet} title="Advance">
            "Paisa mila" se advance darj karein — poora hote hi halat khud "Advance mila" ho jati hai. "Parchi" se
            customer ko advance ki raseed de dein.
          </Tip>
          <Tip icon={Ban} title="Cancel">
            Advance liya hua ho to cancel karte waqt yaad-dehani aati hai — paisa khud wapas nahi hota.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">N</kbd> naya order</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
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
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" /></div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
