import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sofa, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Award, Percent, Camera, Wand2, ChevronDown, ChevronUp,
  Zap, Tag, MapPin, Leaf, Hammer, Palette, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { FurnitureWizardBasic } from '../../hooks/useFurnitureWizard';

interface Props {
  basic: FurnitureWizardBasic;
  onChange: (patch: Partial<FurnitureWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: 'Sofas & Seating',
    items: [
      { v: 'SOFA_SET', l: 'Sofa Set', e: '🛋️' },
      { v: 'SOFA_L_SHAPE', l: 'L-Shape', e: '🛋️' },
      { v: 'SOFA_RECLINER', l: 'Recliner', e: '💺' },
      { v: 'SOFA_BED', l: 'Sofa Bed', e: '🛏️' },
      { v: 'BEAN_BAG', l: 'Bean Bag', e: '🫘' },
      { v: 'OTTOMAN', l: 'Ottoman', e: '🪑' },
    ],
  },
  {
    group: 'Bedroom',
    items: [
      { v: 'BED_SINGLE', l: 'Single Bed', e: '🛏️' },
      { v: 'BED_DOUBLE', l: 'Double Bed', e: '🛏️' },
      { v: 'BED_KING', l: 'King Bed', e: '👑' },
      { v: 'BED_QUEEN', l: 'Queen Bed', e: '🛏️' },
      { v: 'BED_BUNK', l: 'Bunk Bed', e: '🛏️' },
      { v: 'MATTRESS', l: 'Mattress', e: '🛌' },
      { v: 'WARDROBE', l: 'Wardrobe', e: '🚪' },
      { v: 'DRESSING_TABLE', l: 'Dressing', e: '🪞' },
    ],
  },
  {
    group: 'Dining',
    items: [
      { v: 'DINING_TABLE', l: 'Dining Table', e: '🍽️' },
      { v: 'DINING_CHAIR', l: 'Dining Chair', e: '🪑' },
      { v: 'DINING_SET', l: 'Dining Set', e: '🍽️' },
    ],
  },
  {
    group: 'Living / Tables',
    items: [
      { v: 'CENTER_TABLE', l: 'Center Table', e: '🟫' },
      { v: 'SIDE_TABLE', l: 'Side Table', e: '🟫' },
      { v: 'TV_CONSOLE', l: 'TV Console', e: '📺' },
      { v: 'ENTERTAINMENT_UNIT', l: 'Ent. Unit', e: '🎬' },
    ],
  },
  {
    group: 'Office',
    items: [
      { v: 'OFFICE_DESK', l: 'Office Desk', e: '💼' },
      { v: 'OFFICE_CHAIR', l: 'Office Chair', e: '💺' },
      { v: 'BOOKSHELF', l: 'Bookshelf', e: '📚' },
      { v: 'STUDY_TABLE', l: 'Study Table', e: '📖' },
    ],
  },
  {
    group: 'Storage',
    items: [
      { v: 'SHOE_RACK', l: 'Shoe Rack', e: '👞' },
      { v: 'CABINET', l: 'Cabinet', e: '🗄️' },
      { v: 'CUPBOARD', l: 'Cupboard', e: '🚪' },
    ],
  },
  {
    group: 'Kids & Outdoor',
    items: [
      { v: 'KIDS_FURNITURE', l: 'Kids', e: '🧸' },
      { v: 'BABY_COT', l: 'Baby Cot', e: '👶' },
      { v: 'OUTDOOR_FURNITURE', l: 'Outdoor', e: '🌳' },
      { v: 'GARDEN_SET', l: 'Garden Set', e: '🌿' },
    ],
  },
  {
    group: 'Decor & Other',
    items: [
      { v: 'CURTAINS', l: 'Curtains', e: '🪟' },
      { v: 'RUG', l: 'Rug', e: '🧶' },
      { v: 'DECOR', l: 'Decor', e: '🖼️' },
      { v: 'LIGHTING', l: 'Lighting', e: '💡' },
      { v: 'MIRROR', l: 'Mirror', e: '🪞' },
      { v: 'CUSTOM_FURNITURE', l: 'Custom', e: '🔨' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const CONDITIONS = [
  { v: 'BRAND_NEW', l: 'Brand New', e: '✨', tone: 'emerald' },
  { v: 'DISPLAY_MODEL', l: 'Display Model', e: '🏬', tone: 'blue' },
  { v: 'FLOOR_MODEL', l: 'Floor Model', e: '🪑', tone: 'sky' },
  { v: 'REFURBISHED', l: 'Refurbished', e: '🔧', tone: 'violet' },
  { v: 'PRE_OWNED', l: 'Pre-owned', e: '♻️', tone: 'amber' },
  { v: 'CUSTOM_ORDER', l: 'Custom Order', e: '🎨', tone: 'rose' },
];

const MARKUPS = [15, 20, 25, 30, 40, 50];

const COUNTRIES = ['Pakistan', 'Malaysia', 'Indonesia', 'China', 'India', 'Turkey', 'Italy', 'USA', 'Germany'];

export function FurnitureWizardStep1Basic({ basic, onChange, errors }: Props) {
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.mrp || basic.taxRate || basic.discountedPrice || basic.emiStartingFrom));
  const [showShowroom, setShowShowroom] = useState(Boolean(basic.showroomLocation || basic.showroomFloor));
  const [showBrand, setShowBrand] = useState(Boolean(basic.brand || basic.collectionName || basic.designerName));

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const autoSku = () => {
    const base = (basic.name || 'FURN').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'FURN';
    const cat = basic.categoryType ? basic.categoryType.split('_')[0].slice(0, 3) : '';
    onChange({ sku: `${base}-${cat}-${Math.floor(100 + Math.random() * 900)}` });
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

      {/* 1 — PRODUCT NAME */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <Head icon={Sofa} n="1" t="Product Name" d="Full product name with size" tone="amber" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="7-Seater L-Shape Sofa Set — Sheesham Wood"
          className="h-16 w-full rounded-2xl border-2 border-amber-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="SOFA-LSH-001"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="2" t="Category" d="What kind of furniture is this?" />
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {CATEGORY_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5 min-h-[68px]',
                        a ? 'border-amber-600 bg-amber-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
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

      {/* 3 — CONDITION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Award} n="3" t="Condition" d="Brand new, display or refurbished?" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CONDITIONS.map((c) => {
            const a = basic.conditionType === c.v;
            const tones: Record<string, string> = {
              emerald: 'border-emerald-500 bg-emerald-500 text-white',
              blue: 'border-blue-500 bg-blue-500 text-white',
              sky: 'border-sky-500 bg-sky-500 text-white',
              violet: 'border-violet-500 bg-violet-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              rose: 'border-rose-500 bg-rose-500 text-white',
            };
            return (
              <button key={c.v} type="button" onClick={() => onChange({ conditionType: c.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[c.tone]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl">{c.e}</span>
                <span className="text-[10px] font-extrabold text-center">{c.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="4" t="Pricing" d="Cost and retail price" tone="emerald" />

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
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup (furniture typically 25-50%)
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
            loss ? 'bg-rose-50 border-rose-300' : margin >= 25 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra pricing' : 'Wholesale / MRP / Discounted / EMI'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Wholesale" type="number" step="0.01" value={basic.wholesalePrice}
              onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Bulk price" />
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Discounted Sale Price" type="number" step="0.01" value={basic.discountedPrice}
              onChange={(e) => onChange({ discountedPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sale offer" />
            <Input label="EMI Starting From" type="number" step="0.01" value={basic.emiStartingFrom}
              onChange={(e) => onChange({ emiStartingFrom: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Monthly installment" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 5 — BRAND & COLLECTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Head icon={Award} n="5" t="Brand & Collection" d="Brand, model, designer info" />
          <button type="button" onClick={() => setShowBrand((v) => !v)}
            className="text-xs font-extrabold text-amber-700 inline-flex items-center gap-1">
            {showBrand ? 'Hide' : 'Show'}
          </button>
        </div>
        {showBrand && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Brand" value={basic.brand}
              onChange={(e) => onChange({ brand: e.target.value })} placeholder="e.g. Interwood, Habitt" />
            <Input label="Collection Name" value={basic.collectionName}
              onChange={(e) => onChange({ collectionName: e.target.value })} placeholder="Royal Collection" />
            <Input label="Designer" value={basic.designerName}
              onChange={(e) => onChange({ designerName: e.target.value })} placeholder="Designer name" />
            <Input label="Model Number" value={basic.modelNumber}
              onChange={(e) => onChange({ modelNumber: e.target.value })} placeholder="M-2026-01" />
            <div>
              <Lbl>Country of Origin</Lbl>
              <input list="countriesList" value={basic.countryOfOrigin}
                onChange={(e) => onChange({ countryOfOrigin: e.target.value })} placeholder="Pakistan"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              <datalist id="countriesList">
                {COUNTRIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
        )}
      </section>

      {/* 6 — SHOWROOM LOCATION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Head icon={Building2} n="6" t="Showroom Location" d="Where is this displayed?" />
          <button type="button" onClick={() => setShowShowroom((v) => !v)}
            className="text-xs font-extrabold text-amber-700 inline-flex items-center gap-1">
            {showShowroom ? 'Hide' : 'Show'}
          </button>
        </div>
        {showShowroom && (
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>Location</Lbl>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={basic.showroomLocation} onChange={(e) => onChange({ showroomLocation: e.target.value })}
                  placeholder="Main Showroom"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
            </div>
            <Input label="Floor" value={basic.showroomFloor}
              onChange={(e) => onChange({ showroomFloor: e.target.value })} placeholder="Ground / 1st / 2nd" />
            <Input label="Display Zone" value={basic.displayZone}
              onChange={(e) => onChange({ displayZone: e.target.value })} placeholder="Zone A / Bedroom Section" />
          </div>
        )}
      </section>

      {/* 7 — CATEGORY & DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="7" t="Shop Category & Description" d="Optional but helps search" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Elegant, hand-crafted, family-sized..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
      </section>

      {/* 8 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="8" t="Product Images" d="First image is main display" />
        <UploadDropzone purpose="product-image" maxFiles={12}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 12 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9 — MARKETING FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="9" t="Marketing Flags" d="Where it gets highlighted" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" tone="amber" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" tone="orange" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" tone="emerald" />
          <Tog checked={basic.isCustomMade} onChange={(v: boolean) => onChange({ isCustomMade: v })} icon={Hammer} label="Custom Made" tone="violet" />
          <Tog checked={basic.isEcoFriendly} onChange={(v: boolean) => onChange({ isEcoFriendly: v })} icon={Leaf} label="Eco-Friendly" tone="green" />
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
    amber: 'from-amber-600 to-orange-800',
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
function Tog({ checked, onChange, icon: Icon, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'border-amber-500 bg-amber-50 text-amber-800',
    orange: 'border-orange-500 bg-orange-50 text-orange-800',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-500 bg-violet-50 text-violet-800',
    green: 'border-green-500 bg-green-50 text-green-800',
  };
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? tones[tone] : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? '' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
