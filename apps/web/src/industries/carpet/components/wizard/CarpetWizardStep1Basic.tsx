import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, DollarSign, Image as ImageIcon, Sparkles, Star, Eye,
  TrendingUp, Hash, AlertCircle, Layers, Ruler, Shuffle, Tag,
  Wand2, Camera, ChevronDown, ChevronUp, Plus, Check, X, Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import { formatPKRFull } from '@core/lib/format';
import type { CarpetWizardBasic, CarpetStockType } from '../../hooks/useCarpetWizard';

interface Props {
  basic: CarpetWizardBasic;
  onChange: (patch: Partial<CarpetWizardBasic>) => void;
  errors: string[];
}

const STOCK_TYPES: Array<{
  key: CarpetStockType;
  label: string;
  desc: string;
  icon: any;
  color: string;
  examples: string;
}> = [
  {
    key: 'ROLLS',
    label: 'Rolls',
    desc: 'Bara carpet rolls — customer ke hisaab se cut karo',
    icon: Layers,
    color: 'emerald',
    examples: 'Wall-to-wall, room-fitting carpet',
  },
  {
    key: 'PIECES',
    label: 'Ready Pieces',
    desc: 'Fixed-size pieces — jaise ke bikte hain',
    icon: Package,
    color: 'violet',
    examples: 'Centre pieces, rugs, mats, prayer mats',
  },
  {
    key: 'FT',
    label: 'Running Feet',
    desc: 'Lambai ke hisaab se — 1 ft, 2 ft wagera',
    icon: Ruler,
    color: 'blue',
    examples: 'Runners, edge strips, borders',
  },
  {
    key: 'MIXED',
    label: 'Mixed',
    desc: 'Har variant apni stock type me',
    icon: Shuffle,
    color: 'amber',
    examples: 'Kuch rolls me, kuch ready pieces',
  },
];

const MARKUPS = [15, 20, 25, 30, 40, 50];
const COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export function CarpetWizardStep1Basic({ basic, onChange, errors }: Props) {
  const qc = useQueryClient();
  const [scanOpen, setScanOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(basic.wholesalePricePerSqft || basic.taxRate || basic.designCode),
  );
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const cost = Number(basic.costPricePerSqft || 0);
  const sale = Number(basic.salePricePerSqft || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

  const priceUnitLabel =
    basic.stockType === 'PIECES' ? 'piece' :
    basic.stockType === 'FT' ? 'ft' : basic.unit;

  const createCat = useMutation({
    mutationFn: () => categoriesApi.create({
      name: newCatName.trim(),
      color: COLORS[(categories as any[]).length % COLORS.length],
    }),
    onSuccess: (c: any) => {
      toast.success(`"${c.name}" category ban gayi`);
      onChange({ categoryId: c.id });
      setNewCatName('');
      setShowNewCat(false);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Category nahi bani'),
  });

  const createBrand = useMutation({
    mutationFn: () => brandsApi.create({ name: newBrandName.trim(), isActive: true } as any),
    onSuccess: (b: any) => {
      toast.success(`"${b.name}" brand ban gaya`);
      onChange({ brandId: b.id });
      setNewBrandName('');
      setShowNewBrand(false);
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Brand nahi bana'),
  });

  const autoSku = () => {
    const b = (basic.name || 'CRPT').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim()
      .split(/\s+/).slice(0, 2).map((w) => w.slice(0, 4)).join('-') || 'CRPT';
    onChange({ sku: `${b}-${Math.floor(1000 + Math.random() * 9000)}` });
    toast.success('SKU ban gaya');
  };

  const applyMarkup = (pct: number) => {
    if (!cost) return toast.error('Pehle cost rate likhein');
    onChange({ salePricePerSqft: Math.round(cost * (1 + pct / 100)) });
  };

  const toggleTag = (id: string) => {
    const current = basic.tagIds ?? [];
    onChange({
      tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    });
  };

  return (
    <div className="space-y-5">
      {scanOpen && (
        <BarcodeScanner
          onDetected={(c) => { onChange({ barcode: c.trim() }); setScanOpen(false); toast.success('Barcode set'); }}
          onClose={() => setScanOpen(false)}
        />
      )}

      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Next se pehle ye theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ═══ SECTION 1 — NAME ═══ */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader n="1" icon={Package} title="Product Ka Naam" desc="Yehi POS aur receipt par dikhega" tone="emerald" />

        <input
          autoFocus
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Sun Flower Premium, Persian Design 17R"
          className="h-16 w-full rounded-2xl border-2 border-emerald-300 bg-white px-4 text-xl font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200"
        />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
            Description <span className="text-slate-400 normal-case font-bold">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Quality, thickness, pile height…"
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* SKU + Barcode row */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
              SKU <span className="text-slate-400 normal-case font-bold">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={basic.sku}
                onChange={(e) => onChange({ sku: e.target.value })}
                placeholder="Auto if empty"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={autoSku}
                className="h-11 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-xs inline-flex items-center gap-1"
              >
                <Wand2 className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
              Barcode <span className="text-slate-400 normal-case font-bold">(scan ya type)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={basic.barcode}
                onChange={(e) => onChange({ barcode: e.target.value })}
                placeholder="1234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs inline-flex items-center gap-1"
              >
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2 — STOCK TYPE ═══ */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader n="2" icon={Layers} title="Stock Type" desc="Ye product kaise stock hoti hai?" tone="blue" />

        <div className="grid sm:grid-cols-2 gap-2.5">
          {STOCK_TYPES.map((t) => {
            const active = basic.stockType === t.key;
            const Icon = t.icon;
            const colorClasses: Record<string, string> = {
              emerald: active ? 'border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-200' : 'border-slate-200 bg-white hover:border-emerald-400',
              violet: active ? 'border-violet-600 bg-violet-50 shadow-md ring-2 ring-violet-200' : 'border-slate-200 bg-white hover:border-violet-400',
              blue: active ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-400',
              amber: active ? 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-200' : 'border-slate-200 bg-white hover:border-amber-400',
            };
            const iconBg: Record<string, string> = {
              emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700',
              violet: active ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700',
              blue: active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700',
              amber: active ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700',
            };
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange({ stockType: t.key })}
                className={['flex items-start gap-3 p-3 sm:p-4 rounded-2xl border-2 text-left transition', colorClasses[t.color]].join(' ')}
              >
                <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconBg[t.color]].join(' ')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm">{t.label}</div>
                  <div className="text-[11px] text-slate-600 font-semibold leading-snug mt-0.5">{t.desc}</div>
                  <div className="text-[10px] text-slate-500 font-bold italic mt-1">{t.examples}</div>
                </div>
              </button>
            );
          })}
        </div>

        {basic.stockType === 'MIXED' && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 text-xs flex items-start gap-2">
            <Shuffle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-amber-900 mb-1">Mixed Stock Type</div>
              <div className="text-amber-800 font-semibold">
                Har variant Step 2 mein apni stock type choose kar sakta hai — rolls, pieces ya ft.
              </div>
            </div>
          </div>
        )}

        {basic.stockType === 'ROLLS' && (
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Selling Unit</label>
            <div className="grid grid-cols-3 gap-2">
              {(['sqft', 'sqm', 'sqyd'] as const).map((u) => {
                const active = basic.unit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => onChange({ unit: u })}
                    className={[
                      'h-11 rounded-xl border-2 text-sm font-extrabold transition',
                      active ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400',
                    ].join(' ')}
                  >
                    {u.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ═══ SECTION 3 — PRICING ═══ */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader n="3" icon={DollarSign} title={`Rate (per ${priceUnitLabel})`} desc="Kharid aur bikri rate" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Kharid Rate (Cost)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={basic.costPricePerSqft}
              onChange={(e) => onChange({ costPricePerSqft: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500"
            />
            <p className="text-[11px] text-slate-500 font-bold mt-1">Purchase price</p>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Bikri Rate (Sale) *</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={basic.salePricePerSqft}
              onChange={(e) => onChange({ salePricePerSqft: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200"
            />
            <p className="text-[11px] text-emerald-700 font-bold mt-1">Customer rate</p>
          </div>
        </div>

        {cost > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Fatafat markup lagao
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MARKUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyMarkup(m)}
                  className="px-3 py-2 rounded-xl bg-white border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold"
                >
                  +{m}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(cost * (1 + m / 100)))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sale > 0 && cost > 0 && (
          <div className={[
            'rounded-2xl border-2 p-4',
            isLoss ? 'bg-rose-50 border-rose-300' : margin >= 25 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className={['h-6 w-6', isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase tracking-wider font-extrabold', isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {isLoss ? '⚠️ NUQSAAN HO RAHA HAI' : `Faida per ${priceUnitLabel}`}
                  </div>
                  <div className={['text-2xl font-extrabold tabular-nums', isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                    {formatPKRFull(profit)}
                  </div>
                </div>
              </div>
              <div className={['text-3xl font-extrabold tabular-nums', isLoss ? 'text-rose-700' : margin >= 25 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white/70 overflow-hidden">
              <div className={['h-full rounded-full', isLoss ? 'bg-rose-500' : margin >= 25 ? 'bg-emerald-500' : 'bg-amber-500'].join(' ')}
                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showAdvanced ? 'Advanced options chhupao' : 'Wholesale / Design Code / Tax (optional)'}
        </button>

        {showAdvanced && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Wholesale Rate"
              type="number"
              step="0.01"
              value={basic.wholesalePricePerSqft}
              onChange={(e) => onChange({ wholesalePricePerSqft: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Optional"
              hint="B2B rate"
            />
            <Input
              label="Design Code"
              value={basic.designCode}
              onChange={(e) => onChange({ designCode: e.target.value })}
              placeholder="SF-2026, 17R"
              hint="Pattern code"
            />
            <Input
              label="Tax %"
              type="number"
              step="0.01"
              value={basic.taxRate}
              onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
            />
          </div>
        )}
      </section>

      {/* ═══ SECTION 4 — CATEGORY & BRAND ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader n="4" icon={Tag} title="Category & Brand" desc="Dhundne aur organize karne ke liye" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold uppercase text-slate-600">Category</label>
            <button type="button" onClick={() => setShowNewCat((v) => !v)} className="text-xs font-extrabold text-emerald-700 inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Nayi
            </button>
          </div>
          {showNewCat && (
            <div className="flex gap-2 mb-2">
              <input
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newCatName.trim() && createCat.mutate()}
                placeholder="e.g. Persian Carpets"
                className="h-11 flex-1 rounded-xl border-2 border-emerald-300 px-3 text-sm font-bold focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                disabled={!newCatName.trim() || createCat.isPending}
                onClick={() => createCat.mutate()}
                className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setShowNewCat(false); setNewCatName(''); }}
                className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ categoryId: '' })}
              className={[
                'px-3 py-2 rounded-xl border-2 text-xs font-extrabold',
                !basic.categoryId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
              ].join(' ')}
            >
              Koi nahi
            </button>
            {(categories as any[]).map((c) => {
              const active = basic.categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ categoryId: c.id })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5', active ? 'text-white shadow-md' : 'bg-white text-slate-700'].join(' ')}
                  style={{
                    backgroundColor: active ? (c.color || '#059669') : '#fff',
                    borderColor: active ? (c.color || '#059669') : '#e2e8f0',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : (c.color || '#059669') }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold uppercase text-slate-600">Brand</label>
            <button type="button" onClick={() => setShowNewBrand((v) => !v)} className="text-xs font-extrabold text-violet-700 inline-flex items-center gap-1">
              <Plus className="h-3 w-3" /> Naya
            </button>
          </div>
          {showNewBrand && (
            <div className="flex gap-2 mb-2">
              <input
                autoFocus
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newBrandName.trim() && createBrand.mutate()}
                placeholder="e.g. Master Carpets"
                className="h-11 flex-1 rounded-xl border-2 border-violet-300 px-3 text-sm font-bold focus:outline-none focus:border-violet-600"
              />
              <button
                type="button"
                disabled={!newBrandName.trim() || createBrand.isPending}
                onClick={() => createBrand.mutate()}
                className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setShowNewBrand(false); setNewBrandName(''); }}
                className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <select
            value={basic.brandId}
            onChange={(e) => onChange({ brandId: e.target.value })}
            className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
          >
            <option value="">Koi brand nahi</option>
            {(brands as any[]).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </div>
      </section>

      {/* ═══ SECTION 5 — TAGS ═══ */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <SectionHeader n="5" icon={Hash} title="Tags" desc="Bestseller, Imported, Persian (optional)" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={['inline-flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-extrabold', active ? 'shadow-sm' : 'opacity-60 hover:opacity-100'].join(' ')}
                  style={{
                    backgroundColor: active ? `${t.color}20` : '#fff',
                    borderColor: active ? t.color : '#e2e8f0',
                    color: active ? t.color : '#475569',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ SECTION 6 — IMAGES ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader n="6" icon={ImageIcon} title="Tasveer" desc="Pehli tasveer main dikhegi (optional)" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(recs: any[]) => onChange({ imageUrls: [...(basic.imageUrls ?? []), ...recs.map((r) => r.url)] })}
          hint="10 tasveer tak"
        />
        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold">
                    MAIN
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ SECTION 7 — SETTINGS ═══ */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-2">
        <SectionHeader n="7" icon={Sparkles} title="Settings" desc="Kahan dikhega" />
        <Toggle checked={basic.isActive} onChange={(v) => onChange({ isActive: v })} icon={Eye} title="Active — POS me dikhega" desc="Off karo to POS/catalog se chhup jayega" />
        <Toggle checked={basic.isFeatured} onChange={(v) => onChange({ isFeatured: v })} icon={Star} title="Featured — highlight" desc="Catalog me sab se upar" />
      </section>
    </div>
  );
}

function SectionHeader({ n, icon: Icon, title, desc, tone = 'slate' }: { n?: string; icon: any; title: string; desc: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', tones[tone] || tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          {n && <span className="text-slate-400">{n}. </span>}{title}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, icon: Icon, title, desc }: { checked: boolean; onChange: (v: boolean) => void; icon: any; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={['w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition text-left', checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'].join(' ')}
    >
      <div className={['h-10 w-10 rounded-xl flex items-center justify-center shrink-0', checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-900 text-sm">{title}</div>
        <div className="text-[11px] text-slate-500 font-semibold">{desc}</div>
      </div>
      <div className={['h-7 w-12 rounded-full transition relative shrink-0', checked ? 'bg-emerald-600' : 'bg-slate-300'].join(' ')}>
        <div className={['absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1'].join(' ')} />
      </div>
    </button>
  );
}
