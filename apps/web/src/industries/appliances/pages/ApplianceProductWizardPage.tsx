import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Home,
  Plus, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useApplianceWizard, type WizardStep } from '../hooks/useApplianceWizard';
import { ApplianceWizardStepper } from '../components/wizard/ApplianceWizardStepper';
import { ApplianceWizardStep1Basic } from '../components/wizard/ApplianceWizardStep1Basic';
import { ApplianceWizardStep2Specs } from '../components/wizard/ApplianceWizardStep2Specs';
import { ApplianceWizardStep3Warranty } from '../components/wizard/ApplianceWizardStep3Warranty';
import { ApplianceWizardStep4Stock } from '../components/wizard/ApplianceWizardStep4Stock';
import { ApplianceWizardSummary } from '../components/wizard/ApplianceWizardSummary';
import { saveApplianceWizard, type ApplianceWizardSaveResult } from '../api/appliances-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { applianceProductsApi } from '../api/products.api';

export default function ApplianceProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateSpecs, updateWarranty, updateInstallation,
    setHasVariants, setHasSerials,
    addVariant, updateVariant, removeVariant,
    addSerial, addSerialsBulk, updateSerial, removeSerial,
    updateStock,
    reset,
  } = useApplianceWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<ApplianceWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['appliance-profile-for-wizard', id],
    queryFn: () => applianceProductsApi.byProduct(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      applianceBrandId: existingProfile?.brandId ?? '',
      categoryType: existingProfile?.categoryType ?? 'REFRIGERATOR',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      modelNumber: existingProfile?.modelNumber ?? '',
      modelYear: existingProfile?.modelYear ?? 2026,
      colorName: existingProfile?.colorName ?? '',
      colorHex: existingProfile?.colorHex ?? '',
      costPrice: existingProduct.costPrice ?? 0,
      retailPrice: existingProduct.price ?? 0,
      wholesalePrice: existingProduct.wholesalePrice ?? '',
      mrp: existingProfile?.mrp ?? '',
      emiStartingFrom: existingProfile?.emiStartingFrom ?? '',
      cashDiscount: existingProfile?.cashDiscount ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      isBestSeller: existingProfile?.isBestSeller ?? false,
      isNewArrival: existingProfile?.isNewArrival ?? false,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
    });

    if (existingProfile) {
      updateSpecs({
        capacity: existingProfile.capacity ?? '',
        powerConsumption: existingProfile.powerConsumption ?? '',
        voltage: existingProfile.voltage ?? '220V',
        frequency: existingProfile.frequency ?? '50Hz',
        weightKg: existingProfile.weightKg ?? '',
        dimensions: existingProfile.dimensions ?? '',
        energyRating: existingProfile.energyRating ?? 'NOT_RATED',
        isEnergyStar: existingProfile.isEnergyStar ?? false,
        isInverter: existingProfile.isInverter ?? false,
        acTonnage: existingProfile.acTonnage ?? '',
        acType: existingProfile.acType ?? '',
        coolingCapacity: existingProfile.coolingCapacity ?? '',
        refrigerantType: existingProfile.refrigerantType ?? '',
        fridgeCapacityLiters: existingProfile.fridgeCapacityLiters ?? '',
        refrigeratorType: existingProfile.refrigeratorType ?? '',
        doorCount: existingProfile.doorCount ?? '',
        compressorType: existingProfile.compressorType ?? '',
        washingCapacityKg: existingProfile.washingCapacityKg ?? '',
        washingType: existingProfile.washingType ?? '',
        rpm: existingProfile.rpm ?? '',
        screenSizeInch: existingProfile.screenSizeInch ?? '',
        displayType: existingProfile.displayType ?? '',
        resolution: existingProfile.resolution ?? '',
        smartOS: existingProfile.smartOS ?? '',
        features: existingProfile.features ?? [],
        smartFeatures: existingProfile.smartFeatures ?? [],
        safetyFeatures: existingProfile.safetyFeatures ?? [],
      });

      updateWarranty({
        warrantyMonths: existingProfile.warrantyMonths ?? 12,
        compressorWarrantyMonths: existingProfile.compressorWarrantyMonths ?? '',
        motorWarrantyMonths: existingProfile.motorWarrantyMonths ?? '',
        warrantyType: existingProfile.warrantyType ?? 'Manufacturer',
        warrantyStartDate: '',
        warrantyEndDate: '',
        boxContents: existingProfile.boxContents ?? [],
      });

      updateInstallation({
        requiresInstallation: existingProfile.requiresInstallation ?? true,
        installationCharge: existingProfile.installationCharge ?? '',
        installationCovered: existingProfile.installationCovered ?? false,
        installationTimeHours: existingProfile.installationTimeHours ?? '',
        requiresPlumbing: existingProfile.requiresPlumbing ?? false,
        requiresGasConnection: existingProfile.requiresGasConnection ?? false,
        requiresElectrician: existingProfile.requiresElectrician ?? true,
        requiresLargeVehicle: existingProfile.requiresLargeVehicle ?? false,
        freeDelivery: existingProfile.freeDelivery ?? false,
        deliveryChargePerKm: existingProfile.deliveryChargePerKm ?? '',
      });
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingProfile, editLoaded, updateBasic, updateSpecs, updateWarranty, updateInstallation]);

  const saveMutation = useMutation({
    mutationFn: () => saveApplianceWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['appliances-products-list'] });
      queryClient.invalidateQueries({ queryKey: ['appliance-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}!`);
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
        <div className="h-12 w-12 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-cyan-900">
            Product {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-cyan-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> ready hai
          </p>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <SuccessStat label="Profile" value={savedResult.profileCreated ? '✓' : '—'} />
            <SuccessStat label="Variants" value={savedResult.variantCount} />
            <SuccessStat label="Serials" value={savedResult.serialsCreated} />
            <SuccessStat label="Stock" value={savedResult.totalStock} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => { setSavedResult(null); reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); if (isEdit) navigate('/appliance-products/new'); }}
            className="rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition">
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
          </button>
          <button onClick={() => navigate(`/appliance-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Eye className="h-6 w-6 text-cyan-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
          </button>
          <button onClick={() => navigate('/appliance-products')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Home className="h-6 w-6 text-cyan-600" />
            <div className="font-extrabold text-slate-900">All Products</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-cyan-50 border-2 border-cyan-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-cyan-700" />
          <div className="text-xs text-cyan-900 flex-1 min-w-0">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200">
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-extrabold mb-0.5">Edit Mode</div>
            <div className="font-semibold">Basic info + specs + warranty edit ho sakti hain. Serials aur variants add karenge to merge honge.</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate(isEdit ? `/appliance-products/${id}` : '/appliances/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold transition">
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Product' : 'Back to Dashboard'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Home className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Appliance' : 'Appliance Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Appliance'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Full details, specs, warranty, installation requirements — sab ek page mein.
          </p>
        </div>
      </section>

      <ApplianceWizardStepper
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
            <ApplianceWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <ApplianceWizardStep2Specs specs={draft.specs} onChange={updateSpecs}
              categoryType={draft.basic.categoryType} errors={validation.step2.errors} />
          )}
          {draft.step === 3 && (
            <ApplianceWizardStep3Warranty warranty={draft.warranty} installation={draft.installation}
              onChangeWarranty={updateWarranty} onChangeInstallation={updateInstallation}
              errors={validation.step3.errors} />
          )}
          {draft.step === 4 && (
            <ApplianceWizardStep4Stock
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              onToggleVariants={setHasVariants}
              hasSerials={draft.hasSerials}
              onToggleSerials={setHasSerials}
              variants={draft.variants}
              serials={draft.serials}
              stock={draft.stock}
              onAddVariant={addVariant}
              onUpdateVariant={updateVariant}
              onRemoveVariant={removeVariant}
              onAddSerial={addSerial}
              onAddSerialsBulk={addSerialsBulk}
              onUpdateSerial={updateSerial}
              onRemoveSerial={removeSerial}
              onUpdateStock={updateStock}
              errors={validation.step4.errors}
            />
          )}
        </div>

        <ApplianceWizardSummary draft={draft} stats={stats} allValid={canSave} />
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
                <AlertTriangle className="h-3 w-3" />
                {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 4 ? (
            <button onClick={nextStep} disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}
              disabled={!canSave} className="bg-gradient-to-r from-cyan-600 to-teal-700">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Product (${stats.totalStock} pcs)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-cyan-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">{label}</div>
      <div className="text-2xl font-extrabold text-cyan-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
