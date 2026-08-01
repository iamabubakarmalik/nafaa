import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home, DollarSign, Image as ImageIcon, Sparkles, Star, TrendingUp,
  AlertCircle, Award, Percent, Camera, Wand2, Plus, Check, X,
  ChevronDown, ChevronUp, Palette, Tag, Calendar, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { applianceBrandsApi } from '../../api/brands.api';
import { formatPKRFull } from '@core/lib/format';
import type { ApplianceWizardBasic } from '../../hooks/useApplianceWizard';

interface Props {
  basic: ApplianceWizardBasic;
  onChange: (patch: Partial<ApplianceWizardBasic>) => void;
  errors: string[];
}

const CATEGORY_TYPES = [
  { grp: 'Cooling', items: [
    { v: 'REFRIGERATOR', l: 'Refrigerator', e: '🧊' },
    { v: 'DEEP_FREEZER', l: 'Deep Freezer', e: '❄️' },
    { v: 'AIR_CONDITIONER_SPLIT', l: 'AC Split', e: '❄️' },
    { v: 'AIR_CONDITIONER_WINDOW', l: 'AC Window', e: '🪟' },
    { v: 'AIR_CONDITIONER_INVERTER', l: 'AC Inverter', e: '⚡' },
    { v: 'AIR_COOLER', l: 'Air Cooler', e: '💨' },
  ]},
  { grp: 'Laundry', items: [
    { v: 'WASHING_MACHINE_TOP_LOAD', l: 'W/M Top Load', e: '👕' },
    { v: 'WASHING_MACHINE_FRONT_LOAD', l: 'W/M Front Load', e: '👔' },
    { v: 'WASHING_MACHINE_TWIN_TUB', l: 'W/M Twin Tub', e: '👖' },
    { v: 'DRYER', l: 'Dryer', e: '🌀' },
    { v: 'DISHWASHER', l: 'Dishwasher', e: '🍽️' },
  ]},
  { grp: 'TV & Entertainment', items: [
    { v: 'LED_TV', l: 'LED TV', e: '📺' },
    { v: 'SMART_TV', l: 'Smart TV', e: '📱' },
    { v: 'QLED_TV', l: 'QLED TV', e: '🎨' },
    { v: 'OLED_TV', l: 'OLED TV', e: '✨' },
  ]},
  { grp: 'Kitchen', items: [
    { v: 'MICROWAVE_OVEN', l: 'Microwave', e: '📡' },
    { v: 'OTG_OVEN', l: 'OTG Oven', e: '🔥' },
    { v: 'ELECTRIC_STOVE', l: 'Electric Stove', e: '⚡' },
    { v: 'GAS_STOVE', l: 'Gas Stove', e: '🔥' },
    { v: 'RANGE_HOOD', l: 'Range Hood', e: '💨' },
    { v: 'CHIMNEY', l: 'Chimney', e: '🏭' },
    { v: 'BLENDER', l: 'Blender', e: '🥤' },
    { v: 'JUICER', l: 'Juicer', e: '🧃' },
  ]},
  { grp: 'Water', items: [
    { v: 'WATER_DISPENSER', l: 'Water Dispenser', e: '💧' },
    { v: 'WATER_PURIFIER', l: 'Water Purifier', e: '🚰' },
    { v: 'GEYSER_ELECTRIC', l: 'Geyser Electric', e: '♨️' },
    { v: 'GEYSER_GAS', l: 'Geyser Gas', e: '🔥' },
  ]},
  { grp: 'Comfort', items: [
    { v: 'AIR_PURIFIER', l: 'Air Purifier', e: '🌬️' },
    { v: 'ROOM_HEATER', l: 'Room Heater', e: '🔥' },
    { v: 'VACUUM_CLEANER', l: 'Vacuum Cleaner', e: '🧹' },
    { v: 'IRON_STEAM', l: 'Steam Iron', e: '👔' },
    { v: 'FAN_CEILING', l: 'Ceiling Fan', e: '🌀' },
    { v: 'FAN_PEDESTAL', l: 'Pedestal Fan', e: '💨' },
  ]},
  { grp: 'Power', items: [
    { v: 'UPS', l: 'UPS', e: '🔋' },
    { v: 'SOLAR_PANEL', l: 'Solar Panel', e: '☀️' },
    { v: 'SOLAR_INVERTER', l: 'Solar Inverter', e: '⚡' },
    { v: 'BATTERY', l: 'Battery', e: '🔋' },
    { v: 'GENERATOR', l: 'Generator', e: '⚙️' },
  ]},
];

const MARKUPS = [8, 10, 12, 15, 20, 25];
const COLOR_PRESETS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#000000' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Grey', hex: '#6b7280' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Stainless', hex: '#a8a8a8' },
];

export function ApplianceWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scan, setScan] = useState(false);
  const [adv, setAdv] = useState(Boolean(basic.wholesalePrice || basic.mrp || basic.emiStartingFrom));
  const [newBrand, setNewBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['appliance-brands'], queryFn: () => applianceBrandsApi.list({ active: true }) });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.retailPrice || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const loss = cost > 0 && sale > 0 && profit < 0;

  const mkBrand = useMutation({
    mutationFn: () => applianceBrandsApi.create({ name: newBrand.trim(), isActive: true }),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" ban gaya`);
      onChange({ applianceBrandId: b.id });
      setNewBrand(''); setShowBrand(false);
      qc.invalidateQueries({ queryKey: ['appliance-brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bana'),
  });

  const autoSku = () => {
    const b = (basic.name || 'APPL').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'APPL';
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
    <div className="space-y-5">
      {scan && <BarcodeScanner onDetected={(c: string) => { onChange({ barcode: c.trim() }); setScan(false); toast.success('Barcode mil gaya'); }} onClose={() => setScan(false)} />}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Next se pehle theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 1 — NAME */}
      <section className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <Head icon={Home} n="1" t="Product Name" d="Model + capacity + type" tone="cyan" />
        <input autoFocus value={basic.name} onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Haier HRF-368IPB 8CFT Inverter Refrigerator"
          className="h-16 w-full rounded-2xl border-2 border-cyan-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-200" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Model Number</Lbl>
            <input value={basic.modelNumber} onChange={(e) => onChange({ modelNumber: e.target.value })} placeholder="HRF-368IPB"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <Lbl>Model Year</Lbl>
            <input type="number" value={basic.modelYear} onChange={(e) => onChange({ modelYear: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="2026" min="2000" max="2030"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <Lbl>SKU / Code</Lbl>
            <div className="flex gap-2">
              <input value={basic.sku} onChange={(e) => onChange({ sku: e.target.value })} placeholder="HAIER-368"
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
            <input value={basic.barcode} onChange={(e) => onChange({ barcode: e.target.value })} placeholder="8901234567890"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500" />
            <button type="button" onClick={() => setScan(true)} className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1">
              <Camera className="h-4 w-4" /> Scan
            </button>
          </div>
        </div>
      </section>

      {/* 2 — CATEGORY TYPE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Tag} n="2" t="Category Type" d="Kis type ki appliance hai?" />
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {CATEGORY_TYPES.map((grp) => (
            <div key={grp.grp}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.grp}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {grp.items.map((c) => {
                  const a = basic.categoryType === c.v;
                  return (
                    <button key={c.v} type="button" onClick={() => onChange({ categoryType: c.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5 min-h-[70px]',
                        a ? 'border-cyan-600 bg-cyan-600 text-white shadow-md scale-[1.03]' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-400'].join(' ')}>
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
          <Head icon={Award} n="3" t="Brand" d="Haier, Dawlance, PEL, Orient..." />
          <button type="button" onClick={() => setShowBrand((v) => !v)} className="text-xs font-extrabold text-violet-700 inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> Nayi brand
          </button>
        </div>
        {showBrand && (
          <div className="flex gap-2">
            <input autoFocus value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBrand.trim() && mkBrand.mutate()} placeholder="e.g. Kenwood"
              className="h-11 flex-1 rounded-xl border-2 border-violet-300 px-3 text-sm font-bold focus:outline-none focus:border-violet-600" />
            <button type="button" disabled={!newBrand.trim() || mkBrand.isPending} onClick={() => mkBrand.mutate()}
              className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setShowBrand(false); setNewBrand(''); }} className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        )}
        <select className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
          value={basic.applianceBrandId} onChange={(e) => onChange({ applianceBrandId: e.target.value })}>
          <option value="">-- Brand chunein --</option>
          {(brands as any[]).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.authorizedDealer ? '✓ Authorized' : ''}
            </option>
          ))}
        </select>
      </section>

      {/* 4 — COLOR */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={Palette} n="4" t="Color" d="Product ka color (optional)" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Color Name</Lbl>
            <input value={basic.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="Stainless Steel Silver"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={basic.colorHex || '#ffffff'} onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={basic.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })} placeholder="#ffffff"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button key={c.hex} type="button" onClick={() => onChange({ colorName: c.name, colorHex: c.hex })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-cyan-400 text-xs font-extrabold">
                <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — PRICING */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <Head icon={DollarSign} n="5" t="Pricing" d="Cost aur retail price" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Cost Price (Kharid)</Lbl>
            <input type="number" step="0.01" inputMode="decimal" value={basic.costPrice}
              onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
          </div>
          <div>
            <Lbl tone="emerald">Retail Price (Bikri) *</Lbl>
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
            loss ? 'bg-rose-50 border-rose-300' : margin >= 10 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', loss ? 'text-rose-700' : margin >= 10 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold', loss ? 'text-rose-700' : margin >= 10 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {loss ? '⚠️ Nuqsaan!' : 'Profit per unit'}
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums', loss ? 'text-rose-700' : margin >= 10 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="button" onClick={() => setAdv((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
          {adv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {adv ? 'Extra rates chhupao' : 'Wholesale / MRP / EMI / Discount'}
        </button>

        {adv && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Wholesale" type="number" step="0.01" value={basic.wholesalePrice}
                onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Optional" />
              <Input label="MRP" type="number" step="0.01" value={basic.mrp}
                onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Printed price" />
              <Input label="Tax %" type="number" step="0.01" value={basic.taxRate}
                onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" leftIcon={<Percent className="h-4 w-4 text-slate-400" />} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="EMI Starting From" type="number" step="0.01" value={basic.emiStartingFrom}
                onChange={(e) => onChange({ emiStartingFrom: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Per month"
                leftIcon={<CreditCard className="h-4 w-4 text-slate-400" />} />
              <Input label="Cash Discount" type="number" step="0.01" value={basic.cashDiscount}
                onChange={(e) => onChange({ cashDiscount: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="Nakad par chhoot" />
            </div>
          </div>
        )}
      </section>

      {/* 6 — CATEGORY / DESCRIPTION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Tag} n="6" t="Category & Details" d="Dhundne mein asaan (optional)" />

        <div>
          <Lbl>Category</Lbl>
          <select value={basic.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
            <option value="">Koi nahi</option>
            {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        <div>
          <Lbl>Description <Opt /></Lbl>
          <textarea rows={2} value={basic.description} onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Key features, kya khaas hai..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
        </div>
      </section>

      {/* 7 — IMAGES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <Head icon={ImageIcon} n="7" t="Product Images" d="Pehli image main dikhegi" />
        <UploadDropzone purpose="product-image" maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="10 tak images" />
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
      </section>

      {/* 8 — TAGS & FLAGS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={Sparkles} n="8" t="Marketing Flags" d="Kahan highlight ho" />
        <div className="grid grid-cols-3 gap-2">
          <Tog checked={basic.isFeatured} onChange={(v: boolean) => onChange({ isFeatured: v })} icon={Star} label="Featured" />
          <Tog checked={basic.isBestSeller} onChange={(v: boolean) => onChange({ isBestSeller: v })} icon={Award} label="Best Seller" />
          <Tog checked={basic.isNewArrival} onChange={(v: boolean) => onChange({ isNewArrival: v })} icon={Sparkles} label="New Arrival" />
        </div>

        {(tags as any[]).length > 0 && (
          <div>
            <Lbl>Tags</Lbl>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((t) => {
                const a = basic.tagIds?.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => togTag(t.id)}
                    className={['inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-extrabold', a ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
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
  const g: Record<string, string> = { slate: 'from-slate-500 to-slate-700', emerald: 'from-emerald-500 to-emerald-700', cyan: 'from-cyan-500 to-teal-700' };
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
  return <label className={['block text-xs font-extrabold uppercase tracking-wider mb-1.5', tone === 'emerald' ? 'text-emerald-700' : 'text-slate-600'].join(' ')}>{children}</label>;
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
