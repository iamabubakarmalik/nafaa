import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Globe, Package, RefreshCw, Search, ShoppingBag, TrendingUp, Wallet, Zap, X,
  BarChart3, CalendarRange, CalendarDays, ChevronDown, Clock, Filter, FileSpreadsheet,
  GraduationCap, Printer, Trophy, Truck, CheckCircle2, XCircle, AlertTriangle, MapPin,
  User, Users, ArrowRight, Sun, Sunrise, Sunset, Moon, Repeat, Banknote, Timer, Keyboard,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { onlineOrdersApi, type OnlineOrder } from '../api/online-orders.api';
import { useLiveOnlineOrders } from '../hooks/useLiveOnlineOrders';
import { OrderDetailPanel } from '../components/OrderDetailPanel';
import { STATUS_LABEL, rs, sourceOf, timeAgo } from '../lib/labels';
import { channelMeta, useSalesChannels } from '../hooks/useSalesChannels';
import { cn } from '@core/lib/cn';
import { RiskBadge } from '../components/RiskBadge';
import { BulkBar } from '../components/BulkBar';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   ONLINE ORDERS — WEBSITE KA POORA HISAAB  (Bikri page jaisa)
   ─────────────────────────────────────────────────────────────
   📋 Kaam ki list: Naye → Chal rahe → Delivered / COD / Cancel
   ⏰ Der se pare naye order ki warning • customer cancel request
   📊 Aath KPI, order ka safar (pipeline), rozana rujhan (khali
      din bhi), kis waqt / kis din, source, COD vs paid, shehar,
      kya bika, qeemti + dobara aane wale customer
   🔎 Tareekh, source, payment ki chaant • CSV khulase ke saath
   ⌨️ / search • A analytics • N naye • J/K agla/pichla • R taaza
      G guide • P print • Esc band
   ═════════════════════════════════════════════════════════════ */

type View = 'list' | 'analytics';
type Tab = 'PENDING' | 'ACTIVE' | 'DELIVERED' | 'CLOSED' | 'ALL' | 'COD_DUE';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';
type PayFilter = 'all' | 'COD' | 'PAID';

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'PENDING', label: 'Naye', hint: 'Accept karne hain' },
  { key: 'ACTIVE', label: 'Chal rahe', hint: 'Pack / raste me' },
  { key: 'DELIVERED', label: 'Delivered', hint: 'Mil gaye' },
  { key: 'COD_DUE', label: 'COD baqi', hint: 'Paisa aana hai' },
  { key: 'CLOSED', label: 'Cancel', hint: 'Cancel / reject' },
  { key: 'ALL', label: 'Sab', hint: 'Har order' },
];

const ACTIVE_S = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
const CLOSED_S = ['CANCELLED', 'REJECTED'];
const PIPELINE = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const PIPE_ICON: Record<string, any> = {
  PENDING: Zap, CONFIRMED: CheckCircle2, PREPARING: Package, READY: ShoppingBag, OUT_FOR_DELIVERY: Truck, DELIVERED: CheckCircle2,
};

const DATE_OPTS: Array<[DateFilter, string]> = [
  ['today', 'Aaj'], ['yesterday', 'Kal'], ['week', '7 din'],
  ['month', '30 din'], ['year', 'Is saal'], ['all', 'Sab'], ['custom', '📅 Apni tareekh'],
];

/** Pending itne minute se zyada para rahe to warning */
const STALE_MIN = 15;

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const C = { value: '#10b981', orders: '#0ea5e9', hours: '#f59e0b', peak: '#059669', weekday: '#14b8a6', cod: '#f97316', paid: '#10b981' };
const PALETTE = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'];

/* ── Waqt — maqami din par ── */
const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayEnd = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDT = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const fmtTime = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(v));
const hourLabel = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);

const DAYPARTS = [
  { key: 'subah', label: 'Subah', range: '5am – 11am', icon: Sunrise, from: 5, to: 11 },
  { key: 'dopahar', label: 'Dopahar', range: '11am – 4pm', icon: Sun, from: 11, to: 16 },
  { key: 'shaam', label: 'Shaam', range: '4pm – 9pm', icon: Sunset, from: 16, to: 21 },
  { key: 'raat', label: 'Raat', range: '9pm – 5am', icon: Moon, from: 21, to: 29 },
] as const;
const daypartOf = (h: number) => DAYPARTS.find((p) => { const hh = h < 5 ? h + 24 : h; return hh >= p.from && hh < p.to; })!;

/* ── Order ke chhote helper ── */
const orderNo = (o: OnlineOrder) => String(o.externalOrderNumber ?? o.externalOrderId ?? '');
const phoneOf = (o: OnlineOrder): string => (o as any).customerPhone ?? (o as any).phone ?? '';
const isClosed = (o: OnlineOrder) => CLOSED_S.includes(o.orderStatus);
const isCodDue = (o: OnlineOrder) => o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o);
const lineValue = (i: any) => Number(i.total ?? i.lineTotal ?? Number(i.price ?? i.unitPrice ?? 0) * Number(i.quantity || 0));
const waitMin = (o: OnlineOrder, now: number) => Math.floor((now - new Date(o.receivedAt).getTime()) / 60000);
const statusShort = (s: string) => STATUS_LABEL[s as keyof typeof STATUS_LABEL]?.short ?? s;

export default function OnlineOrdersPage() {
  const [params, setParams] = useSearchParams();
  const hideAmounts = useCostHidden();
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>('list');
  // Customers safhe se aaye (?search=phone) → sab orders me dhoondo
  const [tab, setTab] = useState<Tab>(() => (params.get('search') ? 'ALL' : 'PENDING'));
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [debounced, setDebounced] = useState(() => params.get('search') ?? '');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
  const [showDate, setShowDate] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [visible, setVisible] = useState(50);
  const [now, setNow] = useState(() => Date.now());
  const selectedId = params.get('order');
  // Sidebar ka channel link (?channel=) — sirf usi website/store ke orders
  const channelId = params.get('channel') || undefined;
  const { data: channels } = useSalesChannels();
  const channel = channels?.find((c) => c.id === channelId);
  const setChannel = (id?: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('channel', id); else next.delete('channel');
    next.delete('order');
    setParams(next, { replace: true });
  };

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { setVisible(50); }, [tab, debounced, dateFilter, customStart, customEnd, sourceFilter, payFilter]);

  const live = useLiveOnlineOrders();

  /* ── List: server par tab + search ke hisab se ── */
  const listQ = useQuery({
    queryKey: ['online-orders', tab, debounced, channelId],
    queryFn: () =>
      onlineOrdersApi.list({
        integrationId: channelId,
        status: tab === 'ALL' || tab === 'COD_DUE' ? undefined : tab,
        payment: tab === 'COD_DUE' ? 'COD_DUE' : undefined,
        search: debounced || undefined,
        limit: 100,
      }),
    refetchInterval: 15_000,
  });

  /* ── Analytics / KPI: haal ke sab orders (tareekh client par lagti hai) ── */
  const allQ = useQuery({
    queryKey: ['online-orders-all', channelId],
    queryFn: () => onlineOrdersApi.list({ limit: 500, integrationId: channelId }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const refreshAll = () => { listQ.refetch(); allQ.refetch(); };

  // Naya order aaya → dono list foran taaza
  useEffect(() => {
    if (live.data) refreshAll();
  }, [live.data?.pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const [canNotify, setCanNotify] = useState(() => typeof Notification === 'undefined' || Notification.permission !== 'default');

  const counts = listQ.data?.counts ?? allQ.data?.counts ?? {};
  const serverStats = listQ.data?.stats ?? allQ.data?.stats;
  const tabCount = (t: Tab) => {
    if (t === 'PENDING') return counts.PENDING ?? 0;
    if (t === 'ACTIVE') return ACTIVE_S.reduce((a, k) => a + (counts[k] ?? 0), 0);
    if (t === 'DELIVERED') return counts.DELIVERED ?? 0;
    if (t === 'CLOSED') return CLOSED_S.reduce((a, k) => a + (counts[k] ?? 0), 0);
    if (t === 'COD_DUE') return serverStats?.codDueCount ?? 0;
    return Object.values(counts).reduce((a, b) => a + b, 0);
  };

  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('order', id); else next.delete('order');
    setParams(next, { replace: true });
  };

  /* ── Tareekh ka daira ── */
  const [from, to] = useMemo<[Date, Date]>(() => {
    const n = new Date();
    switch (dateFilter) {
      case 'today': return [dayStart(n), dayEnd(n)];
      case 'yesterday': { const y = new Date(n); y.setDate(y.getDate() - 1); return [dayStart(y), dayEnd(y)]; }
      case 'week': { const f = new Date(n); f.setDate(f.getDate() - 6); return [dayStart(f), dayEnd(n)]; }
      case 'month': { const f = new Date(n); f.setDate(f.getDate() - 29); return [dayStart(f), dayEnd(n)]; }
      case 'year': return [new Date(n.getFullYear(), 0, 1), dayEnd(n)];
      case 'custom': return [
        customStart ? dayStart(new Date(customStart)) : new Date(0),
        customEnd ? dayEnd(new Date(customEnd)) : dayEnd(n),
      ];
      default: return [new Date(0), dayEnd(n)];
    }
  }, [dateFilter, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    if (dateFilter === 'all') return 'Shuru se ab tak';
    const f = (d: Date) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
    return dayKey(from) === dayKey(to) ? f(from) : `${f(from)} — ${f(to)}`;
  }, [dateFilter, from, to]);

  const inRange = (o: OnlineOrder) => { const t = new Date(o.receivedAt).getTime(); return t >= from.getTime() && t <= to.getTime(); };
  /** Naye aur chal rahe = kaam ki qatar — un par tareekh nahi lagti, warna purana order chhup jata */
  const dateApplies = tab !== 'PENDING' && tab !== 'ACTIVE';

  const matchSource = (o: OnlineOrder) => sourceFilter === 'all' || sourceOf(o).label === sourceFilter;
  const matchPay = (o: OnlineOrder) => payFilter === 'all' || (payFilter === 'COD' ? o.isCod : o.paymentStatus === 'PAID');

  /* ── List ki rows ── */
  // Kai orders ek saath (accept / agla qadam / book / cancel)
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const stopSelecting = () => { setSelecting(false); setPicked(new Set()); };

  const shown = useMemo(() => {
    const items = listQ.data?.items ?? [];
    return items
      .filter((o) => (!dateApplies || inRange(o)) && matchSource(o) && matchPay(o))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQ.data, dateApplies, from, to, sourceFilter, payFilter]);

  /* ── Analytics ka data: tareekh + chaant, test order bahar ── */
  const allOrders = allQ.data?.items ?? [];
  const sources = useMemo(() => [...new Set(allOrders.map((o) => sourceOf(o).label))].sort(), [allOrders]);
  const ranged = useMemo(
    () => allOrders.filter((o) => !o.isTest && inRange(o) && matchSource(o) && matchPay(o)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOrders, from, to, sourceFilter, payFilter],
  );
  const valid = useMemo(() => ranged.filter((o) => !isClosed(o)), [ranged]);

  const stats = useMemo(() => {
    const value = valid.reduce((a, o) => a + Number(o.total || 0), 0);
    const delivered = ranged.filter((o) => o.orderStatus === 'DELIVERED');
    const closed = ranged.filter(isClosed);
    const codDue = ranged.filter(isCodDue);
    const finished = delivered.length + closed.length;
    return {
      count: ranged.length,
      validCount: valid.length,
      value,
      avg: valid.length ? value / valid.length : 0,
      delivered: delivered.length,
      deliveredValue: delivered.reduce((a, o) => a + Number(o.total || 0), 0),
      closed: closed.length,
      cancelRate: ranged.length ? (closed.length / ranged.length) * 100 : 0,
      successRate: finished ? (delivered.length / finished) * 100 : 0,
      codDueCount: codDue.length,
      codDueValue: codDue.reduce((a, o) => a + Number(o.total || 0), 0),
      codShare: valid.length ? (valid.filter((o) => o.isCod).length / valid.length) * 100 : 0,
      best: valid.reduce<OnlineOrder | null>((b, o) => (Number(o.total) > Number(b?.total ?? 0) ? o : b), null),
    };
  }, [ranged, valid]);

  /* ── Foran tawajjuh ── */
  const stalePending = useMemo(
    () => allOrders.filter((o) => o.orderStatus === 'PENDING' && !o.isTest && waitMin(o, now) >= STALE_MIN)
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()),
    [allOrders, now],
  );
  const cancelRequests = useMemo(
    () => allOrders.filter((o) => o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED'),
    [allOrders],
  );

  /* ── Charts ── */
  const pipeline = useMemo(() => {
    const m: Record<string, number> = {};
    ranged.forEach((o) => { m[o.orderStatus] = (m[o.orderStatus] ?? 0) + 1; });
    return { steps: PIPELINE.map((k) => ({ key: k, label: statusShort(k), n: m[k] ?? 0 })), closed: CLOSED_S.reduce((a, k) => a + (m[k] ?? 0), 0) };
  }, [ranged]);

  const daily = useMemo(() => {
    const start = dateFilter === 'all' && valid.length
      ? dayStart(new Date(Math.min(...valid.map((o) => new Date(o.receivedAt).getTime()))))
      : from;
    const days = Math.min(Math.max(Math.ceil((to.getTime() - start.getTime()) / 86400000), 1), 90);
    const b: Record<string, { name: string; value: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(to); d.setDate(to.getDate() - i);
      b[dayKey(d)] = { name: d.toLocaleDateString('en-PK', days > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }), value: 0, orders: 0 };
    }
    valid.forEach((o) => { const k = dayKey(new Date(o.receivedAt)); if (b[k]) { b[k].value += Number(o.total || 0); b[k].orders += 1; } });
    return Object.values(b).map((v) => ({ ...v, value: Math.round(v.value) }));
  }, [valid, from, to, dateFilter]);

  const hourly = useMemo(() => {
    const b = Array.from({ length: 24 }, (_, h) => ({ h, label: hourLabel(h), orders: 0, value: 0 }));
    valid.forEach((o) => { const h = new Date(o.receivedAt).getHours(); b[h].orders += 1; b[h].value += Number(o.total || 0); });
    return b;
  }, [valid]);
  const peak = useMemo(() => hourly.reduce((b, h) => (h.orders > b.orders ? h : b), hourly[0]), [hourly]);

  const dayparts = useMemo(() => {
    const m = new Map<string, { orders: number; value: number }>(DAYPARTS.map((p) => [p.key, { orders: 0, value: 0 }]));
    valid.forEach((o) => { const e = m.get(daypartOf(new Date(o.receivedAt).getHours()).key)!; e.orders += 1; e.value += Number(o.total || 0); });
    const total = valid.length;
    return DAYPARTS.map((p) => ({ ...p, ...m.get(p.key)!, pct: total ? (m.get(p.key)!.orders / total) * 100 : 0 }));
  }, [valid]);
  const topPart = useMemo(() => dayparts.reduce((b, p) => (p.orders > b.orders ? p : b), dayparts[0]), [dayparts]);

  const weekday = useMemo(() => {
    const names = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
    const rows = names.map((label) => ({ label, orders: 0, value: 0 }));
    valid.forEach((o) => { const d = new Date(o.receivedAt).getDay(); rows[d].orders += 1; rows[d].value += Number(o.total || 0); });
    return rows;
  }, [valid]);

  const sourcePie = useMemo(() => {
    const m = new Map<string, { name: string; emoji: string; orders: number; value: number }>();
    valid.forEach((o) => {
      const s = sourceOf(o);
      const e = m.get(s.label) ?? { name: s.label, emoji: s.emoji, orders: 0, value: 0 };
      e.orders += 1; e.value += Number(o.total || 0);
      m.set(s.label, e);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).map((v, i) => ({ ...v, value: Math.round(v.value), hex: PALETTE[i % PALETTE.length] }));
  }, [valid]);

  const payPie = useMemo(() => {
    const cod = valid.filter((o) => o.isCod);
    const pre = valid.filter((o) => !o.isCod);
    const sum = (l: OnlineOrder[]) => Math.round(l.reduce((a, o) => a + Number(o.total || 0), 0));
    const codCollected = cod.filter((o) => o.paymentStatus === 'PAID');
    return {
      pie: [
        { name: 'COD', value: sum(cod), orders: cod.length, hex: C.cod },
        { name: 'Pehle se paid', value: sum(pre), orders: pre.length, hex: C.paid },
      ].filter((x) => x.orders > 0),
      codCollected: sum(codCollected),
      codPending: sum(cod.filter((o) => o.paymentStatus !== 'PAID')),
    };
  }, [valid]);

  const cities = useMemo(() => {
    const m = new Map<string, { name: string; orders: number; value: number }>();
    valid.forEach((o) => {
      const k = (o.customerCity || '').trim() || 'Shehar darj nahi';
      const e = m.get(k.toLowerCase()) ?? { name: k, orders: 0, value: 0 };
      e.orders += 1; e.value += Number(o.total || 0);
      m.set(k.toLowerCase(), e);
    });
    return [...m.values()].sort((a, b) => b.orders - a.orders).slice(0, 8);
  }, [valid]);

  const topItems = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; value: number; orders: number }>();
    valid.forEach((o) => o.items.forEach((i: any) => {
      const k = i.name ?? 'Doosri cheez';
      const e = m.get(k) ?? { name: k, qty: 0, value: 0, orders: 0 };
      e.qty += Number(i.quantity || 0); e.value += lineValue(i); e.orders += 1;
      m.set(k, e);
    }));
    return [...m.values()].sort((a, b) => (b.value || b.qty) - (a.value || a.qty)).slice(0, 10);
  }, [valid]);

  const customers = useMemo(() => {
    const m = new Map<string, { name: string; phone: string; city?: string; orders: number; value: number; due: number }>();
    valid.forEach((o) => {
      const phone = phoneOf(o);
      const k = (phone || o.customerName || '').replace(/\s+/g, '').toLowerCase();
      if (!k) return;
      const e = m.get(k) ?? { name: o.customerName, phone, city: o.customerCity ?? undefined, orders: 0, value: 0, due: 0 };
      e.orders += 1; e.value += Number(o.total || 0); if (isCodDue(o)) e.due += Number(o.total || 0);
      m.set(k, e);
    });
    const all = [...m.values()];
    const repeat = all.filter((c) => c.orders > 1).length;
    return { top: all.sort((a, b) => b.value - a.value).slice(0, 10), total: all.length, repeat, repeatPct: all.length ? (repeat / all.length) * 100 : 0 };
  }, [valid]);

  const showValue = (v: string) => (hideAmounts ? '•••••' : v);
  const hasFilters = !!search || dateFilter !== 'month' || sourceFilter !== 'all' || payFilter !== 'all';
  const clearFilters = () => { setSearch(''); setDateFilter('month'); setCustomStart(''); setCustomEnd(''); setSourceFilter('all'); setPayFilter('all'); };
  const goTab = (t: Tab) => { setTab(t); setView('list'); };

  /* ── CSV — upar khulasa ── */
  const exportCsv = () => {
    if (shown.length === 0) return toast.error('Is list me koi order nahi');
    const head = [
      ['Online orders — Nafaa'],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}  •  List: ${TABS.find((t) => t.key === tab)?.label}`],
      [`Muddat: ${dateApplies ? rangeLabel : 'Sab (kaam ki qatar)'}  •  Orders: ${shown.length}  •  Kul: ${shown.reduce((a, o) => a + Number(o.total || 0), 0).toFixed(2)}`],
      [''],
    ];
    const cols = ['Order', 'Tareekh', 'Waqt', 'Customer', 'Phone', 'Shehar', 'Source', 'Cheezein', 'Qty', 'Total', 'COD', 'Payment', 'Halat', 'Tracking', 'Test'];
    const body = shown.map((o) => [
      orderNo(o), new Date(o.receivedAt).toLocaleDateString('en-PK'), fmtTime(o.receivedAt),
      o.customerName, phoneOf(o), o.customerCity ?? '', sourceOf(o).label,
      o.items.length, o.items.reduce((a, i) => a + Number(i.quantity || 0), 0),
      Number(o.total || 0).toFixed(2), o.isCod ? 'Haan' : 'Nahi', o.paymentStatus,
      statusShort(o.orderStatus), o.trackingNumber ?? '', o.isTest ? 'Haan' : '',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...head, cols, ...body].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `online-orders-${dayKey(new Date())}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${shown.length} order CSV me`);
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showDate || showMore) { setShowDate(false); setShowMore(false); return; }
        if (selectedId) return open(null);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey || showTeacher) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setView('list'); setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setView((v) => (v === 'analytics' ? 'list' : 'analytics'));
      else if (k === 'n') goTab('PENDING');
      else if (k === 'r') { refreshAll(); toast.success('Taaza kar diya'); }
      else if (k === 'g') setShowTeacher(true);
      else if (k === 'p') window.print();
      else if ((k === 'j' || k === 'k') && view === 'list' && shown.length) {
        e.preventDefault();
        const idx = shown.findIndex((o) => o.id === selectedId);
        const next = k === 'j' ? Math.min(idx + 1, shown.length - 1) : Math.max(idx - 1, 0);
        open(shown[idx === -1 ? 0 : next].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showDate, showMore, selectedId, shown, view]);

  const isEmptyEverywhere = !listQ.isLoading && !allQ.isLoading && Object.keys(counts).length === 0 && allOrders.length === 0 && !debounced;
  const heroBtn = 'h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition';
  const isFetching = listQ.isFetching || allQ.isFetching;

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-10">
      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-extrabold">Online orders — {TABS.find((t) => t.key === tab)?.label}</h1>
        <p className="text-xs text-slate-600">
          {dateApplies ? rangeLabel : 'Kaam ki qatar (har tareekh)'} • {new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {shown.length} order • Kul {rs(shown.reduce((a, o) => a + Number(o.total || 0), 0))} • COD baqi {rs(serverStats?.codDueValue ?? 0)}
        </p>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Globe className="h-3.5 w-3.5 text-emerald-300" /> Website · Orders
              {(counts.PENDING ?? 0) > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 text-slate-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900 animate-pulse" /> {counts.PENDING} naye
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
              {channel ? <>{channelMeta(channel.type).emoji} {channel.displayName}</> : '🛍️ Online Orders'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/90 max-w-2xl">
              {rangeLabel} · <strong className="text-emerald-200">{stats.validCount}</strong> order ·{' '}
              <strong>{showValue(rs(stats.value))}</strong>
              {stats.codDueValue > 0 && <> · <span className="text-amber-200">{showValue(rs(stats.codDueValue))} COD baqi</span></>}
            </p>
            <p className="mt-1 text-[11px] font-bold text-white/70">
              Accept karo — bill aur receipt khud banti hai, stock kam ho jata hai.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            {!canNotify && (
              <button onClick={() => Notification.requestPermission().finally(() => setCanNotify(true))} title="Desktop alert on karein"
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition">
                <Bell className="h-4 w-4" /> <span className="hidden sm:inline">Alert on</span>
              </button>
            )}
            <button onClick={refreshAll} disabled={isFetching} title="Taaza (R)" className={`${heroBtn} disabled:opacity-50`}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><FileSpreadsheet className="h-4 w-4" /></button>
            <Link to="/online-store/website" title="Website connect"
              className="h-11 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Globe className="h-4 w-4" /> <span className="hidden sm:inline">Website</span>
            </Link>
            <button onClick={() => window.print()} title="Print (P)"
              className="h-11 px-3.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {isEmptyEverywhere ? <EmptyState /> : (
        <>
          {/* ═══ KPI — do qatar ═══ */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <Kpi icon={Zap} label="Naye orders" value={counts.PENDING ?? 0} tone="amber" pulse={(counts.PENDING ?? 0) > 0}
              sub={stalePending.length ? `${stalePending.length} ${STALE_MIN}+ min se ruke` : 'Accept karne hain'}
              onClick={() => goTab('PENDING')} active={view === 'list' && tab === 'PENDING'} />
            <Kpi icon={Truck} label="Chal rahe" value={tabCount('ACTIVE')} tone="sky" sub="Pack / raste me"
              onClick={() => goTab('ACTIVE')} active={view === 'list' && tab === 'ACTIVE'} />
            <Kpi icon={TrendingUp} label="Kul online sale" value={showValue(rs(stats.value))} sub={rangeLabel} tone="emerald" highlight />
            <Kpi icon={CheckCircle2} label="Delivered" value={stats.delivered}
              sub={`${showValue(rs(stats.deliveredValue))} · ${stats.successRate.toFixed(0)}% kamyab`} tone="violet"
              onClick={() => goTab('DELIVERED')} active={view === 'list' && tab === 'DELIVERED'} />
          </section>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
            <Kpi icon={Wallet} label="COD paisa baqi" value={showValue(rs(serverStats?.codDueValue ?? 0))}
              sub={`${serverStats?.codDueCount ?? 0} order — courier se lena hai`} tone="rose"
              onClick={() => goTab('COD_DUE')} active={view === 'list' && tab === 'COD_DUE'} />
            <Kpi icon={BarChart3} label="Ausat order" value={showValue(rs(stats.avg))} sub={`${stats.codShare.toFixed(0)}% COD par`} tone="sky" />
            <Kpi icon={XCircle} label="Cancel / reject" value={`${stats.cancelRate.toFixed(0)}%`} sub={`${stats.closed} order is arse me`} tone="rose"
              onClick={() => goTab('CLOSED')} active={view === 'list' && tab === 'CLOSED'} />
            <Kpi icon={Trophy} label="Sab se bara order" value={showValue(rs(stats.best?.total ?? 0))}
              sub={stats.best ? `${stats.best.customerName} · #${orderNo(stats.best)}` : '—'} tone="amber"
              onClick={stats.best ? () => { setView('list'); setTab('ALL'); open(stats.best!.id); } : undefined} />
          </section>

          {/* ═══ FORAN TAWAJJUH ═══ */}
          {(stalePending.length > 0 || cancelRequests.length > 0) && (
            <section className="grid sm:grid-cols-2 gap-3 print:hidden">
              {stalePending.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4 flex gap-3">
                  <Timer className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                      {stalePending.length} naya order {STALE_MIN} minute se zyada se ruka hai
                    </h3>
                    <p className="text-[12px] font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                      Sab se purana <strong>#{orderNo(stalePending[0])}</strong> ({stalePending[0].customerName}) —{' '}
                      {waitMin(stalePending[0], now)} minute. Der hone par customer cancel kar deta hai.
                    </p>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {stalePending.slice(0, 4).map((o) => (
                        <button key={o.id} onClick={() => { goTab('PENDING'); open(o.id); }}
                          className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black transition">
                          #{orderNo(o)} · {waitMin(o, now)}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {cancelRequests.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-amber-900 dark:text-amber-200 text-sm">
                      {cancelRequests.length} customer ne cancel maanga hai
                    </h3>
                    <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                      Parcel bhejne se pehle dekh lein — warna courier ka kharcha aur wapsi dono aapke sar.
                    </p>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {cancelRequests.slice(0, 4).map((o) => (
                        <button key={o.id} onClick={() => { goTab('ALL'); open(o.id); }}
                          className="h-8 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition">
                          #{orderNo(o)} · {statusShort(o.orderStatus)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ═══ VIEW TABS ═══ */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
            {([
              { v: 'list' as const, label: 'Orders', hint: 'Accept, pack, bhejo', icon: ShoppingBag, n: shown.length as number | undefined },
              { v: 'analytics' as const, label: 'Analytics', hint: 'Kab, kya, kahan aur kis se', icon: BarChart3, n: undefined },
            ]).map((t) => {
              const on = view === t.v;
              return (
                <button key={t.v} onClick={() => setView(t.v)}
                  className={`group relative overflow-hidden rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                    on ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-transparent text-white shadow-xl shadow-emerald-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:shadow-lg'
                  }`}>
                  <div className="relative flex items-center gap-3">
                    <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      on ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                    }`}><t.icon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black truncate">{t.label}</span>
                        {t.n !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${on ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{t.n}</span>
                        )}
                      </div>
                      <div className={`text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400'}`}>{t.hint}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ═══ CHANNELS ═══ */}
          {(channels?.length ?? 0) > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 print:hidden">
              <button onClick={() => setChannel(undefined)}
                className={cn('shrink-0 h-10 px-3.5 rounded-xl text-xs font-black border-2 transition inline-flex items-center gap-1.5',
                  !channelId ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300')}>
                <Globe className="h-3.5 w-3.5" /> Sab channels
              </button>
              {channels!.map((c) => (
                <button key={c.id} onClick={() => setChannel(c.id)}
                  className={cn('shrink-0 h-10 px-3.5 rounded-xl text-xs font-black border-2 transition inline-flex items-center gap-1.5',
                    channelId === c.id ? 'bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-500/30' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-300',
                    !c.live && 'opacity-60')}>
                  <span>{channelMeta(c.type).emoji}</span> {c.displayName}
                  {c.pendingOrders > 0 && (
                    <span className={cn('rounded-md px-1.5 text-[10px] tabular-nums', channelId === c.id ? 'bg-white/25' : 'bg-amber-500 text-white')}>{c.pendingOrders}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ═══ TOOLBAR ═══ */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 space-y-3 print:hidden">
            {view === 'list' && (
              <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1">
                {TABS.map((t) => {
                  const c = tabCount(t.key);
                  const on = tab === t.key;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)} title={t.hint}
                      className={cn(
                        'flex flex-1 shrink-0 min-w-[92px] flex-col items-center justify-center rounded-xl px-3 py-2 transition',
                        on ? 'bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
                      )}>
                      <span className="flex items-center gap-1.5 text-sm font-black">
                        {t.label}
                        {c > 0 && (
                          <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums',
                            t.key === 'PENDING' ? 'bg-amber-500 text-white' : t.key === 'COD_DUE' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200')}>
                            {c}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:block">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => { setSearch(e.target.value); setView('list'); }}
                  placeholder="Order #, naam, phone, tracking… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setShowDate((v) => !v); setShowMore(false); }}
                  className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                    dateFilter !== 'month' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                  }`}>
                  <CalendarRange className="h-4 w-4" />
                  <span className="max-w-[140px] truncate">{DATE_OPTS.find(([v]) => v === dateFilter)?.[1]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showDate ? 'rotate-180' : ''}`} />
                </button>
                {showDate && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowDate(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tareekh chunein</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DATE_OPTS.map(([v, l]) => (
                          <button key={v} onClick={() => { setDateFilter(v); if (v !== 'custom') setShowDate(false); }}
                            className={`h-10 rounded-xl text-xs font-black transition ${
                              dateFilter === v ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}>{l}</button>
                        ))}
                      </div>
                      {dateFilter === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {([['Se', customStart, setCustomStart], ['Tak', customEnd, setCustomEnd]] as const).map(([l, v, set]) => (
                            <div key={l}>
                              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{l}</label>
                              <input type="date" value={v} onChange={(e) => set(e.target.value)}
                                className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 [color-scheme:light] dark:[color-scheme:dark]" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] font-bold text-slate-500 text-center">{rangeLabel}</div>
                      <p className="text-[10px] font-bold text-slate-400 text-center">"Naye" aur "Chal rahe" par tareekh nahi lagti — koi order chhupe na.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setShowMore((v) => !v); setShowDate(false); }}
                  className={`h-12 px-4 rounded-2xl border-2 text-sm font-black inline-flex items-center gap-2 transition ${
                    sourceFilter !== 'all' || payFilter !== 'all' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-400'
                  }`}>
                  <Filter className="h-4 w-4" /> Chaant
                  {(sourceFilter !== 'all' || payFilter !== 'all') && (
                    <span className="h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center">
                      {[sourceFilter !== 'all', payFilter !== 'all'].filter(Boolean).length}
                    </span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showMore ? 'rotate-180' : ''}`} />
                </button>
                {showMore && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                    <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-3 space-y-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Order kahan se aaya</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['all', ...sources].map((s) => (
                            <button key={s} onClick={() => setSourceFilter(s)}
                              className={`h-10 rounded-xl text-[11px] font-black truncate px-2 transition ${
                                sourceFilter === s ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>{s === 'all' ? 'Sab' : s}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Paisa</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([['all', 'Sab'], ['COD', 'COD'], ['PAID', 'Paid']] as const).map(([v, l]) => (
                            <button key={v} onClick={() => setPayFilter(v)}
                              className={`h-10 rounded-xl text-[11px] font-black transition ${
                                payFilter === v ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {hasFilters && (
                <button onClick={clearFilters} title="Chaant hatao"
                  className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {hasFilters && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-black">
                <span className="text-slate-400">Chaant:</span>
                <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {view === 'list' && !dateApplies ? 'Har tareekh (kaam ki qatar)' : rangeLabel}
                </span>
                {sourceFilter !== 'all' && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{sourceFilter}</span>}
                {payFilter !== 'all' && <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">{payFilter === 'COD' ? 'Sirf COD' : 'Sirf paid'}</span>}
                {search && <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">"{search}"</span>}
                <span className="text-slate-400">→ {view === 'list' ? shown.length : stats.count} order</span>
              </div>
            )}
          </section>

          {/* ═══════ ANALYTICS ═══════ */}
          {view === 'analytics' ? (
            allQ.isLoading ? <Skeleton /> : (
              <div className="space-y-4 print:hidden">
                {/* Order ka safar */}
                <Panel icon={Truck} title="Order ka safar" hint={`${rangeLabel} — har marhale par kitne order (test order shamil nahi)`}>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {pipeline.steps.map((s, i) => {
                      const Icon = PIPE_ICON[s.key] ?? Package;
                      const max = Math.max(...pipeline.steps.map((x) => x.n), 1);
                      return (
                        <button key={s.key}
                          onClick={() => goTab(s.key === 'PENDING' ? 'PENDING' : s.key === 'DELIVERED' ? 'DELIVERED' : 'ACTIVE')}
                          className="relative rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-left hover:border-emerald-400 transition">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
                            <span className="h-5 w-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px]">{i + 1}</span>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="mt-1.5 text-xs font-black text-slate-700 dark:text-slate-200 truncate">{s.label}</div>
                          <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{s.n}</div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${(s.n / max) * 100}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid sm:grid-cols-3 gap-2 text-[12px] font-bold">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2.5 text-emerald-800 dark:text-emerald-300">
                      ✅ Kamyab delivery: <strong>{stats.successRate.toFixed(0)}%</strong> (khatam hue orders me se)
                    </div>
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-2.5 text-rose-800 dark:text-rose-300">
                      ❌ Cancel / reject: <strong>{pipeline.closed}</strong> order ({stats.cancelRate.toFixed(0)}%)
                    </div>
                    <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 p-2.5 text-orange-800 dark:text-orange-300">
                      💵 COD baqi is arse ka: <strong>{showValue(rs(stats.codDueValue))}</strong> · {stats.codDueCount} order
                    </div>
                  </div>
                </Panel>

                {/* Din ke hisse */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {dayparts.map((p) => {
                    const top = p.key === topPart.key && p.orders > 0;
                    return (
                      <div key={p.key} className={`rounded-2xl border-2 p-4 ${
                        top ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          <p.icon className={`h-4 w-4 ${top ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="text-sm font-black text-slate-900 dark:text-white">{p.label}</span>
                          {top && <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">Rush</span>}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">{p.range}</div>
                        <div className="mt-2 text-lg font-black text-slate-900 dark:text-white tabular-nums">{p.orders} order</div>
                        <div className="text-[11px] font-bold text-slate-500">{showValue(rs(p.value))} · {p.pct.toFixed(0)}%</div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </section>

                <Panel icon={TrendingUp} title="Roz ke orders aur online sale" hint={`${rangeLabel} — khali din bhi nazar aate hain`}>
                  {daily.some((d) => d.orders > 0) ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={daily}>
                          <defs>
                            <linearGradient id="ooVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={C.value} stopOpacity={0.45} />
                              <stop offset="100%" stopColor={C.value} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                          <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                          <YAxis yAxisId="v" stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                          <YAxis yAxisId="o" orientation="right" stroke={AXIS} fontSize={11} width={36} allowDecimals={false} />
                          <Tooltip contentStyle={TOOLTIP}
                            formatter={(v: any, n: any) => [n === 'orders' ? v : rs(Number(v)), n === 'orders' ? 'Orders' : 'Sale']} />
                          <Legend formatter={(v) => (v === 'orders' ? 'Orders' : 'Sale')} />
                          <Bar yAxisId="o" dataKey="orders" fill={C.orders} radius={[4, 4, 0, 0]} maxBarSize={14} />
                          <Area yAxisId="v" type="monotone" dataKey="value" stroke={C.value} strokeWidth={3} fill="url(#ooVal)" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <EmptyBox text="Is arse me koi online order nahi" />}
                </Panel>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Panel icon={Clock} title="Kis waqt order aate hain" hint={peak?.orders ? `Sab se zyada: ${peak.label} (${peak.orders} order)` : 'Staff isi hisab se rakhein'}>
                    {hourly.some((h) => h.orders > 0) ? (
                      <>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourly}>
                              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                              <XAxis dataKey="label" stroke={AXIS} fontSize={9} interval={1} />
                              <YAxis stroke={AXIS} fontSize={11} width={32} allowDecimals={false} />
                              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Orders']} />
                              <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                                {hourly.map((h, i) => <Cell key={i} fill={h.h === peak?.h ? C.peak : C.hours} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                          Hara column sab se masroof ghanta hai — us waqt koi phone ke paas ho taake order foran accept ho.
                        </p>
                      </>
                    ) : <EmptyBox />}
                  </Panel>

                  <Panel icon={CalendarDays} title="Hafte ka kaun sa din behtar" hint="Ads aur offers kis din chalayein">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekday}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                          <XAxis dataKey="label" stroke={AXIS} fontSize={11} fontWeight={700} />
                          <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                          <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [n === 'orders' ? v : rs(Number(v)), n === 'orders' ? 'Orders' : 'Sale']} />
                          <Bar dataKey="value" fill={C.weekday} radius={[8, 8, 0, 0]} maxBarSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Panel icon={Globe} title="Order kahan se aaye" hint="Website, Shopify, WordPress…">
                    {sourcePie.length === 0 ? <EmptyBox /> : (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={sourcePie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4} stroke="none">
                                {sourcePie.map((p, i) => <Cell key={i} fill={p.hex} />)}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => rs(Number(v))} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {sourcePie.map((p) => (
                            <div key={p.name} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 truncate">{p.emoji} {p.name} · {p.orders}</span>
                              <span className="text-xs font-black tabular-nums shrink-0" style={{ color: p.hex }}>{showValue(rs(p.value))}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Panel>

                  <Panel icon={Banknote} title="COD ya pehle se paid" hint="COD ka paisa courier ke paas phansta hai">
                    {payPie.pie.length === 0 ? <EmptyBox /> : (
                      <>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={payPie.pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4} stroke="none">
                                {payPie.pie.map((p, i) => <Cell key={i} fill={p.hex} />)}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => rs(Number(v))} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2">
                            <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">COD wasool</div>
                            <div className="text-sm font-black tabular-nums text-emerald-800 dark:text-emerald-200">{showValue(rs(payPie.codCollected))}</div>
                          </div>
                          <button onClick={() => goTab('COD_DUE')} className="rounded-xl bg-orange-50 dark:bg-orange-500/10 p-2 text-left hover:ring-2 ring-orange-300 transition">
                            <div className="text-[10px] font-black text-orange-700 dark:text-orange-300">COD abhi baqi →</div>
                            <div className="text-sm font-black tabular-nums text-orange-800 dark:text-orange-200">{showValue(rs(payPie.codPending))}</div>
                          </button>
                        </div>
                      </>
                    )}
                  </Panel>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Panel icon={Package} title="Sab se zyada kya bika" hint="Online orders me">
                    {topItems.length === 0 ? <EmptyBox /> : (
                      <RankList rows={topItems.map((p) => ({
                        key: p.name, title: p.name, meta: `${Number(p.qty.toFixed(1))} bike · ${p.orders} order`,
                        right: p.value > 0 ? showValue(rs(p.value)) : `${Number(p.qty.toFixed(1))}`, bar: p.value || p.qty,
                      }))} />
                    )}
                  </Panel>

                  <Panel icon={MapPin} title="Kaun se shehar" hint="Courier aur delivery charges isi hisab se">
                    {cities.length === 0 ? <EmptyBox /> : (
                      <RankList rows={cities.map((c) => ({
                        key: c.name, title: c.name, meta: `${c.orders} order`, right: showValue(rs(c.value)), bar: c.orders,
                      }))} />
                    )}
                  </Panel>
                </div>

                <Panel icon={Users} title="Sab se qeemti customer"
                  hint={customers.total ? `${customers.total} customer · ${customers.repeat} dobara aaye (${customers.repeatPct.toFixed(0)}%)` : 'Online khareedne wale'}>
                  {customers.top.length === 0 ? <EmptyBox /> : (
                    <>
                      <div className="mb-3 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border-2 border-teal-200 dark:border-teal-500/30 p-3 flex items-center gap-3">
                        <Repeat className="h-5 w-5 text-teal-600 shrink-0" />
                        <p className="text-[12px] font-bold text-teal-900 dark:text-teal-200">
                          <strong>{customers.repeatPct.toFixed(0)}%</strong> customer dobara order karte hain.
                          {customers.repeatPct < 20 ? ' Kam hai — parcel me shukriya card ya agle order par discount rakhein.' : ' Achha hai — inhein WhatsApp par naye maal ki khabar dein.'}
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-1.5">
                        {customers.top.map((c, i) => (
                          <div key={c.name + c.phone + i} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                            <span className={`h-9 w-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                              i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>{i === 0 ? '👑' : i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-sm text-slate-900 dark:text-white truncate">{c.name}</div>
                              <div className="text-[11px] font-bold text-slate-500 truncate">
                                {c.orders} order{c.city ? ` · ${c.city}` : ''}{c.phone ? ` · ${c.phone}` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{showValue(rs(c.value))}</div>
                              {c.due > 0 && <div className="text-[10px] font-black text-orange-600 tabular-nums">{showValue(rs(c.due))} COD baqi</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Panel>

                {allOrders.length >= 500 && (
                  <p className="text-[11px] font-bold text-slate-400 text-center">
                    Analytics haal ke 500 orders par hai — lambi muddat ke liye tareekh chhoti karein.
                  </p>
                )}
              </div>
            )
          ) : (
            /* ═══════ LIST + DETAIL ═══════ */
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
              <div className="min-w-0">
                {listQ.isLoading ? <Skeleton /> : shown.length === 0 ? (
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-14 text-center">
                    <div className="text-4xl">📭</div>
                    <p className="mt-3 font-black text-slate-800 dark:text-slate-100 text-lg">
                      {search ? `"${search}" se koi order nahi mila` : tab === 'PENDING' ? 'Koi naya order nahi' : 'Is list me koi order nahi'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
                      {tab === 'PENDING' ? 'Naya order aate hi ghanti bajegi aur yahan dikhega.' : 'Tareekh ya chaant badal kar dekhein.'}
                    </p>
                    {hasFilters && (
                      <div className="mt-4"><Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Chaant hatao</Button></div>
                    )}
                  </div>
                ) : (
                  <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:shadow-none">
                    <div className="flex items-center gap-2 border-b-2 border-slate-100 px-4 py-2 text-xs font-bold dark:border-slate-800 sm:px-5 print:hidden">
                      {selecting ? (
                        <>
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chuno"
                            checked={shown.slice(0, visible).every((o) => picked.has(o.id))}
                            onChange={(e) => setPicked(e.target.checked ? new Set(shown.slice(0, visible).map((o) => o.id)) : new Set())} />
                          <span className="text-slate-600 dark:text-slate-300">Sab {Math.min(visible, shown.length)} chuno</span>
                          <span className="flex-1" />
                          <button onClick={stopSelecting} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Chhoro</button>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400">{shown.length} order</span>
                          <span className="flex-1" />
                          <button onClick={() => setSelecting(true)} className="rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">☑ Kai orders chunein</button>
                        </>
                      )}
                    </div>
                    <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                      {shown.slice(0, visible).map((o) => (
                        <OrderRow key={o.id} order={o} now={now} active={o.id === selectedId} hide={hideAmounts}
                          selecting={selecting} checked={picked.has(o.id)}
                          onClick={() => (selecting ? togglePick(o.id) : open(o.id))} />
                      ))}
                    </div>
                    {visible < shown.length && (
                      <button onClick={() => setVisible((v) => v + 50)}
                        className="w-full py-4 text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border-t-2 border-slate-100 dark:border-slate-800 inline-flex items-center justify-center gap-1 transition print:hidden">
                        Aur {Math.min(50, shown.length - visible)} dikhayein <ArrowRight className="h-3 w-3" />
                        <span className="text-slate-400 ml-1">({visible}/{shown.length})</span>
                      </button>
                    )}
                  </section>
                )}
              </div>

              {/* Detail (desktop) */}
              <div className="hidden lg:block print:hidden">
                <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {selectedId ? (
                    <OrderDetailPanel key={selectedId} orderId={selectedId} onClose={() => open(null)} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                      <div className="text-4xl">👈</div>
                      <div className="mt-2 font-black text-slate-800 dark:text-white">Order chunein</div>
                      <p className="mt-1 text-sm text-slate-500">Poori detail, items, customer aur buttons yahan dikhenge.</p>
                      <p className="mt-3 text-[11px] font-bold text-slate-400 inline-flex items-center gap-1.5">
                        <Keyboard className="h-3.5 w-3.5" /> <kbd className="px-1.5 rounded border">J</kbd> / <kbd className="px-1.5 rounded border">K</kbd> se agla / pichla
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail (mobile — poori screen) */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 lg:hidden print:hidden">
          <OrderDetailPanel key={selectedId} orderId={selectedId} onClose={() => open(null)} />
        </div>
      )}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-hidden, .overflow-auto { overflow: visible !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          img, .recharts-wrapper { display: none !important; }
          [data-sonner-toaster] { display: none !important; }
        }
      `}</style>
      <BulkBar orders={shown} picked={picked} onClear={stopSelecting} onKeep={(ids) => setPicked(new Set(ids))} />
    </div>
  );
}

/* ═══ ORDER KI LINE ═══ */
function OrderRow({ order: o, now, active, hide, onClick, selecting, checked }: {
  order: OnlineOrder; now: number; active: boolean; hide: boolean; onClick: () => void; selecting?: boolean; checked?: boolean;
}) {
  const st = STATUS_LABEL[o.orderStatus] ?? STATUS_LABEL.PENDING;
  const src = sourceOf(o);
  const isNew = o.orderStatus === 'PENDING';
  const wait = waitMin(o, now);
  const late = isNew && wait >= STALE_MIN;
  const qty = o.items.reduce((a, i) => a + Number(i.quantity || 0), 0);
  const phone = phoneOf(o);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [active]);

  return (
    <button ref={ref} onClick={onClick}
      className={cn(
        'relative w-full px-4 sm:px-5 py-4 text-left transition avoid-break focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        active ? 'bg-emerald-50 dark:bg-emerald-500/10' : isClosed(o) ? 'opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5',
      )}>
      {(active || isNew) && <span className={cn('absolute left-0 top-0 bottom-0 w-1', active ? 'bg-emerald-500' : late ? 'bg-rose-500' : 'bg-amber-400')} />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {selecting ? (
            <span className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 text-lg font-black',
              checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent')}>✓</span>
          ) : (
            <span className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-xl">{src.emoji}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">#{orderNo(o)}</span>
              <span className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black', st.tone)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', st.dot, isNew && 'animate-pulse')} />{st.short}
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{src.label}</span>
              {o.isCod && o.paymentStatus !== 'PAID' && (
                <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">COD</span>
              )}
              {o.paymentStatus === 'PAID' && (
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">PAID</span>
              )}
              {o.isTest && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">TEST</span>}
              {!isClosed(o) && <RiskBadge risk={o.risk} />}
              {o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o) && !o.dispatchedAt && (
                o.confirmation?.result === 'CONFIRMED'
                  ? <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">✓ Confirm</span>
                  : o.confirmation?.result === 'REFUSED'
                    ? <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700">Mana kiya</span>
                    : <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        {o.confirmation?.result === 'NO_ANSWER' ? `Jawab nahi (${o.confirmation.attempts})` : 'Confirm baqi'}
                      </span>
              )}
              {o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED' && (
                <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">Customer ne cancel maanga</span>
              )}
              {late && (
                <span className="rounded-md bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                  <Timer className="h-2.5 w-2.5" /> {wait} min se ruka
                </span>
              )}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[180px] text-slate-800 dark:text-slate-100">{o.customerName}</span>
              {phone && <><span className="text-slate-300">•</span><span className="text-slate-500">{phone}</span></>}
              {o.customerCity && <><span className="text-slate-300">•</span><MapPin className="h-3 w-3 shrink-0" /><span className="text-slate-500">{o.customerCity}</span></>}
              <span className="text-slate-300">•</span>
              <Package className="h-3 w-3 shrink-0" />
              <span>{o.items.length} cheezein · {Number(qty.toFixed(2))} qty</span>
            </div>
            <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 flex-wrap">
              <Clock className="h-2.5 w-2.5" />
              <span className="text-slate-700 dark:text-slate-200">{fmtTime(o.receivedAt)}</span>
              <span className="text-slate-300">•</span>
              <span>{fmtDT(o.receivedAt)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">{timeAgo(o.receivedAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {o.items.slice(0, 4).map((it, n) => (
                <span key={n} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                  {it.name} × {Number(Number(it.quantity).toFixed(2))}
                </span>
              ))}
              {o.items.length > 4 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">+{o.items.length - 4} aur</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('text-xl sm:text-2xl font-black tabular-nums', isClosed(o) ? 'text-slate-400 line-through' : 'text-emerald-700 dark:text-emerald-400')}>
            {hide ? '•••••' : rs(o.total)}
          </div>
          {o.trackingNumber && <div className="mt-0.5 text-[10px] font-black text-slate-500">🚚 {o.trackingNumber}</div>}
          {isNew && !late && <div className="mt-0.5 text-[10px] font-black text-amber-600">Accept karein</div>}
        </div>
      </div>
    </button>
  );
}

/* ═══ CHHOTE HISSE ═══ */
function Kpi({ icon: Icon, label, value, sub, tone, onClick, active, highlight, pulse }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    sky: 'from-sky-500 to-blue-700 shadow-sky-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10'
          : highlight ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-300 dark:border-emerald-500/40'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      ].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums break-words leading-tight">{value}</div>
          {sub && <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0 ${pulse ? 'animate-pulse' : ''}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function Panel({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
          {hint && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function RankList({ rows }: { rows: { key: string; title: string; meta: string; right: string; bar: number }[] }) {
  const max = Math.max(...rows.map((r) => r.bar), 1);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
              i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>{i === 0 ? '🏆' : i + 1}</span>
            <span className="font-black text-sm text-slate-900 dark:text-white truncate flex-1">{r.title}</span>
            <span className="text-[11px] font-bold text-slate-400 shrink-0">{r.meta}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0">{r.right}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${(r.bar / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
    </div>
  );
}

function EmptyBox({ text }: { text?: string }) {
  return <div className="h-48 flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text ?? 'Abhi dikhane ko kuch nahi'}</p></div>;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center dark:border-emerald-500/30 dark:from-emerald-500/5 dark:to-teal-500/5 md:p-12">
      <div className="text-5xl">🌐</div>
      <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Abhi koi online order nahi aaya</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600 dark:text-slate-300">
        Apni website Nafaa se jodein — WordPress, Shopify ya apni banayi hui. 2 minute ka kaam hai.
        Phir har order yahan aayega, ghanti bajegi, aur ek click me bill ban jayega.
      </p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-3 text-left">
        {[
          ['1', 'Website jodein', 'Plugin ya link lagayein'],
          ['2', 'Test order bhejein', 'TEST ka nishan lagta hai'],
          ['3', 'Accept karein', 'Bill + stock khud'],
        ].map(([n, t, d]) => (
          <div key={n} className="rounded-2xl bg-white/80 dark:bg-slate-900/60 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">{n}</div>
            <div className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">{t}</div>
            <div className="text-[11px] font-bold text-slate-500">{d}</div>
          </div>
        ))}
      </div>
      <Link to="/online-store/website">
        <Button className="mt-5" size="lg" variant="success" leftIcon={<Globe className="h-5 w-5" />}>Website jodein</Button>
      </Link>
    </div>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Online orders ka safha</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Zap} title="Naya order aaya">
            Ghanti bajti hai aur <strong>Naye</strong> me dikhta hai. {STALE_MIN} minute se zyada ruka ho to laal warning aati hai — jaldi accept karein, warna customer cancel kar deta hai.
          </Tip>
          <Tip icon={CheckCircle2} title="Accept karte hi kya hota hai">
            Bill aur receipt khud ban jati hai aur stock kam ho jata hai. Reject kiya to kuch nahi katta.
          </Tip>
          <Tip icon={Truck} title="Order ka safar">
            Naya → Confirm → Pack → Tayyar → Raste me → Delivered. Har marhala detail panel ke button se aage badhta hai.
          </Tip>
          <Tip icon={Wallet} title="COD baqi">
            Parcel pohanch gaya lekin paisa courier se nahi aaya — ye <strong>COD baqi</strong> me rehta hai. Paisa aaye to order par "Paid" lagayein.
          </Tip>
          <Tip icon={AlertTriangle} title="Customer ne cancel maanga">
            Laal nishan wale order bhejne se pehle dekh lein — bheja to courier ka kharcha aur wapsi dono.
          </Tip>
          <Tip icon={BarChart3} title="Analytics">
            Kis waqt, kis din, kis shehar se order aate hain aur kaun dobara khareedta hai. Test order analytics me nahi gine jate.
          </Tip>
          <Tip icon={CalendarRange} title="Tareekh ki chaant">
            "Naye" aur "Chal rahe" par tareekh nahi lagti taake koi purana ruka hua order chhup na jaye. Baqi list aur analytics par lagti hai.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><Kbd>/</Kbd> dhoondo</div>
              <div><Kbd>N</Kbd> naye orders</div>
              <div><Kbd>J</Kbd> <Kbd>K</Kbd> agla / pichla</div>
              <div><Kbd>A</Kbd> analytics</div>
              <div><Kbd>R</Kbd> taaza</div>
              <div><Kbd>P</Kbd> print</div>
              <div><Kbd>G</Kbd> ye guide</div>
              <div><Kbd>Esc</Kbd> band karo</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">{children}</kbd>;
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