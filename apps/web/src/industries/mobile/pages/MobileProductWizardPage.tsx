import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Smartphone,
  Plus, AlertTriangle, Trash2, Eye, Edit3, Headphones,
  GraduationCap, X, WifiOff, Layers, Hash, Package, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useMobileWizard, type WizardStep } from '../hooks/useMobileWizard';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { MobileWizardStepper } from '../components/wizard/MobileWizardStepper';
import { MobileWizardStep1Basic } from '../components/wizard/MobileWizardStep1Basic';
import { MobileWizardStep2Variants } from '../components/wizard/MobileWizardStep2Variants';
import { MobileWizardStep3Imeis } from '../components/wizard/MobileWizardStep3Imeis';
import { MobileWizardSummary } from '../components/wizard/MobileWizardSummary';
import { saveMobileWizard, type MobileWizardSaveResult } from '../api/mobile-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

/* ═════════════════════════════════════════════════════════════
   MOBILE PRODUCT WIZARD — FULL BEST v4
   ─────────────────────────────────────────────────────────────
   📱🎧 PRODUCT TYPE FIRST — phone ya accessory, flow khud
      adapt hota hai:
        • PHONE     → Step 3 = IMEIs (15-digit, PTA, warranty)
        • ACCESSORY → Step 3 = Stock (simple qty, koi IMEI nahi)
   ✏️  Edit mode me type LOCKED (real product ka type preserve)
   🎓 Teacher — type ke hisab se alag guide (phone vs accessory)
   📡 Offline guard — save block, draft auto-save safe
   ⌨️  Ctrl+→/← steps • Ctrl+Enter save • Esc teacher
   📊 Hero live stats — type ke hisab se labels (IMEIs / Units)
   🌙 Dark complete • 📱 Safe-area bottom bar
   ═════════════════════════════════════════════════════════════ */

type ProductType = 'PHONE' | 'ACCESSORY';

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export default function MobileProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const currentShopId = useShopParam();
  const isEdit = Boolean(id);
  const isOnline = useOnlineStatus();

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    setHasVariants, addVariant, addVariantsMatrix, updateVariant, removeVariant,
    addImeiLine, addImeisBulk, updateImeiLine, removeImeiLine, applyPtaToAll,
    upsertAccessoryStock,
    reset,
  } = useMobileWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<MobileWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  /* ── Product type (edit mode me product ka real type) ── */
  const productType: ProductType = ((draft.basic as any).productType as ProductType) || 'PHONE';
  const isAccessory = productType === 'ACCESSORY';

  const setProductType = (t: ProductType) => {
    if (isEdit) return; // edit me type locked
    updateBasic({ productType: t } as any);
    toast.success(t === 'PHONE' ? '📱 Phone mode — Step 3 me IMEIs + PTA' : '🎧 Accessory mode — Step 3 me sirf stock qty', { duration: 2000 });
  };

  // ─── EDIT MODE — load existing product ───
  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingVariants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: () => productVariantsApi.list(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      brandId: existingProduct.brandId ?? '',
      modelNumber: existingProduct.metaTitle?.split('—').pop()?.trim() ?? '',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      costPrice: existingProduct.costPrice ?? 0,
      salePrice: existingProduct.price ?? 0,
      wholesalePrice: existingProduct.wholesalePrice ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      warrantyMonths: 12,
      defaultPtaStatus: 'APPROVED',
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
      // ✅ Real type preserve — hardcode NAHI
      productType: ((existingProduct as any).productType as ProductType) ?? 'PHONE',
    } as any);

    setHasVariants(existingVariants.length > 0);
    setEditLoaded(true);
  }, [isEdit, existingProduct, existingVariants, editLoaded, updateBasic, setHasVariants]);

  const saveMutation = useMutation({
    mutationFn: () => saveMobileWizard(draft, currentShopId || undefined, isEdit ? id : undefined),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['imei-available'] });
      queryClient.invalidateQueries({ queryKey: ['imei-product-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-stats'] });
      queryClient.invalidateQueries({ queryKey: ['product-imeis'] });
      forceRefreshProducts().catch(() => {});
      toast.success(
        isAccessory
          ? `${result.productName} ${isEdit ? 'updated' : 'created'} — ${result.accessoryUnits} units stock me`
          : `${result.productName} ${isEdit ? 'updated' : 'created'} — ${result.variantCount} variants, ${result.imeiCount} IMEIs`,
      );
      if (!isEdit) reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Save fail hua');
    },
  });

  const currentValidation =
    draft.step === 1 ? validation.step1
    : draft.step === 2 ? validation.step2
    : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  /* Scroll top on step change */
  const prevStepRef = useRef(draft.step);
  useEffect(() => {
    if (prevStepRef.current !== draft.step) {
      prevStepRef.current = draft.step;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [draft.step]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'ArrowRight' && canGoNext && !savedResult) { e.preventDefault(); nextStep(); }
      if (e.key === 'ArrowLeft' && draft.step > 1 && !savedResult) { e.preventDefault(); prevStep(); }
      if (e.key === 'Enter' && draft.step === 3 && canSave && !saveMutation.isPending && isOnline && !savedResult) {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft.step, canGoNext, canSave, savedResult, showTeacher, nextStep, prevStep, saveMutation, isOnline]);

  /* Body scroll lock for teacher */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const handleSave = () => {
    if (!isOnline) {
      toast.error('Internet nahi hai — online ho kar save karein. Draft safe hai, kuch nahi khoya.');
      return;
    }
    saveMutation.mutate();
  };

  /* Type-aware step labels */
  const step3Label = isAccessory ? 'Stock' : 'IMEIs';
  const stepLabels = [
    { s: 1, label: 'Basic Info', valid: validation.step1.valid },
    { s: 2, label: 'Variants', valid: validation.step2.valid },
    { s: 3, label: step3Label, valid: validation.step3.valid },
  ];

  // ─── Edit loading skeleton ───
  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-4">
        <div className="h-40 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-800/60 animate-pulse" />
        <div className="grid xl:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse hidden xl:block" />
        </div>
        <div className="flex justify-center pt-4">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <div className="h-5 w-5 rounded-full border-2 border-blue-200 dark:border-blue-500/30 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
            Product load ho raha hai...
          </div>
        </div>
      </div>
    );
  }

  // ═══ SUCCESS SCREEN (type-aware) ═══
  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-5 px-1">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-2 border-blue-300 dark:border-blue-500/40 p-6 sm:p-8 text-center shadow-xl dark:shadow-none">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-slate-800 border border-blue-200 dark:border-blue-500/40 px-3 py-1 text-[11px] font-extrabold text-blue-800 dark:text-blue-300 mb-2">
              {isAccessory ? <Headphones className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              {isAccessory ? 'ACCESSORY' : 'PHONE'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 dark:text-blue-100">
              Product {isEdit ? 'Updated' : 'Created'}! 🎉
            </h1>
            <p className="text-blue-800 dark:text-blue-200 font-semibold mt-1 text-sm sm:text-base">
              <strong>{savedResult.productName}</strong> aur uski poori inventory ready hai
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
              <SuccessStat icon={Layers} label="Variants" value={savedResult.variantCount} />
              {isAccessory ? (
                <SuccessStat icon={Package} label="Units" value={savedResult.accessoryUnits} />
              ) : (
                <SuccessStat icon={Hash} label="IMEIs" value={savedResult.imeiCount} />
              )}
              <SuccessStat
                icon={ShieldCheck}
                label={isAccessory ? 'Type' : 'PTA'}
                value={isAccessory ? 'Qty' : '✓'}
              />
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 px-3 py-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Offline cache bhi refresh ho gaya — POS me turant dikhega
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/mobile-products/new');
            }}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white p-5 flex flex-col items-center gap-2 shadow-lg shadow-blue-500/30 transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
            <div className="text-xs opacity-90 font-semibold">Naya product shuru karo</div>
          </button>
          <button
            onClick={() => navigate(`/mobile-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md active:scale-[0.98] p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div className="font-extrabold text-slate-900 dark:text-white">View Product</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Full detail page</div>
          </button>
          <button
            onClick={() => navigate(isAccessory ? '/mobile-products' : '/imei-inventory')}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md active:scale-[0.98] p-5 flex flex-col items-center gap-2 transition"
          >
            {isAccessory ? (
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            )}
            <div className="font-extrabold text-slate-900 dark:text-white">
              {isAccessory ? 'All Products' : 'All IMEIs'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {isAccessory ? 'Catalog dekho' : 'IMEI inventory'}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ═══ WIZARD ═══
  return (
    <div className="space-y-4 sm:space-y-5 pb-32 sm:pb-28">
      {showTeacher && <WizardTeacher isAccessory={isAccessory} onClose={() => setShowTeacher(false)} />}

      {/* Offline banner */}
      {!isOnline && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="text-xs flex-1 min-w-0">
            <div className="font-extrabold text-rose-900 dark:text-rose-200">Offline Mode</div>
            <div className="font-semibold text-rose-800 dark:text-rose-300">
              Form bharna chalu rakhein — draft auto-save hota hai. Save sirf online hone pe hoga.
            </div>
          </div>
        </div>
      )}

      {/* Draft restored */}
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-200 flex-1 min-w-0 font-semibold">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button
            onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200 dark:border-rose-500/40 transition"
          >
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {/* Edit mode note */}
      {isEdit && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 flex-1 font-semibold">
            <div className="font-extrabold mb-0.5">
              Edit Mode • Type locked: {isAccessory ? '🎧 Accessory' : '📱 Phone'}
            </div>
            Basic info edit kar sakte hain. New variants + {isAccessory ? 'stock' : 'IMEIs'} add karenge tou existing ke saath merge honge (duplicates skip).
            Delete karne ke liye{' '}
            <a href={`/mobile-products/${id}`} className="underline font-extrabold">detail page</a> use karein.
          </div>
        </div>
      )}

      {/* Back + Guide */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/mobile-products/${id}` : '/mobile-products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Products'}
        </button>
        <button
          onClick={() => setShowTeacher(true)}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border-2 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-extrabold transition"
        >
          <GraduationCap className="h-4 w-4" /> Guide
        </button>
      </div>

      {/* ═══ PRODUCT TYPE SELECTOR (create mode only) ═══ */}
      {!isEdit && (
        <section className="grid grid-cols-2 gap-3">
          <TypeCard
            active={!isAccessory}
            onClick={() => setProductType('PHONE')}
            icon={Smartphone}
            emoji="📱"
            title="Phone"
            desc="IMEI tracked • PTA status • warranty"
            tone="blue"
          />
          <TypeCard
            active={isAccessory}
            onClick={() => setProductType('ACCESSORY')}
            icon={Headphones}
            emoji="🎧"
            title="Accessory"
            desc="Charger, cover, handsfree — sirf qty stock"
            tone="violet"
          />
        </section>
      )}

      {/* ═══ HERO (type-aware) ═══ */}
      <section className={`relative overflow-hidden rounded-2xl sm:rounded-3xl text-white p-4 sm:p-6 shadow-2xl ${
        isAccessory
          ? 'bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 dark:from-slate-950 dark:via-violet-950 dark:to-fuchsia-900'
          : 'bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900'
      }`}>
        <div className={`absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl pointer-events-none ${isAccessory ? 'bg-fuchsia-400/20' : 'bg-blue-400/20'}`} />
        <div className={`absolute -bottom-20 -left-20 h-64 w-64 rounded-full blur-3xl pointer-events-none ${isAccessory ? 'bg-violet-400/15' : 'bg-indigo-400/15'}`} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest">
                {isAccessory ? <Headphones className="h-3.5 w-3.5 text-fuchsia-300" /> : <Smartphone className="h-3.5 w-3.5 text-amber-300" />}
                {isEdit ? `Editing ${isAccessory ? 'Accessory' : 'Phone'}` : isAccessory ? 'New Accessory' : 'New Phone'}
                {!isOnline && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-1 text-rose-300">
                      <WifiOff className="h-3 w-3" /> Offline
                    </span>
                  </>
                )}
              </div>
              <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight truncate">
                {draft.basic.name || (isEdit ? 'Edit Product' : isAccessory ? 'Add Accessory' : 'Add Mobile Phone')}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/85 font-semibold">
                {isAccessory
                  ? 'Naam, price, colors (optional) aur stock qty — bas itna hi. Koi IMEI nahi.'
                  : 'Ek page mein — product, colors/storage aur IMEIs sab. PTA compliance built-in.'}
              </p>
            </div>

            {/* Live mini stats — type-aware */}
            <div className="flex gap-2 shrink-0">
              <HeroStat label="Variants" value={stats.variantCount} />
              {isAccessory ? (
                <HeroStat label="Units" value={stats.accessoryUnits} />
              ) : (
                <HeroStat label="IMEIs" value={stats.imeiCount} />
              )}
              <HeroStat label="Step" value={`${draft.step}/3`} />
            </div>
          </div>

          {/* Step progress chips — type-aware labels */}
          <div className="mt-4 flex gap-1.5 flex-wrap">
            {stepLabels.map((st) => {
              const active = draft.step === st.s;
              return (
                <div
                  key={st.s}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border transition ${
                    active
                      ? 'bg-white text-slate-900 border-white shadow-lg'
                      : st.valid
                      ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-white/10 text-white/70 border-white/20'
                  }`}
                >
                  {st.valid && !active && <CheckCircle2 className="h-3 w-3" />}
                  {st.s}. {st.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MobileWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid)
            goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-4 sm:gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <MobileWizardStep1Basic
              basic={draft.basic}
              onChange={updateBasic}
              errors={validation.step1.errors}
            />
          )}
          {draft.step === 2 && (
            <MobileWizardStep2Variants
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              onToggleVariants={setHasVariants}
              variants={draft.variants}
              onAddVariant={addVariant}
              onAddVariantsMatrix={addVariantsMatrix}
              onUpdateVariant={updateVariant}
              onRemoveVariant={removeVariant}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <MobileWizardStep3Imeis
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              variants={draft.variants}
              imeiLines={draft.imeiLines}
              accessoryStock={draft.accessoryStock}
              onAddImeiLine={addImeiLine}
              onUpdateImeiLine={updateImeiLine}
              onRemoveImeiLine={removeImeiLine}
              onAddImeisBulk={addImeisBulk}
              onApplyPtaToAll={applyPtaToAll}
              onUpsertAccessoryStock={upsertAccessoryStock}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <div className="xl:sticky xl:top-4">
          <MobileWizardSummary draft={draft} stats={stats} allValid={canSave} />
        </div>
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-3 sm:px-4 pt-3 lg:pl-[300px] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={prevStep}
            disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-3 sm:px-4 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-extrabold transition disabled:opacity-40 active:scale-[0.97]"
            title="Ctrl+←"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden xs:inline">Back</span>
          </button>

          <div className="flex-1 text-center min-w-0 px-1">
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              Step {draft.step} of 3 {isAccessory && draft.step === 3 ? '• Stock qty' : ''}
            </div>
            {!currentValidation.valid && (
              <div className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400 font-bold max-w-full">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">{currentValidation.errors[0]}</span>
              </div>
            )}
          </div>

          {draft.step < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-4 sm:px-5 min-h-[44px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition active:scale-[0.97]"
              title="Ctrl+→"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={handleSave}
              loading={saveMutation.isPending}
              disabled={!canSave || !isOnline}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 min-h-[44px] shadow-lg shadow-blue-500/30"
              title="Ctrl+Enter"
            >
              {!isOnline ? <WifiOff className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isEdit
                  ? 'Save Changes'
                  : isAccessory
                  ? `Save (${stats.accessoryUnits} units)`
                  : `Save All (${stats.imeiCount} IMEIs)`}
              </span>
              <span className="sm:hidden">{isEdit ? 'Save' : 'Save All'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TYPE CARD — Phone ya Accessory
   ═════════════════════════════════════════════════════════════ */
function TypeCard({ active, onClick, icon: Icon, emoji, title, desc, tone }: {
  active: boolean; onClick: () => void; icon: any; emoji: string; title: string; desc: string; tone: 'blue' | 'violet';
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-2xl border-4 p-4 sm:p-5 transition-all active:scale-[0.98] ${
        active
          ? tone === 'blue'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-xl shadow-blue-500/20 ring-4 ring-blue-200 dark:ring-blue-500/30'
            : 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 shadow-xl shadow-violet-500/20 ring-4 ring-violet-200 dark:ring-violet-500/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {active && (
        <div className={`absolute -top-2 -right-2 h-7 w-7 rounded-full text-white flex items-center justify-center shadow-lg ${tone === 'blue' ? 'bg-blue-600' : 'bg-violet-600'}`}>
          <CheckCircle2 className="h-4 w-4" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
          active
            ? tone === 'blue' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800'
        }`}>
          {emoji}
        </div>
        <div className="min-w-0">
          <div className={`font-extrabold text-base sm:text-lg ${active ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
            {title}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">{desc}</div>
        </div>
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   WIZARD TEACHER — type-aware guide
   ═════════════════════════════════════════════════════════════ */
function WizardTeacher({ isAccessory, onClose }: { isAccessory: boolean; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> {isAccessory ? 'Accessory Guide' : 'Phone Wizard Guide'}
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            {isAccessory ? (
              <>Accessory ka matlab: <strong>charger, cover, handsfree, glass</strong> — in ka koi IMEI nahi hota,
              sirf <strong>quantity stock</strong> hota hai. 3 easy steps, draft auto-save.</>
            ) : (
              <>Phone wizard <strong>3 easy steps</strong> me poora product banata hai — phone + colors
              + IMEIs sab ek saath. <strong>Draft auto-save</strong> hota rehta hai —
              browser band bhi kar do tou kuch nahi khoega.</>
            )}
          </p>

          <div className="space-y-2">
            <StepCard
              num={1}
              title="Basic Info"
              desc={isAccessory
                ? 'Accessory ka naam (jaise "iPhone 15 Cover"), price, brand. Name + price zaroori.'
                : 'Phone ka naam, brand, model, prices. Name + prices zaroori — baqi optional.'}
              tip={isAccessory ? 'Barcode laga do tou POS scan se turant aayega' : 'Model number auto-SKU banata hai'}
            />
            <StepCard
              num={2}
              title="Variants"
              desc={isAccessory
                ? 'Colors ya sizes (Black/White cover) — OPTIONAL. Nahi chahiye tou skip karo, seedha Step 3.'
                : 'Colors aur storage combinations (Black 128GB). Matrix se ek click me saare combos.'}
              tip={isAccessory ? 'Simple item hai tou variants skip = kam clicks' : 'Accessory hai tou Phone/Accessory type upar se badlo'}
            />
            <StepCard
              num={3}
              title={isAccessory ? 'Stock Qty' : 'IMEIs'}
              desc={isAccessory
                ? 'Sirf quantity likho — kitne piece stock me hain. Bas, khatam!'
                : 'Har phone ka 15-digit IMEI daalo. Bulk paste supported — lines ya comma se separate.'}
              tip={isAccessory ? 'Baad mein purchase se stock aur barh sakta hai' : 'Box pe ya *#06# se IMEI mil jata hai'}
            />
          </div>

          {!isAccessory && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-3 text-xs font-semibold text-rose-900 dark:text-rose-200">
              🛡️ <strong>PTA zaroori hai:</strong> Pakistan me non-PTA phone bechna illegal hai.
              Default <strong>APPROVED</strong> rakhein — sirf tab change karein jab pakka pata ho.
              Non-approved phones POS me <strong>sell nahi</strong> honge.
            </div>
          )}

          {isAccessory && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/40 p-3 text-xs font-semibold text-violet-900 dark:text-violet-200">
              🎧 <strong>Accessory tips:</strong> Low-stock alert default 5 hai — stock kam ho to dashboard
              pe warning aa jayegi. Repair tickets me parts ke tor pe bhi yehi accessories use ho sakti hain.
            </div>
          )}

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-1">
              ⌨️ Shortcuts (desktop)
            </div>
            <KbdRow keys="Ctrl + →" desc="Next step" />
            <KbdRow keys="Ctrl + ←" desc="Back step" />
            <KbdRow keys="Ctrl + Enter" desc="Save (step 3 pe)" />
            <KbdRow keys="Esc" desc="Ye window band" />
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            📡 <strong>Offline?</strong> Form bharna chalu rakhein — draft safe rehta hai. Save ka button
            online hone pe hi kaam karega, aur save ke baad offline cache khud refresh ho jata hai.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Shuru Karein!
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepCard({ num, title, desc, tip }: { num: number; title: string; desc: string; tip: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-blue-100 dark:border-blue-500/25 bg-blue-50/50 dark:bg-blue-500/5 p-3">
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-lg shadow-blue-500/30">
        {num}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">{desc}</div>
        <div className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold mt-1 inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {tip}
        </div>
      </div>
    </div>
  );
}

function KbdRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-mono font-bold text-[10px] shadow-sm">
        {keys}
      </kbd>
      <span className="text-slate-600 dark:text-slate-300">{desc}</span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 text-center min-w-[62px]">
      <div className="text-lg sm:text-xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider font-extrabold text-white/60 mt-1">{label}</div>
    </div>
  );
}

function SuccessStat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-500/30 p-3">
      <Icon className="h-4 w-4 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 dark:text-blue-300">{label}</div>
      <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
