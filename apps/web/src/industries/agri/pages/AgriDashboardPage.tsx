import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wheat, TrendingUp, Wallet, Package, AlertTriangle, ShieldAlert,
  Calendar, Sprout, FlaskConical, Bug, Tractor, Clock, RefreshCw,
  GraduationCap, Printer, ArrowRight, Receipt, Users, Landmark,
  Boxes, Scissors, CheckCircle2, X, Leaf, Award, Scale,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line,
} from 'recharts';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { stockReportApi } from '@modules/inventory/stock-report/api/stock-report.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { seasonalPlansApi } from '../api/seasonal-plans.api';
import { subsidyApi } from '../api/subsidy.api';
import { certStatus, isMeasured, SEASONS } from '../lib/agriUnits';
import { CommissionCard } from '@modules/hr/commission/components/CommissionCard';
import { useBusinessDayStart, setToDayStart, setToDayEnd } from '@core/lib/business-day';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI DASHBOARD — SUBAH KA PEHLA SAFHA
   ─────────────────────────────────────────────────────────────
   Dukaan kholte hi teen sawal hote hain: kal kitna bika, aaj kya
   karna hai, aur kitna paisa bahar hai. Ye safha wohi teen jawab
   deta hai — baqi sab neeche.

   Ek ahem faisla: ye safha `/agri/dashboard/overview` wali API par
   nahi chalta, balki UNHI queries par jo Sales, Stock aur Farmers
   ke safhe chalate hain.

   Wajah: wo API revenue sirf BULK ORDERS se ginti hai. Jo dukaan
   din bhar counter par bechti hai, us ka "aaj ki bikri" wahan 0
   aata. Aur jab dashboard ka number sales page se mel na khaye,
   dukaan-daar dono par bharosa chhor deta hai.

   Yahan sab kuch wohi queries deti hain jo pehle se cache me hain
   (`sales-list`, `agri-profiles-all`, `agri-stock-report`,
   `agri-farmers-all`), is liye safha tez bhi hai aur numbers har
   jagah ek jaise bhi.
   ═════════════════════════════════════════════════════════════ */

const AXIS = '#94a3b8';
const GRID = 'rgba(148,163,184,0.25)';
const TOOLTIP = {
  borderRadius: 14, border: 'none', backgroundColor: 'rgba(15,23,42,0.96)', color: '#f8fafc',
  fontWeight: 700, fontSize: 12, boxShadow: '0 12px 32px rgba(15,23,42,.28)', padding: '10px 12px',
};
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];

const KINDS: Array<{ v: string; l: string; e: string; hex: string; test: (k: AgriKind) => boolean }> = [
  { v: 'seed', l: 'Beej', e: '🌱', hex: '#84cc16', test: isSeedKind },
  { v: 'fert', l: 'Khaad', e: '🧪', hex: '#10b981', test: isFertKind },
  { v: 'spray', l: 'Dawa', e: '🐛', hex: '#ef4444', test: isSprayKind },
  { v: 'feed', l: 'Feed', e: '🐄', hex: '#f59e0b', test: isFeedKind },
  { v: 'tool', l: 'Auzaar', e: '🔧', hex: '#64748b', test: isToolKind },
];

const dayMs = 86_400_000;
const dayStart = (d: Date, h = 0) => { const x = new Date(d); setToDayStart(x, h); return x; };
const dayEnd = (d: Date, h = 0) => { const x = new Date(d); setToDayEnd(x, h); return x; };
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

function daysTo(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const today = dayStart(new Date()).getTime();
  return Math.round((t - today) / dayMs);
}

/** Saal chhor kar sirf din-mahina — plan purane saal ka ho to bhi chale */
function thisYear(iso: string): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
}

export default function AgriDashboardPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const hideAmounts = useCostHidden();
  /* Dukaan ka apna karobari din — Settings se */
  const bdStart = useBusinessDayStart();
  const [showTeacher, setShowTeacher] = useState(false);

  /* ── Wohi queries jo baqi safhe chalate hain ── */
  const salesQ = useQuery({ queryKey: ['sales-list'], queryFn: () => salesApi.list() });
  const stockQ = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }).catch(() => null),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * 60_000,
  });
  const farmersQ = useQuery({
    queryKey: ['agri-farmers-all'],
    queryFn: () => farmersApi.list({}).catch(() => [] as any[]),
  });
  const plansQ = useQuery({
    queryKey: ['seasonal-plans-all'],
    queryFn: () => seasonalPlansApi.list({ active: true }).catch(() => [] as any[]),
    staleTime: 5 * 60_000,
  });
  const subsidyQ = useQuery({
    queryKey: ['subsidy-claims-all'],
    queryFn: () => subsidyApi.list({}).catch(() => [] as any[]),
    staleTime: 5 * 60_000,
  });

  const isLoading = salesQ.isLoading || stockQ.isLoading;
  const isRefetching = salesQ.isRefetching || stockQ.isRefetching || farmersQ.isRefetching;
  const refetchAll = () => {
    salesQ.refetch(); stockQ.refetch(); profilesQ.refetch();
    farmersQ.refetch(); plansQ.refetch(); subsidyQ.refetch();
  };

  const money = (v: number) => (hideAmounts ? '••••' : formatPKR(v));

  /* ── Product ki agri tafseel ── */
  const infoBy = useMemo(() => {
    const m = new Map<string, { kind: AgriKind; group: string; season?: string | null; crops: string[] }>();
    (profilesQ.data ?? []).forEach((p: any) => {
      if (!p.productId) return;
      const k = (p.category as AgriKind) ?? 'OTHER';
      m.set(p.productId, {
        kind: k,
        group: KINDS.find((x) => x.test(k))?.v ?? 'tool',
        season: p.season ?? null,
        crops: p.targetCrops ?? [],
      });
    });
    return m;
  }, [profilesQ.data]);

  const infoOf = (i: any) => {
    const hit = infoBy.get(i.product?.id ?? i.productId);
    if (hit) return hit;
    const k = deriveAgriKind(i.product?.category?.name, i.product?.name);
    return { kind: k, group: KINDS.find((x) => x.test(k))?.v ?? 'tool', season: null, crops: [] as string[] };
  };

  /* ── Bikri ── */
  const sales: any[] = salesQ.data ?? [];
  const live = useMemo(() => sales.filter((s) => s.status !== 'VOIDED'), [sales]);

  const today = useMemo(() => {
    const f = dayStart(new Date(), bdStart).getTime(), t = dayEnd(new Date(), bdStart).getTime();
    return live.filter((s) => { const x = new Date(s.soldAt).getTime(); return x >= f && x <= t; });
  }, [live]);

  const yesterday = useMemo(() => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const f = dayStart(y, bdStart).getTime(), t = dayEnd(y, bdStart).getTime();
    return live.filter((s) => { const x = new Date(s.soldAt).getTime(); return x >= f && x <= t; });
  }, [live]);

  const month = useMemo(() => {
    const f = Date.now() - 30 * dayMs;
    return live.filter((s) => new Date(s.soldAt).getTime() >= f);
  }, [live]);

  const sum = (list: any[], k: string) => list.reduce((s, x) => s + Number(x[k] || 0), 0);
  const profitOf = (list: any[]) => list.reduce((s, x) => s + (Number(x.total || 0) - Number(x.costOfGoods || 0)), 0);

  const todayAmount = sum(today, 'total');
  const yAmount = sum(yesterday, 'total');
  const dayDelta = yAmount > 0 ? ((todayAmount - yAmount) / yAmount) * 100 : null;

  /* ── Stock, registration ── */
  const stockRows = useMemo(() => {
    const rows = stockQ.data?.rows ?? [];
    return rows.map((r: any) => {
      const profile = (profilesQ.data ?? []).find((p: any) => p.productId === r.productId);
      const kind = (profile?.category as AgriKind) ?? deriveAgriKind(r.category, r.productName);
      const cert = certStatus(profile?.govtRegExpiry);
      const packSize = Number(profile?.packSize || 0);
      return {
        ...r, profile, kind, cert,
        regulated: needsGovtReg(kind),
        blocked: needsGovtReg(kind) && cert.state === 'expired',
        certSoon: needsGovtReg(kind) && cert.state === 'soon',
        packSize: packSize > 0 && !isMeasured(r.unit) ? packSize : 0,
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        isLow: r.stockStatus === 'LOW_STOCK',
        crops: profile?.targetCrops ?? [],
      };
    });
  }, [stockQ.data, profilesQ.data]);

  /* ── Farmer aur udhaar ── */
  const farmerRows = useMemo(() => {
    const list = (farmersQ.data ?? []) as any[];
    return list.map((f) => {
      const owed = Number(f.currentBalance || 0) || Number(f.totalOutstanding || 0);
      const days = Number(f.creditDays || 60);
      const since = f.lastPurchaseAt
        ? Math.floor((Date.now() - new Date(f.lastPurchaseAt).getTime()) / dayMs) : null;
      const overdueBy = owed > 0 && since !== null ? since - days : null;
      return { ...f, owed, overdueBy, overdue: owed > 0 && overdueBy !== null && overdueBy > 0 };
    });
  }, [farmersQ.data]);

  /* ── Mausam — kis fasal ki bijai qareeb hai ── */
  const seasonAlerts = useMemo(() => {
    const plans = (plansQ.data ?? []) as any[];
    return plans.map((p) => {
      const toSow = daysTo(thisYear(p.sowingStart)?.toISOString());
      const sowEnd = daysTo(thisYear(p.sowingEnd)?.toISOString());
      const sowingNow = toSow !== null && sowEnd !== null && toSow <= 0 && sowEnd >= 0;
      const sowingSoon = toSow !== null && toSow > 0 && toSow <= 45;
      if (!sowingNow && !sowingSoon) return null;
      /* Us fasal ka maal — dono taraf se milan, jaisa calendar safhe me */
      const key = (p.cropName || '').trim().toLowerCase();
      const items = stockRows.filter((r: any) =>
        r.crops.some((c: string) => {
          const k = c.trim().toLowerCase();
          return k === key || k.includes(key) || key.includes(k);
        }));
      const out = items.filter((i: any) => i.isOut);
      return {
        id: p.id, cropName: p.cropName, toSow, sowingNow,
        items: items.length, out: out.length,
        risky: items.length === 0 || out.length > 0,
      };
    }).filter(Boolean) as any[];
  }, [plansQ.data, stockRows]);

  /* ── Sab ginti ── */
  const stats = useMemo(() => {
    const blocked = stockRows.filter((r: any) => r.blocked);
    const owing = farmerRows.filter((f) => f.owed > 0);
    const overdue = farmerRows.filter((f) => f.overdue);
    const subsidyStuck = ((subsidyQ.data ?? []) as any[])
      .filter((c) => c.status === 'PENDING' || c.status === 'APPROVED');
    return {
      todayAmount, todayBills: today.length,
      todayProfit: profitOf(today),
      todayCredit: sum(today, 'creditAmount'),
      monthAmount: sum(month, 'total'),
      monthProfit: profitOf(month),
      dayDelta,

      stockValue: stockRows.reduce((s: number, r: any) => s + Number(r.stockValue || 0), 0),
      outCount: stockRows.filter((r: any) => r.isOut).length,
      lowCount: stockRows.filter((r: any) => r.isLow).length,

      blockedCount: blocked.length,
      blockedValue: blocked.reduce((s: number, r: any) => s + Number(r.stockValue || 0), 0),
      certSoonCount: stockRows.filter((r: any) => r.certSoon).length,

      farmers: farmerRows.length,
      owed: owing.reduce((s, f) => s + f.owed, 0),
      owingCount: owing.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, f) => s + f.owed, 0),
      overdueList: overdue.sort((a, b) => (b.overdueBy ?? 0) - (a.overdueBy ?? 0)).slice(0, 5),

      seasonRisky: seasonAlerts.filter((s) => s.risky).length,
      subsidyStuck: subsidyStuck.length,
      subsidyAmount: subsidyStuck.reduce((s, c) => s + Number(c.subsidyAmount || 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, month, stockRows, farmerRows, seasonAlerts, subsidyQ.data, todayAmount, dayDelta]);

  /* ── Charts ── */
  const trend = useMemo(() => {
    const b: Record<string, { name: string; bikri: number; munafa: number; udhaar: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      b[dayKey(d)] = {
        name: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        bikri: 0, munafa: 0, udhaar: 0,
      };
    }
    live.forEach((s) => {
      const k = dayKey(new Date(s.soldAt));
      if (!b[k]) return;
      b[k].bikri += Number(s.total || 0);
      b[k].munafa += Number(s.total || 0) - Number(s.costOfGoods || 0);
      b[k].udhaar += Number(s.creditAmount || 0);
    });
    return Object.values(b).map((v) => ({
      ...v, bikri: Math.round(v.bikri), munafa: Math.round(v.munafa), udhaar: Math.round(v.udhaar),
    }));
  }, [live]);

  const kindChart = useMemo(() => {
    const m = new Map<string, number>();
    month.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const v = Number(i.lineTotal ?? i.total ?? 0);
      const g = infoOf(i).group;
      m.set(g, (m.get(g) ?? 0) + v);
    }));
    return KINDS.map((k) => ({ ...k, value: Math.round(m.get(k.v) ?? 0) }))
      .filter((k) => k.value > 0).sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, infoBy]);

  const seasonChart = useMemo(() => {
    const m = new Map<string, number>();
    month.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const v = Number(i.lineTotal ?? i.total ?? 0);
      const def = SEASONS.find((x) => x.v === infoOf(i).season);
      const label = def ? `${def.e} ${def.l}` : 'Likha nahi';
      m.set(label, (m.get(label) ?? 0) + v);
    }));
    return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((x) => x.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, infoBy]);

  const topItems = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; unit: string; value: number; kind: AgriKind }>();
    month.forEach((s) => (s.items ?? []).forEach((i: any) => {
      const name = i.product?.name ?? 'Doosri cheez';
      const e = m.get(name) ?? { name, qty: 0, unit: i.product?.unit ?? '', value: 0, kind: infoOf(i).kind };
      e.qty += Number(i.quantity || 0);
      e.value += Number(i.lineTotal ?? i.total ?? 0);
      m.set(name, e);
    }));
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, infoBy]);

  const topFarmers = useMemo(() => {
    const m = new Map<string, { id: string; name: string; total: number; orders: number }>();
    month.forEach((s) => {
      if (!s.customer) return;
      const e = m.get(s.customer.id) ?? { id: s.customer.id, name: s.customer.name, total: 0, orders: 0 };
      e.total += Number(s.total || 0); e.orders += 1;
      m.set(s.customer.id, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [month]);

  /* ── Foran tawajjo — sirf wohi jo asal me hain ── */
  const alerts = useMemo(() => {
    const out: Array<{
      key: string; icon: any; tone: 'rose' | 'amber' | 'sky';
      title: string; body: string; to: string; cta: string;
    }> = [];

    if (stats.blockedCount > 0) out.push({
      key: 'cert', icon: ShieldAlert, tone: 'rose',
      title: `${stats.blockedCount} cheezein bechi nahi ja saktin`,
      body: `Registration khatam ho chuki. ${money(stats.blockedValue)} ka maal gudaam me para hai magar qanooni tor par bik nahi sakta.`,
      to: '/low-stock', cta: 'Dekhein',
    });

    if (stats.overdueCount > 0) out.push({
      key: 'udhaar', icon: Clock, tone: 'amber',
      title: `${stats.overdueCount} farmer ka udhaar ka waqt guzra — ${money(stats.overdueAmount)}`,
      body: 'Har farmer ka apna waada hota hai. Ye wo hain jin ka wo waqt nikal gaya.',
      to: '/agri/farmers', cta: 'Wusooli',
    });

    if (stats.outCount > 0) out.push({
      key: 'stock', icon: Package, tone: 'rose',
      title: `${stats.outCount} cheezein khatam${stats.lowCount > 0 ? `, ${stats.lowCount} kam` : ''}`,
      body: 'Counter par maal na ho to farmer doosri dukaan chala jata hai.',
      to: '/low-stock', cta: 'Mangwana hai',
    });

    if (stats.seasonRisky > 0) out.push({
      key: 'season', icon: Sprout, tone: 'sky',
      title: `${stats.seasonRisky} fasalon ki bijai aa rahi magar maal poora nahi`,
      body: 'Bijai ka waqt hi wo waqt hai jab farmer sab se zyada kharch karta hai.',
      to: '/agri/seasonal-plans', cta: 'Calendar',
    });

    if (stats.certSoonCount > 0) out.push({
      key: 'certsoon', icon: Calendar, tone: 'amber',
      title: `${stats.certSoonCount} ki registration jald khatam`,
      body: 'Renew karwa lein, warna ye cheezein bikna band ho jayengi.',
      to: '/agri/products', cta: 'Maal',
    });

    if (stats.subsidyStuck > 0) out.push({
      key: 'subsidy', icon: Landmark, tone: 'amber',
      title: `${money(stats.subsidyAmount)} sarkar ke paas atka hua`,
      body: `${stats.subsidyStuck} claims ka jawab abhi nahi aaya. Ye aap ka apna paisa hai.`,
      to: '/agri/subsidy', cta: 'Claims',
    });

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, hideAmounts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') setShowTeacher(true);
      if (k === 'p') window.print();
      if (k === 'r') refetchAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher]);

  const nowSeason = useMemo(() => {
    const m = new Date().getMonth() + 1;
    return m >= 5 && m <= 10 ? SEASONS.find((s) => s.v === 'KHARIF') : SEASONS.find((s) => s.v === 'RABI');
  }, []);
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  if (isLoading) {
    return (
      <div className="space-y-4 pb-10 animate-pulse">
        <div className="rounded-3xl bg-slate-200 dark:bg-slate-800 h-44" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌾 {tenant?.name || 'Agri'} — Dashboard</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}Aaj {formatPKR(stats.todayAmount)} ({stats.todayBills} bill) •
              Bahar para {formatPKR(stats.owed)}
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
              <Wheat className="h-3.5 w-3.5 text-lime-300" /> Agri
              {nowSeason && (<><span className="opacity-40">•</span><span>{nowSeason.e} {nowSeason.l}</span></>)}
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
              🌾 {tenant?.name || 'Aap ki dukaan'}
            </h1>
            <div className="mt-3 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-black text-white/70 tracking-widest">Aaj ki bikri</div>
                <div className="text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1">
                  {money(stats.todayAmount)}
                </div>
                <div className="text-[11px] font-bold text-white/70 mt-0.5">
                  {stats.todayBills} bill
                  {dayDelta !== null && (
                    <span className={dayDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {' '}· kal se {dayDelta >= 0 ? '▲' : '▼'} {Math.abs(dayDelta).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black text-white/70 tracking-widest">30 din</div>
                <div className="text-xl font-black tabular-nums text-white/90 leading-none mt-1">
                  {money(stats.monthAmount)}
                </div>
              </div>
              {stats.owed > 0 && (
                <div className="rounded-xl px-3 py-2 bg-amber-400/20 border border-amber-300/40 backdrop-blur">
                  <div className="text-[10px] uppercase font-black text-white/80 tracking-widest">Bahar para paisa</div>
                  <div className="text-lg font-black tabular-nums leading-none mt-0.5 text-amber-200">
                    {money(stats.owed)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={refetchAll} disabled={isRefetching} title="Taaza (R)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => window.print()} title="Print (P)"
              className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
              <Printer className="h-4 w-4" />
            </button>
            <Link to="/pos"
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Receipt className="h-4 w-4" /> POS kholein
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FORAN TAWAJJO ═══ */}
      {alerts.length > 0 && (
        <section className="grid md:grid-cols-2 gap-3 print:hidden">
          {/* `key` alert ke object me bhi hai — spread se pehle nikal lete
              hain, warna React ka key dobara set ho jata hai. */}
          {alerts.map(({ key, ...rest }) => <AlertCard key={key} {...rest} />)}
        </section>
      )}

      {alerts.length === 0 && (
        <section className="rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4 flex items-center gap-3 print:hidden">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-black text-emerald-900 dark:text-emerald-200 text-sm">Sab theek chal raha hai</h3>
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              Koi registration khatam nahi, stock poora hai, aur kisi ka udhaar late nahi.
            </p>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <Kpi icon={TrendingUp} label="Aaj ka munafa" value={money(stats.todayProfit)}
          sub={stats.todayAmount > 0 ? `${((stats.todayProfit / stats.todayAmount) * 100).toFixed(0)}% margin` : 'Abhi koi bikri nahi'}
          tone="emerald" to="/sales" />
        <Kpi icon={Wallet} label="Aaj udhaar gaya" value={money(stats.todayCredit)}
          sub={stats.owingCount > 0 ? `kul ${stats.owingCount} farmer ke paas` : 'Sab cash'}
          tone="amber" to="/agri/farmers" />
        <Kpi icon={Boxes} label="Gudaam ki lagat" value={money(stats.stockValue)}
          sub={stats.blockedValue > 0 ? `${money(stats.blockedValue)} bik nahi sakta` : `${stats.outCount} khatam`}
          tone="lime" to="/stock-report" />
        <Kpi icon={Users} label="Farmer" value={stats.farmers}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} ka waqt guzra` : 'Sab waqt par'}
          tone="rose" to="/agri/farmers" />
      </section>

      {/* ═══ RUJHAN ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="font-black text-slate-900 dark:text-white">Pichle 14 din</h3>
          <Link to="/sales" className="ml-auto text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1 print:hidden">
            Poori bikri <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="h-64">
          {trend.some((d) => d.bikri > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} />
                <YAxis stroke={AXIS} fontSize={11} width={70} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n]} />
                <Legend />
                <Area type="monotone" dataKey="bikri" name="Bikri" stroke="#10b981" fill="#10b981" fillOpacity={0.18} strokeWidth={2.5} />
                <Bar dataKey="udhaar" name="Udhaar" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Line type="monotone" dataKey="munafa" name="Munafa" stroke="#84cc16" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Pichle 14 din me koi bikri nahi</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ MAUSAM KA KAAM ═══ */}
      {seasonAlerts.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-600" />
            <h3 className="font-black text-slate-900 dark:text-white">Bijai qareeb hai</h3>
            <Link to="/agri/seasonal-plans" className="ml-auto text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1">
              Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {seasonAlerts.slice(0, 6).map((s) => (
              <div key={s.id} className={`rounded-2xl border-2 p-3 ${
                s.risky ? 'border-rose-200 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/5'
                  : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5'
              }`}>
                <div className="font-black text-sm text-slate-900 dark:text-white">🌾 {s.cropName}</div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {s.sowingNow ? 'Bijai chal rahi hai' : `Bijai ${s.toSow} din me`}
                </div>
                <div className={`mt-1 text-[11px] font-extrabold ${s.risky ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {s.items === 0 ? 'Koi maal juda nahi'
                    : s.out > 0 ? `${s.out} cheezein khatam`
                    : `${s.items} cheezein maujood`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ CHARTS ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Scale} title="30 din — kis qism se kitna" to="/profit-report">
          {kindChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kindChart} dataKey="value" nameKey="l" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {kindChart.map((k, i) => <Cell key={i} fill={k.hex} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="30 din me koi bikri nahi" />}
        </ChartCard>

        <ChartCard icon={Calendar} title="30 din — kis mausam ka maal" to="/agri/seasonal-plans">
          {seasonChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} width={100} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [formatPKR(Number(v)), 'Bikri']} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyBox text="Cheezon par mausam likha hi nahi" />}
        </ChartCard>
      </div>

      {/* ═══ LISTS ═══ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ListCard icon={Award} title="30 din — kya sab se zyada bika" to="/sales"
          rows={topItems.map((t) => ({
            key: t.name,
            title: `${AGRI_KIND_EMOJI[t.kind]} ${t.name}`,
            sub: `${fmtQty(t.qty)} ${t.unit}`,
            value: money(t.value),
          }))} emptyText="30 din me koi bikri nahi" />

        <ListCard icon={Tractor} title="30 din — sab se bare farmer" to="/agri/farmers"
          rows={topFarmers.map((f) => ({
            key: f.id, to: `/customers/${f.id}`,
            title: f.name, sub: `${f.orders} bill`,
            value: money(f.total),
          }))} emptyText="Kisi bill par farmer nahi laga" />
      </div>

      {stats.overdueList.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/30 shadow-sm overflow-hidden print:hidden">
          <div className="px-4 py-3 border-b-2 border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Wusooli — waqt guzar chuka</h3>
            <Link to="/agri/farmers" className="ml-auto text-xs font-black text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1">
              Poori list <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.overdueList.map((f: any) => (
              <Link key={f.id} to={`/agri/farmers/${f.id}`}
                className="p-3 flex items-center gap-3 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition">
                <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                  {f.fullName?.charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{f.fullName}</div>
                  <div className="text-[11px] font-bold text-slate-400 truncate">
                    {[f.village, f.district].filter(Boolean).join(', ') || 'Gaon nahi likha'}
                  </div>
                </div>
                <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 shrink-0">
                  {f.overdueBy} din late
                </span>
                <span className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-400 shrink-0">
                  {money(f.owed)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ JALDI JANA ═══ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 print:hidden">
        <Quick to="/pos" icon={Receipt} label="POS" tone="emerald" />
        <Quick to="/agri/products" icon={Package} label="Maal" tone="lime" />
        <Quick to="/low-stock" icon={AlertTriangle} label="Mangwana" tone="amber"
          badge={stats.outCount + stats.lowCount} />
        <Quick to="/agri/farmers" icon={Tractor} label="Farmer" tone="sky"
          badge={stats.overdueCount} />
        <Quick to="/agri/bulk-orders" icon={Boxes} label="Bare order" tone="violet" />
        <Quick to="/agri/subsidy" icon={Landmark} label="Subsidy" tone="rose"
          badge={stats.subsidyStuck} />
      </section>

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
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
function AlertCard({ icon: Icon, tone, title, body, to, cta }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
    sky: 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/40 text-sky-900 dark:text-sky-200',
  };
  const btn: Record<string, string> = {
    rose: 'bg-rose-600 hover:bg-rose-700', amber: 'bg-amber-600 hover:bg-amber-700', sky: 'bg-sky-600 hover:bg-sky-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${tones[tone]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <h4 className="font-black text-sm leading-tight">{title}</h4>
        <p className="text-[12px] font-bold opacity-90 mt-0.5 leading-snug">{body}</p>
      </div>
      <Link to={to}
        className={`h-9 px-3 rounded-xl ${btn[tone]} text-white text-xs font-black inline-flex items-center gap-1 shrink-0 transition`}>
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, to }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  return (
    <Link to={to}
      className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-400 p-3 sm:p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
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
    </Link>
  );
}

function ChartCard({ icon: Icon, title, to, children }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
        {to && (
          <Link to={to} className="ml-auto text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1 print:hidden">
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="h-64">{children}</div>
    </section>
  );
}

function ListCard({ icon: Icon, title, rows, emptyText, to }: any) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
        {to && (
          <Link to={to} className="ml-auto text-xs font-black text-emerald-600 hover:underline inline-flex items-center gap-1 print:hidden">
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm font-bold text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r: any, i: number) => {
            const body = (
              <>
                <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-sm text-slate-900 dark:text-white truncate">{r.title}</span>
                  <span className="block text-[11px] font-bold text-slate-400 truncate">{r.sub}</span>
                </span>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{r.value}</span>
              </>
            );
            return r.to ? (
              <Link key={r.key} to={r.to} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                {body}
              </Link>
            ) : (
              <div key={r.key} className="p-3 flex items-center gap-3">{body}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Quick({ to, icon: Icon, label, tone, badge }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600', lime: 'from-lime-500 to-green-600',
    amber: 'from-amber-500 to-orange-600', sky: 'from-sky-500 to-blue-600',
    violet: 'from-violet-500 to-purple-600', rose: 'from-rose-500 to-rose-700',
  };
  return (
    <Link to={to}
      className="relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-400 p-3 flex flex-col items-center gap-1.5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-[0.98]">
      <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400 text-center px-4">{text}</p></div>;
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Subah ye safha kaise parhein
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3">
            <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
              Dukaan kholte hi teen sawal hote hain: <strong>kal kitna bika, aaj kya karna hai,
              aur kitna paisa bahar hai.</strong> Ye safha wohi teen jawab deta hai — baqi sab neeche.
            </p>
          </div>
          <Tip icon={AlertTriangle} title="Foran tawajjo — sab se ooper">
            Ye patti sirf tab aati hai jab asal me koi masla ho. Registration khatam, udhaar late,
            stock khatam, bijai qareeb magar maal nahi — har ek par seedha us safhe ka button.
            Koi masla na ho to hari patti aati hai.
          </Tip>
          <Tip icon={ShieldAlert} title="Registration sab se pehle">
            Jis beej ya dawa ki meyaad khatam ho gayi, wo bechna ghair-qanooni hai. Wo maal gudaam
            me hone ke bawajood phansa hua paisa hai — is liye us ki patti sab se ooper aati hai.
          </Tip>
          <Tip icon={Clock} title="Wusooli — katai ke dinon ka kaam">
            Har farmer ka apna waada hota hai (60 din aam). Jin ka wo waqt nikal gaya wo neeche
            alag list me aate hain, purana sab se ooper. Katai ke baad hi farmer ke paas paisa
            aata hai — wohi maangne ka sahi waqt.
          </Tip>
          <Tip icon={Sprout} title="Bijai qareeb hai">
            Agle 45 din me jis fasal ki bijai hai, wo yahan aa jati hai — aur sath me ye bhi ke
            us fasal ka maal aap ke paas hai ya nahi. Laal ka matlab: mauqa haath se nikal sakta hai.
          </Tip>
          <Tip icon={Scale} title="Numbers har jagah ek jaise">
            Ye safha wohi hisab dikhata hai jo Sales, Stock aur Farmers ke safhe dikhate hain.
            Is liye yahan ka number wahan ja kar bhi wohi milega.
          </Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">R</kbd> taaza</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">P</kbd> print</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">G</kbd> guide</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">Esc</kbd> band</div>
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

      {/* ═══ BANDON KA HISSA ═══ */}
      <CommissionCard tone="emerald" />

    </div>
  );
}
