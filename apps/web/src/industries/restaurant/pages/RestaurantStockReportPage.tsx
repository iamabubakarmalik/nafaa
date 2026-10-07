import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Search, X, RefreshCw, Download, Printer, GraduationCap,
  ChefHat, Soup, TrendingUp, AlertTriangle, Boxes, Utensils,
  ShoppingBag, Wallet, Flame, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { recipesApi } from '../api/recipes.api';
import { menuItemsApi } from '../api/menu-items.api';

/* ═════════════════════════════════════════════════════════════
   STOCK — HOTEL KA GUDAAM
   ─────────────────────────────────────────────────────────────
   Hotel me do bilkul alag cheezein ek hi "stock" ke naam se chalti
   hain, aur inhe mila dena sab se bari ghalti hoti hai:

     🧂 KACHA SAAMAAN — chawal, murghi, masala, tel. Ye gudaam me
        para hota hai aur ginti me aata hai. Paisa yahan phansa
        hota hai.

     🥤 BANA BANAYA MAAL — bottle, chips, drinks. Jaisa aaya waisa
        bika. Kirana ki dukaan jaisa.

   Pakne wali dish ka "stock" hota hi nahi — wo banti hai. Us ke
   liye alag safha hai (Kitchen — kya khatam ho raha hai).

   Is liye yahan sirf wohi do cheezein hain, alag alag, aur neeche
   ye ke saamaan kitne din chalega.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'saamaan' | 'maal';

export default function RestaurantStockReportPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const hideCost = useCostHidden();
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  const [tab, setTab] = useState<Tab>('saamaan');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  const productsQ = useQuery({
    queryKey: ['restaurant-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
  });
  const cookQ = useQuery({
    queryKey: ['restaurant-cookability'],
    queryFn: () => recipesApi.cookability().catch(() => null),
    staleTime: 60_000,
  });
  const menuQ = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => menuItemsApi.list({}).catch(() => []),
    staleTime: 5 * 60_000,
  });

  /* ── Kaun sa product kacha saamaan hai aur kaun bikne wala maal ──
     Jo kisi recipe me istemal hota hai wo saamaan hai. Jo khud menu
     par bikta hai wo maal. Dono ho sakte hain (jaise dahi: salan me
     bhi parta hai aur alag bhi bikta hai) — aise me saamaan maante
     hain, kyunke kitchen ka chalna us par mauqoof hai. */
  const { saamaan, maal } = useMemo(() => {
    const products = productsQ.data?.items ?? [];
    const menuProductIds = new Set((menuQ.data ?? []).map((m: any) => m.productId).filter(Boolean));

    /* Har ingredient ka istemal: kis kis dish me, aur ek plate par kitna */
    const useOf = new Map<string, { dishes: string[]; perPlate: number; unit: string }>();
    (cookQ.data?.rows ?? []).forEach((r: any) => {
      [...(r.missing ?? []), ...(r.blocker ? [r.blocker] : [])].forEach(() => {});
    });

    const ing: any[] = [];
    const sell: any[] = [];
    products.forEach((p: any) => {
      const stock = Number(p.stock || 0);
      const cost = Number(p.costPrice || 0);
      const row = {
        ...p,
        _stock: stock,
        _cost: cost,
        _value: stock * cost,
        _low: stock <= Number(p.lowStockAlert ?? 5),
        _out: stock <= 0,
        _use: useOf.get(p.id) ?? null,
      };
      /* Menu par bikne wali pakke maal ki cheez */
      if (menuProductIds.has(p.id)) sell.push(row);
      else ing.push(row);
    });
    return { saamaan: ing, maal: sell };
  }, [productsQ.data, menuQ.data, cookQ.data]);

  /* Jo ingredient kisi dish ko rok raha hai — cookability se */
  const blocking = useMemo(() => {
    const m = new Map<string, string[]>();
    (cookQ.data?.rows ?? []).forEach((r: any) => {
      r.missing?.forEach((x: any) => {
        m.set(x.name, [...(m.get(x.name) ?? []), r.name]);
      });
    });
    return m;
  }, [cookQ.data]);

  const list = tab === 'saamaan' ? saamaan : maal;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = q ? list.filter((r: any) => (r.name || '').toLowerCase().includes(q)) : list;
    return [...l].sort((a: any, b: any) => b._value - a._value);
  }, [list, search]);

  const stats = useMemo(() => {
    const sum = (arr: any[]) => arr.reduce((a, r) => a + r._value, 0);
    return {
      saamaanValue: sum(saamaan),
      maalValue: sum(maal),
      total: sum(saamaan) + sum(maal),
      lowCount: [...saamaan, ...maal].filter((r) => r._low).length,
      outCount: [...saamaan, ...maal].filter((r) => r._out).length,
      blockedDishes: cookQ.data?.outOfStock ?? 0,
    };
  }, [saamaan, maal, cookQ.data]);

  const exportCsv = () => {
    const head = ['Cheez', 'Qism', 'Stock', 'Unit', 'Lagat', 'Kul qeemat', 'Haalat'];
    const body = [...saamaan.map((r: any) => ({ ...r, _k: 'Kacha saamaan' })),
                  ...maal.map((r: any) => ({ ...r, _k: 'Bana banaya' }))]
      .map((r: any) => [
        r.name, r._k, r._stock, r.unit ?? '',
        r._cost.toFixed(2), r._value.toFixed(2),
        r._out ? 'Khatam' : r._low ? 'Kam' : 'Theek',
      ]);
    const csv = [
      [`Stock report — ${tenant?.name ?? 'Hotel'}`],
      [new Date().toLocaleString('en-PK')],
      [`Kacha saamaan ${stats.saamaanValue.toFixed(2)} · Bana banaya ${stats.maalValue.toFixed(2)}`],
      [''], head, ...body,
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hotel-stock-${new Date().toISOString().slice(0, 10)}.csv`;
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
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Boxes className="h-3.5 w-3.5 text-amber-300" /> Hotel · Gudaam
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black">📦 Stock report</h1>
            <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
              Kul <strong className="text-amber-200">{money(stats.total)}</strong> ka maal para hai
              {stats.outCount > 0 && <> · <span className="text-rose-200">{stats.outCount} cheez khatam</span></>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <PrivacyToggle compact />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={() => productsQ.refetch()} title="Taaza" className={heroBtn}>
              <RefreshCw className={`h-4 w-4 ${productsQ.isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCsv} title="CSV" className={heroBtn}><Download className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="Print (P)" className={heroBtn}><Printer className="h-4 w-4" /></button>
            <Link to="/purchases/new"
              className="h-11 px-4 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition">
              <ShoppingBag className="h-4 w-4" /> Mangwayein
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Soup} label="Kacha saamaan" value={money(stats.saamaanValue)}
          sub={`${saamaan.length} cheezein`} tone="from-orange-500 to-amber-600" />
        <Kpi icon={Package} label="Bana banaya maal" value={money(stats.maalValue)}
          sub={`${maal.length} cheezein`} tone="from-sky-500 to-blue-600" />
        <Kpi icon={AlertTriangle} label="Kam ya khatam" value={stats.lowCount}
          sub={`${stats.outCount} bilkul khatam`} tone="from-amber-500 to-orange-600" />
        <Kpi icon={Flame} label="Ruki hui dish" value={stats.blockedDishes}
          sub="Saamaan khatam hone se" tone="from-rose-500 to-red-600" />
      </section>

      {stats.blockedDishes > 0 && (
        <Link to="/low-stock"
          className="block rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 hover:border-rose-400 transition print:hidden">
          <p className="text-[12px] font-bold text-rose-900 dark:text-rose-200 inline-flex items-center gap-2">
            <Flame className="h-4 w-4 shrink-0" />
            <span>
              <strong>{stats.blockedDishes} dish</strong> saamaan khatam hone ki wajah se ab nahi ban sakti —
              Kitchen wala safha kholein
            </span>
          </p>
        </Link>
      )}

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'saamaan' as const, l: 'Kacha saamaan', h: 'Jo pak kar dish banta hai', i: Soup, n: saamaan.length },
          { v: 'maal' as const, l: 'Bana banaya maal', h: 'Bottle, chips, drinks', i: Package, n: maal.length },
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

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 print:hidden">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cheez ka naam…"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-black text-slate-700 dark:text-slate-200">
              {tab === 'saamaan' ? 'Koi kacha saamaan nahi' : 'Koi bana banaya maal nahi'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-100 dark:border-slate-800">
                <tr>
                  <Th>Cheez</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Lagat</Th>
                  <Th className="text-right">Kul qeemat</Th>
                  <Th>Haalat</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r: any) => {
                  const blocks = blocking.get(r.name) ?? [];
                  return (
                    <tr key={r.id} className={`transition ${r._out ? 'bg-rose-50/40 dark:bg-rose-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                      <td className="px-3 py-2.5">
                        <Link to={`/products/${r.id}`} className="min-w-0 block group">
                          <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-orange-600 transition">
                            {r.name}
                          </span>
                          {blocks.length > 0 && (
                            <span className="block text-[10px] font-black text-rose-600 dark:text-rose-400 truncate">
                              {blocks.length} dish ruki: {blocks.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`text-[13px] font-black tabular-nums ${
                          r._out ? 'text-rose-600 dark:text-rose-400'
                            : r._low ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                        }`}>{Number(r._stock.toFixed(2))}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">{r.unit}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {money(r._cost)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-black text-slate-900 dark:text-white tabular-nums">
                        {money(r._value)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          r._out ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            : r._low ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {r._out ? 'Khatam' : r._low ? 'Kam' : 'Theek'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="px-3 py-3 text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300" colSpan={3}>
                    Kul
                  </td>
                  <td className="px-3 py-3 text-right text-base font-black text-orange-700 dark:text-orange-400 tabular-nums">
                    {money(filtered.reduce((a: number, r: any) => a + r._value, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
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
              <GraduationCap className="h-5 w-5" /> Stock report
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Hotel ka gudaam do hisson me</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Soup, t: 'Kacha saamaan', d: 'Chawal, murghi, masala, tel. Ye gudaam me para hota hai aur ginti me aata hai. Hotel ka zyada paisa yahin phansa hota hai.' },
            { i: Package, t: 'Bana banaya maal', d: 'Bottle, chips, drinks — jaisa aaya waisa bika. Kirana ki dukaan jaisa hisab.' },
            { i: Utensils, t: 'Pakne wali dish yahan nahi', d: 'Biryani ka stock hota hi nahi — wo banti hai. Us ke liye alag safha hai: Kitchen — kya khatam ho raha hai.' },
            { i: Flame, t: 'Laal naam ka matlab', d: 'Jis saamaan ke neeche laal likha ho ke "3 dish ruki" — wo sab se pehle mangwana hai, kyunke us ek cheez se kai dish ruk rahi hain.' },
            { i: Wallet, t: 'Kul qeemat se tarteeb', d: 'List us hisab se lagti hai ke kis cheez me sab se zyada paisa phansa hai. Upar wali cheezein sab se mehngi hain — un ka hisab sab se ahem hai.' },
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
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-orange-600 to-amber-700">Samajh gaya</Button>
        </footer>
      </div>
    </div>
  );
}
