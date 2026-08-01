import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Glasses, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Award, Percent, Camera, Wand2, ChevronDown, ChevronUp, Zap,
  Tag, Users, Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { OpticalWizardBasic } from '../../hooks/useOpticalWizard';

interface Props {
  basic: OpticalWizardBasic;
  onChange: (patch: Partial<OpticalWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: 'Eyewear',
    items: [
      { v: 'EYEGLASSES_FRAME', l: 'Eyeglass Frame', e: '👓' },
      { v: 'SUNGLASSES', l: 'Sunglasses', e: '🕶️' },
      { v: 'READING_GLASSES', l: 'Reading Glass', e: '📖' },
      { v: 'SPORTS_EYEWEAR', l: 'Sports', e: '🏃' },
      { v: 'SAFETY_GOGGLES', l: 'Safety Goggles', e: '🥽' },
      { v: 'KIDS_EYEWEAR', l: 'Kids Eyewear', e: '👶' },
    ],
  },
  {
    group: 'Lenses',
    items: [
      { v: 'PRESCRIPTION_LENS', l: 'Rx Lens', e: '🔍' },
      { v: 'PROGRESSIVE_LENS', l: 'Progressive', e: '📊' },
      { v: 'BIFOCAL_LENS', l: 'Bifocal', e: '⚡' },
      { v: 'BLUE_CUT_LENS', l: 'Blue Cut', e: '💙' },
      { v: 'PHOTOCHROMIC_LENS', l: 'Photochromic', e: '☀️' },
    ],
  },
  {
    group: 'Contact & Accessories',
    items: [
      { v: 'CONTACT_LENS', l: 'Contact Lens', e: '👁️' },
      { v: 'ACCESSORY', l: 'Accessory', e: '🎁' },
      { v: 'CLEANING_KIT', l: 'Cleaning Kit', e: '🧴' },
      { v: 'CASE', l: 'Case', e: '📦' },
      { v: 'CHAIN', l: 'Chain', e: '🔗' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const GENDER_OPTIONS = [
  { v: 'UNISEX', l: 'Unisex', e: '👥' },
  { v: 'MEN', l: 'Men', e: '👨' },
  { v: 'WOMEN', l: 'Women', e: '👩' },
  { v: 'KIDS', l: 'Kids', e: '👶' },
];

const MARKUPS = [15, 20, 30, 40, 50, 60, 80, 100];

const POPULAR_BRANDS = [
  'Ray-Ban', 'Oakley', 'Gucci', 'Prada', 'Versace', 'Tom Ford',
  'Persol', 'Maui Jim', 'Fossil', 'Vogue', 'Titan', 'Fastrack',
  'Local Brand',
];

export function OpticalWizardStep1Basic({ basic, onChange, errors }: Props) {
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.mrp || basic.taxRate || basic.discountedPrice));
  const [showTryOn, setShowTryOn] = useState(Boolean(basic.tryOnUrl));

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const autoSku = () => {
    const b = (basic.brand || 'OPT').toUpperCase().slice(0, 3);
    const m = (basic.modelNumber || basic.name || 'X').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    onChange({ sku: `${b}-${m}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU generated');
  };
  const markup = (pct: number) => {
    if (!cost) return toast.error('Enter cost price first');
    onChange({ retailPrice: Math.round(cost * (1 + pct / 100)) });
  };
  const togTag = (id: string) => {
    const c = basic.tagIds ?? [];
    onChange({ tagIds: c.includes(id) ? c.filter((t) => t !== id) : [...c, id] });
  };

  return (
    <div className="space-y-5">
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode captured'); }}
          onClose={() => setScan(false)}
        />
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 1 — NAME */}
      <section className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <Head icon={Glasses} n="1" t="Product Name" d="Model + collection + color" tone="cyan" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ray-Ban Aviator Classic RB3025 Gold"
          className="h-16 w-full rounded-2xl border-2 border-cyan-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-200" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Model Number</Lbl>
            <input value={basic.modelNumber} onChange={(e) => onChange({ modelNumber: e.target.value })} placeholder="RB3025"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <Lbl>Collection <Opt /></Lbl>
            <input value={basic.collectionName} onChange={(e) => onChange({ collectionName: e.target.value })} placeholder="Classic, Signature..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="RB-3025-001"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
              <button type="button" onClick={autoSku} className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
        </div>

        <div>
          <Lbl>Barcode</Lbl>
          <div className="flex gap-2">
            <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8054916471234"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
            <button type="button" onClick={() => setScan(true)} className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
              <Camera className="h-4 w-4" /> Scan
            </button>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY TYPE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="2" t="Category Type" d="Frame, lens, contact lens or accessory?" />
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {CATEGORY_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5 min-h-[68px]',
                        a ? 'border-cyan-600 bg-cyan-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400'].join(' ')}>
                      <span className="text-xl leading-none">{c.e}</span>
                      <span className="text-[10px] font-extrabold text-center leading-tight">{c.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — GENDER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Users} n="3" t="Gender / Age Group" d="Who is this for?" />
        <div className="grid grid-cols-4 gap-2">
          {GENDER_OPTIONS.map((g) => {
            const a = basic.gender === g.v;
            return (
              <button key={g.v} type="button" onClick={() => onChange({ gender: g.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? 'border-pink-500 bg-pink-500 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                <span className="text-2xl">{g.e}</span>
                <span className="text-[10px] font-extrabold">{g.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Award} n="4" t="Brand" d="Manufacturer name (optional)" />
        <input value={basic.brand} onChange={(e) => onChange({ brand: e.target.value })} placeholder="Ray-Ban, Oakley, Gucci..."
          className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Popular brands</div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_BRANDS.map((b) => (
              <button key={b} type="button" onClick={() => onChange({ brand: b })}
                className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                  basic.brand === b ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'].join(' ')}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="5" t="Pricing" d="Cost and retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <Lbl tone="emerald">Retail Price *</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.retailPrice}
              onChange={(e) => onChange({ retailPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup (optical often 100%+)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKUPS.map((m) => (
                <button key={m} type="button" onClick={() => markup(m)}
                  className="px-3 py-2 rounded-xl bg-white border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  +{m}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(cost * (1 + m / 100)))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={['rounded-2xl border-2 p-4',
            loss ? 'bg-rose-50 border-rose-300' : margin >= 40 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 40 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'MRP / Discounted / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed" />
            <Input label="Discounted Price" type="number" step="0.01" value={basic.discountedPrice}
              onChange={(e) => onChange({ discountedPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sale" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 6 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="6" t="Shop Category & Description" d="Optional — for search" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Style highlights, comfort, best-for..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
        </div>
      </section>

      {/* 7 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="7" t="Product Images" d="First image is the main gallery photo" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images — show front, side, worn on model" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-cyan-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setShowTryOn((v) => !v)}
          className="w-full py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-violet-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {showTryOn ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showTryOn ? 'Hide virtual try-on URL' : 'Add virtual try-on URL'}
        </button>

        {showTryOn && (
          <div>
            <Lbl><Video className="h-3 w-3 inline mr-1" /> Virtual Try-On URL</Lbl>
            <input value={basic.tryOnUrl} onChange={(e) => onChange({ tryOnUrl: e.target.value })}
              placeholder="https://try-on.example.com/rb3025"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
        )}
      </section>

      {/* 8 — FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="8" t="Marketing Flags" d="Where should it be highlighted" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isDesigner} onChange={(v: boolean) => onChange({ isDesigner: v })} icon={Sparkles} label="Designer" />
        </div>

        {(tags as any[]).length > 0 && (
          <div>
            <Lbl>Tags</Lbl>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((t) => {
                const a = basic.tagIds?.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => togTag(t.id)}
                    className={['inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-extrabold',
                      a ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                    style={{ backgroundColor: a ? `${t.color}20` : '#fff', borderColor: a ? t.color : '#e2e8f0', color: a ? t.color : '#475569' }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
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

function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    cyan: 'from-cyan-500 to-sky-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{d}</p>
      </div>
    </div>
  );
}
function Lbl({ children, tone }: any) {
  return <label className={['block text-xs font-extrabold uppercase tracking-wider mb-1.5',
    tone === 'emerald' ? 'text-emerald-700' : 'text-slate-600'].join(' ')}>{children}</label>;
}
function Opt() { return <span className="text-slate-400 normal-case font-bold">(optional)</span>; }
function Tog({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-cyan-600 fill-cyan-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
