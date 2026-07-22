import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Smartphone,
  Plus, ExternalLink, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useMobileWizard, type WizardStep } from '../hooks/useMobileWizard';
import { MobileWizardStepper } from '../components/wizard/MobileWizardStepper';
import { MobileWizardStep1Basic } from '../components/wizard/MobileWizardStep1Basic';
import { MobileWizardStep2Variants } from '../components/wizard/MobileWizardStep2Variants';
import { MobileWizardStep3Imeis } from '../components/wizard/MobileWizardStep3Imeis';
import { MobileWizardSummary } from '../components/wizard/MobileWizardSummary';
import { saveMobileWizard, type MobileWizardSaveResult } from '../api/mobile-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

export default function MobileProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

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

  // ─── EDIT MODE — load existing product into wizard ───
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
      productType: 'PHONE',
    });

    if (existingVariants.length > 0) {
      setHasVariants(true);
      // Note: variants are loaded but wizard treats them as new drafts.
      // Real edit-mode variant sync would require API changes.
      // For now, edit mode is best used for basic info changes.
    } else {
      setHasVariants(false);
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingVariants, editLoaded, updateBasic, setHasVariants]);

  const saveMutation = useMutation({
    mutationFn: () => saveMobileWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['imei-available'] });
      queryClient.invalidateQueries({ queryKey: ['imei-product-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-stats'] });
      queryClient.invalidateQueries({ queryKey: ['product-imeis'] });
      forceRefreshProducts().catch(() => {});
      toast.success(
        `${result.productName} ${isEdit ? 'updated' : 'created'} — ${result.variantCount} variants, ${result.imeiCount} IMEIs`,
      );
      if (!isEdit) reset();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to save mobile product');
    },
  });

  const currentValidation =
    draft.step === 1 ? validation.step1
    : draft.step === 2 ? validation.step2
    : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  // Show loading while loading existing product in edit mode
  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  // SUCCESS SCREEN
  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-blue-900">
            Product {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-blue-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> aur uski poori inventory ready hai
          </p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Variants" value={savedResult.variantCount} />
            <SuccessStat label="IMEIs" value={savedResult.imeiCount} />
            <SuccessStat label="Accessories" value={savedResult.accessoryUnits} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/mobile-products/new');
            }}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another Product</div>
            <div className="text-xs opacity-90 font-semibold">Wizard reset ho jayega</div>
          </button>
          <button
            onClick={() => navigate(`/mobile-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-blue-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
            <div className="text-xs text-slate-500 font-semibold">Full detail page</div>
          </button>
          <button
            onClick={() => navigate('/imei-inventory')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div className="font-extrabold text-slate-900">All IMEIs</div>
            <div className="text-xs text-slate-500 font-semibold">IMEI inventory</div>
          </button>
        </div>
      </div>
    );
  }

  // WIZARD
  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-blue-700" />
          <div className="text-xs text-blue-900 flex-1 min-w-0">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button
            onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200"
          >
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-extrabold mb-0.5">Edit Mode</div>
            <div className="font-semibold">
              Basic info edit kar sakte hain. New variants + IMEIs add karenge tou existing ke saath merge honge (duplicates skip).
              Sirf variants / IMEIs delete karne ke liye <a href={`/mobile-products/${id}`} className="underline">detail page</a> use karein.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/mobile-products/${id}` : '/imei-inventory')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to IMEI Inventory'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Smartphone className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Mobile Product' : 'Mobile Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Mobile Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Ek page mein — product, colors, storage aur IMEIs sab. PTA compliance built-in.
          </p>
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

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
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

        <MobileWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={prevStep}
            disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            Step {draft.step} of 3
            {!currentValidation.valid && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-blue-600 to-indigo-700"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Everything (${stats.imeiCount} IMEIs, ${stats.accessoryUnits} accessories)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-blue-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">{label}</div>
      <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
