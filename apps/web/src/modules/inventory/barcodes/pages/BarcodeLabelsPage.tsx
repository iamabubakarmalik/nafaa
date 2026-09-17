import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Printer, ScanLine, Plus, Minus, Search, X, Settings2, SlidersHorizontal,
  Building2, DollarSign, Package, AlertCircle, Sparkles, Ruler,
  Edit3, Wand2, CheckCircle2, RefreshCw, GraduationCap, RotateCcw,
  Hash, Tag, Trash2, Eye, QrCode, LayoutGrid, Eraser, Type, Maximize2,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { Button } from '@core/ui/Button';
import { formatPKRFull } from '@core/lib/format';
import { toast } from 'sonner';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

/* ═════════════════════════════════════════════════════════════
   NAFAA BARCODE LABEL STUDIO
   ─────────────────────────────────────────────────────────────
   Har dukaan ke label ka naap alag hota hai. Pehle yahan sirf
   chaar tayyar naap thay — jiske roll ka naap 40×15 tha, uske
   label ya to kat jate thay ya beech me khali jagah chhor dete
   thay. Ab naap dukaan-daar ke haath me hai: chaar tayyar naap
   ek click par, aur us ke sath apni marzi ka naap millimeter
   tak.

   Barcode ki unchai, motai aur likhai ka naap bhi khud set ho
   sakta hai — kyunke chhote label par bara barcode bilkul nahi
   samata.

   Sab settings browser me mehfooz — agli baar wohi milengi.
   ═════════════════════════════════════════════════════════════ */

interface LabelItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  copies: number;
}

type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';

interface Preset {
  key: string;
  label: string;
  dims: string;
  desc: string;
  icon: string;
  wMm: number;
  hMm: number;
}

/** Tayyar naap — bazaar me sab se aam rolls */
const PRESETS: Preset[] = [
  { key: 'small',  label: 'Small',   dims: '40×25', desc: 'Choti cheezain — thermal roll', icon: '🏷️', wMm: 40, hMm: 25 },
  { key: 'strip',  label: 'Patti',   dims: '40×15', desc: 'Patli patti — shelf par',        icon: '📏', wMm: 40, hMm: 15 },
  { key: 'medium', label: 'Medium',  dims: '50×30', desc: 'Sab se common thermal',          icon: '📋', wMm: 50, hMm: 30 },
  { key: 'large',  label: 'Large',   dims: '70×40', desc: 'A4 sheet — tafseel ke sath',     icon: '📄', wMm: 70, hMm: 40 },
  { key: 'xlarge', label: 'X-Large', dims: '100×50', desc: 'Shelf ya box ka bara label',    icon: '📃', wMm: 100, hMm: 50 },
];

const FORMAT_HINTS: Record<BarcodeFormat, string> = {
  CODE128: 'Universal — har scanner (recommended)',
  CODE39: 'Purane scanners ke liye',
  EAN13: 'Retail standard — sirf 12-13 digits',
  UPC: 'USA standard — sirf 11-12 digits',
};

/** Industry ke hisaab se sirf shuruaati naap ka mashwara */
const INDUSTRY_DEFAULT: Record<string, string> = {
  jewelry: 'small', pharmacy: 'small', mobile: 'medium', retail: 'medium',
  grocery: 'medium', restaurant: 'medium', garment: 'medium',
  carpet: 'large', wholesale: 'large',
};

/**
 * Label ke naap se andar ki har cheez ka naap khud nikal aata hai.
 *
 * Dukaan-daar se ye poochna ke "barcode ki unchai kitni ho" be-maani
 * hai — wo label ka naap jaanta hai, barcode ki pixel unchai nahi.
 * Is liye khud hisab lagate hain; badalna ho to Advanced me mojood hai.
 */
function autoScale(wMm: number, hMm: number) {
  const area = wMm * hMm;
  const tiny = hMm <= 18;
  return {
    barcodeHeight: Math.max(14, Math.min(72, Math.round(hMm * 1.25))),
    barcodeWidth: Number(Math.max(0.8, Math.min(2.2, wMm / 34)).toFixed(2)),
    fontSize: Math.max(6, Math.min(16, Math.round(wMm / 5))),
    nameFont: Math.max(5, Math.min(15, Math.round(area / 190) + 5)),
    priceFont: Math.max(6, Math.min(20, Math.round(area / 150) + 6)),
    metaFont: Math.max(4, Math.min(11, Math.round(area / 260) + 4)),
    /** Choti patti par shop ka naam jagah kha jata hai */
    tight: tiny,
  };
}

const PREFS_KEY = 'nafaa-label-prefs-v2';

interface Prefs {
  wMm: number; hMm: number;
  barcodeFormat: BarcodeFormat;
  showShopName: boolean; showPrice: boolean; showCategory: boolean;
  showSku: boolean; showName: boolean;
  gapMm: number;
  autoSize: boolean;
  barcodeHeight: number; barcodeWidth: number; fontSize: number;
  nameFont: number; priceFont: number; metaFont: number;
  customLine: string;
}

function loadPrefs(): Partial<Prefs> | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function BarcodeImage({
  value, height, width, fontSize, format = 'CODE128',
}: {
  value: string; height: number; width: number; fontSize: number; format?: BarcodeFormat;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    const opts = { width, height, fontSize, margin: 0, displayValue: true } as any;
    try {
      JsBarcode(ref.current, value, { format, ...opts });
    } catch {
      // Chuna hua format is value ke liye theek nahi (jaise EAN13 me
      // 13 se kam hindsay) — CODE128 har cheez chala leta hai.
      try { JsBarcode(ref.current, value, { format: 'CODE128', ...opts }); }
      catch { /* value hi ghalat hai */ }
    }
  }, [value, height, width, fontSize, format]);
  return <svg ref={ref} />;
}

export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const industry = useCurrentIndustry();
  const searchRef = useRef<HTMLInputElement>(null);

  const startPreset = PRESETS.find(
    (p) => p.key === (industry?.id ? INDUSTRY_DEFAULT[industry.id] : 'medium'),
  ) ?? PRESETS[2];

  const saved = loadPrefs();

  /* ─── Naap ─── */
  const [wMm, setWMm] = useState<number>(saved?.wMm ?? startPreset.wMm);
  const [hMm, setHMm] = useState<number>(saved?.hMm ?? startPreset.hMm);
  const [gapMm, setGapMm] = useState<number>(saved?.gapMm ?? 2);
  const [autoSize, setAutoSize] = useState<boolean>(saved?.autoSize ?? true);

  /* ─── Barcode aur likhai (Advanced) ─── */
  const auto = useMemo(() => autoScale(wMm, hMm), [wMm, hMm]);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(saved?.barcodeHeight ?? auto.barcodeHeight);
  const [barcodeWidth, setBarcodeWidth] = useState<number>(saved?.barcodeWidth ?? auto.barcodeWidth);
  const [fontSize, setFontSize] = useState<number>(saved?.fontSize ?? auto.fontSize);
  const [nameFont, setNameFont] = useState<number>(saved?.nameFont ?? auto.nameFont);
  const [priceFont, setPriceFont] = useState<number>(saved?.priceFont ?? auto.priceFont);
  const [metaFont, setMetaFont] = useState<number>(saved?.metaFont ?? auto.metaFont);

  /** Naap badle aur "khud set karo" on ho to sab dobara hisab */
  useEffect(() => {
    if (!autoSize) return;
    setBarcodeHeight(auto.barcodeHeight);
    setBarcodeWidth(auto.barcodeWidth);
    setFontSize(auto.fontSize);
    setNameFont(auto.nameFont);
    setPriceFont(auto.priceFont);
    setMetaFont(auto.metaFont);
  }, [auto, autoSize]);

  /* ─── Label par kya dikhe ─── */
  const [showShopName, setShowShopName] = useState(saved?.showShopName ?? true);
  const [showName, setShowName] = useState(saved?.showName ?? true);
  const [showPrice, setShowPrice] = useState(saved?.showPrice ?? true);
  const [showCategory, setShowCategory] = useState(saved?.showCategory ?? false);
  const [showSku, setShowSku] = useState(saved?.showSku ?? false);
  const [customLine, setCustomLine] = useState(saved?.customLine ?? '');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(saved?.barcodeFormat ?? 'CODE128');

  /* ─── Safhe ka intezam ─── */
  const [selected, setSelected] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'with-barcode' | 'without-barcode'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [visible, setVisible] = useState(60);

  /* ─── Settings mehfooz ─── */
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        wMm, hMm, gapMm, autoSize, barcodeFormat,
        showShopName, showName, showPrice, showCategory, showSku, customLine,
        barcodeHeight, barcodeWidth, fontSize, nameFont, priceFont, metaFont,
      }));
    } catch { /* private mode */ }
  }, [wMm, hMm, gapMm, autoSize, barcodeFormat, showShopName, showName, showPrice,
      showCategory, showSku, customLine, barcodeHeight, barcodeWidth, fontSize,
      nameFont, priceFont, metaFont]);

  /* ─── Data ─── */
  const { data: productsData, refetch: refetchProducts, isRefetching, isLoading } = useQuery({
    queryKey: ['products-for-labels', 'all'],
    // Pehle `limit: 500` tha — 1600 products wali dukaan ke 1100
    // products yahan aate hi nahi thay, na unke label ban sakte thay.
    queryFn: () => fetchAllProducts(),
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const products = productsData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (stockFilter === 'with-barcode' && !p.barcode) return false;
      if (stockFilter === 'without-barcode' && p.barcode) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q)
        || (p.sku || '').toLowerCase().includes(q)
        || (p.barcode || '').toLowerCase().includes(q);
    });
  }, [products, search, categoryFilter, stockFilter]);

  useEffect(() => { setVisible(60); }, [search, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const withBarcode = products.filter((p) => p.barcode).length;
    return { total: products.length, withBarcode, withoutBarcode: products.length - withBarcode };
  }, [products]);

  const labelsToPrint = useMemo(
    () => selected.flatMap((item) =>
      Array.from({ length: item.copies }, (_, i) => ({ ...item, _key: `${item.id}-${i}` }))),
    [selected],
  );

  /* A4 par ek qatar me kitne label — dukaan-daar ko pehle se pata chale */
  const perRow = Math.max(1, Math.floor((210 - 8) / (wMm + gapMm)));
  const perCol = Math.max(1, Math.floor((297 - 8) / (hMm + gapMm)));
  const perSheet = perRow * perCol;
  const sheets = Math.ceil(labelsToPrint.length / perSheet) || 0;

  /* ─── Mutations ─── */
  const generateBarcodeMutation = useMutation({
    mutationFn: productsApi.generateBarcode,
    onSuccess: (updated) => {
      toast.success(`✓ Barcode ban gaya: ${updated.barcode}`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Barcode ban nahi saka'),
  });

  const bulkGenerateMutation = useMutation({
    mutationFn: productsApi.bulkGenerateBarcodes,
    onSuccess: (result) => {
      toast.success(`✓ ${result.count} barcode ban gaye!`);
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Bulk generate nahi hua'),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => productsApi.update(id, payload),
    onSuccess: () => {
      toast.success('✓ Barcode save ho gaya');
      queryClient.invalidateQueries({ queryKey: ['products-for-labels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
    },
    onError: () => toast.error('Save nahi hua'),
  });

  /* ─── Queue ke kaam ─── */
  const addOneItem = (product: Product, variant?: ProductVariant) => {
    const id = variant ? `${product.id}__${variant.id}` : product.id;
    setSelected((prev) => {
      const existing = prev.find((p) => p.id === id);
      if (existing) return prev.map((p) => (p.id === id ? { ...p, copies: p.copies + 1 } : p));
      return [...prev, { id, product, variant, copies: 1 }];
    });
  };

  const addProduct = async (product: Product) => {
    if (!product.barcode) {
      if (confirm(`"${product.name}" ka barcode nahi hai. Abhi bana doon?`)) {
        await generateBarcodeMutation.mutateAsync(product.id);
        toast.info('Barcode ban gaya — ab dobara click karke add karein');
      }
      return;
    }
    if (product.hasVariants) {
      try {
        const variants = await productVariantsApi.list(product.id);
        const active = variants.filter((v) => v.isActive);
        if (active.length === 0) return addOneItem(product, undefined);
        let added = 0;
        active.forEach((v) => { if (v.barcode) { addOneItem(product, v); added++; } });
        if (added === 0) {
          addOneItem(product, undefined);
          toast('Variants ka barcode nahi — product wala barcode laga diya');
        } else {
          toast.success(`✓ ${added} variants add ho gaye`);
        }
      } catch { addOneItem(product, undefined); }
      return;
    }
    addOneItem(product, undefined);
  };

  const updateCopies = (id: string, delta: number) =>
    setSelected((prev) => prev
      .map((p) => (p.id === id ? { ...p, copies: Math.max(0, p.copies + delta) } : p))
      .filter((p) => p.copies > 0));

  const setCopies = (id: string, copies: number) =>
    setSelected((prev) => prev
      .map((p) => (p.id === id ? { ...p, copies: Math.max(0, copies) } : p))
      .filter((p) => p.copies > 0));

  const setAllCopies = (copies: number) => {
    setSelected((prev) => prev.map((p) => ({ ...p, copies })));
    toast.success(`Har cheez ki ${copies} copies`);
  };

  const removeItem = (id: string) => setSelected((prev) => prev.filter((p) => p.id !== id));

  const handlePrint = () => {
    if (selected.length === 0) return toast.error('Pehle products chunein');
    window.print();
  };

  const handleAddAll = () => {
    let added = 0;
    filteredProducts.forEach((p) => { if (p.barcode) { addOneItem(p, undefined); added++; } });
    if (added === 0) return toast.info('Is chaant me koi barcode wala product nahi');
    toast.success(`✓ ${added} products add ho gaye`);
  };

  const handleBulkGenerateBarcodes = () => {
    const withoutBarcode = filteredProducts.filter((p) => !p.barcode);
    if (withoutBarcode.length === 0) return toast.info('Sab ke barcode pehle se hain 🎉');
    if (confirm(`${withoutBarcode.length} products ke barcode bana doon?`)) {
      bulkGenerateMutation.mutate(withoutBarcode.map((p) => p.id));
    }
  };

  const applyPreset = (p: Preset) => { setWMm(p.wMm); setHMm(p.hMm); };

  const resetAuto = () => {
    setAutoSize(true);
    const a = autoScale(wMm, hMm);
    setBarcodeHeight(a.barcodeHeight); setBarcodeWidth(a.barcodeWidth);
    setFontSize(a.fontSize); setNameFont(a.nameFont);
    setPriceFont(a.priceFont); setMetaFont(a.metaFont);
    toast.success('Naap dobara khud set ho gaye');
  };

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGuide) return setShowGuide(false);
        if (editingProduct) return setEditingProduct(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); handlePrint(); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 's') setShowSettings((v) => !v);
      if (e.key.toLowerCase() === 'g') setShowGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const anyModal = showGuide || !!editingProduct;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const shopName = (settings as any)?.shopName || 'My Shop';
  const hasFilters = !!search || !!categoryFilter || stockFilter !== 'all';
  const matchedPreset = PRESETS.find((p) => p.wMm === wMm && p.hMm === hMm);

  /** Screen par label ka naap — 1mm ≈ 3.2px, taake asal naap ka andaza ho */
  const PX = 3.2;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-0 print:p-0">
      {showGuide && <LabelGuide onClose={() => setShowGuide(false)} />}

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-5 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <ScanLine className="h-3.5 w-3.5 text-amber-300" /> Label Studio
              {industry?.id && (<><span className="opacity-40">•</span><span>{industry.emoji} {industry.name}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🏷️ Barcode Labels</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-bold">
              Apni marzi ka naap, apni marzi ka label — thermal roll se A4 sheet tak
              {stats.withoutBarcode > 0 && (
                <><span className="opacity-50 mx-1.5">•</span>
                <strong className="text-amber-300">{stats.withoutBarcode}</strong> ko barcode chahiye</>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowGuide(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => refetchProducts()} disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Taaza</span>
            </button>
            <button onClick={() => setShowSettings((v) => !v)}
              className={`h-11 px-3 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition border backdrop-blur-md ${
                showSettings ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg' : 'bg-white/15 hover:bg-white/25 border-white/25'
              }`}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{showSettings ? 'Chhupayein' : 'Settings'}</span>
            </button>
            <Button onClick={handlePrint} disabled={labelsToPrint.length === 0}
              className="h-11 bg-white text-slate-900 hover:bg-slate-100 font-black shadow-lg disabled:opacity-50">
              <Printer className="h-4 w-4" /> Print <span className="tabular-nums">{labelsToPrint.length}</span>
            </Button>
          </div>
        </div>

      </section>

      {/* ═══════════ SETTINGS — alag panel, hero ke bahar ═══════════
          Pehle ye sab hero ke andar tha: header itna bara ho jata tha
          ke asal kaam (products chunna) screen se neeche chala jata.
          Ab header baqi safhon jaisa chhota hai aur settings sirf
          zaroorat par khulti hain. */}
      {showSettings && (
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-800 text-white border-2 border-emerald-700/40 p-4 sm:p-5 shadow-xl print:hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-black text-base leading-tight">Label ki Settings</div>
                <div className="text-[11px] font-bold text-white/70">Naap, format aur label par kya dikhe</div>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">

            {/* ── Naap ── */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/20">
              <label className="text-[10px] uppercase tracking-widest font-black text-white/80 mb-2.5 flex items-center gap-1.5">
                <Ruler className="h-3 w-3" /> Label ka naap
                {matchedPreset
                  ? <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[9px]">{matchedPreset.label}</span>
                  : <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 text-[9px]">APNI MARZI</span>}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PRESETS.map((p) => {
                  const on = wMm === p.wMm && hMm === p.hMm;
                  return (
                    <button key={p.key} onClick={() => applyPreset(p)}
                      className={`px-3 py-2.5 rounded-xl text-left transition border-2 ${
                        on ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{p.icon}</span>
                        <span className="font-black text-xs">{p.label}</span>
                      </div>
                      <div className={`text-[10px] font-black mt-0.5 tabular-nums ${on ? 'text-emerald-700' : 'text-emerald-200'}`}>
                        {p.dims}mm
                      </div>
                      <div className={`text-[9px] font-bold mt-0.5 ${on ? 'opacity-60' : 'opacity-60'}`}>{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Apni marzi ka naap */}
              <div className="mt-3 rounded-2xl bg-slate-950/30 border-2 border-white/20 p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-black text-amber-200 mb-2 flex items-center gap-1.5">
                  <Maximize2 className="h-3 w-3" /> Apni marzi ka naap (millimeter me)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MmInput label="Chaurai (W)" value={wMm} onChange={setWMm} min={15} max={210} />
                  <MmInput label="Unchai (H)" value={hMm} onChange={setHMm} min={8} max={297} />
                  <MmInput label="Beech ka faasla" value={gapMm} onChange={setGapMm} min={0} max={20} />
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-black text-white/70 mb-1">A4 par</div>
                    <div className="h-10 rounded-xl bg-white/10 border border-white/20 px-3 flex items-center text-xs font-black tabular-nums">
                      {perRow} × {perCol} = {perSheet}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-white/60">
                  Jo naap aap ke roll ka hai wohi likhein — label bilkul usi naap me chhapega.
                  Misal: 40×15, 38×22, 30×20 — koi bhi.
                </div>
              </div>
            </div>

            {/* ── Format + kya dikhe ── */}
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/20">
                <label className="text-[10px] uppercase tracking-widest font-black text-white/80 mb-1.5 flex items-center gap-1.5">
                  <QrCode className="h-3 w-3" /> Barcode ka format
                </label>
                <select value={barcodeFormat} onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                  className="h-11 w-full rounded-xl bg-white text-slate-900 px-3 text-sm font-bold focus:outline-none">
                  {(Object.entries(FORMAT_HINTS) as [BarcodeFormat, string][]).map(([f, hint]) => (
                    <option key={f} value={f}>{f} — {hint}</option>
                  ))}
                </select>
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-widest font-black text-white/80 mb-1.5 flex items-center gap-1.5">
                    <Type className="h-3 w-3" /> Apni line (optional)
                  </label>
                  <input value={customLine} onChange={(e) => setCustomLine(e.target.value)}
                    maxLength={40} placeholder="Jaise: Exchange 7 din — ya kuch bhi"
                    className="h-11 w-full rounded-xl bg-white text-slate-900 px-3 text-sm font-bold focus:outline-none placeholder:text-slate-400" />
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/20">
                <label className="text-[10px] uppercase tracking-widest font-black text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Eye className="h-3 w-3" /> Label par kya dikhe
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  <ToggleChip checked={showShopName} onChange={setShowShopName} icon={Building2} label="Shop" />
                  <ToggleChip checked={showName} onChange={setShowName} icon={Package} label="Naam" />
                  <ToggleChip checked={showPrice} onChange={setShowPrice} icon={DollarSign} label="Rate" />
                  <ToggleChip checked={showCategory} onChange={setShowCategory} icon={Tag} label="Category" />
                  <ToggleChip checked={showSku} onChange={setShowSku} icon={Hash} label="SKU" />
                </div>

                <button onClick={() => setShowAdvanced((v) => !v)}
                  className="mt-3 h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {showAdvanced ? 'Advanced band karein' : 'Advanced — barcode aur likhai ka naap'}
                </button>
              </div>
            </div>

            {/* ── Advanced ── */}
            {showAdvanced && (
              <div className="rounded-2xl bg-slate-950/30 border-2 border-white/20 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={autoSize}
                      onChange={(e) => { setAutoSize(e.target.checked); }}
                      className="h-4 w-4 rounded accent-emerald-500" />
                    <span className="text-[11px] font-black text-white">
                      Naap khud set karo (label ke size ke hisab se)
                    </span>
                  </label>
                  <button onClick={resetAuto}
                    className="h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-[11px] font-black inline-flex items-center gap-1.5 transition">
                    <RotateCcw className="h-3.5 w-3.5" /> Dobara khud set
                  </button>
                </div>

                <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-3 ${autoSize ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Slider label="Barcode ki unchai" value={barcodeHeight} onChange={setBarcodeHeight} min={10} max={90} unit="px" />
                  <Slider label="Barcode ki motai" value={barcodeWidth} onChange={setBarcodeWidth} min={0.6} max={3} step={0.1} unit="×" />
                  <Slider label="Barcode ke hindsay" value={fontSize} onChange={setFontSize} min={0} max={20} unit="px" />
                  <Slider label="Naam ki likhai" value={nameFont} onChange={setNameFont} min={4} max={20} unit="px" />
                  <Slider label="Rate ki likhai" value={priceFont} onChange={setPriceFont} min={5} max={26} unit="px" />
                  <Slider label="Chhoti likhai" value={metaFont} onChange={setMetaFont} min={3} max={14} unit="px" />
                </div>
                <div className="mt-2 text-[10px] font-bold text-white/60">
                  Barcode ke hindsay 0 kar dein to sirf lakeerein chhapengi — bohat chhote label par jagah bach jati hai.
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Sab settings khud mehfooz ho jati hain — agli baar wohi milengi
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ STATS ═══════════ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <StatCard label="Kul Products" value={stats.total} sub="Inventory me" icon={Package} tone="violet" />
        <StatCard label="Barcode Ready" value={stats.withBarcode}
          sub={`${stats.total > 0 ? Math.round((stats.withBarcode / stats.total) * 100) : 0}% tayyar`}
          icon={CheckCircle2} tone="emerald" />
        <StatCard label="Barcode Chahiye" value={stats.withoutBarcode}
          sub={stats.withoutBarcode > 0 ? 'In ka barcode banana hai' : 'Sab tayyar 🎉'}
          icon={AlertCircle} tone="amber"
          action={stats.withoutBarcode > 0 ? (
            <button onClick={handleBulkGenerateBarcodes} disabled={bulkGenerateMutation.isPending}
              className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black transition disabled:opacity-50 active:scale-95">
              <Wand2 className="h-3 w-3" /> Sab ke bana do
            </button>
          ) : null} />
        <StatCard label="Print Queue" value={labelsToPrint.length}
          sub={sheets > 0 ? `${selected.length} cheezein · ${sheets} A4 sheet` : `${selected.length} cheezein`}
          icon={Printer} tone="blue" highlight />
      </section>

      {/* ═══════════ MAIN ═══════════ */}
      <section className="grid lg:grid-cols-[420px_1fr] gap-4 sm:gap-5 items-start print:grid-cols-1 print:gap-0">
        {/* ─── PRODUCT PICKER ─── */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10">
            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Products Chunein
            </h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredProducts.length.toLocaleString()} dikh rahe · click = queue me add
            </p>
          </div>

          <div className="p-4 space-y-3 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, SKU, barcode… (/ dabao)"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-9 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition">
              <option value="">Sab Categories</option>
              {(categories as any[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {([
                ['all', 'Sab'],
                ['with-barcode', '✓ Barcode'],
                ['without-barcode', '⚠ Baghair'],
              ] as const).map(([v, l]) => (
                <button key={v} onClick={() => setStockFilter(v)}
                  className={`flex-1 h-9 rounded-lg text-[11px] font-black transition ${
                    stockFilter === v ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}>{l}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleAddAll}
                className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow transition active:scale-[0.97]">
                <Plus className="h-4 w-4" /> Sab Add ({filteredProducts.filter((p) => p.barcode).length})
              </button>
              <button onClick={handleBulkGenerateBarcodes} disabled={bulkGenerateMutation.isPending}
                className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 shadow disabled:opacity-50 transition active:scale-[0.97]">
                <Sparkles className="h-4 w-4" /> Generate ({filteredProducts.filter((p) => !p.barcode).length})
              </button>
            </div>

            {hasFilters && (
              <button onClick={() => { setSearch(''); setCategoryFilter(''); setStockFilter('all'); }}
                className="w-full h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black inline-flex items-center justify-center gap-1.5 transition">
                <Eraser className="h-3.5 w-3.5" /> Chaant hatayein
              </button>
            )}
          </div>

          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="py-16 text-center text-sm font-bold text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" /> Products aa rahe hain…
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">Kuch nahi mila</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">Chaant badal kar dekhein</p>
              </div>
            ) : (
              <>
                {filteredProducts.slice(0, visible).map((p) => (
                  <div key={p.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition cursor-pointer"
                    onClick={() => addProduct(p)}>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-[11px] font-bold font-mono truncate">
                        {p.barcode
                          ? <span className="text-emerald-600 dark:text-emerald-400">{p.barcode}</span>
                          : <span className="text-amber-600 dark:text-amber-400">⚠ barcode nahi</span>}
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                      {formatPKRFull(p.price)}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                      title="Barcode badlein"
                      className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 hover:bg-blue-100 transition">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {visible < filteredProducts.length && (
                  <button onClick={() => setVisible((v) => v + 60)}
                    className="w-full py-3 text-xs font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition">
                    Aur {Math.min(60, filteredProducts.length - visible)} dikhayein
                    <span className="text-slate-400 ml-1">({visible}/{filteredProducts.length})</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── QUEUE + PREVIEW ─── */}
        <div className="space-y-4 print:space-y-0">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print:hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Print Queue
                <span className="text-xs font-bold text-slate-500">
                  {selected.length} cheezein · {labelsToPrint.length} label
                </span>
              </h3>
              {selected.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 5, 10, 20].map((n) => (
                    <button key={n} onClick={() => setAllCopies(n)}
                      className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                      ×{n}
                    </button>
                  ))}
                  <button onClick={() => setSelected([])}
                    className="h-8 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1 transition">
                    <Trash2 className="h-3 w-3" /> Saaf
                  </button>
                </div>
              )}
            </div>

            {selected.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-12 text-center">
                <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-black text-slate-700 dark:text-slate-200">Queue khaali hai</p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">Baein taraf se product par click karein</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {selected.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {item.product.name}{item.variant ? ` — ${item.variant.name}` : ''}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-500 truncate">
                        {item.variant?.barcode || item.product.barcode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateCopies(item.id, -1)}
                        className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-rose-400 transition">
                        <Minus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </button>
                      <input type="number" min={1} value={item.copies}
                        onChange={(e) => setCopies(item.id, Number(e.target.value) || 0)}
                        className="h-8 w-14 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xs font-black tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                      <button onClick={() => updateCopies(item.id, 1)}
                        className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-emerald-400 transition">
                        <Plus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </button>
                      <button onClick={() => removeItem(item.id)}
                        className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── PREVIEW ─── */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print:border-none print:shadow-none print:p-0 print:rounded-none print:bg-white">
            <div className="flex items-center justify-between mb-3 print:hidden flex-wrap gap-2">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Print Preview
              </h3>
              <button onClick={() => setShowSettings(true)} title="Naap badlein"
                className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-[11px] font-black text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 transition">
                <Ruler className="h-3.5 w-3.5" />
                {matchedPreset ? matchedPreset.label : 'Apni marzi'} • {wMm}×{hMm}mm • faasla {gapMm}mm
                <Settings2 className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center print:justify-start label-sheet"
              style={{ gap: `${gapMm}mm` }}>
              {labelsToPrint.map((item) => {
                const barcodeValue = item.variant?.barcode || item.product.barcode || '';
                const displayName = item.variant ? `${item.product.name} — ${item.variant.name}` : item.product.name;
                const displayPrice = item.variant?.price ?? item.product.price;
                const displaySku = item.variant?.sku || item.product.sku;

                return (
                  <div key={item._key}
                    className="label-card border border-slate-300 bg-white text-center overflow-hidden flex flex-col items-center justify-center print:border-slate-700"
                    style={{
                      width: `${wMm * PX}px`,
                      height: `${hMm * PX}px`,
                      padding: `${Math.max(1, Math.round(hMm / 12))}px`,
                    }}>
                    {showShopName && (
                      <div className="font-black text-slate-600 truncate leading-tight max-w-full"
                        style={{ fontSize: `${metaFont}px` }}>{shopName}</div>
                    )}
                    {showName && (
                      <div className="font-black text-slate-900 leading-tight max-w-full overflow-hidden"
                        style={{ fontSize: `${nameFont}px`, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {displayName}
                      </div>
                    )}
                    {showCategory && item.product.category && (
                      <div className="text-slate-500 font-bold truncate max-w-full"
                        style={{ fontSize: `${metaFont}px` }}>{(item.product.category as any).name}</div>
                    )}
                    {showSku && displaySku && (
                      <div className="font-mono text-slate-600 truncate max-w-full"
                        style={{ fontSize: `${metaFont}px` }}>{displaySku}</div>
                    )}
                    {barcodeValue && (
                      <div className="flex justify-center max-w-full overflow-hidden">
                        <BarcodeImage value={barcodeValue} height={barcodeHeight}
                          width={barcodeWidth} fontSize={fontSize} format={barcodeFormat} />
                      </div>
                    )}
                    {showPrice && (
                      <div className="font-black text-slate-900 tabular-nums leading-none"
                        style={{ fontSize: `${priceFont}px` }}>{formatPKRFull(displayPrice)}</div>
                    )}
                    {customLine && (
                      <div className="text-slate-600 font-bold truncate max-w-full"
                        style={{ fontSize: `${metaFont}px` }}>{customLine}</div>
                    )}
                  </div>
                );
              })}
              {labelsToPrint.length === 0 && (
                <div className="w-full text-center py-14 print:hidden">
                  <Printer className="h-14 w-14 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="font-black text-slate-700 dark:text-slate-200">Preview khaali hai</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    Products add karein — yahan bilkul usi naap ka label dikhega jo chhapega
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {editingProduct && (
        <EditBarcodeModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(barcode: string) => updateProductMutation.mutate({ id: editingProduct.id, payload: { barcode } })}
          onGenerate={() => generateBarcodeMutation.mutate(editingProduct.id)}
          saving={updateProductMutation.isPending || generateBarcodeMutation.isPending}
        />
      )}

      {/* ═══ PRINT CSS — bilkul asal millimeter ═══ */}
      <style>{`
        @media print {
          @page { margin: 4mm; size: auto; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          .label-sheet { gap: ${gapMm}mm !important; }
          .label-card {
            width: ${wMm}mm !important;
            height: ${hMm}mm !important;
            min-height: ${hMm}mm !important;
            max-height: ${hMm}mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .label-card svg { max-width: 100% !important; max-height: 100% !important; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────── naap ke purzay ─────────────── */

function MmInput({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-black text-white/70 mb-1">{label}</div>
      <div className="relative">
        <input type="number" min={min} max={max} value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          className="h-10 w-full rounded-xl bg-white text-slate-900 pl-3 pr-9 text-sm font-black tabular-nums focus:outline-none" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">mm</span>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, unit }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider font-black text-white/70">{label}</span>
        <span className="text-[11px] font-black text-amber-200 tabular-nums">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-400" />
    </div>
  );
}
/* ═════════════════════════════════════════════════════════════
   GUIDE
   ═════════════════════════════════════════════════════════════ */
function LabelGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/15 dark:to-green-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Label Kaise Print Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
            Har cheez par <strong>barcode label</strong> laga dein — phir bikri ke waqt scanner se
            <strong> ek second</strong> me cheez mil jati hai. Naam type karne ki zaroorat khatam.
          </p>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Teen qadam
            </div>
            <div className="space-y-2.5">
              <FlowRow num="①" title="Naap set karein" desc="Apne roll ka naap — tayyar naap ya millimeter me apni marzi ka" />
              <FlowRow num="②" title="Products chunein" desc="Click karke queue me daalein, copies set karein" />
              <FlowRow num="③" title="Print dabayein" desc="Label bilkul usi naap me chhapega jo aap ne likha" />
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <Ruler className="h-3 w-3" /> Apni marzi ka naap
            </div>
            <div className="space-y-2 text-xs font-bold text-amber-900 dark:text-amber-100">
              <TipRow>
                Aap ke roll ka naap 40×15 ho ya 38×22 — <strong>Settings me chaurai aur unchai likh dein</strong>.
                Tayyar naap sirf jaldi ke liye hain, zaroori nahi.
              </TipRow>
              <TipRow>
                <strong>Beech ka faasla</strong> wo khali jagah hai jo do label ke darmiyan chhorni hai —
                roll wale aksar 2mm rakhte hain.
              </TipRow>
              <TipRow>
                <strong>A4 par</strong> wala number batata hai ke ek sheet par kitne label aayenge.
              </TipRow>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Barcode nahi hai?</strong> — purple <strong>Generate</strong> button ek click me sab ke bana deta hai</TipRow>
            <TipRow><strong>Chhota label</strong> — Advanced me "Naam" band kar dein aur barcode ke hindsay 0; sirf lakeerein rahengi aur sab kuch sama jayega</TipRow>
            <TipRow><strong>Apni line</strong> — "Exchange 7 din" jaisi koi baat har label par likhwa sakte hain</TipRow>
            <TipRow><strong>Pehla label zaya na karein</strong> — ek test print kar ke roll par rakh kar naap milayein</TipRow>
            <TipRow><strong>Shortcuts</strong> — <strong>/</strong> search • <strong>S</strong> settings • <strong>Ctrl+P</strong> print • <strong>Esc</strong> band</TipRow>
          </div>

          <Button onClick={onClose} className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-700 font-black">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlowRow({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-extrabold shrink-0">
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function ToggleChip({ checked, onChange, icon: Icon, label }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex flex-col items-center justify-center gap-0.5 h-12 rounded-xl border-2 transition active:scale-95 ${
        checked
          ? 'bg-white border-white text-slate-900 shadow-md'
          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[9px] font-extrabold">{label}</span>
    </button>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone, action, highlight }: any) {
  const tones: Record<string, { wrap: string; icon: string; text: string }> = {
    violet: {
      wrap: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10',
      icon: 'from-violet-500 to-purple-700 shadow-violet-500/30',
      text: 'text-violet-700 dark:text-violet-300',
    },
    emerald: {
      wrap: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'from-emerald-500 to-green-700 shadow-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    amber: {
      wrap: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
      icon: 'from-amber-500 to-orange-700 shadow-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
    },
    blue: {
      wrap: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10',
      icon: 'from-blue-500 to-indigo-700 shadow-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300',
    },
  };
  const c = tones[tone];

  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${c.wrap} ${highlight ? 'shadow-lg' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${c.text}`}>{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{sub}</div>}
          {action}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.icon} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EditBarcodeModal({ product, onClose, onSave, onGenerate, saving }: any) {
  const [barcode, setBarcode] = useState(product.barcode || '');
  const previewRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (previewRef.current && barcode) {
      try {
        JsBarcode(previewRef.current, barcode, {
          format: 'CODE128', width: 2, height: 60, fontSize: 14, displayValue: true,
        });
      } catch { /* invalid */ }
    }
  }, [barcode]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 border-b-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <Edit3 className="h-4 w-4" /> Barcode Edit Karo
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</div>
            <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{product.name}</div>
            {product.sku && (
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">SKU: {product.sku}</div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Barcode Value
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode likho ya auto-generate karo"
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
            />
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              CODE128, CODE39, EAN-13, UPC — sab formats support
            </div>
          </div>

          {barcode && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex flex-col items-center">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1">Live Preview</div>
              <div className="bg-white p-2 rounded-lg">
                <svg ref={previewRef} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={onGenerate}
              loading={saving}
              variant="secondary"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-violet-600 font-extrabold"
            >
              <Wand2 className="h-4 w-4" /> Auto
            </Button>
            <Button
              onClick={() => onSave(barcode)}
              loading={saving}
              disabled={!barcode.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold"
            >
              <CheckCircle2 className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
