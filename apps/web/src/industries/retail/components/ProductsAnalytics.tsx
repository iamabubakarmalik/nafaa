import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Package, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Layers, Tag, Percent, Boxes, Crown, Barcode, CheckCircle2, ChevronRight,
  ShoppingCart, Scale, Archive, Wallet, Sparkles, Coins, PieChart as PieIcon,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';

/* ═════════════════════════════════════════════════════════════
   PRODUCTS ANALYTICS — maal me paisa kahan khara hai
   ─────────────────────────────────────────────────────────────
   Safhe par ab tak sirf ginti thi: kitne products, kitna stock.
   Asal sawal ye hain —

     • Mera paisa kis category me sab se zyada khara hai?
     • Kaun si cheez NUQSAN par bik rahi hai? (lagat > rate)
     • Kis cheez ki lagat likhi hi nahi, is liye munafa jhoota hai?
     • Kis cheez ka bara zakheera para hai?

   Sab kuch isi list se nikal aata hai — koi naya API nahi, is
   liye offline bhi chalta hai.

   Ginti ka andaz: bare numbers "lakh/crore" me dikhte hain
   kyunke "Rs 2,032,274" ek nazar me parha nahi jata — jabke
   "20.3 lakh" foran samajh aata hai. Poora number hamesha
   tooltip me mojood rehta hai.
   ═════════════════════════════════════════════════════════════ */

/** Bara number chhote roop me — 20.3 lakh, 2.03 crore */
function shortPKR(n: number): string {
  const v = Math.abs(n);
  if (v >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} crore`;
  if (v >= 100_000) return `${(n / 100_000).toFixed(1)} lakh`;
  if (v >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

const money = (n: number) => `Rs ${shortPKR(n)}`;

const TOOLTIP = {
  borderRadius: 14,
  border: '2px solid #e2e8f0',
  fontWeight: 700,
  fontSize: 12,
  boxShadow: '0 10px 30px rgba(15,23,42,.12)',
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4',
                '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#a855f7'];

type Tone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'indigo' | 'teal';

const TONES: Record<Tone, string> = {
  sky: 'from-sky-500 to-blue-700',
  emerald: 'from-emerald-500 to-green-700',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-red-700',
  violet: 'from-violet-500 to-purple-700',
  slate: 'from-slate-500 to-slate-700',
  indigo: 'from-indigo-500 to-blue-700',
  teal: 'from-teal-500 to-emerald-700',
};

/* ─────────────── chhote purzay ─────────────── */

function Stat({ icon: Icon, label, value, exact, sub, tone = 'sky', alert }: {
  icon: any; label: string; value: React.ReactNode; exact?: string;
  sub?: React.ReactNode; tone?: Tone; alert?: boolean;
}) {
  return (
    <div
      title={exact}
      className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 p-4 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 ${
        alert ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${TONES[tone]} opacity-10 group-hover:opacity-20 transition`} />
      <div className="relative flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">
            {label}
          </div>
          {/* Number ko kabhi kaatna nahi — poora dikhna chahiye */}
          <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none break-words">
            {value}
          </div>
          {sub && (
            <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-snug">
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, hint, tone = 'sky', right, children, className = '' }: {
  icon: any; title: string; hint?: string; tone?: Tone;
  right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">{title}</h3>
            {hint && <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Blank({ text }: { text: string }) {
  return <p className="py-12 text-center text-xs font-bold text-slate-400">{text}</p>;
}

function Thumb({ p }: { p: any }) {
  const url = p.images?.[0]?.url;
  return (
    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl shrink-0 overflow-hidden bg-gradient-to-br ${productTint(p.name)}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : productEmoji(p.name, p.category?.name)}
    </div>
  );
}

/* ═════════════════════════════════════════════ */

export function ProductsAnalytics({ products, hideCost }: { products: any[]; hideCost: boolean }) {
  const [problemTab, setProblemTab] = useState<'loss' | 'nocost' | 'nobarcode' | 'dead'>('loss');

  /** PIN laga ho to paisa chhupa rahe */
  const m = (n: number) => (hideCost ? '••••' : money(n));
  const mExact = (n: number) => (hideCost ? undefined : formatPKR(n));

  const a = useMemo(() => {
    const num = (v: any) => Number(v ?? 0) || 0;

    let units = 0, cost = 0, retail = 0;
    let inStock = 0, low = 0, out = 0;
    let noBarcode = 0, noCost = 0;

    const byCategory = new Map<string, { name: string; count: number; units: number; cost: number; retail: number }>();
    const byBrand = new Map<string, { name: string; count: number; cost: number; retail: number }>();

    const lossMakers: any[] = [];
    const noCostList: any[] = [];
    const noBarcodeList: any[] = [];
    const heavy: any[] = [];

    const marginBands = [
      { band: 'Nuqsan', min: -Infinity, max: 0, count: 0, hex: '#e11d48' },
      { band: '0-10%', min: 0, max: 10, count: 0, hex: '#f97316' },
      { band: '10-20%', min: 10, max: 20, count: 0, hex: '#f59e0b' },
      { band: '20-30%', min: 20, max: 30, count: 0, hex: '#84cc16' },
      { band: '30-50%', min: 30, max: 50, count: 0, hex: '#10b981' },
      { band: '50%+', min: 50, max: Infinity, count: 0, hex: '#059669' },
    ];

    for (const p of products) {
      const s = num(p.stock);
      const c = num(p.costPrice);
      const r = num(p.price);
      const alert = p.lowStockAlert === null || p.lowStockAlert === undefined ? 5 : num(p.lowStockAlert);

      units += s;
      cost += s * c;
      retail += s * r;

      if (s <= 0) out += 1;
      else if (s <= alert) low += 1;
      else inStock += 1;

      const catName = p.category?.name ?? 'Bina category';
      const cat = byCategory.get(catName) ?? { name: catName, count: 0, units: 0, cost: 0, retail: 0 };
      cat.count += 1; cat.units += s; cat.cost += s * c; cat.retail += s * r;
      byCategory.set(catName, cat);

      const brName = p.brand?.name ?? 'Bina brand';
      const br = byBrand.get(brName) ?? { name: brName, count: 0, cost: 0, retail: 0 };
      br.count += 1; br.cost += s * c; br.retail += s * r;
      byBrand.set(brName, br);

      if (!p.barcode) { noBarcode += 1; if (noBarcodeList.length < 60) noBarcodeList.push(p); }

      if (c <= 0) {
        noCost += 1;
        if (noCostList.length < 60) noCostList.push({ ...p, _val: s * r });
      } else {
        const mg = r > 0 ? ((r - c) / r) * 100 : 0;
        const band = marginBands.find((b) => mg > b.min && mg <= b.max) ?? marginBands[0];
        band.count += 1;
        if (r > 0 && r < c) lossMakers.push({ ...p, _loss: c - r, _lossTotal: (c - r) * s });
      }

      if (s * c > 0) heavy.push({ ...p, _val: s * c });
    }

    const cats = [...byCategory.values()].sort((x, y) => y.cost - x.cost);
    const brands = [...byBrand.values()].sort((x, y) => y.cost - x.cost);

    lossMakers.sort((x, y) => y._lossTotal - x._lossTotal);
    noCostList.sort((x, y) => y._val - x._val);
    heavy.sort((x, y) => y._val - x._val);

    const profit = retail - cost;
    const margin = retail > 0 ? (profit / retail) * 100 : 0;

    /** Sab se upar wali 3 category kitna hissa rakhti hain */
    const top3Share = cats.length && cost > 0
      ? (cats.slice(0, 3).reduce((s2, c) => s2 + c.cost, 0) / cost) * 100
      : 0;

    return {
      units, cost, retail, profit, margin, top3Share,
      inStock, low, out,
      noBarcode, noCost,
      cats, brands,
      lossMakers, noCostList, noBarcodeList,
      heavy: heavy.slice(0, 12),
      marginBands,
      catCount: byCategory.size,
      brandCount: byBrand.size,
      lossTotal: lossMakers.reduce((s2, p) => s2 + p._lossTotal, 0),
      noCostValue: noCostList.reduce((s2, p) => s2 + (p._val ?? 0), 0),
    };
  }, [products]);

  const health = [
    { name: 'Stock me', value: a.inStock, hex: '#10b981' },
    { name: 'Kam ho gaya', value: a.low, hex: '#f59e0b' },
    { name: 'Khatam', value: a.out, hex: '#e11d48' },
  ].filter((r) => r.value > 0);

  const problems = {
    loss: a.lossMakers,
    nocost: a.noCostList,
    nobarcode: a.noBarcodeList,
    dead: a.heavy,
  }[problemTab];

  /** Munafe ki patti — lagat vs munafa, ek nazar me */
  const costShare = a.retail > 0 ? (a.cost / a.retail) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* ═══════════ PAISE KA KHULASA ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-blue-800 text-white p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Maal ka hisab
          </div>

          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            {[
              { l: 'Maal me laga paisa', v: a.cost, hint: 'jo aap ne kharcha kiya', c: 'text-sky-200', I: Wallet },
              { l: 'Sab bik jaye to', v: a.retail, hint: 'poori bikri ki qeemat', c: 'text-emerald-200', I: ShoppingCart },
              { l: 'Mumkin munafa', v: a.profit, hint: `${a.margin.toFixed(1)}% margin`, c: 'text-amber-200', I: TrendingUp },
            ].map((k) => (
              <div key={k.l}>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/70">
                  <k.I className="h-3.5 w-3.5" /> {k.l}
                </div>
                <div className={`mt-1 text-2xl sm:text-3xl font-black tabular-nums ${k.c}`}
                  title={hideCost ? undefined : formatPKR(k.v)}>
                  {hideCost ? '••••' : money(k.v)}
                </div>
                <div className="text-[11px] font-bold text-white/60">{k.hint}</div>
              </div>
            ))}
          </div>

          {/* Lagat vs munafa ki patti */}
          {!hideCost && a.retail > 0 && (
            <div className="mt-5">
              <div className="h-3 rounded-full bg-white/15 overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-700"
                  style={{ width: `${Math.min(costShare, 100)}%` }} />
                <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 flex-1" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-black">
                <span className="text-sky-200">Lagat {costShare.toFixed(0)}%</span>
                <span className="text-amber-200">Munafa {(100 - costShare).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ GINTI ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Package} label="Products" value={products.length.toLocaleString()} tone="sky"
          sub={<>{a.catCount} category · {a.brandCount} brand</>} />
        <Stat icon={Boxes} label="Kul units" value={a.units.toLocaleString()} tone="indigo"
          sub="Sab cheezon ka stock mila kar" />
        <Stat icon={Scale} label="Stock ki sehat" value={`${a.inStock} / ${products.length}`} tone="emerald"
          sub={<>{a.low} kam · <span className="text-rose-500">{a.out} khatam</span></>} />
        <Stat icon={Percent} label="Ausat margin" value={`${a.margin.toFixed(1)}%`} tone="violet"
          sub={`Top 3 category me ${a.top3Share.toFixed(0)}% paisa`} />
      </div>

      {/* ═══════════ JIN PAR TAWAJJO CHAHIYE ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat icon={TrendingDown} label="Nuqsan par bik raha" value={a.lossMakers.length} tone="rose"
          alert={a.lossMakers.length > 0}
          exact={a.lossMakers.length ? mExact(a.lossTotal) : undefined}
          sub={a.lossMakers.length
            ? <span className="text-rose-600 dark:text-rose-400">{m(a.lossTotal)} ka nuqsan khara hai</span>
            : 'Sab theek — koi cheez lagat se sasti nahi'} />
        <Stat icon={DollarSign} label="Lagat likhi hi nahi" value={a.noCost} tone="amber"
          alert={a.noCost > 0}
          sub={a.noCost
            ? <span className="text-amber-700 dark:text-amber-400">{m(a.noCostValue)} ka maal — munafa jhoota lagega</span>
            : 'Har cheez ki lagat darj hai'} />
        <Stat icon={Barcode} label="Barcode nahi" value={a.noBarcode} tone="slate"
          alert={a.noBarcode > 0}
          sub={a.noBarcode ? 'Ye cheezein scan nahi ho saktin' : 'Har cheez scan ho sakti hai'} />
      </div>

      {/* Sab se ahem warning */}
      {a.lossMakers.length > 0 && (
        <div className="rounded-3xl border-2 border-rose-300 dark:border-rose-500/40 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 p-4 sm:p-5">
          <div className="flex items-start gap-3.5 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-lg shrink-0">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-lg text-rose-900 dark:text-rose-200 leading-tight">
                {a.lossMakers.length} cheezein lagat se SASTI bik rahi hain
              </div>
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                Har bikri par nuqsan ho raha hai — kul <strong>{m(a.lossTotal)}</strong> ka.
                Aksar ye tab hota hai jab supplier ne rate barha diya magar bechne ka rate wohi purana reh gaya.
              </p>
              <div className="flex gap-1.5 flex-wrap mt-2.5">
                {a.lossMakers.slice(0, 6).map((p) => (
                  <Link key={p.id} to={`/retail-products/${p.id}/edit`}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-500/30 text-[11px] font-black text-rose-700 dark:text-rose-300 hover:border-rose-400 transition">
                    {p.name} <span className="opacity-70">−{formatPKR(p._loss)}</span>
                  </Link>
                ))}
                {a.lossMakers.length > 6 && (
                  <button onClick={() => setProblemTab('loss')}
                    className="px-3 py-1.5 text-[11px] font-black text-rose-700 dark:text-rose-300 underline">
                    +{a.lossMakers.length - 6} aur dekhein
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CATEGORY ═══════════ */}
      <Panel icon={Layers} title="Paisa Kis Category Me Khara Hai" tone="sky"
        hint="Lagat aur bikri ki qeemat — sab se bara zakheera upar"
        right={
          <div className="text-right shrink-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top 3 ka hissa</div>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums">{a.top3Share.toFixed(0)}%</div>
          </div>
        }>
        {a.cats.length === 0 ? <Blank text="Abhi koi product nahi" /> : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.cats.slice(0, 12)} margin={{ bottom: 60, left: 4, right: 4 }}>
                <defs>
                  <linearGradient id="pa-cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="pa-retail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }}
                  angle={-35} textAnchor="end" height={80} interval={0} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} width={52}
                  tickFormatter={(v) => shortPKR(Number(v))} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,.12)' }}
                  formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'cost' ? 'Lagat' : 'Bikri qeemat']}
                  contentStyle={TOOLTIP} />
                <Legend formatter={(v) => (v === 'cost' ? 'Lagat' : 'Bikri qeemat')} />
                <Bar dataKey="cost" fill="url(#pa-cost)" radius={[8, 8, 0, 0]} maxBarSize={44} />
                <Bar dataKey="retail" fill="url(#pa-retail)" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Stock health */}
        <Panel icon={Scale} title="Stock Ki Sehat" tone="emerald" hint="Kitni cheezein poori, kitni kam, kitni khatam">
          {health.length === 0 ? <Blank text="Abhi koi product nahi" /> : (
            <>
              <div className="h-60 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={health} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={62} outerRadius={92} paddingAngle={4} stroke="none">
                      {health.map((d, i) => <Cell key={i} fill={d.hex} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [`${v} cheezein`, n]} contentStyle={TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Darmiyan me kul ginti */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{products.length}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">products</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { l: 'Stock me', v: a.inStock, hex: '#10b981' },
                  { l: 'Kam', v: a.low, hex: '#f59e0b' },
                  { l: 'Khatam', v: a.out, hex: '#e11d48' },
                ].map((r) => (
                  <div key={r.l} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
                    <div className="h-1 w-8 rounded-full mx-auto mb-1.5" style={{ background: r.hex }} />
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{r.l}</div>
                    <div className="text-lg font-black tabular-nums" style={{ color: r.hex }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* Margin bands */}
        <Panel icon={Percent} title="Munafe Ki Pattiyan" tone="violet" hint="Kitni cheezon par kitna margin hai">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.marginBands} margin={{ left: 4, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 10, fontWeight: 800 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 600 }} width={34} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,.12)' }}
                  formatter={(v: any) => [`${v} cheezein`, 'Ginti']} contentStyle={TOOLTIP} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
                  {a.marginBands.map((b, i) => <Cell key={i} fill={b.hex} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
            {a.noCost > 0 ? (
              <>Jin ki lagat likhi hi nahi (<strong>{a.noCost}</strong>) wo is chart me shamil nahi —
              unka margin nikala hi nahi ja sakta. Pehle unki lagat bharein.</>
            ) : (
              <>Har cheez ki lagat darj hai, is liye ye chart poora sach bata raha hai.</>
            )}
          </div>
        </Panel>
      </div>

      {/* ═══════════ MASLE ═══════════ */}
      <Panel icon={AlertTriangle} title="Jin Cheezon Par Tawajjo Chahiye" tone="rose"
        hint="Har patti ek alag masla — sab se mehnga upar">
        <div className="flex gap-2 flex-wrap mb-4">
          {([
            ['loss', 'Nuqsan par', a.lossMakers.length, TrendingDown],
            ['nocost', 'Lagat nahi likhi', a.noCost, DollarSign],
            ['nobarcode', 'Barcode nahi', a.noBarcode, Barcode],
            ['dead', 'Bara zakheera', a.heavy.length, Archive],
          ] as const).map(([v, l, n, I]) => (
            <button key={v} onClick={() => setProblemTab(v)}
              className={`h-10 px-3.5 rounded-2xl text-[11px] font-black border-2 inline-flex items-center gap-1.5 transition ${
                problemTab === v
                  ? 'bg-gradient-to-r from-rose-600 to-red-700 border-transparent text-white shadow-lg shadow-rose-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-400'
              }`}>
              <I className="h-3.5 w-3.5" /> {l}
              <span className={`px-1.5 rounded-full tabular-nums ${problemTab === v ? 'bg-black/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{n}</span>
            </button>
          ))}
        </div>

        {problems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <p className="mt-3 text-base font-black text-emerald-700 dark:text-emerald-400">
              {problemTab === 'loss' && 'Koi cheez nuqsan par nahi bik rahi'}
              {problemTab === 'nocost' && 'Har cheez ki lagat darj hai'}
              {problemTab === 'nobarcode' && 'Har cheez ka barcode laga hua hai'}
              {problemTab === 'dead' && 'Abhi koi stock nahi'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-2">
              {problems.slice(0, 20).map((p: any) => (
                <Link key={p.id} to={`/retail-products/${p.id}/edit`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 border-2 border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 transition">
                  <Thumb p={p} />
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                      {problemTab === 'loss' && `Lagat ${formatPKR(Number(p.costPrice))} → rate ${formatPKR(Number(p.price))}`}
                      {problemTab === 'nocost' && `Rate ${formatPKR(Number(p.price))} · stock ${Number(p.stock ?? 0)}`}
                      {problemTab === 'nobarcode' && `${p.sku || 'SKU nahi'} · stock ${Number(p.stock ?? 0)}`}
                      {problemTab === 'dead' && `${Number(p.stock ?? 0)} ${p.unit ?? ''} para hai · ${p.category?.name ?? 'Bina category'}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1">
                    <div>
                      {problemTab === 'loss' && (
                        <div className="text-xs font-black text-rose-600 tabular-nums">−{formatPKR(p._lossTotal)}</div>
                      )}
                      {(problemTab === 'nocost' || problemTab === 'dead') && (
                        <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{m(p._val ?? 0)}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
            {problems.length > 20 && (
              <p className="text-[11px] font-bold text-slate-400 text-center mt-3">
                Aur {problems.length - 20} — upar wale 20 sab se ahem hain
              </p>
            )}
          </>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Category ranking */}
        <Panel icon={Crown} title="Category Ranking" tone="amber" hint="Lagat ke hisab se — kahan sab se zyada paisa">
          {a.cats.length === 0 ? <Blank text="Koi category nahi" /> : (
            <div className="space-y-2">
              {a.cats.slice(0, 10).map((c, i) => {
                const pct = a.cost > 0 ? (c.cost / a.cost) * 100 : 0;
                return (
                  <div key={c.name} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="h-7 w-7 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow"
                        style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white truncate flex-1">{c.name}</span>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">{c.count} cheezein</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0"
                        title={mExact(c.cost)}>{m(c.cost)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400">{pct.toFixed(1)}% kul lagat ka</span>
                      <span className="text-emerald-600">+{m(c.retail - c.cost)} munafa</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Brand breakdown */}
        <Panel icon={Tag} title="Brand Ke Hisab Se" tone="indigo" hint="Kis brand me kitna paisa laga hai">
          {a.brands.length === 0 ? <Blank text="Koi brand nahi" /> : (
            <div className="space-y-2">
              {a.brands.slice(0, 10).map((b, i) => (
                <div key={b.name} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                  <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white truncate">{b.name}</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{b.count} cheezein</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums" title={mExact(b.cost)}>
                      {m(b.cost)}
                    </div>
                    <div className="text-[10px] font-black text-emerald-600 tabular-nums">
                      +{m(b.retail - b.cost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Sab se bara zakheera */}
      <Panel icon={Archive} title="Sab Se Bara Zakheera" tone="teal"
        hint="In cheezon me sab se zyada paisa khara hai — inhi ko chalana sab se zaroori hai">
        {a.heavy.length === 0 ? <Blank text="Abhi koi stock nahi" /> : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {a.heavy.map((p: any, i: number) => (
              <Link key={p.id} to={`/retail-products/${p.id}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 hover:bg-teal-50 dark:hover:bg-teal-500/10 border-2 border-transparent hover:border-teal-200 dark:hover:border-teal-500/30 transition">
                <div className="relative shrink-0">
                  <Thumb p={p} />
                  <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-lg bg-teal-600 text-white text-[9px] font-black flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {Number(p.stock ?? 0)} {p.unit ?? 'pcs'} · {p.category?.name ?? 'Bina category'}
                  </div>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums shrink-0"
                  title={mExact(p._val)}>
                  {m(p._val)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
