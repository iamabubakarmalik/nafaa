import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Footprints,
  Plus, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useShoeWizard, type WizardStep } from '../hooks/useShoeWizard';
import { ShoeWizardStepper } from '../components/wizard/ShoeWizardStepper';
import { ShoeWizardStep1Basic } from '../components/wizard/ShoeWizardStep1Basic';
import { ShoeWizardStep2Materials } from '../components/wizard/ShoeWizardStep2Materials';
import { ShoeWizardStep3Sizing } from '../components/wizard/ShoeWizardStep3Sizing';
import { ShoeWizardStep4FeaturesPricing } from '../components/wizard/ShoeWizardStep4FeaturesPricing';
import { ShoeWizardStep5SizeGrid } from '../components/wizard/ShoeWizardStep5SizeGrid';
import { ShoeWizardSummary } from '../components/wizard/ShoeWizardSummary';
import { saveShoeWizard, type ShoeWizardSaveResult } from '../api/shoe-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { shoeProductsApi } from '../api/products.api';
import { shoeSizeVariantsApi } from '../api/size-variants.api';

export default function ShoeProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateMaterials, updateSizing, updateFeatures, updateWarranty, updatePricing,
    addSizeVariant, addSizeVariantsBulk, updateSizeVariant, removeSizeVariant,
    reset,
  } = useShoeWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<ShoeWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-shoe-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });
  const { data: existingProfile } = useQuery({
    queryKey: ['shoe-profile-for-wizard', id],
    queryFn: () => shoeProductsApi.byProduct(id!),
    enabled: isEdit,
  });
  const { data: existingVariants = [] } = useQuery({
    queryKey: ['shoe-variants-for-wizard', id],
    queryFn: () => shoeSizeVariantsApi.byProduct(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      brandId: existingProfile?.brandId ?? '',
      categoryType: existingProfile?.categoryType ?? 'MEN_CASUAL',
      gender: existingProfile?.gender ?? 'MEN',
      ageGroup: existingProfile?.ageGroup ?? '',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      modelName: existingProfile?.modelName ?? '',
      modelCode: existingProfile?.modelCode ?? '',
      collection: existingProfile?.collection ?? '',
      season: existingProfile?.season ?? '',
      colorName: existingProfile?.colorName ?? '',
      colorHex: existingProfile?.colorHex ?? '',
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      isBestSeller: existingProfile?.isBestSeller ?? false,
      isNewArrival: existingProfile?.isNewArrival ?? false,
      isTrending: existingProfile?.isTrending ?? false,
      isBridal: existingProfile?.isBridal ?? false,
      isEidSpecial: existingProfile?.isEidSpecial ?? false,
      imageUrls: (existingProduct.images ?? []).map((i: any) => i?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
      notes: existingProfile?.notes ?? '',
    });

    if (existingProfile) {
      updateMaterials({
        upperMaterial: existingProfile.upperMaterial ?? '',
        soleMaterial: existingProfile.soleMaterial ?? '',
        innerMaterial: existingProfile.innerMaterial ?? '',
        liningMaterial: existingProfile.liningMaterial ?? '',
        patternType: existingProfile.patternType ?? '',
        closureType: existingProfile.closureType ?? '',
        toeShape: existingProfile.toeShape ?? '',
        heelHeight: existingProfile.heelHeight ?? '',
        heelType: existingProfile.heelType ?? '',
        soleType: existingProfile.soleType ?? '',
      });

      updateSizing({
        sizeSystem: existingProfile.sizeSystem ?? 'UK',
        width: existingProfile.width ?? 'REGULAR',
        runsLarge: existingProfile.runsLarge ?? false,
        runsSmall: existingProfile.runsSmall ?? false,
        sizingNotes: existingProfile.sizingNotes ?? '',
      });

      updateFeatures({
        isWaterproof: existingProfile.isWaterproof ?? false,
        isBreathable: existingProfile.isBreathable ?? false,
        hasAirCushion: existingProfile.hasAirCushion ?? false,
        hasArchSupport: existingProfile.hasArchSupport ?? false,
        isOrthopedic: existingProfile.isOrthopedic ?? false,
        isVegan: existingProfile.isVegan ?? false,
        isHandmade: existingProfile.isHandmade ?? false,
        sport: existingProfile.sport ?? '',
        playingSurface: existingProfile.playingSurface ?? [],
      });

      updateWarranty({
        warrantyMonths: existingProfile.warrantyMonths ?? '',
        warrantyDetails: existingProfile.warrantyDetails ?? '',
        careInstructions: existingProfile.careInstructions ?? '',
        cleaningRecommendation: existingProfile.cleaningRecommendation ?? '',
        includesBox: existingProfile.includesBox ?? true,
        includesDustBag: existingProfile.includesDustBag ?? false,
        includesExtraLaces: existingProfile.includesExtraLaces ?? false,
        boxColor: existingProfile.boxColor ?? '',
      });

      updatePricing({
        costPrice: existingProduct.costPrice ?? '',
        retailPrice: existingProduct.price ?? '',
        wholesalePrice: existingProduct.wholesalePrice ?? '',
        memberPrice: existingProfile.memberPrice ?? '',
        mrp: existingProfile.mrp ?? '',
        taxRate: existingProduct.taxRate ?? '',
      });
    }

    if (existingVariants && (existingVariants as any[]).length > 0) {
      (existingVariants as any[]).forEach((v) => {
        addSizeVariant({
          size: v.size,
          sku: v.sku,
          barcode: v.barcode,
          boxNumber: v.boxNumber,
          shelfLocation: v.shelfLocation,
          stock: v.stock,
          lowStockAlert: v.lowStockAlert,
          priceOverride: v.priceOverride,
          costOverride: v.costOverride,
        });
      });
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingProfile, existingVariants, editLoaded, updateBasic, updateMaterials, updateSizing, updateFeatures, updateWarranty, updatePricing, addSizeVariant]);

  const saveMutation = useMutation({
    mutationFn: () => saveShoeWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['shoe-products-list'] });
      queryClient.invalidateQueries({ queryKey: ['shoe-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 :
    draft.step === 3 ? validation.step3 :
    draft.step === 4 ? validation.step4 : validation.step5;

  const canGoNext = currentValidation.valid && draft.step < 5;
  const canSave = validation.allValid;

  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-900">
            Product {isEdit ? 'Updated' : 'Created'}
          </h1>
          <p className="text-orange-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> is live in your catalogue
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Profile" value={savedResult.profileCreated ? '✓' : '—'} />
            <SuccessStat label="Sizes" value={savedResult.sizeVariantsCreated} />
            <SuccessStat label="Total Pairs" value={savedResult.totalStock} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => { setSavedResult(null); reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); if (isEdit) navigate('/shoe-products/new'); }}
            className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition">
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
          </button>
          <button onClick={() => navigate(`/shoe-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Eye className="h-6 w-6 text-orange-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
          </button>
          <button onClick={() => navigate('/shoe-products')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Footprints className="h-6 w-6 text-orange-600" />
            <div className="font-extrabold text-slate-900">All Products</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-orange-700" />
          <div className="text-xs text-orange-900 flex-1 min-w-0">
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
            <div className="font-semibold">Basic info, materials, sizing, features can be edited. New sizes will be added on save.</div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(isEdit ? `/shoe-products/${id}` : '/shoe/dashboard')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Dashboard'}
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Footprints className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Shoe Product' : 'Shoe Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Shoe Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Men's, women's, kids' & sports shoes — with every size + box location tracked.
          </p>
        </div>
      </section>

      <ShoeWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
          else if (s === 4 && validation.step1.valid && validation.step2.valid && validation.step3.valid) goToStep(s as WizardStep);
          else if (s === 5 && validation.step1.valid && validation.step2.valid && validation.step3.valid && validation.step4.valid) goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <ShoeWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <ShoeWizardStep2Materials materials={draft.materials} onChange={updateMaterials} errors={validation.step2.errors} />
          )}
          {draft.step === 3 && (
            <ShoeWizardStep3Sizing sizing={draft.sizing} onChange={updateSizing} errors={validation.step3.errors} />
          )}
          {draft.step === 4 && (
            <ShoeWizardStep4FeaturesPricing
              features={draft.features} warranty={draft.warranty} pricing={draft.pricing}
              categoryType={draft.basic.categoryType}
              onChangeFeatures={updateFeatures}
              onChangeWarranty={updateWarranty}
              onChangePricing={updatePricing}
              errors={validation.step4.errors} />
          )}
          {draft.step === 5 && (
            <ShoeWizardStep5SizeGrid
              basic={draft.basic}
              sizing={draft.sizing}
              retailPrice={Number(draft.pricing.retailPrice || 0)}
              variants={draft.sizeVariants}
              onAdd={addSizeVariant}
              onAddBulk={addSizeVariantsBulk}
              onUpdate={updateSizeVariant}
              onRemove={removeSizeVariant}
              errors={validation.step5.errors} />
          )}
        </div>

        <ShoeWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button onClick={prevStep} disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            Step {draft.step} of 5
            {!currentValidation.valid && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3 w-3" /> {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 5 ? (
            <button onClick={nextStep} disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}
              disabled={!canSave} className="bg-gradient-to-r from-orange-600 to-amber-700">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Product (${stats.totalStock} pairs)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-orange-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700">{label}</div>
      <div className="text-2xl font-extrabold text-orange-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
