import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gamepad2, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Percent, Camera, Wand2, ChevronDown, ChevronUp, Zap,
  Tag, Monitor, Recycle, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { GamingWizardBasic } from '../../hooks/useGamingWizard';
import { CategoryPicker, makeCategoryTypeResolver } from '@modules/inventory/categories/components/CategoryPicker';

interface Props {
  basic: GamingWizardBasic;
  onChange: (patch: Partial<GamingWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_GROUPS: Array<{ group: string; items: Array<{ v: string; l: string; e: string }> }> = [
  {
    group: 'Consoles',
    items: [
      { v: 'CONSOLE_PS5', l: 'PS5', e: '🎮' },
      { v: 'CONSOLE_PS4', l: 'PS4', e: '🎮' },
      { v: 'CONSOLE_XBOX_SERIES', l: 'Xbox Series', e: '🟩' },
      { v: 'CONSOLE_XBOX_ONE', l: 'Xbox One', e: '🟩' },
      { v: 'CONSOLE_NINTENDO_SWITCH', l: 'Switch', e: '🔴' },
      { v: 'CONSOLE_HANDHELD', l: 'Handheld', e: '📟' },
      { v: 'CONSOLE_RETRO', l: 'Retro', e: '👾' },
    ],
  },
  {
    group: 'Games',
    items: [
      { v: 'GAME_DISC', l: 'Game Disc', e: '💿' },
      { v: 'GAME_DIGITAL', l: 'Digital Key', e: '🔑' },
      { v: 'GAME_COLLECTOR_EDITION', l: 'Collector Ed.', e: '🏆' },
    ],
  },
  {
    group: 'Accessories',
    items: [
      { v: 'CONTROLLER', l: 'Controller', e: '🕹️' },
      { v: 'HEADSET_GAMING', l: 'Headset', e: '🎧' },
      { v: 'KEYBOARD_GAMING', l: 'Keyboard', e: '⌨️' },
      { v: 'MOUSE_GAMING', l: 'Mouse', e: '🖱️' },
      { v: 'MOUSEPAD', l: 'Mousepad', e: '🟦' },
      { v: 'CHAIR_GAMING', l: 'Chair', e: '💺' },
      { v: 'DESK_GAMING', l: 'Desk', e: '🪑' },
      { v: 'MONITOR_GAMING', l: 'Monitor', e: '🖥️' },
      { v: 'RGB_ACCESSORY', l: 'RGB Gear', e: '🌈' },
      { v: 'VR_HEADSET', l: 'VR Headset', e: '🥽' },
    ],
  },
  {
    group: 'PC & Parts',
    items: [
      { v: 'PC_PREBUILT', l: 'Prebuilt PC', e: '🖥️' },
      { v: 'PC_CUSTOM_BUILD', l: 'Custom Build', e: '🔧' },
      { v: 'CPU', l: 'CPU', e: '🧠' },
      { v: 'GPU', l: 'GPU', e: '🎛️' },
      { v: 'RAM', l: 'RAM', e: '💳' },
      { v: 'MOTHERBOARD', l: 'Motherboard', e: '🔲' },
      { v: 'PSU', l: 'PSU', e: '🔌' },
      { v: 'STORAGE_SSD', l: 'SSD', e: '💾' },
      { v: 'STORAGE_HDD', l: 'HDD', e: '💿' },
      { v: 'COOLING', l: 'Cooling', e: '❄️' },
      { v: 'PC_CASE', l: 'Case', e: '📦' },
    ],
  },
  {
    group: 'Digital & Other',
    items: [
      { v: 'DIGITAL_TOPUP', l: 'Top-up', e: '💳' },
      { v: 'DIGITAL_SUBSCRIPTION', l: 'Subscription', e: '📅' },
      { v: 'GIFT_CARD', l: 'Gift Card', e: '🎁' },
      { v: 'STREAMING_GEAR', l: 'Streaming', e: '📹' },
      { v: 'CAPTURE_CARD', l: 'Capture Card', e: '🎬' },
      { v: 'MERCHANDISE', l: 'Merch', e: '👕' },
      { v: 'OTHER', l: 'Other', e: '📦' },
    ],
  },
];

const PLATFORMS = [
  { v: 'PS5', l: 'PS5', e: '🎮' },
  { v: 'PS4', l: 'PS4', e: '🎮' },
  { v: 'XBOX_SERIES_X', l: 'Xbox X', e: '🟩' },
  { v: 'XBOX_SERIES_S', l: 'Xbox S', e: '🟩' },
  { v: 'XBOX_ONE', l: 'Xbox One', e: '🟩' },
  { v: 'NINTENDO_SWITCH', l: 'Switch', e: '🔴' },
  { v: 'PC', l: 'PC', e: '🖥️' },
  { v: 'STEAM_DECK', l: 'Steam Deck', e: '📟' },
  { v: 'MOBILE', l: 'Mobile', e: '📱' },
  { v: 'RETRO', l: 'Retro', e: '👾' },
  { v: 'MULTI', l: 'Multi', e: '🌐' },
  { v: 'OTHER', l: 'Other', e: '❓' },
];

const CONDITIONS = [
  { v: 'NEW_SEALED', l: 'New Sealed', e: '✨', tone: 'emerald' },
  { v: 'OPEN_BOX', l: 'Open Box', e: '📦', tone: 'blue' },
  { v: 'PRE_OWNED', l: 'Pre-owned', e: '♻️', tone: 'amber' },
  { v: 'REFURBISHED', l: 'Refurbished', e: '🔧', tone: 'violet' },
  { v: 'TRADE_IN', l: 'Trade-in', e: '🔁', tone: 'orange' },
];

const MARKUPS = [10, 15, 20, 25, 30, 40];


/* Category ke NAAM se andar wala `categoryType` — pehle ye alag
   se poochha jata tha jo confusing tha (aur kuch values DB me
   thin hi nahi). Match na ho to fallback. */
const resolveCategoryType = makeCategoryTypeResolver<string>([
  [/ps\s?5|playstation\s?5/i, "CONSOLE_PS5"],
  [/ps\s?4|playstation\s?4/i, "CONSOLE_PS4"],
  [/xbox.*series/i, "CONSOLE_XBOX_SERIES"],
  [/xbox/i, "CONSOLE_XBOX_ONE"],
  [/switch|nintendo/i, "CONSOLE_NINTENDO_SWITCH"],
  [/retro/i, "CONSOLE_RETRO"],
  [/console/i, "CONSOLE_PS5"],
  [/game.*disc|disc|cd|game\b/i, "GAME_DISC"],
  [/controller|joystick|pad/i, "CONTROLLER"],
  [/head\s?set|headphone/i, "HEADSET_GAMING"],
  [/key\s?board/i, "KEYBOARD_GAMING"],
  [/mouse\s?pad/i, "MOUSEPAD"],
  [/mouse/i, "MOUSE_GAMING"],
  [/chair/i, "CHAIR_GAMING"],
  [/desk/i, "DESK_GAMING"],
  [/monitor|screen/i, "MONITOR_GAMING"],
  [/gpu|graphic/i, "GPU"],
  [/cpu|processor/i, "CPU"],
  [/ram|memory/i, "RAM"],
  [/mother\s?board/i, "MOTHERBOARD"],
  [/psu|power\s?supply/i, "PSU"],
  [/ssd/i, "STORAGE_SSD"],
  [/hdd|hard/i, "STORAGE_HDD"],
  [/cool|fan/i, "COOLING"],
  [/case|cabinet/i, "PC_CASE"],
  [/rgb/i, "RGB_ACCESSORY"],
  [/pc\b|desktop/i, "PC_PREBUILT"],
  [/vr\b/i, "VR_HEADSET"],
  [/top\s?up|topup/i, "DIGITAL_TOPUP"],
  [/subscription/i, "DIGITAL_SUBSCRIPTION"],
  [/gift\s?card/i, "GIFT_CARD"],
  [/merch/i, "MERCHANDISE"],
], 'OTHER');

export function GamingWizardStep1Basic({ basic, onChange, errors }: Props) {
  const { data: catsForType = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  /* Category chunte hi andar wala type set ho jata hai */
  useEffect(() => {
    const name = (catsForType as any[]).find((c) => c.id === basic.categoryId)?.name;
    const derived = resolveCategoryType(name);
    if (derived !== basic.categoryType) onChange({ categoryType: derived } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basic.categoryId, catsForType]);

  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.mrp || basic.taxRate || basic.discountedPrice));
  const [showUsed, setShowUsed] = useState(Boolean(basic.usedPrice || basic.tradeInValue));

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const autoSku = () => {
    const base = (basic.name || 'GAME').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'GAME';
    const plat = basic.platform ? basic.platform.slice(0, 3) : '';
    onChange({ sku: `${base}-${plat}-${Math.floor(100 + Math.random() * 900)}` });
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

      {/* 1 — TITLE */}
      <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <Head icon={Gamepad2} n="1" t="Product Title" d="Game title, console model, or part name" tone="violet" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="EA FC 26 — PS5 Standard Edition"
          className="h-16 w-full rounded-2xl border-2 border-violet-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-200" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="FC26-PS5-001"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
              <button type="button" onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1">
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <Lbl>Barcode</Lbl>
            <div className="flex gap-2">
              <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="5030917123456"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500" />
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
        <Head icon={Tag} n="2" t="Category" d="Aap ki apni category" />

        <CategoryPicker
          value={basic.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          tone="violet"
          examples="jaise Consoles, Games, PC Parts"
        />
      </section>

      {/* 3 — PLATFORM */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Monitor} n="3" t="Platform" d="Which system does it run on?" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {PLATFORMS.map((p) => {
            const a = basic.platform === p.v;
            return (
              <button key={p.v} type="button" onClick={() => onChange({ platform: p.v })}
                className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5',
                  a ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400'].join(' ')}>
                <span className="text-xl">{p.e}</span>
                <span className="text-[10px] font-extrabold">{p.l}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 — CONDITION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Recycle} n="4" t="Condition" d="New, pre-owned or trade-in?" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CONDITIONS.map((c) => {
            const a = basic.conditionType === c.v;
            const tones: Record<string, string> = {
              emerald: 'border-emerald-500 bg-emerald-500 text-white',
              blue: 'border-blue-500 bg-blue-500 text-white',
              amber: 'border-amber-500 bg-amber-500 text-white',
              violet: 'border-violet-500 bg-violet-500 text-white',
              orange: 'border-orange-500 bg-orange-500 text-white',
            };
            return (
              <button key={c.v} type="button" onClick={() => { onChange({ conditionType: c.v }); if (c.v !== 'NEW_SEALED') setShowUsed(true); }}
                className={['p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
                  a ? `${tones[c.tone]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                <span className="text-2xl">{c.e}</span>
                <span className="text-[10px] font-extrabold text-center">{c.l}</span>
              </button>
            );
          })}
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
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick markup
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
            loss ? 'bg-rose-50 border-rose-300' : margin >= 15 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                    loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? 'Loss warning' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums',
                loss ? 'text-rose-700' : margin >= 15 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setShowUsed((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {showUsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showUsed ? 'Hide pre-owned pricing' : 'Pre-owned / Trade-in pricing'}
        </button>

        {showUsed && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 grid sm:grid-cols-2 gap-3">
            <Input label="Pre-owned Sale Price" type="number" step="0.01" value={basic.usedPrice}
              onChange={(e) => onChange({ usedPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Used copy price" />
            <Input label="Trade-in Value (buy back)" type="number" step="0.01" value={basic.tradeInValue}
              onChange={(e) => onChange({ tradeInValue: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="What you pay customer" />
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Hide extra rates' : 'MRP / Discounted price / Tax'}
        </button>

        {adv && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="MRP" type="number" step="0.01" value={basic.mrp}
              onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
            <Input label="Discounted Price" type="number" step="0.01" value={basic.discountedPrice}
              onChange={(e) => onChange({ discountedPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Sale price" />
            <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
          </div>
        )}
      </section>

      {/* 6 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="6" t="Category & Description" d="Optional but helps search" />
        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, what makes it special..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
      </section>

      {/* 7 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="7" t="Cover & Images" d="First image becomes the cover art" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="Up to 10 images" />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold">COVER</div>}
                <button type="button" onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 8 — FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="8" t="Marketing Flags" d="Where it gets highlighted" />
        <div className="grid grid-cols-3 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewRelease} onChange={(v: boolean) => onChange({ isNewRelease: v })} icon={Zap} label="New Release" />
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
    violet: 'from-violet-500 to-fuchsia-700',
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
        checked ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'].join(' ')}>
      <Icon className={['h-5 w-5', checked ? 'text-violet-600 fill-violet-100' : 'text-slate-500'].join(' ')} />
      <span className="text-[11px] font-extrabold">{label}</span>
    </button>
  );
}
