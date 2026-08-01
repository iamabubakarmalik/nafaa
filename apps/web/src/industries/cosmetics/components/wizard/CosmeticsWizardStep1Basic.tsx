import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, DollarSign, Image as ImageIcon, Star, TrendingUp,
  AlertCircle, Award, Percent, Camera, Wand2, Plus, Check, X,
  ChevronDown, ChevronUp, Zap, Palette, Tag, Heart, Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { cosmeticsBrandsApi } from '../../api/brands.api';
import { formatPKRFull } from '@core/lib/format';
import type { CosmeticsWizardBasic } from '../../hooks/useCosmeticsWizard';

interface Props {
  basic: CosmeticsWizardBasic;
  onChange: (patch: Partial<CosmeticsWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS = [
  {
    group: 'Face Makeup',
    items: [
      { v: 'FOUNDATION', l: 'Foundation', e: '💧' },
      { v: 'CONCEALER', l: 'Concealer', e: '🎨' },
      { v: 'POWDER', l: 'Powder', e: '✨' },
      { v: 'BLUSH', l: 'Blush', e: '🌸' },
      { v: 'BRONZER', l: 'Bronzer', e: '☀️' },
      { v: 'HIGHLIGHTER', l: 'Highlighter', e: '💫' },
    ],
  },
  {
    group: 'Eyes',
    items: [
      { v: 'EYESHADOW', l: 'Eyeshadow', e: '👁️' },
      { v: 'EYELINER', l: 'Eyeliner', e: '✒️' },
      { v: 'MASCARA', l: 'Mascara', e: '🖤' },
      { v: 'EYEBROW', l: 'Eyebrow', e: '👀' },
    ],
  },
  {
    group: 'Lips',
    items: [
      { v: 'LIPSTICK', l: 'Lipstick', e: '💋' },
      { v: 'LIP_GLOSS', l: 'Lip Gloss', e: '💄' },
      { v: 'LIP_LINER', l: 'Lip Liner', e: '✏️' },
      { v: 'LIP_BALM', l: 'Lip Balm', e: '🍒' },
    ],
  },
  {
    group: 'Tools & Palettes',
    items: [
      { v: 'MAKEUP_PALETTE', l: 'Palette', e: '🎨' },
      { v: 'MAKEUP_BRUSH', l: 'Brush', e: '🖌️' },
      { v: 'MAKEUP_REMOVER', l: 'Remover', e: '🧴' },
    ],
  },
  {
    group: 'Skincare',
    items: [
      { v: 'FACE_WASH', l: 'Face Wash', e: '🧼' },
      { v: 'CLEANSER', l: 'Cleanser', e: '💧' },
      { v: 'TONER', l: 'Toner', e: '🌿' },
      { v: 'SERUM', l: 'Serum', e: '💎' },
      { v: 'MOISTURIZER', l: 'Moisturizer', e: '🧴' },
      { v: 'DAY_CREAM', l: 'Day Cream', e: '☀️' },
      { v: 'NIGHT_CREAM', l: 'Night Cream', e: '🌙' },
      { v: 'EYE_CREAM', l: 'Eye Cream', e: '👁️' },
      { v: 'FACE_MASK', l: 'Face Mask', e: '😷' },
      { v: 'SHEET_MASK', l: 'Sheet Mask', e: '📄' },
      { v: 'EXFOLIATOR', l: 'Exfoliator', e: '🌱' },
      { v: 'SUNSCREEN', l: 'Sunscreen', e: '☀️' },
    ],
  },
  {
    group: 'Body Care',
    items: [
      { v: 'BODY_LOTION', l: 'Body Lotion', e: '🧴' },
      { v: 'BODY_WASH', l: 'Body Wash', e: '🚿' },
      { v: 'BODY_SCRUB', l: 'Body Scrub', e: '🌿' },
      { v: 'BODY_OIL', l: 'Body Oil', e: '💧' },
      { v: 'HAND_CREAM', l: 'Hand Cream', e: '✋' },
      { v: 'FOOT_CREAM', l: 'Foot Cream', e: '🦶' },
    ],
  },
  {
    group: 'Fragrance',
    items: [
      { v: 'PERFUME', l: 'Perfume', e: '🌹' },
      { v: 'EAU_DE_TOILETTE', l: 'EDT', e: '💐' },
      { v: 'BODY_MIST', l: 'Body Mist', e: '💨' },
      { v: 'DEODORANT', l: 'Deodorant', e: '🌸' },
      { v: 'ATTAR', l: 'Attar', e: '🕌' },
      { v: 'FRAGRANCE_GIFT_SET', l: 'Gift Set', e: '🎁' },
    ],
  },
  {
    group: 'Haircare',
    items: [
      { v: 'SHAMPOO', l: 'Shampoo', e: '🧴' },
      { v: 'CONDITIONER', l: 'Conditioner', e: '💆' },
      { v: 'HAIR_OIL', l: 'Hair Oil', e: '💧' },
      { v: 'HAIR_MASK', l: 'Hair Mask', e: '👑' },
      { v: 'HAIR_SERUM', l: 'Hair Serum', e: '💎' },
      { v: 'HAIR_COLOR', l: 'Hair Color', e: '🎨' },
      { v: 'HAIR_STYLING', l: 'Styling', e: '💇' },
    ],
  },
  {
    group: "Nails & Men's",
    items: [
      { v: 'NAIL_POLISH', l: 'Nail Polish', e: '💅' },
      { v: 'NAIL_REMOVER', l: 'Remover', e: '🧪' },
      { v: 'NAIL_ART', l: 'Nail Art', e: '🎨' },
      { v: 'SHAVING_CREAM', l: 'Shaving', e: '🪒' },
      { v: 'AFTER_SHAVE', l: 'After Shave', e: '🧴' },
      { v: 'BEARD_OIL', l: 'Beard Oil', e: '🧔' },
    ],
  },
  {
    group: 'Tools & Others',
    items: [
      { v: 'HAIR_DRYER', l: 'Hair Dryer', e: '💨' },
      { v: 'STRAIGHTENER', l: 'Straightener', e: '📏' },
      { v: 'CURLING_IRON', l: 'Curling Iron', e: '➰' },
      { v: 'BEAUTY_TOOL', l: 'Tool', e: '🛠️' },
      { v: 'SOAP', l: 'Soap', e: '🧼' },
      { v: 'BATH_BOMB', l: 'Bath Bomb', e: '💣' },
      { v: 'GIFT_SET', l: 'Gift Set', e: '🎁' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const FINISHES = [
  { v: 'MATTE', l: 'Matte', e: '🎨', tone: 'slate' },
  { v: 'DEWY', l: 'Dewy', e: '💧', tone: 'sky' },
  { v: 'SATIN', l: 'Satin', e: '✨', tone: 'violet' },
  { v: 'GLOSSY', l: 'Glossy', e: '💫', tone: 'pink' },
  { v: 'SHIMMER', l: 'Shimmer', e: '⭐', tone: 'amber' },
  { v: 'NATURAL', l: 'Natural', e: '🌿', tone: 'emerald' },
  { v: 'METALLIC', l: 'Metallic', e: '🥇', tone: 'orange' },
];

const MARKUPS = [15, 25, 40, 60, 80, 100];

const SHADE_PRESETS = [
  { name: 'Ivory', hex: '#f5e6d3' },
  { name: 'Beige', hex: '#e8c9a0' },
  { name: 'Sand', hex: '#d4a373' },
  { name: 'Caramel', hex: '#b07b4a' },
  { name: 'Mocha', hex: '#8b5a3c' },
  { name: 'Espresso', hex: '#5c3a2e' },
  { name: 'Ruby Red', hex: '#c81d3f' },
  { name: 'Coral', hex: '#f88379' },
  { name: 'Nude Pink', hex: '#dfa0a0' },
  { name: 'Berry', hex: '#8b3a5f' },
  { name: 'Plum', hex: '#673147' },
  { name: 'Rose Gold', hex: '#b76e79' },
];

export function CosmeticsWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.wholesalePrice || basic.mrp || basic.taxRate));
  const [newBrand, setNewBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['cosmetics-brands'], queryFn: () => cosmeticsBrandsApi.list({ active: true }) });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const mkBrand = useMutation({
    mutationFn: () => cosmeticsBrandsApi.create({ name: newBrand.trim(), isActive: true }),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" added`);
      onChange({ brandId: b.id });
      setNewBrand(''); setShowBrand(false);
      qc.invalidateQueries({ queryKey: ['cosmetics-brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add'),
  });

  const autoSku = () => {
    const b = (basic.name || 'COSM').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'COSM';
    onChange({ sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
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
      {scan && <BarcodeScanner onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode captured'); }} onClose={() => setScan(false)} />}

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
      <section className="rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
        <Head icon={Sparkles} n="1" t="Product Name" d="Full product title with variant details" tone="pink" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Maybelline Fit Me Foundation 220 Natural Beige"
          className="h-16 w-full rounded-2xl border-2 border-pink-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-pink-600 focus:ring-4 focus:ring-pink-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="MYB-FDN-220"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={autoSku} className="h-11 px-3 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="6901234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={() => setScan(true)} className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="2" t="Category Type" d="What kind of product is this?" />
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
                        a ? 'border-pink-600 bg-pink-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
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

      {/* 3 — BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Head icon={Award} n="3" t="Brand" d="Maybelline, MAC, Estée Lauder..." />
          <button type="button" onClick={() => setShowBrand((v) => !v)} className="text-xs font-extrabold text-pink-700 inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> New brand
          </button>
        </div>
        {showBrand && (
          <div className="flex gap-2">
            <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()} placeholder="e.g. Fenty Beauty"
              className="h-11 flex-1 rounded-xl border-2 border-pink-300 px-3 text-sm font-bold focus:outline-none focus:border-pink-600" />
            <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
              className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }} className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        <select className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
          value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })}>
          <option value="">-- Select brand --</option>
          {(brands as any[]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.isPremium ? ' 👑 Premium' : ''}
              {b.isHalalCertified ? ' ✓ Halal' : ''}
              {b.isCrueltyFree ? ' 🐰 CF' : ''}
            </option>
          ))}
        </select>
      </section>

      {/* 4 — SHADE (for makeup) */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Palette} n="4" t="Shade / Color" d="For foundations, lipsticks, eyeshadows" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Shade Name</Lbl>
            <input value={basic.shadeName} onChange={(e) => onChange({ shadeName: e.target.value })} placeholder="Natural Beige"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <Lbl>Shade Code</Lbl>
            <input value={basic.shadeCode} onChange={(e) => onChange({ shadeCode: e.target.value })} placeholder="220"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={basic.shadeHex || '#000000'} onChange={(e) => onChange({ shadeHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={basic.shadeHex} onChange={(e) => onChange({ shadeHex: e.target.value })} placeholder="#dfa0a0"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-pink-500" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Popular shades</div>
          <div className="flex flex-wrap gap-1.5">
            {SHADE_PRESETS.map((c) => (
              <button key={c.hex} type="button" onClick={() => onChange({ shadeName: c.name, shadeHex: c.hex })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-pink-400 text-xs font-extrabold">
                <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — FINISH */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Sparkles} n="5" t="Finish" d="How does it look on skin?" />
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {FINISHES.map((f) => {
            const a = basic.finish === f.v;
            const tones: Record<string, string> = {
              slate: 'border-slate-500 bg-slate-500 text-white',
              sky: 'border-sky-500 bg-sky-500 text-white',
              violet: 'border-violet-500 bg-violet-500 text-white',
              pink: 'border-pink-500 bg-pink-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              emerald: 'border-emerald-500 bg-emerald-500 text-white',
              orange: 'border-orange-500 bg-orange-500 text-white',
            };
            return (
              <button key={f.v} type="button" onClick={() => onChange({ finish: basic.finish === f.v ? '' : f.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[f.tone]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl">{f.e}</span>
                <span className="text-[10px] font-extrabold text-center">{f.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 6 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="6" t="Pricing" d="Cost and retail price" tone="emerald" />

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
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup (cosmetics standard: 40-100%)
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
          {adv ? 'Hide extra rates' : 'Wholesale / MRP / Tax'}
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

      {/* 7 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="7" t="Category & Description" d="Optional but helps search" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, what makes it special..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
        </div>
      </section>

      {/* 8 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="8" t="Product Images" d="First image becomes the cover" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images (front, back, swatch, box)" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold">COVER</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9 — FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="9" t="Marketing Flags" d="Where it gets highlighted" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isLimitedEdition} onChange={(v: boolean) => onChange({ isLimitedEdition: v })} icon={Crown} label="Limited" />
          <Tog checked={basic.isViral} onChange={(v: boolean) => onChange({ isViral: v })} icon={TrendingUp} label="Viral 🔥" />
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
    pink: 'from-pink-500 to-rose-700',
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
        checked ? 'border-pink-500 bg-pink-50 text-pink-800' : 'border-slate-200 bg-white text-slate-600 hover:border-pink-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-pink-600 fill-pink-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
