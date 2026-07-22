import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, ChefHat,
  Plus, AlertTriangle, Trash2, Eye, Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useRestaurantWizard, type WizardStep } from '../hooks/useRestaurantWizard';
import { RestaurantWizardStepper } from '../components/wizard/RestaurantWizardStepper';
import { RestaurantWizardStep1Basic } from '../components/wizard/RestaurantWizardStep1Basic';
import { RestaurantWizardStep2Modifiers } from '../components/wizard/RestaurantWizardStep2Modifiers';
import { RestaurantWizardStep3Recipe } from '../components/wizard/RestaurantWizardStep3Recipe';
import { RestaurantWizardSummary } from '../components/wizard/RestaurantWizardSummary';
import { saveRestaurantWizard, type RestaurantWizardSaveResult } from '../api/restaurant-wizard.api';
import { productsApi } from '@/api/products.api';
import { forceRefreshProducts } from '@/lib/offline/offlineProducts';

export default function RestaurantMenuItemWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    updateModifiers, toggleDietaryTag, toggleModifierGroup,
    setHasRecipe, updateRecipe,
    addIngredient, updateIngredient, removeIngredient,
    toggleDay,
    reset,
  } = useRestaurantWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<RestaurantWizardSaveResult | null>(null);
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
      unit: existingProduct.unit ?? 'plate',
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
    mutationFn: () => saveRestaurantWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      forceRefreshProducts().catch(() => {});
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save menu item'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

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
        <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-900">
            Menu Item {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-orange-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> menu par ready hai
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Dietary Tags" value={savedResult.dietaryTagCount} />
            <SuccessStat label="Modifier Groups" value={savedResult.modifierGroupCount} />
            <SuccessStat label="Ingredients" value={savedResult.ingredientCount} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/restaurant-menu-items/new');
            }}
            className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another Item</div>
          </button>
          <button
            onClick={() => navigate(`/restaurant-menu-items/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-orange-600" />
            <div className="font-extrabold text-slate-900">View Item</div>
          </button>
          <button
            onClick={() => navigate('/restaurant/menu')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <ChefHat className="h-6 w-6 text-orange-600" />
            <div className="font-extrabold text-slate-900">Full Menu</div>
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
              Basic info edit ho sakta hai. Modifier changes overwrite honge, recipe merge hoga.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/restaurant-menu-items/${id}` : '/restaurant/menu')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Item' : 'Back to Menu'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <ChefHat className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Menu Item' : 'Restaurant Menu Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Menu Item' : 'Add New Menu Item'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Menu item, modifiers, aur recipe — sab ek page mein.
          </p>
        </div>
      </section>

      <RestaurantWizardStepper
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
            <RestaurantWizardStep1Basic
              basic={draft.basic}
              onChange={updateBasic}
              onToggleDay={toggleDay}
              errors={validation.step1.errors}
            />
          )}
          {draft.step === 2 && (
            <RestaurantWizardStep2Modifiers
              modifiers={draft.modifiers}
              onChange={updateModifiers}
              onToggleDietaryTag={toggleDietaryTag}
              onToggleModifierGroup={toggleModifierGroup}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <RestaurantWizardStep3Recipe
              recipe={draft.recipe}
              onToggleRecipe={setHasRecipe}
              onUpdate={updateRecipe}
              onAddIngredient={addIngredient}
              onUpdateIngredient={updateIngredient}
              onRemoveIngredient={removeIngredient}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <RestaurantWizardSummary draft={draft} stats={stats} allValid={canSave} />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-orange-600 to-red-700"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : 'Save Menu Item'}
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
