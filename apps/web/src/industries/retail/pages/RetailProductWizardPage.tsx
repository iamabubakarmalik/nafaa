import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, ShoppingBag,
  Plus, AlertTriangle, Trash2, Eye, Edit3, GraduationCap, X,
  Package, Layers, Keyboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useRetailWizard, type WizardStep } from '../hooks/useRetailWizard';
import { RetailWizardStepper } from '../components/wizard/RetailWizardStepper';
import { RetailWizardStep1Basic } from '../components/wizard/RetailWizardStep1Basic';
import { RetailWizardStep2MultiUnits } from '../components/wizard/RetailWizardStep2MultiUnits';
import { RetailWizardStep3Stock } from '../components/wizard/RetailWizardStep3Stock';
import { RetailWizardSummary } from '../components/wizard/RetailWizardSummary';
import { saveRetailWizard, type RetailWizardSaveResult } from '../api/retail-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL PRODUCT WIZARD — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — "Wizard kaise kaam karta hai" (3 steps)
   ⌨️  Ctrl+Enter = save (step 3) • Esc = teacher band
   📱 Mobile step dots (fixed bar mein) • 🌙 Dark mode perfect
   🎉 Success screen with next actions
   ═════════════════════════════════════════════════════════════ */

export default function RetailProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    setHasVariants, setHasMultiUnits, setTrackBatches,
    addUnit, updateUnit, removeUnit,
    addVariant, updateVariant, removeVariant,
    addBatch, updateBatch, removeBatch,
    updateStock,
    reset,
  } = useRetailWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<RetailWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      brandId: existingProduct.brandId ?? '',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      baseUnit: existingProduct.unit ?? 'pcs',
      costPrice: existingProduct.costPrice ?? 0,
      salePrice: existingProduct.price ?? 0,
      wholesalePrice: existingProduct.wholesalePrice ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
    });

    setEditLoaded(true);
  }, [isEdit, existingProduct, editLoaded, updateBasic]);

  const saveMutation = useMutation({
    mutationFn: () => {
      // On edit: if SKU/barcode unchanged from existing product, don't resend them
      // to avoid false "already exists" errors from unique constraint.
      let payload = draft;
      if (isEdit && existingProduct) {
        const same = (a?: string | null, b?: string | null) => (a ?? '') === (b ?? '');
        if (same(draft.basic.sku, existingProduct.sku) || same(draft.basic.barcode, existingProduct.barcode)) {
          payload = {
            ...draft,
            basic: {
              ...draft.basic,
              sku: same(draft.basic.sku, existingProduct.sku) ? '' : draft.basic.sku,
              barcode: same(draft.basic.barcode, existingProduct.barcode) ? '' : draft.basic.barcode,
            },
          };
        }
      }
      return saveRetailWizard(payload);
    },
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['product-units'] });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      forceRefreshProducts().catch(() => {});
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'} — ${result.unitCount} units, ${result.variantCount} variants`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save retail product'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  /* ─── Keyboard shortcuts ──────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) { setShowTeacher(false); return; }
      // Ctrl+Enter / Cmd+Enter = save on step 3
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && draft.step === 3 && canSave && !saveMutation.isPending) {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, draft.step, canSave, saveMutation.isPending]);

  /* ═══ LOADING (edit) ═══ */
  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-sky-200 dark:border-sky-500/30 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
      </div>
    );
  }

  /* ═══ SUCCESS SCREEN ═══ */
  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6 px-3">
        <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-2 border-sky-300 dark:border-sky-500/40 p-8 text-center shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-extrabold text-sky-900 dark:text-sky-200">
              🎉 Product {isEdit ? 'Updated' : 'Created'}!
            </h1>
            <p className="text-sky-800 dark:text-sky-300 font-semibold mt-1">
              <strong>{savedResult.productName}</strong> ready hai — POS pe abhi dikhega
            </p>

            <div className="grid grid-cols-4 gap-3 mt-6">
              <SuccessStat label="Units" value={savedResult.unitCount} />
              <SuccessStat label="Variants" value={savedResult.variantCount} />
              <SuccessStat label="Batches" value={savedResult.batchCount} />
              <SuccessStat label="Stock" value={savedResult.totalStock} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/retail-products/new');
            }}
            className="rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white p-5 flex flex-col items-center gap-2 shadow-lg shadow-sky-500/40 transition hover:-translate-y-0.5"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another Product</div>
            <div className="text-[10px] font-bold text-white/70">Agla product daalo</div>
          </button>
          <button
            onClick={() => navigate(`/retail-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500/50 hover:shadow-md p-5 flex flex-col items-center gap-2 transition hover:-translate-y-0.5"
          >
            <Eye className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <div className="font-extrabold text-slate-900 dark:text-white">View Product</div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Details dekho</div>
          </button>
          <button
            onClick={() => navigate('/products')}
            className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500/50 hover:shadow-md p-5 flex flex-col items-center gap-2 transition hover:-translate-y-0.5"
          >
            <ShoppingBag className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <div className="font-extrabold text-slate-900 dark:text-white">All Products</div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">List pe wapas</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* ═══ Draft restored banner ═══ */}
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-500/10 border-2 border-sky-200 dark:border-sky-500/40 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-sky-700 dark:text-sky-300 shrink-0" />
          <div className="text-xs text-sky-900 dark:text-sky-200 font-semibold flex-1 min-w-0">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button
            onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200 dark:border-rose-500/40 transition"
          >
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {/* ═══ Edit mode banner ═══ */}
      {isEdit && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 flex-1">
            <div className="font-extrabold mb-0.5">Edit Mode</div>
            <div className="font-semibold">
              Basic info edit ho sakta hai. Multi-units, variants, batches add karenge to merge honge.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Top bar ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/retail-products/${id}` : '/retail/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Dashboard'}
        </button>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Editing Retail Product' : 'Retail Product Wizard'}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Retail Product'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-xl">
              3 easy steps — Multi-unit pricing, variants, batches sab ek page mein
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Kaise Kaam Karta Hai?</span>
              <span className="sm:hidden">?</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <WizardTeacher isEdit={isEdit} onClose={() => setShowTeacher(false)} />
      )}

      {/* ═══ STEPPER ═══ */}
      <RetailWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
        }}
      />

      {/* ═══ CONTENT + SUMMARY ═══ */}
      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <RetailWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <RetailWizardStep2MultiUnits
              basic={draft.basic}
              hasMultiUnits={draft.hasMultiUnits}
              onToggleMultiUnits={setHasMultiUnits}
              units={draft.units}
              onAddUnit={addUnit}
              onUpdateUnit={updateUnit}
              onRemoveUnit={removeUnit}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <RetailWizardStep3Stock
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              onToggleVariants={setHasVariants}
              trackBatches={draft.trackBatches}
              onToggleBatches={setTrackBatches}
              variants={draft.variants}
              batches={draft.batches}
              stock={draft.stock}
              onAddVariant={addVariant}
              onUpdateVariant={updateVariant}
              onRemoveVariant={removeVariant}
              onAddBatch={addBatch}
              onUpdateBatch={updateBatch}
              onRemoveBatch={removeBatch}
              onUpdateStock={updateStock}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <RetailWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      {/* ═══ FIXED BOTTOM BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={prevStep}
            disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-extrabold transition disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </button>

          {/* Step dots (mobile) + error (desktop) */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:hidden">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={[
                    'h-2 rounded-full transition-all',
                    draft.step === s ? 'w-6 bg-sky-600' : draft.step > s ? 'w-2 bg-emerald-500' : 'w-2 bg-slate-300 dark:bg-slate-600',
                  ].join(' ')}
                />
              ))}
            </div>
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 hidden sm:block truncate">
              Step {draft.step} of 3
              {!currentValidation.valid && (
                <span className="ml-2 inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-3 w-3" />
                  {currentValidation.errors[0]}
                </span>
              )}
              {draft.step === 3 && canSave && (
                <span className="ml-2 text-slate-400 dark:text-slate-500 font-bold">
                  <Keyboard className="h-3 w-3 inline" /> Ctrl+Enter = save
                </span>
              )}
            </div>
          </div>

          {draft.step < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white text-sm font-extrabold shadow-md shadow-sky-500/40 disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-sky-500/40"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Everything (${stats.totalStock} ${draft.basic.baseUnit || 'units'})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   WIZARD TEACHER — "Wizard kaise kaam karta hai"
   ═════════════════════════════════════════════════════════════ */
function WizardTeacher({ isEdit, onClose }: { isEdit: boolean; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Product Wizard Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye wizard <strong>3 easy steps</strong> mein product banata hai. Har step ke saath
            <strong> right side pe live summary</strong> dikhti hai — naam, rate, stock, faida sab ek nazar mein.
          </p>

          {/* 3 steps visual */}
          <div className="space-y-2">
            <TeacherRow
              n={1} icon={Package} tone="sky"
              title="Basic Info" desc="Naam + bikri rate likho (bas ye 2 zaroori!)"
              chips={['⚡ Auto SKU', '📷 Barcode scan', '💰 Profit calculator']}
            />
            <TeacherRow
              n={2} icon={Layers} tone="violet"
              title="Multi-Units" desc={'Dozen/carton ka alag rate — zyadatar ko "Nahi" kaafi'}
              chips={['🥚 1-click presets', '🏷️ Bulk discount']}
            />
            <TeacherRow
              n={3} icon={ShoppingBag} tone="emerald"
              title="Stock Entry" desc="Kitna maal hai? Simple ginti, variants, ya expiry batches"
              chips={['⚡ +10/+50 quick', '📅 Expiry warnings']}
            />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>💾 Draft khud save hota hai</strong> — page band ho jaye to wapas aake wahin se shuru</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Kharid rate</strong> likho to faida % khud nikal aayega — nuqsaan pe red warning</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Step 3 pe <strong>Ctrl+Enter</strong> = instant save</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Sau se zyada products hain? <strong>Bulk Import</strong> (Excel) zyada fast hai</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-sky-500/40 h-12"
            onClick={onClose}
          >
            <Sparkles className="h-4 w-4" />
            {isEdit ? 'Samajh Gaya — Edit Karo!' : 'Samajh Gaya — Product Banao!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeacherRow({ n, icon: Icon, tone, title, desc, chips }: {
  n: number; icon: any; tone: string; title: string; desc: string; chips: string[];
}) {
  const tones: Record<string, string> = {
    sky: 'from-sky-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-600',
  };
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
          <span className="text-slate-400 dark:text-slate-500">Step {n}:</span> {title}
        </div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {chips.map((c) => (
            <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-extrabold text-slate-600 dark:text-slate-300">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-800/80 border-2 border-sky-200 dark:border-sky-500/30 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-700 dark:text-sky-400">{label}</div>
      <div className="text-2xl font-extrabold text-sky-900 dark:text-sky-200 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
