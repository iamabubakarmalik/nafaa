import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChefHat, AlertTriangle, Flame, Package, Search, X, RefreshCw,
  Download, Printer, GraduationCap, Utensils, Timer, TrendingUp,
  ShoppingBag, CheckCircle2, EyeOff, Soup, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { recipesApi, type Cookability } from '../api/recipes.api';
import { menuItemsApi } from '../api/menu-items.api';

/* ═════════════════════════════════════════════════════════════
   KITCHEN — KYA KHATAM HO RAHA HAI
   ─────────────────────────────────────────────────────────────
   Baqi dukaanon me sawal hota hai "kaunsa maal kam hai". Restaurant
   me ye sawal bekaar hai — kyunke jo bikta hai wo gudaam me para hi
   nahi hota. Biryani stock me nahi hoti; chawal, murghi aur masala
   hote hain.

   Is liye asal sawal ye hai: **ab kaunsi dish nahi ban sakti.**

   Rush me ye farq sab kuch hai. Grahak order deta hai, kitchen se
   awaz aati hai "khatam", aur order wapas karna parta hai — samne
   sharmindagi, aur grahak dobara nahi aata. Agar pehle hi pata ho ke
   biryani sirf chaar aur ban sakti hai, to ya menu se hata dein ya
   chawal mangwa lein.

   Do nazariye, do tab:
     🍲 DISH   — kaunsi kitni aur ban sakti hai, aur kaunsa saamaan
                 rok raha hai
     🧂 SAAMAAN — kaunsa ingredient khatam ho raha hai, aur us ke
                 rukne se kitni dish mar jayengi
   ═════════════════════════════════════════════════════════════ */

type Tab = 'dish' | 'saamaan';

export default function RestaurantLowStockPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const hideCost = useCostHidden();
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  const [tab, setTab] = useState<Tab>('dish');
  const [search, setSearch] = useState('');
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  const cookQ = useQuery({
    queryKey: ['restaurant-cookability'],
    queryFn: () => recipesApi.cookability(),
    refetchInterval: 60_000,
  });

  const menuQ = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => menuItemsApi.list({}).catch(() => []),
    staleTime: 5 * 60_000,
  });

  const productsQ = useQuery({
    queryKey: ['restaurant-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
    staleTime: 2 * 60_000,
  });

  const rows = cookQ.data?.rows ?? [];

  /* ── Jin dishon par recipe hi nahi bani ──
     In ka food cost pata hi nahi chalta, aur ye report me nazar hi
     nahi aatin — malik ko lagta hai sab theek hai. */
  const withoutRecipe = useMemo(() => {
    const haveRecipe = new Set(rows.map((r) => r.menuItemId));
    return (menuQ.data ?? []).filter((m: any) => !haveRecipe.has(m.id));
  }, [rows, menuQ.data]);

  /* ── Saamaan ke hisab se: ek ingredient kitni dish rok raha hai ── */
  const ingredients = useMemo(() => {
    const map = new Map<string, {
      name: string; unit: string; have: number;
      blocks: string[]; tight: string[];
    }>();
    rows.forEach((r) => {
      r.missing.forEach((m) => {
        const e = map.get(m.name) ?? { name: m.name, unit: m.unit, have: m.have, blocks: [], tight: [] };
        e.blocks.push(r.name);
        map.set(m.name, e);
      });
      if (r.blocker && r.canMake !== null && r.canMake > 0 && r.canMake <= 5) {
        const b = r.blocker;
        const e = map.get(b.name) ?? { name: b.name, unit: b.unit, have: b.have, blocks: [], tight: [] };
        e.tight.push(r.name);
        map.set(b.name, e);
      }
    });
    return [...map.values()].sort((a, b) => b.blocks.length - a.blocks.length || b.tight.length - a.tight.length);
  }, [rows]);

  /* Counter par bikne wali cheezein (bottle, drinks) — un ka apna stock hota hai */
  const counterLow = useMemo(() => {
    const recipeProductIds = new Set(rows.map((r) => r.productId).filter(Boolean));
    return (productsQ.data?.items ?? []).filter((p: any) => {
      if (recipeProductIds.has(p.id)) return false;
      const s = Number(p.stock || 0);
      return s <= Number(p.lowStockAlert ?? 5);
    });
  }, [productsQ.data, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (onlyBlocked) list = list.filter((r) => r.canMake === 0);
    if (q) list = list.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.blocker?.name.toLowerCase().includes(q)
      || r.missing.some((m) => m.name.toLowerCase().includes(q)));
    return list;
  }, [rows, search, onlyBlocked]);

  const stats = useMemo(() => ({
    dead: rows.filter((r) => r.canMake === 0).length,
    tight: rows.filter((r) => r.canMake !== null && r.canMake > 0 && r.canMake <= 5).length,
    fine: rows.filter((r) => r.canMake === null || r.canMake > 5).length,
    /* Jo dish nahi ban sakti magar menu par abhi bhi chaalu hai —
       yehi wo haalat hai jis me order lene ke baad mana karna parta */
    liveButDead: rows.filter((r) => r.canMake === 0 && r.isAvailable),
  }), [rows]);

  const exportCsv = () => {
    if (rows.length === 0) return toast.error('Koi recipe nahi');
    const head = ['Dish', 'Kitni aur ban sakti', 'Rok kaun raha', 'Us ka stock', 'Chahiye', 'Menu par', 'Rate', 'Lagat', 'Food cost %'];
    const body = rows.map((r) => [
      r.name, r.canMake ?? '—',
      r.blocker?.name ?? '', r.blocker?.have ?? '', r.blocker?.need ?? '',
      r.isAvailable ? 'Haan' : 'Nahi',
      r.price.toFixed(2), r.cost.toFixed(2), r.foodCostPct.toFixed(1),
    ]);
    const csv = [
      [`Kitchen — kya khatam ho raha hai · ${tenant?.name ?? ''}`],
      [new Date().toLocaleString('en-PK')],
      [''], head, ...body,
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kitchen-stock-${new Date().toISOString().slice(0, 10)}.csv`;
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

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" /> Kitchen
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black">🍲 Kya khatam ho raha hai</h1>
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
              {stats.dead > 0
                ? <><strong className="text-rose-200">{stats.dead} dish</strong> ab ban hi nahi sakti</>
                : 'Sab dish ban sakti hain'}
              {stats.tight > 0 && <> · <span className="text-amber-200">{stats.tight} me thora saamaan bacha</span></>}
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
            <Link to="/purchases/new"
              className="h-11 px-4 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition">
              <ShoppingBag className="h-4 w-4" /> Saamaan mangwayein
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SAB SE ZAROORI: menu par hai magar ban nahi sakti ═══ */}
      {stats.liveButDead.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-500/10 dark:to-orange-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
              <Flame className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                ⚠️ {stats.liveButDead.length} dish menu par chaalu hai magar ban nahi sakti
              </h3>
              <p className="mt-0.5 text-[12px] font-bold text-rose-800 dark:text-rose-300">
                Grahak ye order kar dega aur kitchen mana kar degi. Menu se abhi hata dein —
                order lene ke baad mana karna bura lagta hai.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.liveButDead.slice(0, 8).map((r) => (
                  <Link key={r.menuItemId} to="/restaurant/menu"
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 hover:border-rose-400 text-[11px] font-black text-rose-900 dark:text-rose-200 transition">
                    {r.name}
                    {r.blocker && <span className="text-rose-600 dark:text-rose-400"> · {r.blocker.name} khatam</span>}
                  </Link>
                ))}
              </div>
            </div>
            <Link to="/restaurant/menu"
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shrink-0 inline-flex items-center gap-1.5 transition">
              <EyeOff className="h-3.5 w-3.5" /> Menu theek karein
            </Link>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Flame} label="Ban hi nahi sakti" value={stats.dead}
          sub="Saamaan khatam" tone="from-rose-500 to-red-600"
          onClick={() => { setTab('dish'); setOnlyBlocked(true); }} active={onlyBlocked} />
        <Kpi icon={Timer} label="Thori si bachi" value={stats.tight} sub="5 ya kam plate" tone="from-amber-500 to-orange-600" />
        <Kpi icon={CheckCircle2} label="Theek chal rahi" value={stats.fine} sub="Saamaan poora" tone="from-emerald-500 to-green-600" />
        <Kpi icon={Soup} label="Recipe nahi bani" value={withoutRecipe.length}
          sub={withoutRecipe.length > 0 ? 'In ka hisab nahi banta' : 'Sab par recipe hai'}
          tone="from-slate-500 to-slate-700" />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'dish' as const, l: 'Dish ke hisab se', h: 'Kaunsi kitni aur ban sakti hai', i: Utensils, n: rows.length },
          { v: 'saamaan' as const, l: 'Saamaan ke hisab se', h: 'Kaunsa ingredient rok raha hai', i: Package, n: ingredients.length },
        ]).map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                on ? 'bg-gradient-to-br from-orange-600 to-amber-700 border-transparent text-white shadow-xl'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-400'
              }`}>
              <div className="flex items-center gap-3">
                <span className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-orange-500 to-amber-700 text-white'
                }`}><t.i className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black truncate">{t.l}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${on ? 'bg-black/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{t.n}</span>
                  </span>
                  <span className={`block text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400'}`}>{t.h}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ SEARCH ═══ */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 flex gap-2 flex-wrap items-center print:hidden">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Dish ya saamaan ka naam…"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        {tab === 'dish' && (
          <button onClick={() => setOnlyBlocked((v) => !v)}
            className={`h-12 px-4 rounded-2xl border-2 text-xs font-black inline-flex items-center gap-1.5 transition ${
              onlyBlocked
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-rose-400'
            }`}>
            <Flame className="h-4 w-4" /> Sirf ruki hui
          </button>
        )}
      </section>

      {/* ═══ DISH ═══ */}
      {tab === 'dish' && (
        cookQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <Empty icon={Soup} title="Kisi dish par recipe nahi bani"
            sub="Recipe banayein — phir ye safha khud bata dega ke kaunsi dish kitni ban sakti hai"
            to="/restaurant/recipes" cta="Recipe banayein" />
        ) : filtered.length === 0 ? (
          <Empty icon={CheckCircle2} title="Kuch nahi mila" sub="Chaant badal kar dekhein" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.map((r) => <DishCard key={r.recipeId} r={r} money={money} hideCost={hideCost} />)}
          </div>
        )
      )}

      {/* ═══ SAAMAAN ═══ */}
      {tab === 'saamaan' && (
        ingredients.length === 0 ? (
          <Empty icon={CheckCircle2} title="Saara saamaan poora hai"
            sub="Koi ingredient kisi dish ko nahi rok raha" />
        ) : (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {ingredients
                .filter((i) => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()))
                .map((ing) => (
                <div key={ing.name} className="p-4 flex items-start gap-3 flex-wrap">
                  <span className={`h-11 w-11 rounded-2xl text-white flex items-center justify-center shrink-0 ${
                    ing.blocks.length > 0
                      ? 'bg-gradient-to-br from-rose-500 to-red-700'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600'
                  }`}>
                    <Package className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{ing.name}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        ing.have <= 0
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}>
                        {Number(ing.have.toFixed(2))} {ing.unit} baqi
                      </span>
                    </div>

                    {ing.blocks.length > 0 && (
                      <p className="mt-1.5 text-[12px] font-bold text-rose-800 dark:text-rose-300">
                        <strong>{ing.blocks.length} dish ruk gayi:</strong>{' '}
                        {ing.blocks.slice(0, 5).join(', ')}
                        {ing.blocks.length > 5 && ` +${ing.blocks.length - 5} aur`}
                      </p>
                    )}
                    {ing.tight.length > 0 && (
                      <p className="mt-1 text-[12px] font-bold text-amber-800 dark:text-amber-300">
                        {ing.tight.length} dish me thora bacha: {ing.tight.slice(0, 4).join(', ')}
                      </p>
                    )}
                  </div>
                  <Link to="/purchases/new"
                    className="h-10 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 transition">
                    <ShoppingBag className="h-3.5 w-3.5" /> Mangwayein
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      {/* ═══ COUNTER KA MAAL ═══
          Bottle, drinks, chips — in ki recipe nahi hoti, stock hota hai.
          Isi liye ye alag khane me hain. */}
      {counterLow.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <header className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shrink-0">
              <Package className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Counter ka maal kam ho gaya</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Bottle, drinks, chips — jo banta nahi, seedha bikta hai
              </p>
            </div>
          </header>
          <div className="p-3 flex flex-wrap gap-1.5">
            {counterLow.slice(0, 20).map((p: any) => (
              <Link key={p.id} to={`/products/${p.id}`}
                className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-black transition ${
                  Number(p.stock) <= 0
                    ? 'border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
                    : 'border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
                }`}>
                {p.name} · {Number(p.stock || 0)} {p.unit}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ RECIPE NAHI BANI ═══ */}
      {withoutRecipe.length > 0 && (
        <section className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-start gap-2.5 flex-wrap print:hidden">
          <Soup className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="flex-1 min-w-[220px] text-[12px] font-bold text-slate-700 dark:text-slate-300">
            <strong>{withoutRecipe.length} dish</strong> par recipe nahi bani. In ka food cost pata nahi
            chalta aur ye is safhe par nazar bhi nahi aatin — yani saamaan khatam hone ka pata order
            ke waqt chalega.
          </p>
          <Link to="/restaurant/recipes"
            className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 transition">
            Recipe banayein <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      )}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

const heroBtn = 'h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur transition';

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const W: any = onClick ? 'button' : 'div';
  return (
    <W onClick={onClick}
      className={`rounded-2xl sm:rounded-3xl border-2 p-3 sm:p-4 text-left transition ${
        active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-lg'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
      } ${onClick ? 'hover:border-orange-400 active:scale-[0.99] cursor-pointer' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-8 w-8 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] font-bold text-slate-400 truncate">{sub}</p>}
    </W>
  );
}

/* ── Ek dish ka khana ── */
function DishCard({ r, money, hideCost }: { r: Cookability; money: (v: number) => string; hideCost: boolean }) {
  const dead = r.canMake === 0;
  const tight = r.canMake !== null && r.canMake > 0 && r.canMake <= 5;
  /* Food cost 45% se upar — rate kam hai ya recipe mehngi */
  const costHigh = r.foodCostPct > 45;

  return (
    <div className={`rounded-2xl border-2 p-3 transition ${
      dead ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-500/10'
        : tight ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900 dark:text-white truncate">{r.name}</div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {r.ingredientCount} saamaan
            {r.prepTimeMinutes ? ` · ${r.prepTimeMinutes} min` : ''}
            {r.totalOrdered > 0 ? ` · ${r.totalOrdered} dafa bika` : ''}
          </div>
        </div>
        {!r.isAvailable && (
          <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300 shrink-0">
            Menu par nahi
          </span>
        )}
      </div>

      {/* Kitni aur ban sakti hai — safhe ka asal jawab */}
      <div className="mt-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-2.5 text-center">
        {r.canMake === null ? (
          <p className="text-[12px] font-bold text-slate-500">Recipe khali hai</p>
        ) : (
          <>
            <p className={`text-2xl font-black tabular-nums leading-none ${
              dead ? 'text-rose-600 dark:text-rose-400'
                : tight ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {dead ? '0' : r.canMake}
            </p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">
              {dead ? 'ab nahi ban sakti' : 'plate aur ban sakti hain'}
            </p>
          </>
        )}
      </div>

      {r.blocker && r.canMake !== null && (
        <p className={`mt-2 text-[11px] font-bold ${dead ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>
          {dead ? '🚫' : '⏳'} <strong>{r.blocker.name}</strong> rok raha hai —{' '}
          {Number(r.blocker.have.toFixed(2))} {r.blocker.unit} bacha, ek plate par{' '}
          {Number(r.blocker.need.toFixed(2))} {r.blocker.unit} lagta hai
        </p>
      )}

      {!hideCost && r.price > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Rate {money(r.price)} · lagat {money(r.cost)}
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
            costHigh
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}>
            Food cost {r.foodCostPct.toFixed(0)}%
          </span>
        </div>
      )}
      {costHigh && !hideCost && (
        <p className="mt-1 text-[10px] font-bold text-rose-700 dark:text-rose-400">
          Food cost zyada hai — aam tor par 30–35% rakha jata hai
        </p>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, sub, to, cta }: any) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
      <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-base font-black text-slate-700 dark:text-slate-200">{title}</p>
      {sub && <p className="mt-1 text-xs font-bold text-slate-400 max-w-md mx-auto">{sub}</p>}
      {to && (
        <Link to={to}
          className="mt-4 inline-flex h-11 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white text-xs font-black items-center gap-1.5 transition">
          <ChefHat className="h-4 w-4" /> {cta}
        </Link>
      )}
    </div>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Ye safha kya batata hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Kitchen ka sab se kaam ka safha</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Utensils, t: 'Sawal "maal" ka nahi, "dish" ka hai', d: 'Biryani stock me nahi hoti — chawal, murghi aur masala hote hain. Is liye yahan ye nahi batate ke kaunsa saamaan kam hai, balke ye ke ab kaunsi dish kitni aur ban sakti hai.' },
            { i: Flame, t: 'Laal patti sab se zaroori', d: 'Jo dish menu par chaalu hai magar ban nahi sakti — us ka order aa jayega aur kitchen mana kar degi. Grahak ke samne sharmindagi hoti hai. Menu se foran hata dein.' },
            { i: Package, t: 'Ek saamaan, kai dish', d: '"Saamaan ke hisab se" wale tab me dekhein — ek murghi khatam hone se shayad paanch dish ruk jayein. Isi liye wo sab se pehle mangwani chahiye.' },
            { i: TrendingUp, t: 'Food cost 30–35% rakhein', d: 'Har dish par likha hai ke rate ka kitna hissa saamaan me chala gaya. 45% se upar jaye to ya rate kam hai ya recipe mehngi — laal nishan lag jata hai.' },
            { i: Soup, t: 'Recipe na ho to kuch pata nahi chalta', d: 'Jis dish par recipe nahi bani, wo is safhe par aati hi nahi — yani us ka saamaan khatam hone ka pata order ke waqt chalega. Neeche un ki list hai.' },
            { i: ShoppingBag, t: 'Seedha mangwa lein', d: 'Har line par "Mangwayein" ka button hai — wahin se purchase ban jati hai.' },
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
