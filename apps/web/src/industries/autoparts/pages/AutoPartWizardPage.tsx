import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Wrench,
  Plus, AlertTriangle, Trash2, Eye, Edit3, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useAutoPartsWizard, type WizardStep } from '../hooks/useAutoPartsWizard';
import { AutoPartsWizardStepper } from '../components/wizard/AutoPartsWizardStepper';
import { AutoPartsWizardStep1Basic } from '../components/wizard/AutoPartsWizardStep1Basic';
import { AutoPartsWizardStep2Details } from '../components/wizard/AutoPartsWizardStep2Details';
import { AutoPartsWizardStep3Fitment } from '../components/wizard/AutoPartsWizardStep3Fitment';
import { AutoPartsWizardSummary } from '../components/wizard/AutoPartsWizardSummary';
import { saveAutoPartsWizard, type AutoPartsWizardSaveResult } from '../api/autoparts-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { partProfilesApi } from '../api/part-profiles.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

export default function AutoPartWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateDetails,
    addAlternateNumber, removeAlternateNumber,
    setHasFitment, setIsUniversal,
    addFitment, updateFitment, removeFitment,
    reset,
  } = useAutoPartsWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<AutoPartsWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['part-profile-for-wizard', id],
    queryFn: () => partProfilesApi.byProduct(id!),
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
      stock: existingProduct.stock ?? 0,
      lowStockAlert: existingProduct.lowStockAlert ?? 5,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
      partCategory: existingProfile?.category ?? 'ENGINE',
      subCategory: existingProfile?.subCategory ?? '',
    });

    if (existingProfile) {
      updateDetails({
        partNumber: existingProfile.partNumber ?? '',
        oemNumber: existingProfile.oemNumber ?? '',
        alternateNumbers: existingProfile.alternateNumbers ?? [],
        condition: existingProfile.condition ?? 'NEW',
        brand: existingProfile.brand ?? '',
        countryOfOrigin: existingProfile.countryOfOrigin ?? '',
        manufacturer: existingProfile.manufacturer ?? '',
        weightGrams: existingProfile.weightGrams ?? '',
        dimensions: existingProfile.dimensions ?? '',
        color: existingProfile.color ?? '',
        material: existingProfile.material ?? '',
        warrantyMonths: existingProfile.warrantyMonths ?? 6,
        warrantyKm: existingProfile.warrantyKm ?? '',
        warrantyNotes: existingProfile.warrantyNotes ?? '',
        installationMinutes: existingProfile.installationMinutes ?? '',
        installationDifficulty: existingProfile.installationDifficulty ?? 'MEDIUM',
        requiresSpecialTool: existingProfile.requiresSpecialTool ?? false,
        isFastMoving: existingProfile.isFastMoving ?? false,
        isCritical: existingProfile.isCritical ?? false,
        minStockAlert: existingProfile.minStockAlert ?? 5,
      });

      // Load compatibility if exists
      if (existingProfile.compatibility) {
        const comp: any = existingProfile.compatibility;
        setHasFitment(true);
        if (comp.isUniversal) {
          setIsUniversal(true);
        } else if (Array.isArray(comp.fitments)) {
          comp.fitments.forEach((f: any) => {
            addFitment({
              makeId: f.makeId,
              makeName: f.makeName,
              modelId: f.modelId,
              modelName: f.modelName,
              yearFrom: f.yearFrom ?? '',
              yearTo: f.yearTo ?? '',
              engineOptions: f.engineOptions ?? [],
              notes: f.notes ?? '',
            });
          });
        }
      }
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingProfile, editLoaded, updateBasic, updateDetails, setHasFitment, setIsUniversal, addFitment]);

  const saveMutation = useMutation({
    mutationFn: () => saveAutoPartsWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['auto-parts'] });
      queryClient.invalidateQueries({ queryKey: ['part-profile-for-wizard'] });
      forceRefreshProducts().catch(() => {});
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save part'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Part {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-slate-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> catalog par ready hai
          </p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <SuccessStat label="Alt Numbers" value={savedResult.alternateNumberCount} />
            <SuccessStat label="Fitments" value={savedResult.isUniversal ? 'Universal' : savedResult.fitmentCount} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/autoparts-products/new');
            }}
            className="rounded-2xl bg-slate-700 hover:bg-slate-800 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another Part</div>
          </button>
          <button
            onClick={() => navigate(`/autoparts-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-slate-600" />
            <div className="font-extrabold text-slate-900">View Part</div>
          </button>
          <button
            onClick={() => navigate('/autoparts/parts')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Package className="h-6 w-6 text-slate-600" />
            <div className="font-extrabold text-slate-900">Parts Catalog</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-slate-100 border-2 border-slate-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-slate-700" />
          <div className="text-xs text-slate-900 flex-1 min-w-0">
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
              Basic info, part details aur fitments edit ho sakte hain. Save karne pe overwrite honge.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/autoparts-products/${id}` : '/autoparts/parts')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Part' : 'Back to Parts Catalog'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-slate-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Wrench className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Auto Part' : 'Auto Parts Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Part' : 'Add New Auto Part'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Part identity, technical details, vehicle fitment — sab ek page mein.
          </p>
        </div>
      </section>

      <AutoPartsWizardStepper
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
            <AutoPartsWizardStep1Basic
              basic={draft.basic}
              onChange={updateBasic}
              errors={validation.step1.errors}
            />
          )}
          {draft.step === 2 && (
            <AutoPartsWizardStep2Details
              details={draft.details}
              onChange={updateDetails}
              onAddAlternate={addAlternateNumber}
              onRemoveAlternate={removeAlternateNumber}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <AutoPartsWizardStep3Fitment
              compatibility={draft.compatibility}
              onToggleHasFitment={setHasFitment}
              onSetUniversal={setIsUniversal}
              onAddFitment={addFitment}
              onUpdateFitment={updateFitment}
              onRemoveFitment={removeFitment}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <AutoPartsWizardSummary draft={draft} stats={stats} allValid={canSave} />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-slate-700 to-slate-900"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Save Auto Part'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">{label}</div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
