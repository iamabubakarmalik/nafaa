import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Award, Percent, Camera, Wand2, Plus, Check, X,
  ChevronDown, ChevronUp, Zap, Palette, Tag, Search, FileText, Barcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { formatPKRFull } from '@core/lib/format';
import type { ElectronicsWizardBasic } from '../../hooks/useElectronicsWizard';
import {
  CONDITION_TYPES, CONDITION_META, SERIAL_SUGGESTED,
  categoryTypeFromName, type CategoryType,
} from '../../constants';

/* ═════════════════════════════════════════════════════════════
   ⚡ STEP 1 — BASIC (FULL BEST v2)
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete • 📱 mobile-first touch targets
   🔍 Category search + inline create • 🏷️ Brand inline create
   💰 Quick markup + live profit/margin (loss = red)
   📷 Camera barcode scan • ✨ Auto SKU
   ═════════════════════════════════════════════════════════════ */

interface Props {
  basic: ElectronicsWizardBasic;
  onChange: (patch: Partial<ElectronicsWizardBasic>) => void;
  errors: string[];
}

const MARKUPS = [10, 15, 20, 25, 30, 40];
const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Rose Gold', hex: '#b76e79' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Graphite', hex: '#374151' },
];

/* Shared input style — mobile pe bara, dark me readable */
const IN = 'h-12 sm:h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition';

export function ElectronicsWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.wholesalePrice || basic.mrp || basic.taxRate));
  const [newBrand, setNewBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const visibleCats = useMemo(() => {
    const q = catSearch.toLowerCase().trim();
    if (!q) return cats as any[];
    return (cats as any[]).filter((c) => c.name.toLowerCase().includes(q));
  }, [cats, catSearch]);

  const chosenCat = useMemo(
    () => (cats as any[]).find((c) => c.id === basic.categoryId),
    [cats, basic.categoryId],
  );
  const chosenCatName = chosenCat?.name ?? '';

  /* categoryType category ke naam se khud nikal aata hai */
  useEffect(() => {
    const derived = categoryTypeFromName(chosenCatName);
    if (derived !== basic.categoryType) onChange({ categoryType: derived });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenCatName]);

  const serialHint = SERIAL_SUGGESTED.includes(
    categoryTypeFromName(chosenCatName) as CategoryType,
  );

  const createCat = useMutation({
    mutationFn: () => categoriesApi.create({ name: newCat.trim() } as any),
    onSuccess: (created: any) => {
      toast.success(`"${created.name}" ban gayi`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      onChange({ categoryId: created.id });
      setNewCat('');
      setShowNewCat(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Category nahi bani'),
  });

  const mkBrand = useMutation({
    mutationFn: () => brandsApi.create({ name: newBrand.trim() } as any),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" ban gaya`);
      onChange({ electronicsBrandId: b.id });
      setNewBrand(''); setShowBrand(false);
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bana'),
  });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const autoSku = () => {
    const b = (basic.name || 'ELEC').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'ELEC';
    onChange({ sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU ban gaya');
  };
  const markup = (pct: number) => {
    if (!cost) return toast.error('Pehle cost price likhein');
    onChange({ retailPrice: Math.round(cost * (1 + pct / 100)) });
  };
  const togTag = (id: string) => {
    const c = basic.tagIds ?? [];
    onChange({ tagIds: c.includes(id) ? c.filter((t) => t !== id) : [...c, id] });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode mil gaya'); }}
          onClose={() => setScan(false)}
        />
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Next se pehle theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 1 — NAME */}
      <section className="rounded-2xl border-2 border-blue-300 dark:border-blue-500/40 bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-900 p-4 sm:p-5 space-y-4">
        <Head icon={Cpu} n="1" t="Product Ka Naam" d="Model + variant + capacity likhein" tone="blue" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="iPhone 15 Pro Max 256GB"
          className="h-14 sm:h-16 w-full rounded-2xl border-2 border-blue-300 dark:border-blue-500/50 bg-white dark:bg-slate-800 px-4 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-500/20 transition" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Model Number</Lbl>
            <input value={basic.modelNumber} onChange={(e) => onChange({ modelNumber: e.target.value })} placeholder="A2894"
              className={`${IN} font-mono`} />
          </div>
          <div>
            <Lbl>Part Number <Opt /></Lbl>
            <input value={basic.partNumber} onChange={(e) => onChange({ partNumber: e.target.value })} placeholder="MU7A3LL/A"
              className={`${IN} font-mono`} />
          </div>
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="IPHN15-256"
                className={`${IN} font-mono flex-1`} />
              <button type="button" onClick={autoSku}
                className="h-12 sm:h-11 px-3 rounded-xl bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 font-extrabold text-xs inline-flex items-center gap-1 shrink-0 transition active:scale-95">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
        </div>

        <div>
          <Lbl>Barcode</Lbl>
          <div className="flex gap-2">
            <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
              className={`${IN} font-mono flex-1`} />
            <button type="button" onClick={() => setScan(true)}
              className="h-12 sm:h-11 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 transition active:scale-95">
              <Camera className="h-4 w-4" /> Scan
            </button>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Head icon={Tag} n="2" t="Category" d="Aap ki apni category — dhoondne mein asaan" />
          <button type="button" onClick={() => setShowNewCat((v) => !v)}
            className="h-10 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Nayi category
          </button>
        </div>

        {showNewCat && (
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 p-3 flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCat.mutate(); } }}
              autoFocus
              placeholder="Category ka naam — jaise Headphones"
              className="h-11 flex-1 rounded-lg border-2 border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
            <button type="button" onClick={() => createCat.mutate()}
              disabled={!newCat.trim() || createCat.isPending}
              className="h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold disabled:opacity-50 transition active:scale-95">
              {createCat.isPending ? '...' : 'Banao'}
            </button>
          </div>
        )}

        {cats.length > 6 && (
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Category dhoondo..."
              className={`${IN} pl-9`}
            />
          </div>
        )}

        {cats.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-6 text-center">
            <Tag className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi category nahi bani</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              "Nayi category" se banayein — jaise Headphones, Chargers, Cables
            </p>
          </div>
        ) : visibleCats.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-6 text-center">
            "{catSearch}" se koi category nahi mili
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
            {visibleCats.map((c: any) => {
              const a = basic.categoryId === c.id;
              return (
                <button key={c.id} type="button"
                  onClick={() => onChange({ categoryId: a ? '' : c.id })}
                  className={['p-3 rounded-xl border-2 transition active:scale-95 flex items-center gap-2 text-left min-h-[56px]',
                    a ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500/60'].join(' ')}>
                  <span className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-sm"
                    style={{ background: a ? 'rgba(255,255,255,.2)' : (c.color ?? '#e2e8f0') }}>
                    {c.icon ?? '📦'}
                  </span>
                  <span className="text-xs font-extrabold leading-tight truncate">{c.name}</span>
                  {a && <Check className="h-4 w-4 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {serialHint && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              <strong>{chosenCatName}</strong> aam tor par serial number ke saath aata hai —
              Step 4 me "Serial tracking" on kar lein taake har unit alag pehchana jaye
              (warranty ke liye zaroori hai).
            </p>
          </div>
        )}
      </section>

      {/* 3 — CONDITION */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-3">
        <Head icon={BadgeCheck} n="3" t="Condition" d="Naya, refurbished, ya used?" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CONDITION_TYPES.map((c) => {
            const meta = CONDITION_META[c];
            const a = basic.conditionType === c;
            return (
              <button key={c} type="button" onClick={() => onChange({ conditionType: c })}
                title={meta.hint}
                className={['p-3 rounded-xl border-2 transition active:scale-95 flex flex-col items-center gap-1 text-center min-h-[92px] justify-center',
                  a ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500/60'].join(' ')}>
                <span className="text-2xl">{meta.emoji}</span>
                <span className="text-[11px] font-extrabold leading-tight">{meta.label}</span>
                <span className={['text-[9px] font-semibold leading-tight', a ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'].join(' ')}>
                  {meta.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Head icon={Award} n="4" t="Brand" d="Apple, Samsung, Xiaomi..." />
          <button type="button" onClick={() => setShowBrand((v) => !v)}
            className="h-10 px-3 rounded-xl bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-xs font-extrabold text-violet-700 dark:text-violet-300 inline-flex items-center gap-1 transition active:scale-95">
            <Plus className="h-3 w-3" /> Nayi brand
          </button>
        </div>
        {showBrand && (
          <div className="flex gap-2">
            <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()} placeholder="e.g. OnePlus"
              className="h-12 flex-1 rounded-xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-600 transition" />
            <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
              className="h-12 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition active:scale-95"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }}
              className="h-12 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"><X className="h-4 w-4" /></button>
          </div>
        )}
        <select
          className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
          value={basic.electronicsBrandId} onChange={(e) => onChange({ electronicsBrandId: e.target.value })}>
          <option value="">-- Brand chunein --</option>
          {(brands as any[]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.authorizedDealer ? '✓ Authorized' : ''}
            </option>
          ))}
        </select>
      </section>

      {/* 5 — COLOR */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-3">
        <Head icon={Palette} n="5" t="Color" d="Product ka color (optional)" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Color Name</Lbl>
            <input value={basic.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="Titanium Blue"
              className={IN} />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={basic.colorHex || '#000000'} onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-12 w-16 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800" />
              <input value={basic.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })} placeholder="#000000"
                className={`${IN} font-mono flex-1`} />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-2">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => {
              const a = basic.colorHex?.toLowerCase() === c.hex;
              return (
                <button key={c.hex} type="button" onClick={() => onChange({ colorName: c.name, colorHex: c.hex })}
                  className={['inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-extrabold transition active:scale-95',
                    a ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200'].join(' ')}>
                  <span className="h-4 w-4 rounded-full border-2 border-white dark:border-slate-700 shadow" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 p-4 sm:p-5 space-y-4">
        <Head icon={DollarSign} n="6" t="Pricing" d="Cost aur retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price (Kharid)</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 transition" />
          </div>
          <div>
            <Lbl tone="emerald">Retail Price (Bikri) *</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.retailPrice}
              onChange={(e) => onChange({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20 transition" />
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKUPS.map((m) => (
                <button key={m} type="button" onClick={() => markup(m)}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold transition active:scale-95">
                  +{m}% <span className="text-slate-500 dark:text-slate-400 font-bold">= {formatPKRFull(Math.round(cost * (1 + m / 100)))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={['rounded-2xl border-2 p-4',
            loss ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
            : margin >= 15 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6',
                  loss ? 'text-rose-700 dark:text-rose-400'
                  : margin >= 15 ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700 dark:text-rose-400'
                    : margin >= 15 ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'].join(' ')}>
                    {loss ? '⚠️ Nuqsaan!' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700 dark:text-rose-400'
                : margin >= 15 ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98]">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Extra rates chhupao' : 'Wholesale / MRP / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Wholesale" type="number" step="0.01" value={basic.wholesalePrice}
              onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" />
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 7 — DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-4">
        <Head icon={FileText} n="7" t="Description" d="Kya khaas hai (optional)" />
        <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Key features, kya khaas hai..."
          className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition" />
      </section>

      {/* 8 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-3">
        <Head icon={ImageIcon} n="8" t="Product Images" d="Pehli image main dikhegi" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="10 tak images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center font-extrabold transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9 — TAGS & FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 space-y-4">
        <Head icon={Sparkles} n="9" t="Marketing Flags" d="Kahan highlight ho" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isTrending} onChange={(v: boolean) => onChange({ isTrending: v })} icon={TrendingUp} label="Trending" />
        </div>

        {(tags as any[]).length > 0 && (
          <div>
            <Lbl>Tags</Lbl>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((t) => {
                const a = basic.tagIds?.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => togTag(t.id)}
                    className={[
                      'inline-flex items-center gap-2 px-3 py-2.5 rounded-full border-2 text-sm font-extrabold transition active:scale-95',
                      a ? 'shadow-sm' : 'opacity-60 hover:opacity-100 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    ].join(' ')}
                    style={a ? { backgroundColor: `${t.color}20`, borderColor: t.color, color: t.color } : undefined}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ══════════ HELPERS ══════════ */
function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-cyan-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100 dark:border-slate-800">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
          <span className="text-slate-400 dark:text-slate-500">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{d}</p>
      </div>
    </div>
  );
}

function Lbl({ children, tone }: any) {
  return (
    <label className={[
      'block text-xs font-extrabold uppercase tracking-wider mb-1.5',
      tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400',
    ].join(' ')}>{children}</label>
  );
}
function Opt() { return <span className="text-slate-400 dark:text-slate-500 normal-case font-bold">(optional)</span>; }
function BadgeCheck(props: any) { return <Award {...props} />; }

function Tog({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition active:scale-95 min-h-[76px]',
        checked
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/50'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-blue-600 dark:text-blue-400 fill-blue-100 dark:fill-blue-500/20' : 'text-slate-500 dark:text-slate-400'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
