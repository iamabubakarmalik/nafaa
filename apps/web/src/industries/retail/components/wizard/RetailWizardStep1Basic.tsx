import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Sparkles, Star, Eye, TrendingUp,
  AlertCircle, Tag, ShoppingBag, Percent, Camera, Wand2, Plus, Check, X,
  ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { RetailWizardBasic } from '../../hooks/useRetailWizard';

interface Props {
  basic: RetailWizardBasic;
  onChange: (patch: Partial<RetailWizardBasic>) => void;
  errors: string[];
}

/* ═════════════════════════════════════════════════════════════
   STEP 1 — BASIC INFO (FULL BEST v2)
   🌙 Dark mode perfect • 💡 Inline guide tips • ⚡ Auto SKU
   📷 Barcode scanner • 💰 Live profit/margin calculator
   ═════════════════════════════════════════════════════════════ */

/** RETAIL units only — sqft/sqm yahan NAHI (woh carpet ke liye hai). */
const UNITS = [
  { v: 'pcs', l: 'Piece', e: '🔢', h: 'Ek ek' },
  { v: 'kg', l: 'Kilo', e: '⚖️', h: 'Wazan' },
  { v: 'gram', l: 'Gram', e: '🧂', h: 'Chhota wazan' },
  { v: 'liter', l: 'Liter', e: '🥛', h: 'Doodh, oil' },
  { v: 'ml', l: 'ml', e: '🧴', h: 'Chhoti bottle' },
  { v: 'packet', l: 'Packet', e: '📦', h: 'Pack me' },
  { v: 'bottle', l: 'Bottle', e: '🍶', h: 'Bottle' },
  { v: 'dozen', l: 'Dozen', e: '🗳️', h: '12 ka set' },
  { v: 'box', l: 'Box', e: '🗃️', h: 'Dabba' },
  { v: 'carton', l: 'Carton', e: '📮', h: 'Bara carton' },
  { v: 'bag', l: 'Bag', e: '👝', h: 'Bori' },
  { v: 'meter', l: 'Meter', e: '📏', h: 'Lambai' },
];

const MARKUPS = [10, 15, 20, 25, 30, 50];
const COLORS = ['#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316'];

export function RetailWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.wholesalePrice || basic.mrpPrice || basic.taxRate));
  const [newCat, setNewCat] = useState(''); const [showCat, setShowCat] = useState(false);
  const [newBrand, setNewBrand] = useState(''); const [showBrand, setShowBrand] = useState(false);
  const [touched, setTouched] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.salePrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;
  const U = basic.baseUnit || 'pcs';

  const mkCat = useMutation({
    mutationFn: () => categoriesApi.create({ name: newCat.trim(), color: COLORS[(cats as any[]).length % COLORS.length] }),
    onSuccess: (c: any) => { toast.success(`"${c.name}" ban gayi`); onChange({ categoryId: c.id }); setNewCat(''); setShowCat(false); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bani'),
  });
  const mkBrand = useMutation({
    mutationFn: () => brandsApi.create({ name: newBrand.trim(), isActive: true } as any),
    onSuccess: (b: any) => { toast.success(`"${b.name}" ban gaya`); onChange({ brandId: b.id }); setNewBrand(''); setShowBrand(false); qc.invalidateQueries({ queryKey: ['brands'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bana'),
  });

  const autoSku = () => {
    const b = (basic.name || 'PROD').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'PROD';
    onChange({ sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU ban gaya');
  };
  const markup = (pct: number) => {
    if (!cost) return toast.error('Pehle kharid rate likhein');
    onChange({ salePrice: Math.round(cost * (1 + pct / 100)) });
  };
  const togTag = (id: string) => {
    const c = basic.tagIds ?? [];
    onChange({ tagIds: c.includes(id) ? c.filter((t) => t !== id) : [...c, id] });
  };

  const nameError = touched && !basic.name.trim();
  const saleError = touched && sale <= 0;

  return (
    <div className="space-y-5">
      {scan && <BarcodeScanner onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode mil gaya'); }} onClose={() => setScan(false)} />}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Next se pehle ye theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 💡 Mini guide */}
      <Tip>
        Sirf <strong>2 cheezein zaroori</strong> hain: <strong>naam</strong> aur <strong>bikri rate</strong>.
        Baqi sab optional — baad mein edit kar sakte ho. Jaldi ho to naam + rate likho aur Next dabao! ⚡
      </Tip>

      {/* 1 — NAME */}
      <section className="rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 bg-gradient-to-br from-sky-50 to-white dark:from-sky-500/10 dark:to-slate-900 p-5 space-y-4">
        <Head icon={Package} n="1" t="Product ka Naam" d="Bas naam likho — baqi sab optional" tone="sky" />
        <input
          autoFocus
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onBlur={() => setTouched(true)}
          placeholder="Colgate Toothpaste 100g"
          className={[
            'h-16 w-full rounded-2xl border-2 bg-white dark:bg-slate-800 px-4 text-xl font-extrabold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 transition',
            nameError
              ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-500/30'
              : 'border-sky-300 dark:border-sky-500/40 focus:border-sky-600 dark:focus:border-sky-400 focus:ring-sky-200 dark:focus:ring-sky-500/30',
          ].join(' ')}
        />
        {nameError && <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">⚠️ Naam zaroori hai</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">📄 Yehi naam POS aur receipt par dikhega</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code <Opt /></Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="COLG-100"
                className="h-12 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition" />
              <button type="button" onClick={autoSku} className="h-12 px-3 rounded-xl bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 font-extrabold text-xs inline-flex items-center gap-1 transition">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode <Opt>scanner se</Opt></Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
                className="h-12 flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition" />
              <button type="button" onClick={() => setScan(true)} className="h-12 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-extrabold text-xs inline-flex items-center gap-1 transition">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — UNIT */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-3">
        <Head icon={ShoppingBag} n="2" t="Bikri ka Unit" d="Product kis hisaab se bikta hai?" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {UNITS.map((u) => {
            const a = basic.baseUnit === u.v;
            return (
              <button key={u.v} type="button" onClick={() => onChange({ baseUnit: u.v })}
                className={['h-20 rounded-2xl border-2 transition flex flex-col items-center justify-center gap-0.5 px-1',
                  a ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/40 scale-[1.03]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-500/50'].join(' ')}>
                <span className="text-2xl leading-none">{u.e}</span>
                <span className="text-xs font-extrabold">{u.l}</span>
                <span className={['text-[9px] font-bold', a ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'].join(' ')}>{u.h}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-2.5 text-xs font-semibold text-blue-900 dark:text-blue-200">
          💡 Dozen / carton ke <strong>alag rate</strong> Step 2 me add ho sakte hain.
        </div>
      </section>

      {/* 3 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 p-5 space-y-4">
        <Head icon={DollarSign} n="3" t={`Rate (per ${U})`} d="Kharid rate aur bikri rate" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Kharid Rate (Cost)</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 transition" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">Jo aapne diya</p>
          </div>
          <div>
            <Lbl tone="emerald">Bikri Rate (Sale) *</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.salePrice}
              onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
              onBlur={() => setTouched(true)}
              placeholder="0"
              className={[
                'h-14 w-full rounded-2xl border-2 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-4 transition',
                saleError
                  ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-500/30'
                  : 'border-emerald-400 dark:border-emerald-500/50 focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-emerald-200 dark:focus:ring-emerald-500/30',
              ].join(' ')} />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
              {saleError ? '⚠️ Bikri rate zaroori hai' : 'Customer se lena'}
            </p>
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Profit % lagao — rate khud ban jayega
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKUPS.map((m) => (
                <button key={m} type="button" onClick={() => markup(m)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:border-emerald-400 dark:hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition">
                  +{m}% <span className="text-slate-500 dark:text-slate-400 font-bold">= {formatPKRFull(Math.round(cost * (1 + m / 100)))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={['rounded-2xl border-2 p-4',
            loss ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
              : margin >= 20 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold', loss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'].join(' ')}>
                    {loss ? '⚠️ NUQSAAN HO RAHA HAI' : `Faida per ${U}`}
                  </div>
                  <div className={['text-2xl font-extrabold tabular-nums', loss ? 'text-rose-900 dark:text-rose-200' : 'text-slate-900 dark:text-white'].join(' ')}>{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums', loss ? 'text-rose-700 dark:text-rose-400' : margin >= 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white/70 dark:bg-slate-800 overflow-hidden">
              <div className={['h-full rounded-full transition-all', loss ? 'bg-rose-500' : margin >= 20 ? 'bg-emerald-500' : 'bg-amber-500'].join(' ')}
                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
            </div>
            <p className={['text-[11px] font-bold mt-1.5', loss ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'].join(' ')}>
              {loss ? 'Bikri rate kharid se kam hai — rate barhao'
                : margin < 10 ? 'Faida bohat kam hai'
                : margin < 20 ? 'Theek hai, thora behtar ho sakta hai'
                : 'Zabardast! Acha faida hai 👍'}
            </p>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Extra rates chhupao' : 'Wholesale / MRP / Tax (optional)'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Wholesale Rate" type="number" step="0.01" value={basic.wholesalePrice}
              onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" hint="Dukandar rate" />
            <Input label="MRP (printed)" type="number" step="0.01" value={basic.mrpPrice}
              onChange={(e) => onChange({ mrpPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" hint="Packet par likha" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" hint="GST agar lagta ho"
              leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 4 — CATEGORY / BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-4">
        <Head icon={Tag} n="4" t="Category & Brand" d="Dhundne me asaani (optional)" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <Lbl>Category</Lbl>
            <button type="button" onClick={() => setShowCat((v) => !v)} className="text-xs font-extrabold text-sky-700 dark:text-sky-400 inline-flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Nayi
            </button>
          </div>
          {showCat && (
            <div className="flex gap-2 mb-2">
              <input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newCat.trim() && mkCat.mutate()} placeholder="e.g. Biscuits"
                className="h-11 flex-1 rounded-xl border-2 border-sky-300 dark:border-sky-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition" />
              <button type="button" disabled={!newCat.trim() || mkCat.isPending} onClick={() => mkCat.mutate()}
                className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setShowCat(false); setNewCat(''); }} className="h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange({ categoryId: '' })}
              className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition', !basic.categoryId ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'].join(' ')}>
              Koi nahi
            </button>
            {(cats as any[]).map((c) => {
              const a = basic.categoryId === c.id;
              return (
                <button key={c.id} type="button" onClick={() => onChange({ categoryId: c.id })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition', a ? 'text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'].join(' ')}
                  style={{ backgroundColor: a ? (c.color || '#0ea5e9') : undefined, borderColor: a ? (c.color || '#0ea5e9') : undefined }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a ? '#fff' : (c.color || '#0ea5e9') }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Lbl>Brand</Lbl>
            <button type="button" onClick={() => setShowBrand((v) => !v)} className="text-xs font-extrabold text-violet-700 dark:text-violet-400 inline-flex items-center gap-1 hover:underline">
              <Plus className="h-3 w-3" /> Naya
            </button>
          </div>
          {showBrand && (
            <div className="flex gap-2 mb-2">
              <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()} placeholder="e.g. Nestle"
                className="h-11 flex-1 rounded-xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-600 transition" />
              <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
                className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }} className="h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"><X className="h-4 w-4" /></button>
            </div>
          )}
          <select className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
            value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })}>
            <option value="">Koi brand nahi</option>
            {(brands as any[]).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </div>

        <div>
          <Lbl>Tafseel <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Size, flavor, kya khaas hai..."
            className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition resize-none" />
        </div>
      </section>

      {/* 5 — TAGS */}
      {(tags as any[]).length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-3">
          <Head icon={Tag} n="5" t="Tags" d="Bestseller, Imported, Halal (optional)" />
          <div className="flex flex-wrap gap-2">
            {(tags as any[]).map((t) => {
              const a = basic.tagIds?.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => togTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-extrabold transition', a ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                  style={{
                    backgroundColor: a ? `${t.color}20` : undefined,
                    borderColor: a ? t.color : undefined,
                    color: a ? t.color : undefined,
                  }}
                  data-dark={!a ? 'true' : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className={a ? '' : 'text-slate-600 dark:text-slate-300'}>{t.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 6 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-3">
        <Head icon={ImageIcon} n="6" t="Tasveer" d="Pehli tasveer main dikhegi (optional)" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="10 tasveer tak" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold transition">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7 — SETTINGS */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-2">
        <Head icon={Sparkles} n="7" t="Settings" d="Kahan dikhega" />
        <Tog checked={basic.isActive} onChange={(v: boolean) => onChange({ isActive: v })} icon={Eye}
          t="Active — POS me dikhega" d="Off karo to POS/catalog se chhup jayega" />
        <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star}
          t="Featured — sab se upar" d="Catalog me highlight" />
      </section>
    </div>
  );
}

/* ─── Helpers ─── */
function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = { slate: 'from-slate-500 to-slate-700', emerald: 'from-emerald-500 to-emerald-700', sky: 'from-sky-500 to-cyan-700' };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100 dark:border-slate-800">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
          <span className="text-slate-400 dark:text-slate-500">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{d}</p>
      </div>
    </div>
  );
}
function Lbl({ children, tone }: any) {
  return <label className={['block text-xs font-extrabold uppercase tracking-wider mb-1.5', tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'].join(' ')}>{children}</label>;
}
function Opt({ children }: any) {
  return <span className="text-slate-400 dark:text-slate-500 normal-case font-bold">({children || 'optional'})</span>;
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3.5 flex items-start gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/40">
        <Lightbulb className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">{children}</p>
    </div>
  );
}
function Tog({ checked, onChange, icon: Icon, t, d }: { checked: boolean; onChange: (v: boolean) => void; icon: any; t: string; d: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition text-left', checked ? 'border-sky-400 dark:border-sky-500/50 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'].join(' ')}>
      <div className={['h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition', checked ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-sm">{t}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{d}</div>
      </div>
      <div className={['h-7 w-12 rounded-full transition relative shrink-0', checked ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'].join(' ')}>
        <div className={['absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1'].join(' ')} />
      </div>
    </button>
  );
}
