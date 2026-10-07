import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Search, X, RefreshCw, Download, Printer,
  GraduationCap, ChefHat, Soup, Trophy, AlertTriangle, Utensils,
  Wallet, Target, Flame, Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { recipesApi, type Cookability } from '../api/recipes.api';
import { menuItemsApi } from '../api/menu-items.api';

/* ═════════════════════════════════════════════════════════════
   KAUNSI DISH PAISA BANATI HAI
   ─────────────────────────────────────────────────────────────
   Hotel ka sab se bara dhoka ye hai ke jo dish sab se zyada bikti
   hai, aksar wohi sab se kam kamati hai. Biryani ke sau order aate
   hain aur har order par tees rupay bachte hain; chai ke das order
   aate hain aur har ek par pandrah. Mahine ke aakhir me dono barabar.

   Is liye yahan dish ko teen tarah se dekha jata hai:

     💰 FOOD COST % — rate ka kitna hissa saamaan me gaya.
        30–35% aam hai. 45% se upar jaye to ya rate kam hai, ya
        recipe me kuch mehnga para hai, ya portion bara ho gaya.

     🧾 EK PLATE PAR KITNA BACHA — rupay me. Percent dhoka de sakta
        hai: 70% margin wali chai par dus rupay bachte hain, 50%
        wali biryani par do sau.

     🔥 KUL KITNA KAMAYA — ek plate ka munafa × kitni dafa biki.
        Yehi asal number hai jis par dukaan chalti hai.

   Neeche do list alag se: jin par sab se zyada kamaya, aur jo
   bikti to hain magar kuch deti nahi.
   ═════════════════════════════════════════════════════════════ */

type SortKey = 'earned' | 'margin' | 'foodcost' | 'sold' | 'name';

const SORTS: Array<{ v: SortKey; l: string }> = [
  { v: 'earned',   l: '🔥 Sab se zyada kamaya' },
  { v: 'margin',   l: '🧾 Ek plate par sab se zyada bacha' },
  { v: 'foodcost', l: '⚠️ Food cost sab se zyada' },
  { v: 'sold',     l: '📈 Sab se zyada biki' },
  { v: 'name',     l: '🔤 Naam A–Z' },
];

/* Food cost ka darja — dukaan-daar ki zabaan me */
function grade(pct: number) {
  if (pct <= 0) return { l: 'Pata nahi', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500', note: 'Recipe ya rate nahi bhara' };
  if (pct <= 30) return { l: 'Behtareen', c: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', note: 'Achha munafa' };
  if (pct <= 38) return { l: 'Theek', c: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300', note: 'Aam tor par yehi hota hai' };
  if (pct <= 45) return { l: 'Dhyan dein', c: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', note: 'Thora zyada hai' };
  return { l: 'Nuqsan ka khatra', c: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', note: 'Rate barhayein ya portion dekhein' };
}

export default function RestaurantProfitReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const hideCost = useCostHidden();
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('earned');
  const [showTeacher, setShowTeacher] = useState(false);

  const cookQ = useQuery({
    queryKey: ['restaurant-cookability'],
    queryFn: () => recipesApi.cookability(),
    refetchInterval: 5 * 60_000,
  });
  const menuQ = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => menuItemsApi.list({}).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const rows = useMemo(() => {
    return (cookQ.data?.rows ?? []).map((r: Cookability) => ({
      ...r,
      /* Kul kamai — ek plate ka munafa × kitni dafa biki.
         Yehi asal number hai; percent se dhoka hota hai. */
      earned: r.profit * (r.totalOrdered || 0),
      g: grade(r.foodCostPct),
    }));
  }, [cookQ.data]);

  /* Jin dishon par recipe hi nahi — un ka food cost pata hi nahi chalta */
  const withoutRecipe = useMemo(() => {
    const have = new Set(rows.map((r) => r.menuItemId));
    return (menuQ.data ?? []).filter((m: any) => !have.has(m.id));
  }, [rows, menuQ.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
    return [...l].sort((a, b) => {
      switch (sortKey) {
        case 'margin': return b.profit - a.profit;
        case 'foodcost': return b.foodCostPct - a.foodCostPct;
        case 'sold': return b.totalOrdered - a.totalOrdered;
        case 'name': return a.name.localeCompare(b.name);
        default: return b.earned - a.earned;
      }
    });
  }, [rows, search, sortKey]);

  const stats = useMemo(() => {
    const withPrice = rows.filter((r) => r.price > 0 && r.cost > 0);
    const totalEarned = rows.reduce((a, r) => a + r.earned, 0);
    const avgFoodCost = withPrice.length
      ? withPrice.reduce((a, r) => a + r.foodCostPct, 0) / withPrice.length
      : 0;
    return {
      totalEarned,
      avgFoodCost,
      bad: rows.filter((r) => r.foodCostPct > 45).length,
      /* Bikti bahut hai magar kamai kam — sab se khamosh nuqsan */
      busyButPoor: [...rows]
        .filter((r) => r.totalOrdered >= 5 && r.foodCostPct > 45)
        .sort((a, b) => b.totalOrdered - a.totalOrdered)
        .slice(0, 5),
      top: [...rows].sort((a, b) => b.earned - a.earned).slice(0, 5),
      dishes: rows.length,
    };
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) return toast.error('Koi recipe nahi');
    const head = ['Dish', 'Rate', 'Lagat', 'Ek plate par bacha', 'Food cost %', 'Darja', 'Kitni dafa biki', 'Kul kamaya'];
    const body = filtered.map((r) => [
      r.name, r.price.toFixed(2), r.cost.toFixed(2), r.profit.toFixed(2),
      r.foodCostPct.toFixed(1), r.g.l, r.totalOrdered, r.earned.toFixed(2),
    ]);
    const csv = [
      [`Kaunsi dish paisa banati hai — ${tenant?.name ?? 'Hotel'}`],
      [new Date().toLocaleString('en-PK')],
      [`${stats.dishes} dish · ausat food cost ${stats.avgFoodCost.toFixed(1)}% · kul kamai ${stats.totalEarned.toFixed(2)}`],
      [''], head, ...body,
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dish-profit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Export ho gaya');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'r') cookQ.refetch();
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, cookQ]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Scale className="h-3.5 w-3.5 text-amber-300" /> Hotel · Munafa
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black">💰 Kaunsi dish paisa banati hai</h1>
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
              Ausat food cost <strong className="text-amber-200">{stats.avgFoodCost.toFixed(1)}%</strong>
              {stats.bad > 0 && <> · <span className="text-rose-200">{stats.bad} dish par dhyan chahiye</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => cookQ.refetch()} title="Taaza (R)" className={heroBtn}>
              <RefreshCw className={`h-4 w-4 ${cookQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><Download className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="Print (P)" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <Link to="/restaurant/recipes"
              className="h-11 px-4 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition">
              <Soup className="h-4 w-4" /> Recipe
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Wallet} label="Kul kamai" value={money(stats.totalEarned)}
          sub="Sab dish mila kar" tone="from-emerald-500 to-green-600" />
        <Kpi icon={Target} label="Ausat food cost" value={`${stats.avgFoodCost.toFixed(1)}%`}
          sub={stats.avgFoodCost <= 38 ? 'Theek chal raha hai' : 'Thora zyada hai'}
          tone={stats.avgFoodCost <= 38 ? 'from-sky-500 to-blue-600' : 'from-amber-500 to-orange-600'} />
        <Kpi icon={AlertTriangle} label="Dhyan chahiye" value={stats.bad}
          sub="Food cost 45% se upar" tone="from-rose-500 to-red-600" />
        <Kpi icon={Soup} label="Recipe nahi bani" value={withoutRecipe.length}
          sub={withoutRecipe.length ? 'In ka hisab nahi banta' : 'Sab par recipe hai'}
          tone="from-slate-500 to-slate-700" />
      </section>

      {/* ═══ BIKTI BAHUT HAI MAGAR KAMAI KAM ═══ */}
      {stats.busyButPoor.length > 0 && !hideCost && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
              <TrendingDown className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                Ye dish bikti bahut hain, kamati kam
              </h3>
              <p className="mt-0.5 text-[12px] font-bold text-rose-800 dark:text-rose-300">
                Kitchen in par sab se zyada mehnat karti hai aur bachta sab se kam. Rate barhayein,
                portion dekhein, ya recipe me koi mehngi cheez badlein.
              </p>
              <div className="mt-2 space-y-1">
                {stats.busyButPoor.map((r) => (
                  <div key={r.recipeId} className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-800 px-2.5 py-1.5 flex-wrap">
                    <span className="text-[12px] font-black text-slate-900 dark:text-white truncate">{r.name}</span>
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums shrink-0">
                      {r.totalOrdered} dafa biki · food cost {r.foodCostPct.toFixed(0)}% · ek plate par {money(r.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SAB SE ZYADA KAMAI ═══ */}
      {stats.top.length > 0 && stats.top[0].earned > 0 && !hideCost && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Sab se zyada kamai in se hui</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Ek plate ka munafa × kitni dafa biki — dukaan inhi par chalti hai
              </p>
            </div>
          </header>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.top.map((r, i) => {
              const max = stats.top[0].earned || 1;
              return (
                <div key={r.recipeId} className="px-4 sm:px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-8 w-8 rounded-xl text-white text-xs font-black flex items-center justify-center shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>{i + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-slate-900 dark:text-white truncate">{r.name}</span>
                      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {r.totalOrdered} dafa · ek plate par {money(r.profit)}
                      </span>
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      {money(r.earned)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                      style={{ width: `${Math.max((r.earned / max) * 100, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ CHAANT ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 flex gap-2 flex-wrap print:hidden">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Dish ka naam…"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition">
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </section>

      {/* ═══ POORI LIST ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {cookQ.isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Soup className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-black text-slate-700 dark:text-slate-200">
              {rows.length === 0 ? 'Kisi dish par recipe nahi bani' : 'Kuch nahi mila'}
            </p>
            {rows.length === 0 && (
              <>
                <p className="mt-1 text-xs font-bold text-slate-400 max-w-md mx-auto">
                  Recipe ke baghair food cost nikal hi nahi sakta — kitni lagat lagi ye pata hi nahi chalta
                </p>
                <Link to="/restaurant/recipes"
                  className="mt-4 inline-flex h-11 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white text-xs font-black items-center gap-1.5 transition">
                  <ChefHat className="h-4 w-4" /> Recipe banayein
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-100 dark:border-slate-800">
                <tr>
                  <Th>Dish</Th>
                  <Th className="text-right">Rate</Th>
                  <Th className="text-right">Lagat</Th>
                  <Th className="text-right">Ek plate par</Th>
                  <Th className="text-right">Food cost</Th>
                  <Th>Darja</Th>
                  <Th className="text-right">Biki</Th>
                  <Th className="text-right">Kul kamaya</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.recipeId} className={`transition ${
                    r.foodCostPct > 45 ? 'bg-rose-50/40 dark:bg-rose-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}>
                    <td className="px-3 py-2.5">
                      <Link to={r.productId ? `/restaurant-menu/${r.productId}` : '/restaurant/menu'}
                        className="block min-w-0 group">
                        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-orange-600 transition">
                          {r.name}
                        </span>
                        {!r.isAvailable && (
                          <span className="block text-[10px] font-bold text-slate-400">Menu par nahi</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-black text-slate-900 dark:text-white tabular-nums">
                      {formatPKR(r.price)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {money(r.cost)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-[13px] font-black tabular-nums ${
                        r.profit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>{money(r.profit)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] font-black text-slate-700 dark:text-slate-200 tabular-nums">
                      {r.foodCostPct > 0 ? `${r.foodCostPct.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black whitespace-nowrap ${r.g.c}`}>
                        {r.g.l}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {r.totalOrdered || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {r.earned > 0 ? money(r.earned) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {withoutRecipe.length > 0 && (
        <section className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-start gap-2.5 flex-wrap print:hidden">
          <Soup className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="flex-1 min-w-[220px] text-[12px] font-bold text-slate-700 dark:text-slate-300">
            <strong>{withoutRecipe.length} dish</strong> par recipe nahi bani — in ka food cost nikal hi
            nahi sakta. Ho sakta hai inhi me se koi nuqsan par bik rahi ho aur pata hi na chale.
          </p>
          <Link to="/restaurant/recipes"
            className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 transition">
            Recipe banayein
          </Link>
        </section>
      )}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition';

function Th({ children, className = '' }: any) {
  return (
    <th className={`px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
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

function Teacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Munafa kaise parha jaye
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Hotel ka sab se ahem hisab</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Target, t: 'Food cost 30–35% rakhein', d: 'Rate ka kitna hissa saamaan me gaya. 30% tak behtareen, 38% tak theek, 45% se upar fikr ki baat — ya rate kam hai, ya portion bara, ya recipe me koi cheez mehngi par rahi hai.' },
            { i: Scale, t: 'Percent dhoka deta hai', d: 'Chai par 70% margin hota hai magar bachte das rupay. Biryani par 50% hota hai magar bachte do sau. Is liye "ek plate par kitna bacha" rupay me bhi dekhein, sirf percent par faisla na karein.' },
            { i: Trophy, t: 'Asal number: kul kamaya', d: 'Ek plate ka munafa × kitni dafa biki. Dukaan isi par chalti hai. Upar wali list isi hisab se lagti hai.' },
            { i: TrendingDown, t: 'Jo bikti bahut hai magar deti kuch nahi', d: 'Laal khane me wo dish hain jin par kitchen sab se zyada mehnat karti hai aur bachta sab se kam. Yehi sab se khamosh nuqsan hai — rate ya portion par nazar daalein.' },
            { i: Soup, t: 'Recipe ke baghair kuch pata nahi', d: 'Jis dish par recipe nahi, us ka food cost nikal hi nahi sakta. Ho sakta hai wohi nuqsan par bik rahi ho aur mahino pata na chale.' },
            { i: Flame, t: 'Lagat recipe se aati hai', d: 'Har ingredient ka cost price × miqdar. Is liye saamaan ka rate theek bhara hona chahiye, warna poora hisab ghalat chalega.' },
          ].map((x, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 text-white flex items-center justify-center shrink-0">
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
              {[['G', 'Ye safha'], ['R', 'Taaza'], ['P', 'Print'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-orange-600 to-amber-700">Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
