import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Flower2,
  Plus, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useFloristWizard, type WizardStep } from '../hooks/useFloristWizard';
import { FloristWizardStepper } from '../components/wizard/FloristWizardStepper';
import { FloristWizardStep1Basic } from '../components/wizard/FloristWizardStep1Basic';
import { FloristWizardStep2Details } from '../components/wizard/FloristWizardStep2Details';
import { FloristWizardStep3Occasions } from '../components/wizard/FloristWizardStep3Occasions';
import { FloristWizardStep4Stock } from '../components/wizard/FloristWizardStep4Stock';
import { FloristWizardSummary } from '../components/wizard/FloristWizardSummary';
import { saveFloristWizard, type FloristWizardSaveResult } from '../api/florist-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { floristProductsApi } from '../api/products.api';

export default function FloristProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateDetails, updateOccasions,
    setHasVariants, addVariant, updateVariant, removeVariant,
    updateStock, reset,
  } = useFloristWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<FloristWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-florist-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });
  const { data: existingProfile } = useQuery({
    queryKey: ['florist-profile-for-wizard', id],
    queryFn: () => floristProductsApi.byProduct(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      categoryType: existingProfile?.categoryType ?? 'BOUQUET',
      freshnessGrade: existingProfile?.freshnessGrade ?? 'PREMIUM_A',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      unit: existingProduct.unit ?? 'pcs',
      costPrice: existingProduct.costPrice ?? 0,
      retailPrice: existingProduct.price ?? 0,
      wholesalePrice: existingProfile?.wholesalePrice ?? '',
      weddingPrice: existingProfile?.weddingPrice ?? '',
      mrp: existingProfile?.mrp ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      isBestSeller: existingProfile?.isBestSeller ?? false,
      isSeasonalSpecial: existingProfile?.isSeasonalSpecial ?? false,
      imageUrls: (existingProduct.images ?? []).map((i: any) => i?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
      notes: existingProfile?.notes ?? '',
    });

    if (existingProfile) {
      updateDetails({
        flowerType: existingProfile.flowerType ?? '',
        color: existingProfile.color ?? '',
        colorHex: existingProfile.colorHex ?? '',
        stemLengthCm: existingProfile.stemLengthCm ?? '',
        isImported: existingProfile.isImported ?? false,
        origin: existingProfile.origin ?? '',
        season: existingProfile.season ?? [],
        arrivalDate: existingProfile.arrivalDate ? existingProfile.arrivalDate.slice(0, 10) : '',
        freshUntil: existingProfile.freshUntil ? existingProfile.freshUntil.slice(0, 10) : '',
        daysToWither: existingProfile.daysToWither ?? 5,
        isPreArranged: existingProfile.isPreArranged ?? true,
        bouquetSize: existingProfile.bouquetSize ?? '',
        stemCount: existingProfile.stemCount ?? '',
        wrapType: existingProfile.wrapType ?? '',
        ribbonColor: existingProfile.ribbonColor ?? '',
        hasVase: existingProfile.hasVase ?? false,
      });
      updateOccasions({
        occasions: existingProfile.occasions ?? [],
        meaning: existingProfile.meaning ?? '',
        careInstructions: existingProfile.careInstructions ?? '',
        isCustomizable: existingProfile.isCustomizable ?? false,
        customizationOptions: existingProfile.customizationOptions ?? [],
        minLeadTimeHours: existingProfile.minLeadTimeHours ?? 2,
      });
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingProfile, editLoaded, updateBasic, updateDetails, updateOccasions]);

  const saveMutation = useMutation({
    mutationFn: () => saveFloristWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['florist-products-list'] });
      queryClient.invalidateQueries({ queryKey: ['florist-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 :
    draft.step === 3 ? validation.step3 : validation.step4;

  const canGoNext = currentValidation.valid && draft.step < 4;
  const canSave = validation.allValid;

  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-pink-900">
            Product {isEdit ? 'Updated' : 'Created'}
          </h1>
          <p className="text-pink-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> is live in your catalogue
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Profile" value={savedResult.profileCreated ? '✓' : '—'} />
            <SuccessStat label="Variants" value={savedResult.variantCount} />
            <SuccessStat label="Stock" value={savedResult.totalStock} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => { setSavedResult(null); reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); if (isEdit) navigate('/florist-products/new'); }}
            className="rounded-2xl bg-pink-600 hover:bg-pink-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition">
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
          </button>
          <button onClick={() => navigate(`/florist-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Eye className="h-6 w-6 text-pink-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
          </button>
          <button onClick={() => navigate('/florist-products')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Flower2 className="h-6 w-6 text-pink-600" />
            <div className="font-extrabold text-slate-900">All Products</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-pink-700" />
          <div className="text-xs text-pink-900 flex-1 min-w-0">
            <strong>Draft restored</strong> — your previous entries were loaded
          </div>
          <button onClick={() => { if (confirm('Discard the draft and start fresh?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200">
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-extrabold mb-0.5">Edit mode</div>
            <div className="font-semibold">Basic info, flower details and occasion tags can be edited. New variants will be added on save.</div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(isEdit ? `/florist-products/${id}` : '/florist/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Dashboard'}
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Flower2 className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Florist Product' : 'Florist Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Florist Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Bouquets, stems, plants and gifts — with freshness tracking and occasion tags.
          </p>
        </div>
      </section>

      <FloristWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
          else if (s === 4 && validation.step1.valid && validation.step2.valid && validation.step3.valid) goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <FloristWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <FloristWizardStep2Details details={draft.details} onChange={updateDetails}
              categoryType={draft.basic.categoryType} errors={validation.step2.errors} />
          )}
          {draft.step === 3 && (
            <FloristWizardStep3Occasions occasions={draft.occasions} onChange={updateOccasions}
              errors={validation.step3.errors} />
          )}
          {draft.step === 4 && (
            <FloristWizardStep4Stock
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              onToggleVariants={setHasVariants}
              variants={draft.variants}
              stock={draft.stock}
              onAddVariant={addVariant}
              onUpdateVariant={updateVariant}
              onRemoveVariant={removeVariant}
              onUpdateStock={updateStock}
              errors={validation.step4.errors}
            />
          )}
        </div>

        <FloristWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button onClick={prevStep} disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            Step {draft.step} of 4
            {!currentValidation.valid && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3 w-3" /> {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 4 ? (
            <button onClick={nextStep} disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}
              disabled={!canSave} className="bg-gradient-to-r from-pink-500 to-rose-600">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Product (${stats.totalStock} ${draft.basic.unit})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-pink-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">{label}</div>
      <div className="text-2xl font-extrabold text-pink-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
