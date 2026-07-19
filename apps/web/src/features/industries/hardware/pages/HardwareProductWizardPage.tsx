import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Package,
  Plus, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useHardwareWizard, type WizardStep } from '../hooks/useHardwareWizard';
import { HardwareWizardStepper } from '../components/wizard/HardwareWizardStepper';
import { HardwareWizardStep1Basic } from '../components/wizard/HardwareWizardStep1Basic';
import { HardwareWizardStep2Specs } from '../components/wizard/HardwareWizardStep2Specs';
import { HardwareWizardStep3BulkReorder } from '../components/wizard/HardwareWizardStep3BulkReorder';
import { HardwareWizardSummary } from '../components/wizard/HardwareWizardSummary';
import { saveHardwareWizard, type HardwareWizardSaveResult } from '../api/hardware-wizard.api';
import { productsApi } from '@/api/products.api';
import { forceRefreshProducts } from '@/lib/offline/offlineProducts';

export default function HardwareProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateSpecs,
    addBulkTier, updateBulkTier, removeBulkTier,
    updateReorder,
    toggleTag,
    reset,
  } = useHardwareWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<HardwareWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

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
      unit: existingProduct.unit ?? 'pcs',
      costPrice: existingProduct.costPrice ?? 0,
      salePrice: existingProduct.price ?? 0,
      wholesalePrice: existingProduct.wholesalePrice ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      initialStock: existingProduct.stock ?? 0,
      lowStockAlert: existingProduct.lowStockAlert ?? 10,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
    });

    setEditLoaded(true);
  }, [isEdit, existingProduct, editLoaded, updateBasic]);

  const saveMutation = useMutation({
    mutationFn: () => saveHardwareWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['hardware-products'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['reorder-rules'] });
      forceRefreshProducts().catch(() => {});
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'} — ${result.bulkTierCount} tiers`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save hardware product'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-amber-900">
            Product {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-amber-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> ready hai
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Bulk Tiers" value={savedResult.bulkTierCount} />
            <SuccessStat label="Reorder" value={savedResult.hasReorderRule ? '✓' : '—'} />
            <SuccessStat label="Stock" value={savedResult.initialStock} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/hardware-products/new');
            }}
            className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
          </button>
          <button
            onClick={() => navigate(`/hardware-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-amber-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
          </button>
          <button
            onClick={() => navigate('/hardware/products')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Package className="h-6 w-6 text-amber-600" />
            <div className="font-extrabold text-slate-900">All Products</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-amber-700" />
          <div className="text-xs text-amber-900 flex-1 min-w-0">
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
              Basic info edit ho sakta hai. Bulk tiers aur reorder rules add karenge to merge honge.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/hardware-products/${id}` : '/hardware/products')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Products'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Package className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Hardware Product' : 'Hardware Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Hardware Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Cement, steel, tiles — sab specs ke saath. Bulk tier pricing built-in.
          </p>
        </div>
      </section>

      <HardwareWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <HardwareWizardStep1Basic
              basic={draft.basic}
              onChange={updateBasic}
              onToggleTag={toggleTag}
              errors={validation.step1.errors}
            />
          )}
          {draft.step === 2 && (
            <HardwareWizardStep2Specs
              categoryType={draft.basic.categoryType}
              specs={draft.specs}
              onChange={updateSpecs}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <HardwareWizardStep3BulkReorder
              basePrice={Number(draft.basic.salePrice || 0)}
              unit={draft.basic.unit}
              bulkTiers={draft.bulkTiers}
              onAddTier={addBulkTier}
              onUpdateTier={updateBulkTier}
              onRemoveTier={removeBulkTier}
              reorder={draft.reorder}
              onUpdateReorder={updateReorder}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <HardwareWizardSummary draft={draft} stats={stats} allValid={canSave} />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-amber-600 to-orange-700"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Save Hardware Product'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-amber-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">{label}</div>
      <div className="text-2xl font-extrabold text-amber-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
