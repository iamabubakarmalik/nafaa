import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Plus, Search, X, Edit3, Trash2, Star, Package,
  Barcode, Save, ArrowRightLeft, Sparkles, Zap, RefreshCw,
  Camera, TrendingUp, AlertTriangle, ChevronRight,
  CheckCircle2, Boxes, GraduationCap, ArrowRight, Circle,
  Lightbulb, HelpCircle,
} from 'lucide-react';
import { productUnitsApi, type ProductUnit, type UnitConversionType } from '../api/product-units.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';

/* ═════════════════════════════════════════════════════════════
   NAFAA PRODUCT UNITS — FULL BEST v2 (GUIDED)
   ─────────────────────────────────────────────────────────────
   🎓 Visual teacher — "Units kya hain" live example se samjhao
   🧭 3-step setup guide — user kabhi confuse nahi hoga
   👁️  Live conversion chain — form mein type karo, result dikho
   📊 Per-unit stock estimate (base stock ÷ rate)
   ⌨️  Arrow keys + Enter product picker mein
   🐛 TS strict — koi implicit any nahi
   ✨ Dark mode perfect, 📱→4K responsive
   ═════════════════════════════════════════════════════════════ */

type Preset = {
  n: string;
  r: number;
  t: UnitConversionType;
  e: string;
  desc: string;
};

const PRESETS: Preset[] = [
  { n: 'Half-Dozen', r: 6,   t: 'PACK',   e: '🥚', desc: '6 pcs' },
  { n: 'Dozen',      r: 12,  t: 'DOZEN',  e: '🗳️', desc: '12 pcs' },
  { n: 'Pack',       r: 10,  t: 'PACK',   e: '📦', desc: '10 pcs' },
  { n: 'Box',        r: 24,  t: 'BOX',    e: '🗃️', desc: '24 pcs' },
  { n: 'Carton',     r: 120, t: 'CARTON', e: '📮', desc: '120 pcs' },
  { n: 'Bag',        r: 50,  t: 'CUSTOM', e: '👝', desc: '50 pcs' },
];

export default function ProductUnitsPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
  const [showPickerMobile, setShowPickerMobile] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  /* Debounced product search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(productSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-units', debouncedSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: debouncedSearch || undefined } as any),
  });

  const products: any[] = (productsData as any)?.items ?? [];
  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  const { data: units = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['product-units', selectedProductId],
    queryFn: () => productUnitsApi.byProduct(selectedProductId),
    enabled: !!selectedProductId,
  });

  const basePrice = Number(selectedProduct?.price || 0);
  const baseCost = Number(selectedProduct?.costPrice || selectedProduct?.cost || 0);
  const baseStock = Number(selectedProduct?.stock || 0);

  const removeMutation = useMutation({
    mutationFn: (id: string) => productUnitsApi.remove(id),
    onSuccess: () => {
      toast.success('Unit delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  const quickAddPreset = useMutation({
    mutationFn: async ({ name, rate, type }: { name: string; rate: number; type: UnitConversionType }) => {
      return productUnitsApi.create({
        productId: selectedProductId,
        unitName: name.toLowerCase(),
        unitLabel: `${name} (${rate} ${selectedProduct?.unit || 'pcs'})`,
        conversionType: type,
        conversionRate: rate,
        price: Math.round(basePrice * rate),
        costPrice: Math.round(baseCost * rate),
        isBase: false,
        isDefault: false,
        isActive: true,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success(`✓ ${vars.name} unit ban gaya`);
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail hua'),
  });

  const stats = useMemo(() => ({
    total: units.length,
    active: units.filter((u: ProductUnit) => u.isActive).length,
    hasBase: units.some((u: ProductUnit) => u.isBase),
    hasDefault: units.some((u: ProductUnit) => u.isDefault),
  }), [units]);

  /* ─── Setup progress (3 steps) ─────────────────────── */
  const setupStep = !selectedProductId ? 1 : units.length === 0 ? 2 : 3;

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setShowForm(false);
    setEditingUnit(null);
    setShowPickerMobile(false);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        (document.getElementById('units-product-search') as HTMLInputElement)?.focus();
      }
      if (e.key === 'Escape') {
        if (showForm) { setShowForm(false); setEditingUnit(null); }
        else if (showPickerMobile) setShowPickerMobile(false);
        else if (showTeacher) setShowTeacher(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForm, showPickerMobile, showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 dark:from-slate-950 dark:via-emerald-950 dark:to-teal-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Multi-Unit Selling
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              📦 Product Units
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Ek hi product ko <strong className="text-emerald-300">Piece, Dozen, Carton</strong> — sab alag price se becho
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Units kya hain? Samjho"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Units Kya Hain?</span>
              <span className="sm:hidden">?</span>
            </button>
            <button
              onClick={() => setShowPickerMobile(true)}
              className="xl:hidden h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md"
            >
              <Boxes className="h-4 w-4" /> Product
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching || !selectedProductId}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <PrivacyToggle compact />
          </div>
        </div>

        {/* ─── 3-Step Setup Guide ─── */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill
            n={1}
            label="Product Chuno"
            state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'}
          />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill
            n={2}
            label="Units Banao"
            state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'}
          />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill
            n={3}
            label="Tayyar! POS Pe Becho"
            state={setupStep === 3 ? 'done' : 'todo'}
          />
        </div>
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <UnitsTeacher
          onClose={() => setShowTeacher(false)}
          onStart={() => {
            setShowTeacher(false);
            setShowPickerMobile(true);
          }}
        />
      )}

      {/* ═══ LAYOUT ═══ */}
      <div className="grid xl:grid-cols-[400px_1fr] gap-4 sm:gap-5">
        {/* ═══ LEFT: Product picker (desktop) ═══ */}
        <ProductPicker
          products={products}
          loading={loadingProducts}
          search={productSearch}
          onSearch={setProductSearch}
          selectedId={selectedProductId}
          onSelect={handleSelectProduct}
          className="hidden xl:flex"
        />

        {/* ═══ Mobile product picker drawer ═══ */}
        {showPickerMobile && (
          <div
            className="fixed inset-0 z-40 xl:hidden bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
            onClick={() => setShowPickerMobile(false)}
          >
            <div
              className="w-full max-w-md h-[80vh] bg-white dark:bg-slate-950 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b-2 border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-slate-900 dark:text-white">① Product Chuno</h3>
                <button
                  onClick={() => setShowPickerMobile(false)}
                  className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              <ProductPicker
                products={products}
                loading={loadingProducts}
                search={productSearch}
                onSearch={setProductSearch}
                selectedId={selectedProductId}
                onSelect={handleSelectProduct}
                className="flex-1 flex border-0 shadow-none rounded-none"
                embedded
              />
            </div>
          </div>
        )}

        {/* ═══ RIGHT: Units panel ═══ */}
        <section className="space-y-4 min-w-0">
          {!selectedProduct ? (
            <EmptyPickProduct
              onOpenPicker={() => setShowPickerMobile(true)}
              onLearn={() => setShowTeacher(true)}
            />
          ) : (
            <>
              {/* Product header */}
              <ProductHeader
                product={selectedProduct}
                basePrice={basePrice}
                baseStock={baseStock}
                stats={stats}
                onNewUnit={() => { setEditingUnit(null); setShowForm(true); }}
                onChangeProduct={() => setShowPickerMobile(true)}
              />

              {/* Quick presets — with explanation */}
              <QuickPresets
                units={units}
                basePrice={basePrice}
                baseUnit={selectedProduct.unit}
                onAdd={(p: Preset) => quickAddPreset.mutate({ name: p.n, rate: p.r, type: p.t })}
                pending={quickAddPreset.isPending}
              />

              {/* Form */}
              {showForm && (
                <UnitForm
                  productId={selectedProduct.id}
                  baseUnit={selectedProduct.unit}
                  basePrice={basePrice}
                  baseCost={baseCost}
                  editing={editingUnit}
                  onClose={() => { setShowForm(false); setEditingUnit(null); }}
                  onSaved={() => {
                    setShowForm(false);
                    setEditingUnit(null);
                    queryClient.invalidateQueries({ queryKey: ['product-units'] });
                  }}
                />
              )}

              {/* Warnings */}
              {units.length > 0 && !stats.hasBase && (
                <WarningBanner text="Koi Base Unit set nahi. POS conversion sahi kaam nahi karega — kisi ek unit ko 'Base Unit' banao." />
              )}
              {units.length > 0 && !stats.hasDefault && (
                <WarningBanner
                  text="Koi POS Default unit nahi. POS pe sale isi default unit se hogi — ek unit ko 'POS Default' banao."
                  tone="info"
                />
              )}

              {/* Units list */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : units.length === 0 ? (
                <EmptyNoUnits onAddCustom={() => { setEditingUnit(null); setShowForm(true); }} />
              ) : (
                <div className="grid gap-3">
                  {units.map((unit: ProductUnit) => (
                    <UnitCard
                      key={unit.id}
                      unit={unit}
                      baseUnit={selectedProduct.unit}
                      basePrice={basePrice}
                      baseStock={baseStock}
                      hideCost={hideCost}
                      onEdit={() => { setEditingUnit(unit); setShowForm(true); }}
                      onDelete={() => {
                        if (confirm(`"${unit.unitName}" delete karein?`)) removeMutation.mutate(unit.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   UNITS TEACHER — "Units kya hain?" visual guide
   ═════════════════════════════════════════════════════════════ */

function UnitsTeacher({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Units Kya Hain?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Simple explanation */}
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Aap ki dukaan pe customer kabhi <strong>1 piece</strong> mangta hai, kabhi <strong>poora dozen</strong>,
            kabhi <strong>carton</strong>. Product Units se aap ek hi product ke liye saare packages bana lete ho —
            POS khud stock convert karega.
          </p>

          {/* Live visual example */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300">
              🥚 Misal: Anday (Eggs)
            </div>

            {/* Chain */}
            <div className="flex items-center gap-2 flex-wrap">
              <ChainBox emoji="🥚" name="Piece" detail="1 anda" price="Rs 25" highlight />
              <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
              <ChainBox emoji="🗳️" name="Dozen" detail="12 anday" price="Rs 300" />
              <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
              <ChainBox emoji="📮" name="Carton" detail="240 anday" price="Rs 5,800" />
            </div>

            <div className="rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200 space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Customer dozen le → POS stock se <strong>12 piece</strong> khud minus karega</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Har package ka <strong>alag barcode</strong> bhi ho sakta hai (carton ka apna)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Bare package pe <strong>thora discount</strong> do — customer zyada khareede ga</span>
              </div>
            </div>
          </div>

          {/* Key terms */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <TermCard emoji="⭐" term="Base Unit" desc="Sab se choti ikai (piece). Stock isi mein count hota hai" />
            <TermCard emoji="🎯" term="POS Default" desc="POS pe ye unit pehle se select hogi" />
            <TermCard emoji="🔢" term="Rate" desc="1 unit = kitne base? (1 dozen = 12 piece)" />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/40 h-12"
            onClick={onStart}
          >
            <Zap className="h-4 w-4" /> Samajh Gaya — Shuru Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChainBox({ emoji, name, detail, price, highlight }: {
  emoji: string; name: string; detail: string; price: string; highlight?: boolean;
}) {
  return (
    <div className={[
      'rounded-xl border-2 px-3 py-2 text-center min-w-[90px]',
      highlight
        ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-md'
        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60',
    ].join(' ')}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{name}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{detail}</div>
      <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">{price}</div>
    </div>
  );
}

function TermCard({ emoji, term, desc }: { emoji: string; term: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-xl">{emoji}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white mt-1">{term}</div>
      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   STEP PILL (setup guide)
   ═════════════════════════════════════════════════════════════ */

function StepPill({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'todo' }) {
  return (
    <div className={[
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold border backdrop-blur-md transition',
      state === 'done'
        ? 'bg-emerald-400/25 border-emerald-300/50 text-emerald-200'
        : state === 'active'
        ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg shadow-amber-400/30 animate-pulse'
        : 'bg-white/10 border-white/20 text-white/50',
    ].join(' ')}>
      {state === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className={[
          'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black',
          state === 'active' ? 'bg-slate-900 text-amber-300' : 'bg-white/20 text-white/60',
        ].join(' ')}>
          {n}
        </span>
      )}
      {label}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRODUCT PICKER (keyboard navigation ke sath)
   ═════════════════════════════════════════════════════════════ */

function ProductPicker({
  products, loading, search, onSearch, selectedId, onSelect, className = '', embedded = false,
}: {
  products: any[]; loading: boolean;
  search: string; onSearch: (v: string) => void;
  selectedId: string; onSelect: (id: string) => void;
  className?: string; embedded?: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setActiveIdx(0); }, [products.length, search]);

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (products.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = products[activeIdx];
      if (p) onSelect(p.id);
    }
  };

  return (
    <section className={[
      'rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-col',
      embedded ? '' : 'max-h-[calc(100vh-220px)] xl:sticky xl:top-4 xl:self-start',
      className,
    ].join(' ')}>
      {!embedded && (
        <div className="shrink-0 px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
            <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ① Product Chuno
          </h3>
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {products.length}
          </span>
        </div>
      )}
      <div className="shrink-0 p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="units-product-search"
            autoFocus
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Product dhundo... ↑↓ Enter"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Koi product nahi mila</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              {search ? 'Doosra keyword try karo' : 'Pehle products create karo'}
            </p>
          </div>
        ) : (
          products.map((p: any, idx: number) => {
            const active = selectedId === p.id;
            const highlighted = idx === activeIdx;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={[
                  'w-full px-4 py-3 flex items-center gap-3 transition text-left border-b border-slate-50 dark:border-slate-800/60',
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500'
                    : highlighted
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                ].join(' ')}
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-extrabold text-sm truncate ${active ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                    1 {p.unit} = {formatPKR(p.price)}
                    <span className="opacity-40 mx-1">•</span>
                    Stock: {p.stock}
                  </div>
                </div>
                {active && <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   PRODUCT HEADER
   ═════════════════════════════════════════════════════════════ */

function ProductHeader({ product, basePrice, baseStock, stats, onNewUnit, onChangeProduct }: any) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-emerald-300 dark:border-emerald-500/40 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border-2 border-emerald-200 dark:border-emerald-500/30">
          {product.images?.[0]?.url ? (
            <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">
              ✓ Selected
            </span>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate">
              {product.name}
            </h2>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5 flex-wrap mt-0.5">
            <span>Base: <strong className="text-slate-700 dark:text-slate-200">1 {product.unit}</strong></span>
            <span className="opacity-40">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums">
              {formatPKR(basePrice)}/{product.unit}
            </span>
            <span className="opacity-40">•</span>
            <span className="tabular-nums">Stock: {baseStock} {product.unit}</span>
            <span className="opacity-40">•</span>
            <span className="tabular-nums">{stats.total} units</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onChangeProduct}
          className="xl:hidden h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5"
        >
          <ArrowRightLeft className="h-4 w-4" /> Change
        </button>
        <Button
          onClick={onNewUnit}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/30"
        >
          <Plus className="h-4 w-4" /> Custom Unit
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QUICK PRESETS (explanation ke sath)
   ═════════════════════════════════════════════════════════════ */

function QuickPresets({ units, basePrice, baseUnit, onAdd, pending }: {
  units: ProductUnit[];
  basePrice: number;
  baseUnit: string;
  onAdd: (p: Preset) => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900/60 dark:backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-500/30 p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> ② Ek Click Se Unit Banao
          </div>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
            Common packages — price khud calculate ho jayegi
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
            Jaise "Dozen" dabao → 1 Dozen = 12 {baseUnit} = {formatPKRFull(basePrice * 12)} ban jayega
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {PRESETS.map((p) => {
          const exists = units.some((u: ProductUnit) => u.unitName.toLowerCase() === p.n.toLowerCase());
          const disabled = exists || pending || !basePrice;
          return (
            <button
              key={p.n}
              disabled={disabled}
              onClick={() => onAdd(p)}
              className={[
                'p-3 rounded-2xl border-2 text-center transition disabled:cursor-not-allowed',
                exists
                  ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-100 dark:bg-emerald-500/20 opacity-70'
                  : disabled
                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 opacity-40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5',
              ].join(' ')}
            >
              <div className="text-2xl leading-none">{p.e}</div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">{p.n}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                = {p.r} {baseUnit}
              </div>
              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold mt-0.5 tabular-nums">
                {exists ? '✓ Added' : formatPKRFull(basePrice * p.r)}
              </div>
            </button>
          );
        })}
      </div>
      {!basePrice && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Pehle product ka base price set karo, phir presets kaam karenge
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   UNIT CARD (per-unit stock ke sath)
   ═════════════════════════════════════════════════════════════ */

function UnitCard({ unit, baseUnit, basePrice, baseStock, hideCost, onEdit, onDelete }: {
  unit: ProductUnit;
  baseUnit: string;
  basePrice: number;
  baseStock: number;
  hideCost: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const profit = Number(unit.price || 0) - Number(unit.costPrice || 0);
  const marginPct = Number(unit.price) > 0 ? (profit / Number(unit.price)) * 100 : 0;
  const expectedPrice = basePrice * unit.conversionRate;
  const priceDeviation = expectedPrice > 0
    ? ((Number(unit.price) - expectedPrice) / expectedPrice) * 100
    : 0;
  const unitsFromStock = unit.conversionRate > 0 ? Math.floor(baseStock / unit.conversionRate) : 0;

  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm dark:shadow-black/20 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5',
      unit.isBase
        ? 'border-emerald-400 dark:border-emerald-500/50 ring-2 ring-emerald-100 dark:ring-emerald-500/20'
        : !unit.isActive
        ? 'border-slate-200 dark:border-slate-800 opacity-60'
        : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={[
              'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-md',
              unit.isBase
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/40'
                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
            ].join(' ')}>
              {unit.isBase ? <Star className="h-5 w-5 fill-white" /> : <Layers className="h-5 w-5" />}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white capitalize text-base">
                {unit.unitName}
              </h4>
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {unit.isBase && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-wider">
                    ⭐ Base
                  </span>
                )}
                {unit.isDefault && !unit.isBase && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider">
                    🎯 POS Default
                  </span>
                )}
                {!unit.isActive && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-500 text-white text-[9px] font-extrabold uppercase tracking-wider">
                    Band
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-xs text-slate-600 dark:text-slate-300 font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
              <ArrowRightLeft className="h-3 w-3 text-emerald-500" />
              1 <span className="capitalize">{unit.unitName}</span> = <strong className="text-slate-900 dark:text-white tabular-nums">{unit.conversionRate}</strong> {baseUnit}
            </span>
            {!unit.isBase && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 tabular-nums">
                📦 Stock se ~{unitsFromStock} ban sakte
              </span>
            )}
            {unit.barcode && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                <Barcode className="h-3 w-3" /> {unit.barcode}
              </span>
            )}
            {unit.sku && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                SKU: {unit.sku}
              </span>
            )}
          </div>

          {!hideCost && Math.abs(priceDeviation) > 1 && expectedPrice > 0 && (
            <div className={[
              'mt-2 text-[10px] font-extrabold inline-flex items-center gap-1 px-2 py-0.5 rounded-md',
              priceDeviation > 0
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
            ].join(' ')}>
              <TrendingUp className={`h-3 w-3 ${priceDeviation < 0 ? 'rotate-180' : ''}`} />
              {priceDeviation > 0 ? '+' : ''}{priceDeviation.toFixed(1)}% vs expected ({formatPKR(expectedPrice)})
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
            {formatPKR(unit.price)}
          </div>
          {!hideCost && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 justify-end mt-1">
              {unit.costPrice > 0 && <span>Cost: {formatPKR(unit.costPrice)}</span>}
              {unit.wholesalePrice && <span className="text-violet-700 dark:text-violet-400">W/S: {formatPKR(unit.wholesalePrice)}</span>}
            </div>
          )}
          {!hideCost && profit !== 0 && (
            <div className={[
              'text-[11px] font-extrabold mt-0.5 tabular-nums',
              profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400',
            ].join(' ')}>
              Faida: {formatPKR(profit)}
              {marginPct !== 0 && (
                <span className="ml-1 opacity-70">({marginPct.toFixed(0)}%)</span>
              )}
            </div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <button
              onClick={onEdit}
              title="Edit"
              className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            {!unit.isBase && (
              <button
                onClick={onDelete}
                title="Delete"
                className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   UNIT FORM (live conversion chain ke sath)
   ═════════════════════════════════════════════════════════════ */

function UnitForm({ productId, baseUnit, basePrice, baseCost, editing, onClose, onSaved }: {
  productId: string; baseUnit: string; basePrice: number; baseCost: number;
  editing: ProductUnit | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    unitName: editing?.unitName ?? '',
    unitLabel: editing?.unitLabel ?? '',
    conversionType: (editing?.conversionType ?? 'CUSTOM') as UnitConversionType,
    conversionRate: editing?.conversionRate ?? 1,
    price: editing?.price ?? 0,
    costPrice: editing?.costPrice ?? 0,
    wholesalePrice: editing?.wholesalePrice ?? ('' as any),
    mrpPrice: editing?.mrpPrice ?? ('' as any),
    barcode: editing?.barcode ?? '',
    sku: editing?.sku ?? '',
    isBase: editing?.isBase ?? false,
    isDefault: editing?.isDefault ?? false,
    isActive: editing?.isActive ?? true,
  });
  const [scanOpen, setScanOpen] = useState(false);

  const profit = Number(form.price) - Number(form.costPrice);
  const marginPct = Number(form.price) > 0 ? (profit / Number(form.price)) * 100 : 0;

  const autofillPrices = () => {
    setForm({
      ...form,
      price: Math.round(basePrice * form.conversionRate),
      costPrice: Math.round(baseCost * form.conversionRate),
    });
    toast.success('Prices auto-fill ho gaye');
  };

  const autoSku = () => {
    const base = form.unitName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'UNIT';
    setForm({ ...form, sku: `${base}-${Math.floor(100 + Math.random() * 900)}` });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        productId,
        ...form,
        wholesalePrice: form.wholesalePrice === '' ? undefined : Number(form.wholesalePrice),
        mrpPrice: form.mrpPrice === '' ? undefined : Number(form.mrpPrice),
      };
      if (editing) {
        if ((payload.sku ?? '') === (editing.sku ?? '')) delete payload.sku;
        if ((payload.barcode ?? '') === (editing.barcode ?? '')) delete payload.barcode;
      }
      return editing
        ? productUnitsApi.update(editing.id, payload)
        : productUnitsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? '✓ Unit update ho gaya' : '✓ Unit ban gaya — POS pe ready!');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  const canSave = form.unitName.trim() && form.price > 0 && form.conversionRate > 0;

  return (
    <>
      {scanOpen && (
        <BarcodeScanner
          onDetected={(c: string) => { setForm({ ...form, barcode: c.trim() }); setScanOpen(false); }}
          onClose={() => setScanOpen(false)}
        />
      )}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/90 dark:backdrop-blur-sm border-2 border-emerald-300 dark:border-emerald-500/40 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b-2 border-emerald-100 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            {editing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? 'Edit Unit' : 'Naya Unit Banao'}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* 👁️ LIVE CONVERSION CHAIN — type karo, samjho */}
          {form.unitName.trim() && form.conversionRate > 0 && (
            <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Live Preview — Aisa Dikhega
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm font-extrabold">
                <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-500/50 text-slate-900 dark:text-white capitalize shadow-sm">
                  1 {form.unitName}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">=</span>
                <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white tabular-nums">
                  {form.conversionRate} {baseUnit}
                </span>
                {form.price > 0 && (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400">=</span>
                    <span className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white tabular-nums shadow-md">
                      {formatPKR(form.price)}
                    </span>
                  </>
                )}
              </div>
              {basePrice > 0 && form.conversionRate > 0 && form.price > 0 && (
                <div className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Per {baseUnit}: <span className="text-slate-900 dark:text-white tabular-nums">{formatPKR(form.price / form.conversionRate)}</span>
                  {form.price / form.conversionRate < basePrice && (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {' '}— base se {formatPKR(basePrice - form.price / form.conversionRate)} sasta/{baseUnit} (customer ko faida 👍)
                    </span>
                  )}
                  {form.price / form.conversionRate > basePrice && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {' '}— base se {formatPKR(form.price / form.conversionRate - basePrice)} mehenga/{baseUnit}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Unit ka naam" required hint="jaise: dozen, carton">
              <input
                autoFocus
                value={form.unitName}
                onChange={(e) => setForm({ ...form, unitName: e.target.value.toLowerCase() })}
                placeholder="dozen"
                className={inputCls('h-11 font-bold')}
              />
            </FormField>
            <FormField label={`1 ${form.unitName || 'unit'} = kitne ${baseUnit}?`} required>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.conversionRate}
                  onChange={(e) => setForm({ ...form, conversionRate: Number(e.target.value) })}
                  className={inputCls('h-11 font-extrabold tabular-nums')}
                />
                {basePrice > 0 && (
                  <button
                    onClick={autofillPrices}
                    className="h-11 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold inline-flex items-center gap-1 shrink-0 transition"
                    title="Prices khud bharo (rate × base price)"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                )}
              </div>
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Bikri Rate (is package ki)" required tone="emerald">
              <input
                type="number"
                step="0.01"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                placeholder="0"
                className="h-14 w-full rounded-xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 px-3 text-xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30"
              />
            </FormField>
            <FormField label="Kharid Rate">
              <input
                type="number"
                step="0.01"
                value={form.costPrice || ''}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                placeholder="0"
                className={inputCls('h-14 text-xl font-extrabold tabular-nums')}
              />
            </FormField>
          </div>

          {form.price > 0 && form.costPrice > 0 && (
            <div className={[
              'rounded-xl border-2 p-3 flex items-center justify-between gap-2 text-sm',
              profit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
            ].join(' ')}>
              <span className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className={`h-3.5 w-3.5 ${profit < 0 ? 'rotate-180' : ''}`} />
                Har {form.unitName || 'unit'} pe faida
              </span>
              <span className="font-extrabold tabular-nums">
                {formatPKR(profit)}
                <span className="text-[11px] opacity-70 ml-1">({marginPct.toFixed(1)}%)</span>
              </span>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Wholesale" hint="optional" tone="violet">
              <input
                type="number"
                step="0.01"
                value={form.wholesalePrice}
                onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value as any })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-white dark:bg-slate-800 px-3 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30"
              />
            </FormField>
            <FormField label="MRP" hint="optional" tone="blue">
              <input
                type="number"
                step="0.01"
                value={form.mrpPrice}
                onChange={(e) => setForm({ ...form, mrpPrice: e.target.value as any })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-white dark:bg-slate-800 px-3 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30"
              />
            </FormField>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <FormField label="Unit Barcode" hint="package ka apna barcode">
              <div className="flex gap-2">
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Optional"
                  className={inputCls('h-11 font-mono font-bold')}
                />
                <button
                  onClick={() => setScanOpen(true)}
                  title="Barcode scan"
                  className="h-11 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-extrabold inline-flex items-center gap-1 shrink-0 transition"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </FormField>
            <FormField label="SKU">
              <div className="flex gap-2">
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="COLG-DZN"
                  className={inputCls('h-11 font-mono font-bold')}
                />
                <button
                  onClick={autoSku}
                  title="Auto-generate"
                  className="h-11 px-3 rounded-xl bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-extrabold inline-flex items-center gap-1 shrink-0 transition"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </FormField>
          </div>

          {/* Toggles — explanation ke sath */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Settings
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ToggleTile
                checked={form.isBase}
                onChange={(v) => setForm({ ...form, isBase: v })}
                label="Base Unit"
                hint="Stock isi mein"
                tone="emerald"
              />
              <ToggleTile
                checked={form.isDefault}
                onChange={(v) => setForm({ ...form, isDefault: v })}
                label="POS Default"
                hint="POS pe pre-select"
                tone="amber"
              />
              <ToggleTile
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
                label="Active"
                hint="Bikri ke liye"
                tone="emerald"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/40"
              onClick={() => {
                if (!canSave) return toast.error('Naam + rate + price zaroori hain');
                saveMutation.mutate();
              }}
              loading={saveMutation.isPending}
              disabled={!canSave}
            >
              <Save className="h-4 w-4" /> {editing ? 'Update' : 'Unit Banao'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   EMPTY STATES & HELPERS
   ═════════════════════════════════════════════════════════════ */

function EmptyPickProduct({ onOpenPicker, onLearn }: { onOpenPicker: () => void; onLearn: () => void }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Layers className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
        Step ① — Product Chuno
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
        Jis product ko piece, dozen, carton mein bechna hai — use select karo.
        Phir step ② mein uske packages banao ge.
      </p>

      {/* Mini visual hint */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-extrabold text-slate-600 dark:text-slate-300">
        <span>🥚 Piece</span>
        <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
        <span>🗳️ Dozen</span>
        <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
        <span>📮 Carton</span>
      </div>

      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        <button
          onClick={onOpenPicker}
          className="xl:hidden h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-lg shadow-emerald-500/40"
        >
          <Boxes className="h-4 w-4" /> Product Chuno
        </button>
        <button
          onClick={onLearn}
          className="h-11 px-5 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-sm font-extrabold inline-flex items-center gap-2 border-2 border-amber-300 dark:border-amber-500/40 transition"
        >
          <GraduationCap className="h-4 w-4" /> Pehle Samjho — Units Kya Hain?
        </button>
      </div>
      <p className="hidden xl:block mt-3 text-[11px] text-slate-400 dark:text-slate-500 font-bold">
        👈 Baayein list se product click karo
      </p>
    </div>
  );
}

function EmptyNoUnits({ onAddCustom }: { onAddCustom: () => void }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed border-emerald-300 dark:border-emerald-500/40 p-8 sm:p-12 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <Layers className="h-8 w-8 text-white" />
      </div>
      <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white">
        Step ② — Ab Unit Banao
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-sm mx-auto">
        Sab se aasan tareeqa: <strong>upar presets</strong> mein se koi dabao (Dozen, Box, Carton) —
        price khud ban jayegi. Ya custom unit banao:
      </p>
      <Button
        className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/40"
        onClick={onAddCustom}
      >
        <Plus className="h-4 w-4" /> Custom Unit Banao
      </Button>
    </div>
  );
}

function WarningBanner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'info' }) {
  const styles = tone === 'warn'
    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200'
    : 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-200';
  return (
    <div className={`rounded-xl border-2 p-3 text-xs sm:text-sm font-bold flex items-start gap-2 ${styles}`}>
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function FormField({ label, required, hint, tone, children }: {
  label: string; required?: boolean; hint?: string; tone?: string; children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    violet:  'text-violet-700 dark:text-violet-300',
    blue:    'text-blue-700 dark:text-blue-300',
  };
  const color = tone ? tones[tone] : 'text-slate-700 dark:text-slate-300';
  return (
    <div>
      <label className={`block text-xs font-extrabold uppercase tracking-wider mb-1.5 ${color}`}>
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 dark:text-slate-500 normal-case font-bold ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleTile({ checked, onChange, label, hint, tone }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; tone: 'emerald' | 'amber';
}) {
  const active = tone === 'emerald'
    ? 'border-emerald-500 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
    : 'border-amber-500 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200';
  return (
    <label className={[
      'flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition',
      checked
        ? active
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600',
    ].join(' ')}>
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`h-4 w-4 rounded ${tone === 'emerald' ? 'accent-emerald-500' : 'accent-amber-500'}`}
        />
        <span className="text-xs font-extrabold">{label}</span>
      </span>
      {hint && <span className="text-[9px] font-bold opacity-60 pl-6">{hint}</span>}
    </label>
  );
}

function inputCls(extra = '') {
  return [
    'w-full rounded-xl border-2 px-3',
    'bg-white dark:bg-slate-800',
    'text-slate-900 dark:text-white',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    'border-slate-200 dark:border-slate-700',
    'focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400',
    'focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition',
    extra,
  ].join(' ');
}
