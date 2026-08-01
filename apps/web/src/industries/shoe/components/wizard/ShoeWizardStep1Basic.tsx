import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Footprints, Sparkles, Star, TrendingUp, AlertCircle, Award,
  Camera, Wand2, Plus, Check, X, Palette, Tag, User, Users,
  Heart, Zap, Calendar, Layers, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { shoeBrandsApi } from '../../api/brands.api';
import type { ShoeWizardBasic } from '../../hooks/useShoeWizard';

interface Props {
  basic: ShoeWizardBasic;
  onChange: (patch: Partial<ShoeWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: "Men's Footwear",
    items: [
      { v: 'MEN_FORMAL', l: 'Formal', e: '👞' },
      { v: 'MEN_CASUAL', l: 'Casual', e: '👟' },
      { v: 'MEN_SNEAKER', l: 'Sneaker', e: '👟' },
      { v: 'MEN_LOAFER', l: 'Loafer', e: '👞' },
      { v: 'MEN_BOOT', l: 'Boot', e: '🥾' },
      { v: 'MEN_SANDAL', l: 'Sandal', e: '🩴' },
      { v: 'MEN_SLIPPER', l: 'Slipper', e: '🥿' },
      { v: 'MEN_KHUSSA', l: 'Khussa', e: '👡' },
      { v: 'MEN_PESHAWARI', l: 'Peshawari', e: '👞' },
    ],
  },
  {
    group: "Women's Footwear",
    items: [
      { v: 'WOMEN_HEEL', l: 'Heel', e: '👠' },
      { v: 'WOMEN_FLAT', l: 'Flat', e: '🥿' },
      { v: 'WOMEN_SNEAKER', l: 'Sneaker', e: '👟' },
      { v: 'WOMEN_SANDAL', l: 'Sandal', e: '🩴' },
      { v: 'WOMEN_BOOT', l: 'Boot', e: '🥾' },
      { v: 'WOMEN_KHUSSA', l: 'Khussa', e: '👡' },
      { v: 'WOMEN_BRIDAL', l: 'Bridal', e: '💍' },
      { v: 'WOMEN_PUMP', l: 'Pump', e: '👠' },
    ],
  },
  {
    group: "Kids",
    items: [
      { v: 'KIDS_SCHOOL', l: 'School', e: '🎒' },
      { v: 'KIDS_SPORTS', l: 'Sports', e: '⚽' },
      { v: 'KIDS_CASUAL', l: 'Casual', e: '👟' },
      { v: 'KIDS_SANDAL', l: 'Sandal', e: '🩴' },
      { v: 'KIDS_INFANT', l: 'Infant', e: '👶' },
    ],
  },
  {
    group: "Sports",
    items: [
      { v: 'SPORTS_RUNNING', l: 'Running', e: '🏃' },
      { v: 'SPORTS_TRAINING', l: 'Training', e: '💪' },
      { v: 'SPORTS_FOOTBALL', l: 'Football', e: '⚽' },
      { v: 'SPORTS_CRICKET', l: 'Cricket', e: '🏏' },
      { v: 'SPORTS_BASKETBALL', l: 'Basketball', e: '🏀' },
      { v: 'SPORTS_TENNIS', l: 'Tennis', e: '🎾' },
      { v: 'SPORTS_HIKING', l: 'Hiking', e: '🥾' },
      { v: 'SPORTS_GYM', l: 'Gym', e: '🏋️' },
    ],
  },
  {
    group: "Specialty & Other",
    items: [
      { v: 'SAFETY_SHOE', l: 'Safety', e: '🦺' },
      { v: 'MEDICAL_SHOE', l: 'Medical', e: '⚕️' },
      { v: 'ORTHOPEDIC', l: 'Orthopedic', e: '🩹' },
      { v: 'RAIN_BOOT', l: 'Rain Boot', e: '☔' },
      { v: 'FLIP_FLOP', l: 'Flip Flop', e: '🩴' },
      { v: 'CROCS', l: 'Crocs', e: '🥿' },
      { v: 'ACCESSORIES', l: 'Accessories', e: '🎁' },
      { v: 'INSOLES', l: 'Insoles', e: '🦶' },
      { v: 'LACES', l: 'Laces', e: '🎗️' },
      { v: 'POLISH', l: 'Polish', e: '✨' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const GENDERS = [
  { v: 'MEN', l: 'Men', e: '👨', color: 'blue' },
  { v: 'WOMEN', l: 'Women', e: '👩', color: 'rose' },
  { v: 'BOYS', l: 'Boys', e: '👦', color: 'sky' },
  { v: 'GIRLS', l: 'Girls', e: '👧', color: 'pink' },
  { v: 'INFANT', l: 'Infant', e: '👶', color: 'amber' },
  { v: 'UNISEX', l: 'Unisex', e: '🧑', color: 'violet' },
];

const SEASONS = ['All Season', 'Summer', 'Winter', 'Spring', 'Autumn', 'Rainy', 'Eid Collection', 'Wedding Season'];

const COLOR_PRESETS = [
  { name: 'Black', hex: '#000000' }, { name: 'White', hex: '#ffffff' },
  { name: 'Brown', hex: '#8b4513' }, { name: 'Tan', hex: '#d2b48c' },
  { name: 'Navy', hex: '#001f3f' }, { name: 'Grey', hex: '#808080' },
  { name: 'Red', hex: '#dc2626' }, { name: 'Pink', hex: '#ec4899' },
  { name: 'Gold', hex: '#d4af37' }, { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Rose Gold', hex: '#b76e79' }, { name: 'Beige', hex: '#f5f5dc' },
];

export function ShoeWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['shoe-brands'], queryFn: () => shoeBrandsApi.list({ active: true }) });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const mkBrand = useMutation({
    mutationFn: () => shoeBrandsApi.create({ name: newBrand.trim(), isActive: true }),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" created`);
      onChange({ brandId: b.id });
      setNewBrand(''); setShowBrand(false);
      qc.invalidateQueries({ queryKey: ['shoe-brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  });

  const autoSku = () => {
    const b = (basic.name || 'SHOE').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'SHOE';
    const g = basic.gender ? basic.gender.slice(0, 1) : '';
    onChange({ sku: `${b}-${g}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU generated');
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
      <section className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <Head icon={Footprints} n="1" t="Product Name" d="Model name, style + colour" tone="orange" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Nike Air Max 90 - Black/White"
          className="h-16 w-full rounded-2xl border-2 border-orange-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Model Name</Lbl>
            <input value={basic.modelName} onChange={(e) => onChange({ modelName: e.target.value })} placeholder="Air Max 90"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <Lbl>Model Code <Opt /></Lbl>
            <input value={basic.modelCode} onChange={(e) => onChange({ modelCode: e.target.value })} placeholder="CN8490-002"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="NIKE-AM90-M-1234"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — GENDER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={User} n="2" t="Gender / Age Group" d="Who is this for?" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GENDERS.map((g) => {
            const a = basic.gender === g.v;
            const tones: Record<string, string> = {
              blue: 'border-blue-500 bg-blue-500 text-white',
              rose: 'border-rose-500 bg-rose-500 text-white',
              sky: 'border-sky-500 bg-sky-500 text-white',
              pink: 'border-pink-500 bg-pink-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              violet: 'border-violet-500 bg-violet-500 text-white',
            };
            return (
              <button key={g.v} type="button" onClick={() => onChange({ gender: g.v })}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[g.color]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl">{g.e}</span>
                <span className="text-[10px] font-extrabold">{g.l}</span>
              </button>
            );
          })}
        </div>
        <div>
          <Lbl>Age Group <Opt /></Lbl>
          <input value={basic.ageGroup} onChange={(e) => onChange({ ageGroup: e.target.value })}
            placeholder="Adult, 6-12 years, Teen..."
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {/* 3 — CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="3" t="Category Type" d="What kind of shoe?" />
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
                        a ? 'border-orange-600 bg-orange-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-orange-400'].join(' ')}>
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

      {/* 4 — BRAND */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Head icon={Award} n="4" t="Brand" d="Nike, Adidas, Servis, Bata..." />
          <button type="button" onClick={() => setShowBrand((v) => !v)}
            className="text-xs font-extrabold text-violet-700 inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> New brand
          </button>
        </div>
        {showBrand && (
          <div className="flex gap-2">
            <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()} placeholder="e.g. Puma"
              className="h-11 flex-1 rounded-xl border-2 border-violet-300 px-3 text-sm font-bold focus:outline-none focus:border-violet-600" />
            <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
              className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }} className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        <select className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500"
          value={basic.brandId} onChange={(e) => onChange({ brandId: e.target.value })}>
          <option value="">-- Select brand --</option>
          {(brands as any[]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.isPremium ? ' ⭐ Premium' : ''}
              {b.isLocal ? ' 🇵🇰 Local' : ''}
              {b.isSportsBrand ? ' 🏃 Sports' : ''}
            </option>
          ))}
        </select>
      </section>

      {/* 5 — COLOR */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Palette} n="5" t="Colour" d="Primary colour of the shoe" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Colour Name</Lbl>
            <input value={basic.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="Jet Black"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <Lbl>Colour Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={basic.colorHex || '#000000'} onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={basic.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })} placeholder="#000000"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button key={c.hex} type="button" onClick={() => onChange({ colorName: c.name, colorHex: c.hex })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-orange-400 text-xs font-extrabold">
                <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — COLLECTION / SEASON */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Layers} n="6" t="Collection & Season" d="Optional grouping" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Collection <Opt /></Lbl>
            <input value={basic.collection} onChange={(e) => onChange({ collection: e.target.value })}
              placeholder="Air Jordan, Eid 2026..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <Lbl>Season <Opt /></Lbl>
            <select value={basic.season} onChange={(e) => onChange({ season: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
              <option value="">Not specified</option>
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* 7 — DESCRIPTION + CATEGORY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="7" t="Shop Category & Description" d="Optional (helps search)" />
        <div>
          <Lbl>Shop Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
            <option value="">None</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, style highlights..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500" />
        </div>
      </section>

      {/* 8 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="8" t="Product Images" d="First image = main. Show side, top, sole" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-orange-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 9 — MARKETING FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="9" t="Marketing Flags" d="Where does it get highlighted?" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Zap} label="New Arrival" />
          <Tog checked={basic.isTrending} onChange={(v: boolean) => onChange({ isTrending: v })} icon={TrendingUp} label="Trending" />
          <Tog checked={basic.isBridal} onChange={(v: boolean) => onChange({ isBridal: v })} icon={Heart} label="Bridal" />
          <Tog checked={basic.isEidSpecial} onChange={(v: boolean) => onChange({ isEidSpecial: v })} icon={Calendar} label="Eid Special" />
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
    orange: 'from-orange-500 to-amber-700',
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
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function Opt() { return <span className="text-slate-400 normal-case font-bold">(optional)</span>; }
function Tog({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-orange-600 fill-orange-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
